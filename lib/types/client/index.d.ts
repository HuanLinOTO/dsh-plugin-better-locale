/**
 * dsh-plugin-better-locale — browser half.
 *
 * Six responsibilities, in install order:
 *
 *   1. Register the plugin's own copy namespace (`dsh-plugin-better-locale`)
 *      with DSH's locale service, so the settings row's text follows DSH's
 *      zh/en preference. (The plugin's own patch wraps `lookup`; the
 *      plugin's own keys fall back to en when an override is active —
 *      acceptable for MVP.)
 *   2. Construct the override store. Reads the persisted active override
 *      from localStorage on construction so a page refresh restores the
 *      user's last selection.
 *   3. Install the `LocaleRuntime.prototype.lookup` patch. The patch
 *      consults the store on every translate call; when an override
 *      exists AND DSH's active locale is `'en'` (the override borrows the
 *      English slot), it wins, otherwise the original `lookup` runs. The
 *      patch is wrapped in `ctx.effect` so HMR / fiber disposal restores
 *      the original method.
 *   4. Publish `ctx.betterLocale` (the store) as a cordis service so
 *      third-party plugins (e.g. better-sidebar) can register their own
 *      dictionaries for new languages. Consumers declare
 *      `inject = ['betterLocale']` (with `peerDependenciesMeta.optional:
 *      true`); when better-locale is absent, `ctx.betterLocale` is
 *      undefined and the registration code skips.
 *   5. Register the plugin's bundled ja dictionaries for DSH's `common`
 *      and `settings.locale` namespaces. Future versions add more
 *      namespaces (settings.general, settings.plugins, ...) and more
 *      languages (ko, fr, ...).
 *   6. Register the language override preference row into DSH's settings
 *      General section (`settings.general.item` slot). The row's store
 *      mirrors (active override, registered languages, DSH active locale,
 *      revision); the apply function wires two subscriptions — the
 *      better-locale store + DSH's locale service — to call `bound.sync`
 *      on every change so the row re-renders with the latest state.
 *
 * The plugin does NOT depend on better-sidebar. The settings row is the
 * user-facing switcher UI; better-sidebar (or any other third-party
 * plugin) can additionally consume `ctx.betterLocale` to register its own
 * ja dict so its own chrome follows the override, but that's a one-way
 * dependency (better-sidebar → better-locale), never the reverse.
 *
 * @module @huanlin/dsh-plugin-better-locale/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { BetterLocaleStore } from './store.ts';
import { type BetterLocaleKey } from './locales.ts';
/**
 * Merge the plugin's own namespace id into the LocaleNamespaceMap so
 * `ctx.locale.bind('dsh-plugin-better-locale')` returns a translate
 * function typed to {@link BetterLocaleKey}. The locale package's own
 * client half merges `common` and `settings.locale` here; this
 * augmentation adds the plugin's namespace to the same map.
 */
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        'dsh-plugin-better-locale': BetterLocaleKey;
    }
}
/** Declare module merge: expose `ctx.betterLocale` to consumers. */
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** The override store. `undefined` when the plugin is not loaded. */
        betterLocale: BetterLocaleStore;
    }
}
/** Required services: slots (to register the settings row) + locale (for the patch + ctx.locale). */
export declare const inject: string[];
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
