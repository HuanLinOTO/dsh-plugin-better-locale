/**
 * dsh-plugin-better-locale — host plugin entry.
 *
 * Client-only plugin: the host half has no runtime work. The browser half
 * (`./client`) monkey-patches `LocaleRuntime.prototype.lookup` so calls to
 * `ctx.locale`'s translate chain consult the plugin's override store before
 * falling back to DSH's native zh/en dictionaries. The dsh active locale
 * is never mutated — schema, LanguageRow, and `<html lang>` all keep their
 * original behaviour; only the rendered text is replaced when an override
 * translation exists.
 *
 * Persistence: the selected override id is stored in localStorage
 * (`dsh-plugin-better-locale:active`); the dsh `locale.preference` setting
 * is never written, sidestepping the LOCALE_IDS schema enum.
 *
 * @module @huanlin/dsh-plugin-better-locale
 */
export const name = 'dsh-plugin-better-locale';
export const inject = [];
/**
 * Host apply — no-op. The locale override layer is a pure client-side
 * contribution; no host-side resources are used.
 * @param _ctx - host context (unused).
 */
export function apply(_ctx) {
    // Client-only plugin: all work happens in src/client/index.tsx.
}
