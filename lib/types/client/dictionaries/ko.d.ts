/**
 * Korean translation of DSH's core UI namespaces.
 *
 * Mirrors the zh key set of each source dictionary in
 * `@deepseek-ai/dsh-client-*` (zh is the source of truth). The plugin
 * registers these dicts through `BetterLocaleStore.register` so the patched
 * `lookup` returns ko when the user has selected the ko override.
 *
 * @module @huanlin/dsh-plugin-better-locale/client/dictionaries
 */
/** ko dictionaries for all DSH namespaces, keyed by namespace id. */
export declare const dicts: Record<string, Record<string, string>>;
