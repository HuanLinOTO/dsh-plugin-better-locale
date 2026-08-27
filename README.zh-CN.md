<p align="center">
  <a href="https://dshfind.com/zh/plugins/huanlinoto/dsh-plugin-better-locale"><img src="https://dshfind.com/api/card/huanlinoto/dsh-plugin-better-locale?lang=zh" alt="dsh-plugin-better-locale card"></a>
</p>

# dsh-plugin-better-locale

**中文** | [English](README.md)

DSH web 插件：为 DSH 原生 i18n 内置 19 种第三语言字典（日语 / 韩语 / 法语 / 德语 / ...）。通过 DSH v0.1.2-alpha.1 的原生第三方语言 API（`locale.addLanguage` + `locale.register(ns, locale, dict)`）注册，语言直接出现在 DSH 设置页原生 Language 行中；未覆盖文案按 key 级 fallback 链回退英文。

| | |
|---|---|
| **包名** | `@huanlin/dsh-plugin-better-locale` |
| **仓库** | `huanlinoto/dsh-plugin-better-locale` |
| **要求** | DSH `dsh-v0.1.2-alpha.1` 及以上 |
| **License** | AGPL-3.0 |

## 支持的语言

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

打开 **设置 → General → Language**：19 种语言与 DSH 内置的中文 / English 并列。点选任意语言，整个界面立即切换——选择持久化在 DSH 的 `locale.preference` 设置里（同一 DSH home 下跨浏览器 / 跨设备共享），`<html lang>` 同步更新。

未覆盖的命名空间 / key 通过 DSH 的 key 级 fallback 链回退英文（所选语言 → `en`）。翻译对照表见 `TRANSLATION.md`（`pnpm run gen:translations` 重新生成）。

## 覆盖范围

- **DSH 本体**：内置命名空间（`common` / `settings.locale` / `command` / 等——满配 29 个命名空间，部分语言为子集），见 `src/client/dictionaries/<lang>.ts`。
- **第三方插件**：任何插件都可以通过原生 API（`ctx.locale.register(ns, locale, dict)`）直接为这些语言补充自己的词典，无需任何 better-locale 专属接入。见[开发者指南](docs/developer-guide/README.zh-CN.md)。

## 从 0.1.x 迁移（v0.1.2-alpha.1 适配）

0.1.x 通过 monkey-patch `LocaleRuntime.prototype.lookup`、借用 DSH 英文槽位的方式注入第三语言（自定义设置行 + localStorage 持久化 + 仅英文时生效）。DSH v0.1.2-alpha.1 将这些全部原生化了，插件随之移除了该 hack：

- 自定义的「语言覆盖」设置行已移除——直接用 DSH 原生 Language 行；
- 持久化从浏览器 localStorage 改为 DSH 的 `locale.preference` 设置；
- 任意 DSH 语言下覆盖都生效（不再需要「先切到 English」）；
- `ctx.betterLocale` 服务已移除——插件词典直接通过 `ctx.locale` 注册。

## 已知限制

- **覆盖范围有限**：未覆盖的命名空间 / key 回退英文。见 `TRANSLATION.md`。
- **繁体中文变体回退英文**：`zh-HK` / `zh-TW` / `zh-MO` 声明的 fallback 是 `en`；改为回退 `zh` 可复用简体字典补缺（后续可做）。
- **仅 web 平台**：client bundle 为浏览器设计，不在 node 端运行。

## License

AGPL-3.0
