/**
 * Korean translation of DSH's core UI namespaces.
 *
 * Mirrors the zh key set of each source dictionary in
 * `@deepseek-ai/dsh-client-*` (zh is the source of truth). The plugin
 * registers these dicts through `ctx.locale.register(ns, 'ko', dict)` so
 * DSH's fallback chain returns ko when `ko` is the active locale.
 *
 * @module @huanlin/dsh-plugin-better-locale/client/dictionaries
 */
/** ko dictionaries for all DSH namespaces, keyed by namespace id. */
export declare const dicts: Record<string, Record<string, string>>;
