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
import { BetterLocaleStore, loadActiveFromStorage } from "./store.js";
import { bumpRevision, installPatch, probeLocaleRuntime } from "./patch.js";
import { LanguageRow } from "./LanguageRow.js";
import { createLanguageRowStore } from "./settings-store.js";
import { NS, en, zh } from "./locales.js";
import { dicts as jaDicts } from "./dictionaries/ja.js";
import { dicts as deDicts } from "./dictionaries/de.js";
import { dicts as frDicts } from "./dictionaries/fr.js";
import { dicts as ptDicts } from "./dictionaries/pt.js";
import { dicts as koDicts } from "./dictionaries/ko.js";
import { dicts as arDicts } from "./dictionaries/ar.js";
import { dicts as hiDicts } from "./dictionaries/hi.js";
import { dicts as idDicts } from "./dictionaries/id.js";
import { dicts as trDicts } from "./dictionaries/tr.js";
import { dicts as viDicts } from "./dictionaries/vi.js";
import { dicts as thDicts } from "./dictionaries/th.js";
import { dicts as ruDicts } from "./dictionaries/ru.js";
import { dicts as itDicts } from "./dictionaries/it.js";
import { dicts as nlDicts } from "./dictionaries/nl.js";
import { dicts as svDicts } from "./dictionaries/sv.js";
import { dicts as plDicts } from "./dictionaries/pl.js";
import { dicts as zhHKDicts } from "./dictionaries/zh-HK.js";
import { dicts as zhTWDicts } from "./dictionaries/zh-TW.js";
import { dicts as zhMODicts } from "./dictionaries/zh-MO.js";
/** Required services: slots (to register the settings row) + locale (for the patch + ctx.locale). */
export const inject = ['slots', 'locale'];
/**
 * All curated languages the plugin ships dictionaries for. Each entry
 * makes the language selectable in the settings row's dropdown.
 */
const BUILTIN_LANGUAGES = [
    { id: 'ja', label: '日本語' },
    { id: 'de', label: 'Deutsch' },
    { id: 'fr', label: 'Français' },
    { id: 'pt', label: 'Português' },
    { id: 'ko', label: '한국어' },
    { id: 'ar', label: 'العربية' },
    { id: 'hi', label: 'हिन्दी' },
    { id: 'id', label: 'Bahasa Indonesia' },
    { id: 'tr', label: 'Türkçe' },
    { id: 'vi', label: 'Tiếng Việt' },
    { id: 'th', label: 'ไทย' },
    { id: 'ru', label: 'Русский' },
    { id: 'it', label: 'Italiano' },
    { id: 'nl', label: 'Nederlands' },
    { id: 'sv', label: 'Svenska' },
    { id: 'pl', label: 'Polski' },
    { id: 'zh-HK', label: '繁體中文（香港）' },
    { id: 'zh-TW', label: '繁體中文（台灣）' },
    { id: 'zh-MO', label: '繁體中文（澳門）' },
];
/**
 * All language dicts, keyed by language id. Each value is a map of
 * namespace → dict. The apply function iterates this to register every
 * (ns, lang) pair into the override store.
 */
const ALL_LANG_DICTS = {
    ja: jaDicts, de: deDicts, fr: frDicts, pt: ptDicts, ko: koDicts,
    ar: arDicts, hi: hiDicts, id: idDicts, tr: trDicts, vi: viDicts,
    th: thDicts, ru: ruDicts, it: itDicts, nl: nlDicts, sv: svDicts,
    pl: plDicts,
    'zh-HK': zhHKDicts, 'zh-TW': zhTWDicts, 'zh-MO': zhMODicts,
};
/**
 * All DSH namespaces covered by the language dicts. Built once from the
 * union of all language files' namespace keys.
 */
const ALL_NAMESPACES = (() => {
    const set = new Set();
    for (const dicts of Object.values(ALL_LANG_DICTS)) {
        for (const ns of Object.keys(dicts))
            set.add(ns);
    }
    return [...set];
})();
/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    // 1. Plugin's own copy namespace — registered with DSH's locale
    //    service (NOT the override store) so it follows DSH's zh/en.
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-plugin-better-locale: own copy namespace');
    // 2. Construct the store. Read the persisted active override from
    //    localStorage so a page refresh restores the user's last
    //    selection. localStorage errors are swallowed inside the helper.
    const store = new BetterLocaleStore({ active: loadActiveFromStorage() });
    // 3. Install the lookup patch. Probe first so an upstream
    //    LocaleRuntime refactor downgrades to a no-op (console error)
    //    rather than crashing the apply path.
    if (!probeLocaleRuntime()) {
        console.error('[better-locale] LocaleRuntime shape probe failed at apply time; '
            + 'patch will be inert. See dsh-plugin-better-locale/client/patch.ts.');
    }
    ctx.effect(() => installPatch(store), 'dsh-plugin-better-locale: LocaleRuntime.lookup patch');
    // 4. Publish the store as ctx.betterLocale so third-party plugins can
    //    register their own dicts / languages. Done after the patch is
    //    installed so a consumer's `register` call (which notifies
    //    subscribers → bumps revision) hits the patched lookup.
    ctx.provide('betterLocale', store);
    // 5. Register curated languages + bundled dicts. Languages first so
    //    the settings row (when it mounts) sees the selectable list;
    //    dicts second so the patched lookup can return overrides.
    for (const lang of BUILTIN_LANGUAGES) {
        ctx.effect(() => store.registerLanguage(lang), `dsh-plugin-better-locale: language ${lang.id}`);
    }
    // Register all (namespace, language) pairs. For each namespace, collect
    // all language dicts that have that namespace and register them in one
    // call (the store accepts Record<locale, dict> per namespace).
    for (const ns of ALL_NAMESPACES) {
        const langsForNs = {};
        for (const [lang, dicts] of Object.entries(ALL_LANG_DICTS)) {
            if (dicts[ns] !== undefined) {
                langsForNs[lang] = dicts[ns];
            }
        }
        ctx.effect(() => store.register(ns, langsForNs), `dsh-plugin-better-locale: dicts for ns ${ns}`);
    }
    // 6. Subscribe to the better-locale store: on any change (active switch,
    //    language registration, dict registration), bump the LocaleRuntime
    //    revision so outlets re-render (and `locale/change` fires so consumers
    //    like better-sidebar's attachLocale respond). Wrapped in ctx.effect
    //    so the subscription is released on fiber disposal.
    ctx.effect(() => store.subscribe(() => {
        bumpRevision(ctx.locale);
    }), 'dsh-plugin-better-locale: store → revision bump bridge');
    // If the store loaded with a persisted active override, bump once
    // now so already-mounted outlets consult the patched lookup on
    // their next render. (The patch is installed; the subscribe bridge
    // above handles future changes.)
    if (store.active !== undefined) {
        bumpRevision(ctx.locale);
    }
    // 7. Register the language override row into DSH's settings General
    //    section. The row's store mirrors (active, options, dshActive,
    //    revision); the apply function wires two subscriptions to keep it
    //    in sync: the better-locale store (override changes / language
    //    registrations) and DSH's locale service (active locale switches).
    //    Both subscriptions call `bound.sync(...)` with a fresh snapshot.
    const rowStore = createLanguageRowStore();
    let bound;
    let revision = 0;
    const sync = () => {
        if (bound === undefined)
            return;
        revision += 1;
        bound.sync(store.active, store.languages.map(l => ({ id: l.id, label: l.label })), ctx.locale.getLocale().active, revision);
    };
    // better-locale store changes (active switch, language/dict registration).
    ctx.effect(() => store.subscribe(sync), 'dsh-plugin-better-locale: row store mirror (better-locale)');
    // DSH locale changes (active switch — the row needs to know whether the
    // override is effective: only when dshActive === 'en').
    ctx.effect(() => ctx.locale.subscribe(sync), 'dsh-plugin-better-locale: row store mirror (dsh locale)');
    const injected = (actions) => {
        bound = actions;
        // Re-sync from the getters so no event is lost between registration
        // and first render.
        sync();
        return {
            setActive: (id) => { store.setActive(id); },
        };
    };
    ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'better-locale',
        order: 10, // after the locale package's own Language row (order 0)
        store: rowStore,
        locale: NS,
        inject: injected,
    }, LanguageRow));
}
