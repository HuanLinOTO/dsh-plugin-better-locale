/**
 * The override store: a self-contained registry of (ns, locale) → dict
 * pairs plus an "active override" id. The patched `LocaleRuntime.lookup`
 * consults `getOverride(dshActive, ns, key)` on every translate call;
 * when an override exists it wins over DSH's native zh/en dictionary,
 * otherwise the patched lookup falls back to the original implementation
 * (which itself consults the dsh active locale + en fallback).
 *
 * The store is intentionally framework-free (no React, no cordis): the
 * `apply` function wires it to cordis + the locale runtime, and the
 * LanguageSwitcher component wires it to React. This keeps the store
 * unit-testable in pure node.
 *
 * Persistence: the selected override id is stored in localStorage under
 * `STORAGE_KEY`. The store reads on construction and writes on every
 * `setActive`. localStorage errors are swallowed: the in-memory state
 * stays authoritative when storage is unavailable (private mode, quota,
 * ssr); the next browser profile that does have storage re-reads the
 * persisted value.
 *
 * @module @huanlin/dsh-plugin-better-locale/client/store
 */

/** One registered override language. */
export interface LocaleDefinition {
  /** Locale id (e.g. 'ja' / 'ko' / 'fr'). Must match the dict keys registered via `register`. */
  id: string
  /** Self-described display name in its own language ('日本語' / '한국어'). */
  label: string
}

/** Flat key → template string ({name} placeholders). Reuses DSH's LocaleDict shape. */
export type LocaleDict = Record<string, string>

/** localStorage key for the persisted active override id. */
export const STORAGE_KEY = 'dsh-plugin-better-locale:active'

/**
 * The override store. Constructed once per `apply` invocation; survives
 * HMR remounts by re-reading localStorage on construction.
 */
export class BetterLocaleStore {
  /** ns → locale → dict. */
  private readonly dicts = new Map<string, Map<string, LocaleDict>>()
  /** Ordered list of selectable languages (registration order). Backing field for the `languages` getter. */
  private _languages: readonly LocaleDefinition[] = []
  /** Current override id; `undefined` means "no override, use DSH native". */
  private activeOverride: string | undefined
  /** Change listeners (the apply function subscribes to bump LocaleRuntime revision). */
  private readonly listeners = new Set<() => void>()

  /**
   * @param initial - optional initial state (used to seed `active` from
   * `loadActiveFromStorage()` at construction time).
   */
  constructor(initial: { active?: string | undefined } = {}) {
    this.activeOverride = initial.active
  }

  /** Current override id; `undefined` means "no override, use DSH native". */
  get active(): string | undefined {
    return this.activeOverride
  }

  /** Snapshot of registered languages (in registration order). */
  get languages(): readonly LocaleDefinition[] {
    return this._languages
  }

  /**
   * Register a selectable language. The label is shown verbatim in the
   * LanguageSwitcher UI; the id must match the dict keys passed to
   * `register`. Duplicate id throws (single occupant per language).
   * @returns disposer removing the language (idempotent).
   */
  registerLanguage(def: LocaleDefinition): () => void {
    if (this._languages.find(l => l.id === def.id) !== undefined) {
      throw new Error(`language "${def.id}" already registered`)
    }
    this._languages = [...this._languages, def]
    this.notify()
    return () => {
      if (!this._languages.some(l => l.id === def.id)) return
      this._languages = this._languages.filter(l => l.id !== def.id)
      // If the active override was this language, clear it (no dict can
      // match anymore); persists + notifies.
      if (this.activeOverride === def.id) this.setActive(undefined)
      else this.notify()
    }
  }

  /**
   * Register dictionaries for a namespace, all locales in one call —
   * same shape as DSH's `LocaleRuntime.register(ns, dicts)` overload.
   * Duplicate (ns, locale) throws (single occupant; a namespace's texts
   * have one owner). Registration notifies subscribers so the
   * LanguageSwitcher can refresh its "available languages" list when a
   * third-party plugin registers dictionaries for a new language.
   *
   * Note: registering a dict does NOT auto-register the language as
   * selectable. Call `registerLanguage` separately so the UI knows the
   * label. This separation lets third-party plugins ship dict-only
   * contributions (no UI entry) and lets the plugin owner own the
   * curated language list.
   *
   * @param ns - namespace (e.g. 'common', 'settings.locale').
   * @param dicts - dictionaries keyed by locale id.
   * @returns disposer removing every locale registered by this call (idempotent).
   */
  register(ns: string, dicts: Record<string, LocaleDict>): () => void {
    let locales = this.dicts.get(ns)
    if (locales === undefined) {
      locales = new Map()
      this.dicts.set(ns, locales)
    }
    for (const locale of Object.keys(dicts)) {
      if (locales.has(locale)) {
        throw new Error(`locale namespace "${ns}" already has locale "${locale}"`)
      }
    }
    const entries = Object.entries(dicts)
    for (const [locale, dict] of entries) {
      locales.set(locale, dict)
    }
    this.notify()
    return () => {
      const owner = this.dicts.get(ns)
      if (owner === undefined) return
      let removed = false
      for (const [locale, dict] of entries) {
        if (owner.get(locale) === dict) {
          owner.delete(locale)
          removed = true
        }
      }
      if (removed) this.notify()
    }
  }

  /**
   * Read the override translation for (active, ns, key). Called by the
   * patched `LocaleRuntime.lookup` on every translate call.
   *
   * The override only takes effect when DSH's active locale is `'en'`:
   * the override borrows DSH's English slot to render a third language
   * (e.g. ja), so a user must switch DSH to English to actually see the
   * selected language. While DSH is on `'zh'` the override is inert and
   * the user sees native zh — this keeps the chrome consistent (DSH
   * chrome in zh, third-party plugins in zh) rather than mixed (DSH
   * chrome in zh, better-sidebar in ja).
   *
   * Returns `undefined` when:
   *   - no override is active (`active === undefined`), OR
   *   - DSH's active locale is not `'en'` (override borrows the en slot), OR
   *   - the (ns, override) dict is missing, OR
   *   - the dict lacks the key.
   *
   * The patched lookup falls back to the original implementation in
   * those cases, so missing keys naturally render DSH's native zh/en
   * text.
   *
   * @param dshActive - the DSH locale active id (only `'en'` activates the override).
   * @param ns - namespace.
   * @param key - dictionary key.
   * @returns the override text, or `undefined` to fall back.
   */
  getOverride(dshActive: string, ns: string, key: string): string | undefined {
    if (this.activeOverride === undefined) return undefined
    if (dshActive !== 'en') return undefined
    const locales = this.dicts.get(ns)
    return locales?.get(this.activeOverride)?.[key]
  }

  /**
   * Whether the override is *effectively* active given DSH's current
   * active locale. Used by consumers (e.g. better-sidebar's `isZh()`)
   * to decide whether the override is actually shaping the rendered
   * text — `store.active !== undefined` alone is not enough because
   * the override is inert while DSH is on `'zh'`.
   *
   * @param dshActive - the DSH locale active id.
   * @returns `true` when an override is set AND DSH is on `'en'`.
   */
  isOverrideActive(dshActive: string): boolean {
    return this.activeOverride !== undefined && dshActive === 'en'
  }

  /**
   * Switch the active override. `undefined` clears the override (DSH
   * native zh/en behaviour). Dedupes: if the new id equals the current
   * one, no-op (no notification, no revision bump).
   *
   * Persists to localStorage (best-effort) and notifies subscribers.
   * The apply function's subscription calls `bumpRevision(ctx.locale)`
   * so the LocaleFace revision bump triggers a re-render of every
   * outlet — during which the patched lookup returns the new override
   * text.
   * @param localeId - override id, or `undefined` to clear.
   */
  setActive(localeId: string | undefined): void {
    if (this.activeOverride === localeId) return
    this.activeOverride = localeId
    this.persistActive()
    this.notify()
  }

  /**
   * Subscribe to store changes (active switch, language registration,
   * dict registration). Returns an unsubscribe function.
   * @param listener - callback invoked after each state change.
   * @returns unsubscribe.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  /** Notify every subscriber; a throwing listener is logged but does not strand the rest. */
  private notify(): void {
    for (const fn of [...this.listeners]) {
      try {
        fn()
      } catch (error) {
        console.error('[better-locale] subscriber crashed:', error)
      }
    }
  }

  /** Best-effort persist of the active override id to localStorage. */
  private persistActive(): void {
    try {
      if (typeof localStorage === 'undefined') return
      if (this.activeOverride === undefined) {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, this.activeOverride)
      }
    } catch {
      // localStorage may be unavailable (privacy mode, quota, ssr);
      // in-memory state stays authoritative.
    }
  }
}

/**
 * Read the persisted active override id from localStorage.
 * @returns the persisted id, or `undefined` when storage is missing or empty.
 */
export function loadActiveFromStorage(): string | undefined {
  try {
    if (typeof localStorage === 'undefined') return undefined
    return localStorage.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}
