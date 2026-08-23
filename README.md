<p align="center">
  <a href="https://dshfind.com/zh/plugins/huanlinoto/dsh-plugin-better-locale"><img src="https://dshfind.com/api/card/huanlinoto/dsh-plugin-better-locale?lang=zh" alt="dsh-plugin-better-locale card"></a>
</p>

# dsh-plugin-better-locale

[中文](README.zh-CN.md) | **English**

A DSH web plugin that adds 19 third-language overrides (Japanese / Korean / French / German / ...) on top of DSH's native Chinese / English. Coverage spans DSH's own UI copy and all third-party plugins that have opted in.

| | |
|---|---|
| **Package** | `@huanlin/dsh-plugin-better-locale` |
| **Repo** | `huanlinoto/dsh-plugin-better-locale` |
| **License** | AGPL-3.0 |

## Supported languages

The override **borrows DSH's English slot** to render a third language — after switching, the UI shows the selected override language; uncovered parts fall back to English.

| Language | id | Label |
|---|---|---|
| Japanese | `ja` | 日本語 |
| Korean | `ko` | 한국어 |
| French | `fr` | Français |
| German | `de` | Deutsch |
| Portuguese | `pt` | Português |
| Arabic | `ar` | العربية |
| Hindi | `hi` | हिन्दी |
| Indonesian | `id` | Bahasa Indonesia |
| Turkish | `tr` | Türkçe |
| Vietnamese | `vi` | Tiếng Việt |
| Thai | `th` | ไทย |
| Russian | `ru` | Русский |
| Italian | `it` | Italiano |
| Dutch | `nl` | Nederlands |
| Swedish | `sv` | Svenska |
| Polish | `pl` | Polski |
| Traditional Chinese (HK) | `zh-HK` | 繁體中文（香港） |
| Traditional Chinese (TW) | `zh-TW` | 繁體中文（台灣） |
| Traditional Chinese (MO) | `zh-MO` | 繁體中文（澳門） |

## Install

```sh
# npm registry
dsh plugin --profile web add "@huanlin/dsh-plugin-better-locale"

# or github ref
dsh plugin --profile web add "github:huanlinoto/dsh-plugin-better-locale"
```

After install, restart `dsh web` and hard-refresh the browser (`Ctrl+Shift+R`).

## Usage

1. **Switch DSH to English first** (Settings → Language → English).

   The override borrows DSH's English slot — it is inert while DSH is on Chinese. The switcher shows a "switch DSH to English to view [language]" hint in that case.

2. **Pick an override language in Settings → General section.**

   better-locale registers a language picker row in DSH's settings General section (right after the native Language row). Open the dropdown and pick a target language — the UI switches immediately.

3. **Switch back to native:** pick "Use DSH native (zh/en)" in the same row.

The selection persists to browser localStorage and survives page refresh.

## Coverage

- **DSH itself:** built-in namespaces (`common` / `settings.locale` / `command` / ...) — see `src/client/dictionaries/<lang>.ts`.
- **Third-party plugins:** plugins that have opted into better-locale (e.g. dsh-better-sidebar, yet-another-subagent, dsh-aigc-canvas, and the rest of the huanlinoto series) follow the override; non-opted-in plugins fall back to English.

Want your plugin to follow the override too? See the [Developer Guide](docs/developer-guide/README.md).

## Known limitations

- **Must switch to English:** the override only takes effect when DSH's active locale is `en`. While DSH is on Chinese the override is fully inert (native Chinese preserved, no mixed languages).
- **Coverage is partial:** uncovered namespaces / keys fall back to English. See `TRANSLATION.md` for the coverage table (regenerate with `pnpm run gen:translations`).
- **Persistence uses localStorage:** the selected override id is stored in browser localStorage, not in DSH's `locale.preference` (we bypass the native schema enum). Not shared across browsers / profiles.
- **Web only:** the client bundle targets the browser; it does not run in Node.

## License

AGPL-3.0
