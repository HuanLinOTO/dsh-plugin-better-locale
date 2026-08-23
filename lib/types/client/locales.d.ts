/**
 * Plugin's own i18n dictionaries. The plugin's UI (the better-sidebar
 * tab + its buttons) follows DSH's `ctx.locale` for zh/en — the user
 * navigating the language switcher sees the surrounding chrome in their
 * DSH language. The switcher itself has only a handful of copy keys;
 * they live in the `dsh-plugin-better-locale` namespace, registered
 * through `ctx.locale.register` so DSH's native translate chain
 * (which the plugin's own patch wraps) handles them.
 *
 * Note: when the user has selected an override (e.g. ja), the plugin's
 * own copy keys fall back to en (no ja dict for this namespace) —
 * acceptable for MVP since the switcher's job is to pick the override,
 * not to be itself translated. Future versions may add ja/ko dicts here.
 *
 * @module @huanlin/dsh-plugin-better-locale/client/locales
 */
/** All copy keys for the dsh-plugin-better-locale namespace. */
export type BetterLocaleKey = 'rowTitle' | 'heading' | 'description' | 'nativeOption' | 'nativeOptionDesc' | 'overrideActive' | 'switchToEnHint';
/** Locale namespace id (matches the cordis.patch.yml plugin id). */
export declare const NS = "dsh-plugin-better-locale";
/** English dictionary. */
export declare const en: Record<BetterLocaleKey, string>;
/** Chinese dictionary. */
export declare const zh: Record<BetterLocaleKey, string>;
