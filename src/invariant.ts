/**
 * Package-owned invariant companion for `@huanlin/dsh-plugin-better-locale`.
 *
 * @module @huanlin/dsh-plugin-better-locale/invariant
 */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@huanlin/dsh-plugin-better-locale'

/** Cordis companion plugin name. */
export const name = 'dsh-plugin-better-locale-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/**
 * No runtime invariant: the `LocaleRuntime.prototype.lookup` patch is
 * installed through `ctx.effect` (HMR-safe — the disposer restores the
 * original method on fiber disposal, proven by `tests/patch.spec.ts`).
 * The override store's only mutable state is the localStorage-backed
 * active-override id, whose lifecycle is bounded by the browser profile
 * (not the cordis fiber) and whose write path is last-writer-wins with
 * try/catch containment. The startup probe (`probeLocaleRuntime`) logs
 * a console error and downgrades to a no-op patch when the upstream
 * LocaleRuntime shape changes, so an upstream refactor cannot silently
 * break translation.
 */
const install: InvariantInstaller = () => {}

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
