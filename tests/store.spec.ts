/**
 * Unit tests for BetterLocaleStore.
 *
 * Pure node environment — the store has no React / no cordis / no DOM
 * dependencies. localStorage is stubbed via a module-level mock when
 * needed (the store's `loadActiveFromStorage` and `persistActive` both
 * guard with `typeof localStorage === 'undefined'`, so undefined
 * localStorage is a valid test state for "no persistence").
 */
import { describe, expect, it, vi } from 'vitest'
import { BetterLocaleStore, loadActiveFromStorage, STORAGE_KEY } from '../src/client/store.ts'

describe('BetterLocaleStore', () => {
  describe('registerLanguage', () => {
    it('adds a language to the list (in registration order)', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.registerLanguage({ id: 'ko', label: '한국어' })
      expect(store.languages.map(l => l.id)).toEqual(['ja', 'ko'])
      expect(store.languages.map(l => l.label)).toEqual(['日本語', '한국어'])
    })

    it('throws on duplicate id', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      expect(() => store.registerLanguage({ id: 'ja', label: '日本語' })).toThrowError(
        /language "ja" already registered/,
      )
    })

    it('disposer removes the language', () => {
      const store = new BetterLocaleStore()
      const dispose = store.registerLanguage({ id: 'ja', label: '日本語' })
      dispose()
      expect(store.languages).toHaveLength(0)
    })

    it('disposer is idempotent', () => {
      const store = new BetterLocaleStore()
      const dispose = store.registerLanguage({ id: 'ja', label: '日本語' })
      dispose()
      dispose()
      expect(store.languages).toHaveLength(0)
    })

    it('clears active override when the active language is removed', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.register('common', { ja: { ok: 'OK' } })
      store.setActive('ja')
      expect(store.active).toBe('ja')

      // Removing the active language clears the override (no dict can match).
      // We can't easily get the disposer here; re-register and remove via
      // a separate store to verify the behaviour.
      const store2 = new BetterLocaleStore()
      const disposeJa = store2.registerLanguage({ id: 'ja', label: '日本語' })
      store2.register('common', { ja: { ok: 'OK' } })
      store2.setActive('ja')
      disposeJa()
      expect(store2.active).toBeUndefined()
    })
  })

  describe('register (dicts)', () => {
    it('registers a (ns, locale) dict and getOverride returns the key', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.register('common', { ja: { ok: 'OK', cancel: 'キャンセル' } })
      store.setActive('ja')

      expect(store.getOverride('en', 'common', 'ok')).toBe('OK')
      expect(store.getOverride('en', 'common', 'cancel')).toBe('キャンセル')
    })

    it('throws on duplicate (ns, locale)', () => {
      const store = new BetterLocaleStore()
      store.register('common', { ja: { ok: 'OK' } })
      expect(() => store.register('common', { ja: { ok: 'OK' } })).toThrowError(
        /locale namespace "common" already has locale "ja"/,
      )
    })

    it('disposer removes only the dicts registered by this call', () => {
      const store = new BetterLocaleStore()
      const disposeA = store.register('common', { ja: { ok: 'OK' } })
      store.register('common', { ko: { ok: '확인' } })
      store.setActive('ja')
      expect(store.getOverride('en', 'common', 'ok')).toBe('OK')

      disposeA()
      // ja dict removed; ko dict stays
      expect(store.getOverride('en', 'common', 'ok')).toBeUndefined()
      store.setActive('ko')
      expect(store.getOverride('en', 'common', 'ok')).toBe('확인')
    })

    it('disposer is idempotent', () => {
      const store = new BetterLocaleStore()
      const dispose = store.register('common', { ja: { ok: 'OK' } })
      dispose()
      dispose()
      // No throw; no state churn. Verify by registering the same (ns, locale)
      // again — should not throw (the previous dict was removed).
      expect(() => store.register('common', { ja: { ok: 'OK' } })).not.toThrow()
    })

    it('supports multiple locales in one call', () => {
      const store = new BetterLocaleStore()
      store.register('common', {
        ja: { ok: 'OK' },
        ko: { ok: '확인' },
      })
      store.setActive('ja')
      expect(store.getOverride('en', 'common', 'ok')).toBe('OK')
      store.setActive('ko')
      expect(store.getOverride('en', 'common', 'ok')).toBe('확인')
    })

    it('supports multiple namespaces independently', () => {
      const store = new BetterLocaleStore()
      store.register('common', { ja: { ok: 'OK' } })
      store.register('settings', { ja: { title: '設定' } })
      store.setActive('ja')
      expect(store.getOverride('en', 'common', 'ok')).toBe('OK')
      expect(store.getOverride('en', 'settings', 'title')).toBe('設定')
      // Cross-namespace: settings key not in common
      expect(store.getOverride('en', 'common', 'title')).toBeUndefined()
    })
  })

  describe('getOverride', () => {
    it('returns undefined when no override is active', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.register('common', { ja: { ok: 'OK' } })
      // active is undefined (no override)
      expect(store.getOverride('en', 'common', 'ok')).toBeUndefined()
    })

    it('returns undefined when the (ns, locale) dict is missing', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.register('common', { ja: { ok: 'OK' } })
      store.setActive('ja')
      // ns not registered
      expect(store.getOverride('en', 'unknownNs', 'ok')).toBeUndefined()
    })

    it('returns undefined when the key is missing from the dict', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.register('common', { ja: { ok: 'OK' } })
      store.setActive('ja')
      expect(store.getOverride('en', 'common', 'missingKey')).toBeUndefined()
    })

    it('ignores the dshActive parameter in the current model', () => {
      // Behavior changed: the override now borrows DSH's en slot, so it
      // only fires when dshActive === 'en'. See "only fires on en" tests below.
      // This test is kept (renamed in spirit) as a regression marker for
      // the old behavior; it now asserts the new en-only contract.
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.register('common', { ja: { ok: 'OK' } })
      store.setActive('ja')
      expect(store.getOverride('zh', 'common', 'ok')).toBeUndefined()
      expect(store.getOverride('en', 'common', 'ok')).toBe('OK')
    })

    it('only fires when DSH active is "en" (borrows the en slot)', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.register('common', { ja: { ok: 'OK' } })
      store.setActive('ja')
      // zh: override is inert — user sees native zh
      expect(store.getOverride('zh', 'common', 'ok')).toBeUndefined()
      // en: override fires — user sees the third language
      expect(store.getOverride('en', 'common', 'ok')).toBe('OK')
    })

    it('does not fire on unknown DSH active ids', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.register('common', { ja: { ok: 'OK' } })
      store.setActive('ja')
      expect(store.getOverride('fr', 'common', 'ok')).toBeUndefined()
      expect(store.getOverride('ja', 'common', 'ok')).toBeUndefined()
      expect(store.getOverride('', 'common', 'ok')).toBeUndefined()
    })
  })

  describe('isOverrideActive', () => {
    it('returns false when no override is set', () => {
      const store = new BetterLocaleStore()
      expect(store.isOverrideActive('en')).toBe(false)
      expect(store.isOverrideActive('zh')).toBe(false)
    })

    it('returns true only when override is set AND DSH is on en', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.register('common', { ja: { ok: 'OK' } })
      store.setActive('ja')
      expect(store.isOverrideActive('en')).toBe(true)
      expect(store.isOverrideActive('zh')).toBe(false)
      expect(store.isOverrideActive('fr')).toBe(false)
    })

    it('returns false after the override is cleared', () => {
      const store = new BetterLocaleStore()
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.register('common', { ja: { ok: 'OK' } })
      store.setActive('ja')
      expect(store.isOverrideActive('en')).toBe(true)
      store.setActive(undefined)
      expect(store.isOverrideActive('en')).toBe(false)
    })
  })

  describe('setActive', () => {
    it('updates active and persists', () => {
      const store = new BetterLocaleStore()
      store.setActive('ja')
      expect(store.active).toBe('ja')
    })

    it('dedupes: setting the same value is a no-op (no notification)', () => {
      const store = new BetterLocaleStore()
      store.setActive('ja')
      const listener = vi.fn()
      store.subscribe(listener)
      store.setActive('ja')  // same value
      expect(listener).not.toHaveBeenCalled()
    })

    it('clears with undefined', () => {
      const store = new BetterLocaleStore()
      store.setActive('ja')
      store.setActive(undefined)
      expect(store.active).toBeUndefined()
    })
  })

  describe('subscribe', () => {
    it('notifies on setActive', () => {
      const store = new BetterLocaleStore()
      const listener = vi.fn()
      store.subscribe(listener)
      store.setActive('ja')
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('notifies on registerLanguage', () => {
      const store = new BetterLocaleStore()
      const listener = vi.fn()
      store.subscribe(listener)
      store.registerLanguage({ id: 'ja', label: '日本語' })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('notifies on register (dicts)', () => {
      const store = new BetterLocaleStore()
      const listener = vi.fn()
      store.subscribe(listener)
      store.register('common', { ja: { ok: 'OK' } })
      expect(listener).toHaveBeenCalledTimes(1)
    })

    it('unsubscribe stops notifications', () => {
      const store = new BetterLocaleStore()
      const listener = vi.fn()
      const unsubscribe = store.subscribe(listener)
      unsubscribe()
      store.setActive('ja')
      expect(listener).not.toHaveBeenCalled()
    })

    it('a throwing subscriber does not strand the rest', () => {
      const store = new BetterLocaleStore()
      const throwingListener = vi.fn(() => { throw new Error('boom') })
      const okListener = vi.fn()
      // Suppress the expected console.error from the throwing listener.
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        store.subscribe(throwingListener)
        store.subscribe(okListener)
        store.setActive('ja')
        expect(throwingListener).toHaveBeenCalledTimes(1)
        expect(okListener).toHaveBeenCalledTimes(1)
        expect(consoleErrorSpy).toHaveBeenCalled()
      } finally {
        consoleErrorSpy.mockRestore()
      }
    })
  })

  describe('persistence (localStorage)', () => {
    /** Stub localStorage on globalThis for one test. */
    function withLocalStorage<T>(fn: () => T): T {
      const store = new Map<string, string>()
      const fakeLocalStorage = {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value) },
        removeItem: (key: string) => { store.delete(key) },
        clear: () => { store.clear() },
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        get length() { return store.size },
      }
      const previous = (globalThis as Record<string, unknown>).localStorage
      ;(globalThis as Record<string, unknown>).localStorage = fakeLocalStorage
      try {
        return fn()
      } finally {
        if (previous === undefined) {
          delete (globalThis as Record<string, unknown>).localStorage
        } else {
          ;(globalThis as Record<string, unknown>).localStorage = previous
        }
      }
    }

    it('setActive persists to localStorage', () => {
      withLocalStorage(() => {
        const store = new BetterLocaleStore()
        store.setActive('ja')
        expect(localStorage.getItem(STORAGE_KEY)).toBe('ja')
      })
    })

    it('setActive(undefined) removes from localStorage', () => {
      withLocalStorage(() => {
        localStorage.setItem(STORAGE_KEY, 'ja')
        const store = new BetterLocaleStore()
        store.setActive('ja')  // dedupes (already 'ja' from storage? no, store starts undefined)
        // Actually store starts with active=undefined (constructor doesn't read storage);
        // loadActiveFromStorage is called by the apply function. So setActive('ja')
        // sets it to 'ja' and persists.
        expect(localStorage.getItem(STORAGE_KEY)).toBe('ja')
        store.setActive(undefined)
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
      })
    })

    it('loadActiveFromStorage reads the persisted value', () => {
      withLocalStorage(() => {
        localStorage.setItem(STORAGE_KEY, 'ja')
        expect(loadActiveFromStorage()).toBe('ja')
      })
    })

    it('loadActiveFromStorage returns undefined when nothing is stored', () => {
      withLocalStorage(() => {
        expect(loadActiveFromStorage()).toBeUndefined()
      })
    })

    it('loadActiveFromStorage returns undefined when localStorage is unavailable', () => {
      // No localStorage on globalThis (default node environment)
      expect(loadActiveFromStorage()).toBeUndefined()
    })

    it('store constructed with initial active value uses it', () => {
      const store = new BetterLocaleStore({ active: 'ja' })
      expect(store.active).toBe('ja')
    })
  })
})
