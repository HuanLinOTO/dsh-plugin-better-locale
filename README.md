<p align="center">
  <a href="https://dshfind.com/zh/plugins/huanlinoto/dsh-plugin-better-locale"><img src="https://dshfind.com/api/card/huanlinoto/dsh-plugin-better-locale?lang=zh" alt="dsh-plugin-better-locale card"></a>
</p>

# dsh-plugin-better-locale

DSH web 插件：通过运行时 monkey-patch `LocaleRuntime.prototype.lookup` 注入第三语言（ja / ko / ...）覆盖，保持 dsh active locale 不变；通过 better-sidebar 的 tab 暴露切换 UI。

| | |
|---|---|
| **包名** | `@huanlin/dsh-plugin-better-locale` |
| **仓库** | `huanlinoto/dsh-plugin-better-locale` |
| **形态** | bundle（client-only，host `apply` 为空） |
| **lib 策略** | 预构建入库（含 `@deepseek-ai/dsh-client-*` private peer） |
| **License** | AGPL-3.0 |

## 设计动机

DSH 本体（`@deepseek-ai/dsh-client-locale`）只内置 zh/en 两种语言：

- `LOCALE_IDS = ['zh', 'en'] as const`
- `LocaleSettingsSchema.preference = z.union([...LOCALE_IDS])` 拒绝其他语言
- `installLocale()` boot-once 抛错，renderer 直接捕获 LocaleFace 实例
- `ctx.provide('locale', x)` 二次注册抛错

DSH 未提供新增语言的官方扩展点。本插件通过运行时 monkey-patch `LocaleRuntime.prototype.lookup` 实现「保持 active='en'，覆盖 en 词典内容」的方式接入第三语言（ja/ko/fr 等），让所有依赖 `ctx.locale` 的插件无感切换。

完整设计文档：[`docs/plans/2026-08-23-better-locale-design.md`](docs/plans/2026-08-23-better-locale-design.md)。

## 核心机制

```
用户在 better-locale tab 选「日语」
  ↓
betterLocaleStore.setActive('ja')               // plugin 自管，写入 localStorage
  ↓
(ctx.locale as any).publish(active, true)        // active 不变（'zh' 或 'en'），
  ↓                                              // bump revision + 触发 locale/change
renderer 收到 revision 变化，重渲染所有 outlet
  ↓
translate(ns, key) → patched lookup
  ↓
betterLocaleStore.getOverride(active, ns, key)
  ├─ active='en' + 选了 ja + ja 词典有该 key → 返回 ja 文本
  └─ 否则 → origLookup.call(this, ns, key)       // 走 dsh 原生回退
```

关键点：**active locale 保持 dsh 原值**（zh 或 en），better-locale 只在 lookup 层注入覆盖文本。这样：

- Host schema 不需要改（active 仍是合法值）。
- LanguageRow 仍按原 LOCALES 列表渲染。
- `locale/change` 事件正常触发（用 `publish(active, true)`），所有监听者（含 better-sidebar 的 `attachLocale`）正确响应。

## 服务契约

### `ctx.betterLocale`

```ts
interface BetterLocaleStore {
  readonly active: string | undefined
  readonly languages: readonly LocaleDefinition[]
  setActive(localeId: string | undefined): void
  subscribe(listener: () => void): () => void
  registerLanguage(def: LocaleDefinition): () => void
  register(ns: string, dicts: Record<string, LocaleDict>): () => void
  getOverride(dshActive: string, ns: string, key: string): string | undefined
}
```

### 第三方插件协作

```ts
// 第三方插件的 client half
export const inject = ['betterLocale']  // peerDependenciesMeta.optional: true

export function apply(ctx: Context) {
  ctx.effect(() =>
    ctx.betterLocale.registerLanguage({ id: 'ko', label: '한국어' })
  )
  ctx.effect(() =>
    ctx.betterLocale.register('myPlugin', {
      ko: { hello: '안녕하세요' },
    })
  )
}
```

未安装 better-locale 时 `ctx.betterLocale` 为 undefined，注册代码跳过——同 better-sidebar 的 `ctx.betterSidebar` 模式。

## 开发

```sh
pnpm install              # 安装依赖（含 DSH private peer via devDeps link）
pnpm run typecheck        # tsc --noEmit（解析 DSH src 通过 ../dsh paths）
pnpm test                 # vitest run（pure-function unit tests）
pnpm run build            # tsdown + tsc → lib/index.js, lib/invariant.js, lib/client.js
pnpm run bundle:client    # tsdown only（skip tsc；快速 client 重建）
```

### 仓库骨架

```
src/
├── index.ts                          # host entry（empty apply）
├── invariant.ts                      # invariant companion
└── client/
    ├── index.tsx                     # client entry: patch + register tab + provide service
    ├── store.ts                      # BetterLocaleStore（框架无关）
    ├── patch.ts                      # LocaleRuntime patch + bumpRevision helper
    ├── LanguageSwitcher.tsx          # better-sidebar tab 组件
    ├── locales.ts                    # 插件自己的 zh/en 词典
    ├── icons.tsx                     # inline SVG 图标
    └── dictionaries/
        ├── dsh-common-ja.ts          # DSH common ns 的 ja 翻译
        └── dsh-settings-locale-ja.ts # DSH settings.locale ns 的 ja 翻译
tests/
├── store.spec.ts                     # BetterLocaleStore 单元测试
└── patch.spec.ts                     # LocaleRuntime patch 单元测试
```

## 运行

### 安装到 profile

```sh
# 方式 A — link: 本地引用（开发热更新）
dsh plugin --profile web add "link:D:/Projects/deepseek-harness/dsh-plugin-better-locale"

# 方式 B — github: 远端引用（分发）
dsh plugin --profile web add "github:huanlinoto/dsh-plugin-better-locale"
```

改源码后重建 `lib/` 即可见（link: 引用），无需重装。

### 验证

1. 重启 `dsh web` 进程
2. 浏览器硬刷新（`Ctrl+Shift+R`）
3. 打开 better-sidebar 的 + 菜单，应看到「语言」tab（globe 图标）
4. 点开 tab，应看到「使用 DSH 原生（zh/en）」+「日本語」两个选项
5. 点「日本語」→ DSH 界面中 `common` 命名空间的文案（OK / 取消 / 关闭 / 复制 / ...）切换为日语
6. 点「使用 DSH 原生」→ 回到 dsh 原生 zh/en 行为
7. 刷新页面 → 选择持久化（localStorage）

## 检查

```sh
pnpm run typecheck    # 类型门禁
pnpm test             # 单元测试
pnpm run build        # 构建 lib/
```

合规自检（见 `plugin-development-guide.md` §10）：

- [x] 零源码 patch：未修改 DSH checkout 任何文件
- [x] B1: `package.json` 声明 `dsh.bundle.patch`
- [x] B2: 插件自带 `cordis.patch.yml`（insert 行 id/name 齐全）
- [x] B3: patch 行 `name` 用包名
- [x] F1: `files` 含 `lib/` + `cordis.patch.yml`
- [x] F2: `peerDependencies` 含 cordis + 用到的 `@deepseek-ai/*`
- [x] F3: typecheck/test/build script 齐全
- [x] A6: 不导出 default
- [x] G: 测试分层（Unit）
- [x] README（中文，含开发/运行/检查三节）

## 已知限制

- **覆盖范围有限**：MVP 只覆盖 DSH `common` + `settings.locale` 命名空间的 ja 翻译。其他命名空间（settings.general / settings.plugins / 各 ui-* 包自有的 ns）未覆盖时 fallback 到原 en，用户看到混合语言是已知 limitation。后续按需扩展。
- **better-sidebar 自有文案不翻译**：better-sidebar 的 `t()` 不走 `ctx.locale`（它有自己的 `attachLocale` + 内部 zh/en 词典），所以即使选了 ja 覆盖，better-sidebar 的 chrome 仍是 zh/en。需要 better-sidebar 自己接入 ja 词典才能翻译。
- **持久化用 localStorage**：选中的覆盖 id 存在 localStorage（`dsh-plugin-better-locale:active`），不写 dsh 的 `locale.preference`（绕开 schema 枚举）。跨浏览器/跨 profile 不共享。
- **`publish` 是 private**：用 `(ctx.locale as any)` 绕过 TS 类型检查。封装在 `bumpRevision(ctx)` 助手函数集中处理。dsh 若改用 ES `#private` 真私有字段会破坏 patch（启动时探测 + 降级）。
- **仅 web 平台**：client bundle 为 browser 设计，不在 node 端运行。

## License

AGPL-3.0
