/**
 * The plugin's bundled language catalog: one entry per third language,
 * carrying the catalog metadata (id / label / fallback) DSH's native
 * `locale.addLanguage` expects plus the per-namespace dictionaries fed to
 * `locale.register(ns, locale, dict)`.
 *
 * Adding a language = add one `dictionaries/<lang>.ts` file + one entry
 * here. Key sets across languages are intentionally not enforced at
 * compile time; missing keys resolve through DSH's per-key fallback chain
 * (declared fallback → en). `pnpm run gen:translations` + `TRANSLATION.md`
 * is the human-readable coverage report.
 *
 * @module @huanlin/dsh-plugin-better-locale/client/languages
 */
/** One bundled third language: catalog metadata plus its namespace dicts. */
export interface BundledLanguage {
    /** Stable BCP 47-style id, selectable in DSH's native Language row. */
    readonly id: string;
    /** Display name written in the represented language. */
    readonly label: string;
    /**
     * Per-key fallback locale: a DSH built-in. The Traditional Chinese
     * variants fall back to `zh` (missing keys show Simplified rather than
     * English); every other language falls back to `en`. Chains always
     * terminate at `en` as upstream requires.
     */
    readonly fallback: 'en' | 'zh';
    /** Dictionaries keyed by DSH namespace id (`common`, `settings.locale`, ...). */
    readonly dicts: Record<string, Record<string, string>>;
}
/**
 * All curated languages the plugin ships. Registration order is display
 * order in DSH's Language row (after the built-in zh/en entries).
 */
export declare const BUNDLED_LANGUAGES: readonly BundledLanguage[];
