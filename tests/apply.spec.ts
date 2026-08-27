/**
 * Unit tests for the client apply wiring (`src/client/index.ts`).
 *
 * The apply function registers each bundled language through DSH's native
 * API — `ctx.locale.addLanguage` + `ctx.locale.register(ns, locale, dict)`
 * — inside one `ctx.effect` per language. These tests drive `apply` with a
 * fake cordis context (effects run immediately, disposers collected) and a
 * fake LocaleRuntime that mirrors the upstream duplicate guards (duplicate
 * catalog id / duplicate (ns, locale) throw; disposers remove by
 * identity), proving:
 *
 *   - every curated language is registered once with fallback 'en',
 *   - every (namespace, language) dictionary pair is registered with the
 *     bundled dict object (identity preserved),
 *   - running the collected disposers removes the whole contribution
 *     (HMR safety), after which a re-apply succeeds from a clean state,
 *   - applying twice without disposal throws (the plugin relies on
 *     `ctx.effect` disposal rather than silent overwrite).
 *
 * No module mock is needed: the client half imports DSH types only, so
 * the fake satisfies `apply` structurally at runtime.
 */
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/client/index.ts'
import { BUNDLED_LANGUAGES } from '../src/client/languages.ts'
import { dicts as jaDicts } from '../src/client/dictionaries/ja.ts'

/** Mirror of the upstream LocaleRuntime registration surface used by apply. */
class FakeLocaleRuntime {
  readonly catalog = new Map<string, { id: string, label: string, fallback: string }>()
  readonly dicts = new Map<string, Map<string, Record<string, string>>>()

  addLanguage(input: { id: string, label: string, fallback: string }): () => void {
    const key = input.id.toLowerCase()
    if (this.catalog.has(key)) throw new Error(`locale "${input.id}" is already registered`)
    const entry = { ...input }
    this.catalog.set(key, entry)
    return () => {
      if (this.catalog.get(key) !== entry) return
      this.catalog.delete(key)
    }
  }

  register(ns: string, locale: string, dict: Record<string, string>): () => void {
    let locales = this.dicts.get(ns)
    if (locales === undefined) {
      locales = new Map()
      this.dicts.set(ns, locales)
    }
    const key = locale.toLowerCase()
    if (locales.has(key)) {
      throw new Error(`locale namespace "${ns}" already has locale "${locale}"`)
    }
    locales.set(key, dict)
    return () => {
      if (locales.get(key) !== dict) return
      locales.delete(key)
    }
  }
}

interface RecordedEffect {
  readonly label: string | undefined
  readonly dispose: () => void
}

/** Minimal cordis context stand-in: effects run immediately and record their disposers. */
class FakeCtx {
  readonly locale = new FakeLocaleRuntime()
  readonly effects: RecordedEffect[] = []

  effect(body: () => unknown, label?: string): () => void {
    const result = body()
    const dispose = typeof result === 'function' ? result : () => {}
    const effect = { label, dispose }
    this.effects.push(effect)
    return dispose
  }
}

/** Apply the plugin to a fresh context, returning the context. */
function applyToFreshCtx(): FakeCtx {
  const ctx = new FakeCtx()
  apply(ctx as unknown as Context)
  return ctx
}

describe('client apply wiring', () => {
  it('registers one effect per bundled language', () => {
    const ctx = applyToFreshCtx()
    expect(ctx.effects.length).toBe(BUNDLED_LANGUAGES.length)
    expect(ctx.effects.map(e => e.label)).toEqual(
      BUNDLED_LANGUAGES.map(l => `dsh-plugin-better-locale: language ${l.id}`),
    )
  })

  it('registers every language in the catalog with fallback en', () => {
    const ctx = applyToFreshCtx()
    expect([...ctx.locale.catalog.values()].map(l => ({ id: l.id, label: l.label, fallback: l.fallback })))
      .toEqual(BUNDLED_LANGUAGES.map(l => ({ id: l.id, label: l.label, fallback: 'en' })))
  })

  it('registers every (namespace, language) dictionary pair with the bundled dict', () => {
    const ctx = applyToFreshCtx()
    const expectedPairs = BUNDLED_LANGUAGES
      .flatMap(l => Object.keys(l.dicts).map(ns => ({ ns, id: l.id })))
    // The fake (like upstream) keys dictionaries by case-folded locale id,
    // so compare pairs case-insensitively.
    const fold = (p: { ns: string, id: string }): string => `${p.ns}\u0000${p.id.toLowerCase()}`
    const actualPairs: { ns: string, id: string }[] = []
    for (const [ns, locales] of ctx.locale.dicts) {
      for (const locale of locales.keys()) actualPairs.push({ ns, id: locale })
    }
    expect(new Set(actualPairs.map(fold))).toEqual(new Set(expectedPairs.map(fold)))

    // Identity: the registered dict object is the bundled module's dict.
    expect(ctx.locale.dicts.get('common')?.get('ja')).toBe(jaDicts['common'])
  })

  it('disposal removes the whole contribution (HMR safety)', () => {
    const ctx = applyToFreshCtx()
    for (const effect of [...ctx.effects].reverse()) effect.dispose()
    expect(ctx.locale.catalog.size).toBe(0)
    expect([...ctx.locale.dicts.values()].every(locales => locales.size === 0)).toBe(true)
  })

  it('re-apply after disposal succeeds from the clean state', () => {
    const ctx = applyToFreshCtx()
    for (const effect of [...ctx.effects].reverse()) effect.dispose()
    expect(() => apply(ctx as unknown as Context)).not.toThrow()
    expect(ctx.locale.catalog.size).toBe(BUNDLED_LANGUAGES.length)
  })

  it('applying twice without disposal throws (single occupant, disposal owns cleanup)', () => {
    const ctx = applyToFreshCtx()
    expect(() => apply(ctx as unknown as Context)).toThrowError(/already registered/)
  })
})
