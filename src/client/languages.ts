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

import { dicts as jaDicts } from './dictionaries/ja.ts'
import { dicts as deDicts } from './dictionaries/de.ts'
import { dicts as frDicts } from './dictionaries/fr.ts'
import { dicts as ptDicts } from './dictionaries/pt.ts'
import { dicts as koDicts } from './dictionaries/ko.ts'
import { dicts as arDicts } from './dictionaries/ar.ts'
import { dicts as hiDicts } from './dictionaries/hi.ts'
import { dicts as idDicts } from './dictionaries/id.ts'
import { dicts as trDicts } from './dictionaries/tr.ts'
import { dicts as viDicts } from './dictionaries/vi.ts'
import { dicts as thDicts } from './dictionaries/th.ts'
import { dicts as ruDicts } from './dictionaries/ru.ts'
import { dicts as itDicts } from './dictionaries/it.ts'
import { dicts as nlDicts } from './dictionaries/nl.ts'
import { dicts as svDicts } from './dictionaries/sv.ts'
import { dicts as plDicts } from './dictionaries/pl.ts'
import { dicts as zhHKDicts } from './dictionaries/zh-HK.ts'
import { dicts as zhTWDicts } from './dictionaries/zh-TW.ts'
import { dicts as zhMODicts } from './dictionaries/zh-MO.ts'

/** One bundled third language: catalog metadata plus its namespace dicts. */
export interface BundledLanguage {
  /** Stable BCP 47-style id, selectable in DSH's native Language row. */
  readonly id: string
  /** Display name written in the represented language. */
  readonly label: string
  /** Per-key fallback locale; always a DSH built-in (`'en'`). */
  readonly fallback: 'en'
  /** Dictionaries keyed by DSH namespace id (`common`, `settings.locale`, ...). */
  readonly dicts: Record<string, Record<string, string>>
}

/**
 * All curated languages the plugin ships. Registration order is display
 * order in DSH's Language row (after the built-in zh/en entries).
 */
export const BUNDLED_LANGUAGES: readonly BundledLanguage[] = [
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
]
