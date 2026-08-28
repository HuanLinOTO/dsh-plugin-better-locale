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
/** Every bundled language's dictionary with its precise literal type. */
const ALL = {
    ja: jaDicts, de: deDicts, fr: frDicts, pt: ptDicts, ko: koDicts, ar: arDicts,
    hi: hiDicts, id: idDicts, tr: trDicts, vi: viDicts, th: thDicts, ru: ruDicts,
    it: itDicts, nl: nlDicts, sv: svDicts, pl: plDicts,
    'zh-HK': zhHKDicts, 'zh-TW': zhTWDicts, 'zh-MO': zhMODicts,
};
/**
 * Green (`true`) while the bundled dictionaries track the built-in table
 * exactly. Red expands the offending namespace/key literals in the error.
 */
export const assertUpstreamCoverage = true;
