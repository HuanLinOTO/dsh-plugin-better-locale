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
/**
 * All curated languages the plugin ships. Registration order is display
 * order in DSH's Language row (after the built-in zh/en entries).
 */
export const BUNDLED_LANGUAGES = [
    { id: 'ja', label: '日本語', fallback: 'en', dicts: jaDicts },
    { id: 'de', label: 'Deutsch', fallback: 'en', dicts: deDicts },
    { id: 'fr', label: 'Français', fallback: 'en', dicts: frDicts },
    { id: 'pt', label: 'Português', fallback: 'en', dicts: ptDicts },
    { id: 'ko', label: '한국어', fallback: 'en', dicts: koDicts },
    { id: 'ar', label: 'العربية', fallback: 'en', dicts: arDicts },
    { id: 'hi', label: 'हिन्दी', fallback: 'en', dicts: hiDicts },
    { id: 'id', label: 'Bahasa Indonesia', fallback: 'en', dicts: idDicts },
    { id: 'tr', label: 'Türkçe', fallback: 'en', dicts: trDicts },
    { id: 'vi', label: 'Tiếng Việt', fallback: 'en', dicts: viDicts },
    { id: 'th', label: 'ไทย', fallback: 'en', dicts: thDicts },
    { id: 'ru', label: 'Русский', fallback: 'en', dicts: ruDicts },
    { id: 'it', label: 'Italiano', fallback: 'en', dicts: itDicts },
    { id: 'nl', label: 'Nederlands', fallback: 'en', dicts: nlDicts },
    { id: 'sv', label: 'Svenska', fallback: 'en', dicts: svDicts },
    { id: 'pl', label: 'Polski', fallback: 'en', dicts: plDicts },
    { id: 'zh-HK', label: '繁體中文（香港）', fallback: 'en', dicts: zhHKDicts },
    { id: 'zh-TW', label: '繁體中文（台灣）', fallback: 'en', dicts: zhTWDicts },
    { id: 'zh-MO', label: '繁體中文（澳門）', fallback: 'en', dicts: zhMODicts },
];
