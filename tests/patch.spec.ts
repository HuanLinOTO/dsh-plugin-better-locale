/**
 * Unit tests for the LocaleRuntime patch helpers.
 *
 * The real `@deepseek-ai/dsh-client-locale/client` bundle is wrapped in
 * `window.__ModuleLoader__.load(...)` (browser-only). To run the patch
 * helpers against a controlled class shape in node, we mock the module
 * with a minimal `LocaleRuntime` whose prototype has the same surface
 * the patch expects: `getLocale()` + `lookup()` + `publish()`.
 *
 * The mock is defined in `vi.hoisted` so it is available to the
 * `vi.mock` factory (which runs before any import). Tests then
 * instantiate the mocked class (which IS `LocaleRuntime` after the mock
 * is applied) and exercise the patch through `installPatch` /
 * `bumpRevision` / `probeLocaleRuntime`.
 *
 * Type note: `vi.mock` only mocks runtime values, not TypeScript types.
 * The `LocaleRuntime` type still resolves to the real class shape from
 * the .d.ts (whose constructor takes `(ctx, host?)`). The mock's
 * constructor takes a different shape (`{ active, nativeCommon }`), so
 * we cast through `any` when instantiating and when passing to
 * `bumpRevision`. This is a test-only cast; production code receives
 * the real LocaleRuntime from `ctx.locale`.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** Shape of the mock instances used in tests (for safe property access). */
interface MockLocale {
  getLocale(): { active: string }
  lookup(ns: string, key: string): string | undefined
  publish(active: string, localeChanged: boolean): void
}

/**
 * The mock LocaleRuntime class is defined INSIDE `vi.hoisted` so it is
 * available to the `vi.mock` factory (which runs before any import).
 * The class has the same surface the patch probes: `getLocale()` +
 * `lookup()` + `publish()`.
 */
const { MockLocaleRuntime } = vi.hoisted(() => {
  class MockLocaleRuntime {
    private active: string
    /** Native dict for the 'common' ns (used to test fallback path). */
    private nativeCommon: Record<string, string> | undefined
    constructor(opts: { active?: string; nativeCommon?: Record<string, string> } = {}) {
      this.active = opts.active ?? 'en'
      this.nativeCommon = opts.nativeCommon
    }
    getLocale(): { active: string } {
      return { active: this.active }
    }
    lookup(ns: string, key: string): string | undefined {
      if (ns === 'common') return this.nativeCommon?.[key]
      return undefined
    }
    publish(active: string): void {
      this.active = active
    }
  }
  return { MockLocaleRuntime }
})

vi.mock('@deepseek-ai/dsh-client-locale/client', () => ({
  LocaleRuntime: MockLocaleRuntime,
}))

// Import AFTER vi.mock (vitest hoists vi.mock above imports automatically).
import { installPatch, bumpRevision, probeLocaleRuntime } from '../src/client/patch.ts'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { BetterLocaleStore } from '../src/client/store.ts'

/** Construct a mock LocaleRuntime instance with the given options. */
function makeLocale(opts: { active?: string; nativeCommon?: Record<string, string> } = {}): MockLocale {
  // `LocaleRuntime` (value) is the mocked class; cast through any to
  // bypass the real constructor's `(ctx, host?)` signature.
  return new (LocaleRuntime as unknown as new (opts?: { active?: string; nativeCommon?: Record<string, string> }) => MockLocale)(opts)
}

describe('patch helpers', () => {
  describe('probeLocaleRuntime', () => {
    it('returns true when LocaleRuntime.prototype.lookup is a function', () => {
      expect(probeLocaleRuntime()).toBe(true)
    })
  })

  describe('installPatch', () => {
    beforeEach(() => {
      // Ensure each test starts from an unpatched prototype. The patch's
      // disposer restores the original, but a throwing test might skip
      // cleanup; this is the safety net.
      const proto = LocaleRuntime.prototype as unknown as Record<string, unknown>
      const currentLookup = proto.lookup
      if (typeof currentLookup !== 'function' || currentLookup.name === 'wrapper') {
        proto.lookup = MockLocaleRuntime.prototype.lookup
      }
    })

    it('returns a disposer', () => {
      const store = new BetterLocaleStore()
      const dispose = installPatch(store)
      expect(typeof dispose).toBe('function')
      dispose()
    })

    it('patched lookup returns override when store has the (ns, override, key)', () => {
      const store = new BetterLocaleStore()
      store.register('common', { ja: { ok: 'OK (ja)' } })
      store.setActive('ja')

      const locale = makeLocale({ active: 'en' })
      const dispose = installPatch(store)
      try {
        expect(locale.lookup('common', 'ok')).toBe('OK (ja)')
      } finally {
        dispose()
      }
    })

    it('patched lookup is inert when DSH active is "zh" (override borrows the en slot)', () => {
      const store = new BetterLocaleStore()
      store.register('common', { ja: { ok: 'OK (ja)' } })
      store.setActive('ja')

      const locale = makeLocale({
        active: 'zh',
        nativeCommon: { ok: 'OK (native zh)' },
      })
      const dispose = installPatch(store)
      try {
        // Override is set to 'ja' but DSH is on zh — override is inert,
        // native zh text wins. The user must switch DSH to en to see ja.
        expect(locale.lookup('common', 'ok')).toBe('OK (native zh)')
      } finally {
        dispose()
      }
    })

    it('patched lookup falls back to original when override is undefined', () => {
      const store = new BetterLocaleStore()
      // Override active, but no dict registered for (common, ja).
      store.registerLanguage({ id: 'ja', label: '日本語' })
      store.setActive('ja')

      const locale = makeLocale({
        active: 'en',
        nativeCommon: { ok: 'OK (native en)' },
      })
      const dispose = installPatch(store)
      try {
        expect(locale.lookup('common', 'ok')).toBe('OK (native en)')
      } finally {
        dispose()
      }
    })

    it('patched lookup falls back when no override is active', () => {
      const store = new BetterLocaleStore()
      // active is undefined (no override)
      store.register('common', { ja: { ok: 'OK (ja)' } })

      const locale = makeLocale({
        active: 'en',
        nativeCommon: { ok: 'OK (native en)' },
      })
      const dispose = installPatch(store)
      try {
        expect(locale.lookup('common', 'ok')).toBe('OK (native en)')
      } finally {
        dispose()
      }
    })

    it('patched lookup returns undefined when neither override nor native has the key', () => {
      const store = new BetterLocaleStore()
      store.register('common', { ja: { ok: 'OK (ja)' } })
      store.setActive('ja')

      const locale = makeLocale({ active: 'en' })
      const dispose = installPatch(store)
      try {
        expect(locale.lookup('common', 'missingKey')).toBeUndefined()
      } finally {
        dispose()
      }
    })

    it('disposer restores the original lookup', () => {
      const store = new BetterLocaleStore()
      store.register('common', { ja: { ok: 'OK (ja)' } })
      store.setActive('ja')

      const locale = makeLocale({
        active: 'en',
        nativeCommon: { ok: 'OK (native en)' },
      })

      const proto = LocaleRuntime.prototype as unknown as Record<string, unknown>
      const beforePatch = proto.lookup

      const dispose = installPatch(store)
      expect(proto.lookup).not.toBe(beforePatch)
      expect(locale.lookup('common', 'ok')).toBe('OK (ja)')

      dispose()
      expect(proto.lookup).toBe(beforePatch)
      expect(locale.lookup('common', 'ok')).toBe('OK (native en)')
    })

    it('disposer is idempotent', () => {
      const store = new BetterLocaleStore()
      const dispose = installPatch(store)
      dispose()
      expect(() => dispose()).not.toThrow()
    })

    it('installPatch is idempotent: second install on the same prototype is a no-op', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        const store = new BetterLocaleStore()
        const dispose1 = installPatch(store)
        const dispose2 = installPatch(store)
        // Second install should log an error and return a no-op disposer.
        expect(consoleErrorSpy).toHaveBeenCalled()
        // First disposer still restores; second is a no-op.
        dispose2()
        dispose1()
      } finally {
        consoleErrorSpy.mockRestore()
      }
    })
  })

  describe('bumpRevision', () => {
    it('calls locale.publish(active, true)', () => {
      const locale = makeLocale({ active: 'en' })
      const publishSpy = vi.spyOn(locale, 'publish')

      bumpRevision(locale as unknown as never)

      expect(publishSpy).toHaveBeenCalledTimes(1)
      expect(publishSpy).toHaveBeenCalledWith('en', true)
      publishSpy.mockRestore()
    })

    it('passes the current active (does not change it)', () => {
      const locale = makeLocale({ active: 'zh' })
      const publishSpy = vi.spyOn(locale, 'publish')

      bumpRevision(locale as unknown as never)

      expect(publishSpy).toHaveBeenCalledWith('zh', true)
      publishSpy.mockRestore()
    })
  })
})
