/**
 * LocaleRuntime patch: monkey-patches `LocaleRuntime.prototype.lookup`
 * so the override store gets first refusal on every translate call.
 *
 * The patch is idempotent and HMR-safe:
 *   - `installPatch` probes the prototype; if `lookup` is missing or
 *     already patched (by a previous install that did not unwind), it
 *     logs a console error and downgrades to a no-op disposer. The
 *     disposer is still returned so the caller's `ctx.effect` sees a
 *     cleanup function.
 *   - `uninstallPatch` restores the original `lookup` only if the
 *     current method is the wrapper installed by this call (so a
 *     double-uninstall or an intervening re-patch is a no-op).
 *
 * The patch's `this` is the LocaleRuntime instance, so `this.getLocale()`
 * reads the live snapshot — the same one `setLocale` / `publish` mutate.
 * `this.getLocale().active` is the DSH active locale (zh or en); the
 * override store's `getOverride(active, ns, key)` is the one that knows
 * the user's chosen override id (ja / ko / ...).
 *
 * `bumpRevision(locale)` is the helper the apply function calls after a
 * `store.setActive(...)`. `publish` is private on LocaleRuntime; the
 * `any` cast is the documented escape hatch (see plan §"已知风险"). The
 * call bumps the snapshot revision (so uSES subscribers re-render) and
 * emits `locale/change` (so `attachLocale`-style listeners respond).
 *
 * @module @huanlin/dsh-plugin-better-locale/client/patch
 */

import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { BetterLocaleStore } from './store.ts'

/**
 * The original `lookup` method, captured once at module load. `lookup`
 * is TypeScript-private on LocaleRuntime but runtime-readable on the
 * prototype; the `any` cast is the documented escape hatch.
 */
const proto = LocaleRuntime.prototype as unknown as Record<string, unknown>
const origLookup = proto.lookup as
  | ((this: LocaleRuntime, ns: string, key: string) => string | undefined)
  | undefined

/**
 * Probe the LocaleRuntime prototype for the expected `lookup` method.
 * Returns `true` when the shape looks patchable, `false` when upstream
 * has renamed/removed the method (in which case `installPatch` logs a
 * console error and downgrades to a no-op).
 */
export function probeLocaleRuntime(): boolean {
  return typeof origLookup === 'function'
}

/**
 * Patch `LocaleRuntime.prototype.lookup` to consult the override store
 * first. Idempotent: if `lookup` is missing OR already wrapped by a
 * prior `installPatch` call, no-op (with a console error for the
 * already-wrapped case, since two better-locale instances in the same
 * bundle is a bug).
 *
 * @param store - the override store to consult.
 * @returns disposer restoring the original `lookup` (idempotent).
 */
export function installPatch(store: BetterLocaleStore): () => void {
  if (origLookup === undefined) {
    console.error(
      '[better-locale] LocaleRuntime.prototype.lookup not found; upstream changed shape. '
      + 'Patch skipped; override service is inert. Pin a compatible dsh-client-locale version.',
    )
    return () => {}
  }
  if (proto.lookup !== origLookup) {
    console.error(
      '[better-locale] LocaleRuntime.prototype.lookup already patched; '
      + 'another better-locale instance is active. Skipping.',
    )
    return () => {}
  }

  const wrapper = function (this: LocaleRuntime, ns: string, key: string): string | undefined {
    const active = this.getLocale().active
    const override = store.getOverride(active, ns, key)
    if (override !== undefined) return override
    return origLookup.call(this, ns, key)
  }
  proto.lookup = wrapper

  return () => {
    if (proto.lookup !== wrapper) return  // someone else replaced it; leave alone
    proto.lookup = origLookup
  }
}

/**
 * Bump the LocaleRuntime snapshot revision and emit `locale/change`.
 * Called by the apply function after `store.setActive(...)` so the
 * render machinery re-renders every outlet — during which the patched
 * `lookup` returns the new override text.
 *
 * `publish` is TypeScript-private; the `any` cast is the documented
 * escape hatch. The `active` argument is the DSH active locale id
 * (zh or en) — the override layer never mutates it. `localeChanged=true`
 * emits `locale/change` so listeners like better-sidebar's `attachLocale`
 * respond, even though `active` itself did not change.
 *
 * @param locale - the live LocaleRuntime instance (ctx.locale).
 */
export function bumpRevision(locale: LocaleRuntime): void {
  const active = locale.getLocale().active
  ;(locale as unknown as { publish(active: string, localeChanged: boolean): void })
    .publish(active, true)
}
