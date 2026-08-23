<p align="center">
  <a href="https://dshfind.com/zh/plugins/huanlinoto/dsh-plugin-better-locale"><img src="https://dshfind.com/api/card/huanlinoto/dsh-plugin-better-locale?lang=zh" alt="dsh-plugin-better-locale card"></a>
</p>

# dsh-plugin-better-locale

**中文** | [English](README.md)

DSH web 插件：在 DSH 原生中文 / 英文之外，为界面增加 19 种第三语言覆盖（日语 / 韩语 / 法语 / 德语 / ...）。覆盖范围包括 DSH 本体界面文案与所有已接入的第三方插件文案。

| | |
|---|---|
| **包名** | `@huanlin/dsh-plugin-better-locale` |
| **仓库** | `huanlinoto/dsh-plugin-better-locale` |
| **License** | AGPL-3.0 |

## 支持的语言

覆盖**借用 DSH 的英文槽位**渲染第三语言——切换后界面显示选定的覆盖语言，未覆盖的部分回退到英文。

| 语言 | id | 显示名 |
|---|---|---|
| 日语 | `ja` | 日本語 |
| 韩语 | `ko` | 한국어 |
| 法语 | `fr` | Français |
| 德语 | `de` | Deutsch |
| 葡萄牙语 | `pt` | Português |
| 阿拉伯语 | `ar` | العربية |
| 印地语 | `hi` | हिन्दी |
| 印尼语 | `id` | Bahasa Indonesia |
| 土耳其语 | `tr` | Türkçe |
| 越南语 | `vi` | Tiếng Việt |
| 泰语 | `th` | ไทย |
| 俄语 | `ru` | Русский |
| 意大利语 | `it` | Italiano |
| 荷兰语 | `nl` | Nederlands |
| 瑞典语 | `sv` | Svenska |
| 波兰语 | `pl` | Polski |
| 繁体中文（香港） | `zh-HK` | 繁體中文（香港） |
| 繁体中文（台湾） | `zh-TW` | 繁體中文（台灣） |
| 繁体中文（澳门） | `zh-MO` | 繁體中文（澳門） |

## 安装

```sh
# npm registry
dsh plugin --profile web add "@huanlin/dsh-plugin-better-locale"

# 或 github 引用
dsh plugin --profile web add "github:huanlinoto/dsh-plugin-better-locale"
```

安装后重启 `dsh web`，浏览器硬刷新（`Ctrl+Shift+R`）。

## 使用

1. **先把 DSH 切到 English**（设置 → 语言 → English）。

   覆盖借用 DSH 的英文槽位——DSH 在中文时覆盖不生效，切换器会显示「请将 DSH 切换到英文以查看 [语言名]」提示。

2. **在设置 → General 区块选择覆盖语言**。

   better-locale 在 DSH 设置页的 General 分区注册了一行语言选择器（在原生 Language 行之后）。点开下拉选择目标语言，界面立即切换。

3. **切回原生**：在同一行选择「使用 DSH 原生（zh/en）」。

选择会持久化到浏览器 localStorage，刷新页面后自动恢复。

## 覆盖范围

- **DSH 本体**：`common` / `settings.locale` / `command` / 等内置命名空间（见 `src/client/dictionaries/<lang>.ts`）。
- **第三方插件**：已接入 better-locale 的插件（如 dsh-better-sidebar、yet-another-subagent、dsh-aigc-canvas 等 huanlinoto 系列插件）会跟随覆盖；未接入的插件回退英文。

想让你的插件也跟随覆盖？看[开发者指南](docs/developer-guide/README.zh-CN.md)。

## 已知限制

- **必须切到 English**：覆盖只在 DSH active locale 为 `en` 时生效。DSH 在中文时覆盖完全惰性（保持原生中文，界面不混语言）。
- **覆盖范围有限**：未覆盖的命名空间 / key 回退到英文。翻译对照表见 `TRANSLATION.md`（`pnpm run gen:translations` 重新生成）。
- **持久化用 localStorage**：选中的覆盖语言存在浏览器 localStorage，不写 DSH 的 `locale.preference`（绕开原生 schema 枚举）。跨浏览器 / 跨 profile 不共享。
- **仅 web 平台**：client bundle 为浏览器设计，不在 node 端运行。

## License

AGPL-3.0
