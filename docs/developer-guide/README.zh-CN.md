# better-locale 开发者指南

**中文** | [English](README.md)

面向**第三方插件作者**：如何让你的插件跟随 better-locale 的第三语言覆盖，以及如何向 better-locale 注册你自己的翻译。

## 目录

- [概览](#概览)
- [服务契约](#服务契约)
- [接入：让你的插件跟随覆盖](#接入让你的插件跟随覆盖)
- [Activation order（激活顺序）](#activation-order激活顺序)
- [完整示例](#完整示例)
- [注册新的可选语言](#注册新的可选语言)
- [为 better-locale 本体添加翻译](#为-better-locale-本体添加翻译)
- [测试你的接入](#测试你的接入)

---

## 概览

`@huanlin/dsh-plugin-better-locale` 在 client apply 时 monkey-patch 了 `LocaleRuntime.prototype.lookup`，并在 cordis 上发布 `ctx.betterLocale`（override store）作为可选服务。

工作链路：

```
用户在设置页选「日语」
  → store.setActive('ja')
  → bumpRevision(ctx.locale)  // 触发全树重渲染
  → 重渲染时 t(key) 调用 patched lookup
  → store.getOverride(dshActive, ns, key)
      ├─ dshActive === 'en' + 选了 ja + ja 词典有该 key → 返回 ja 文本
      └─ 否则 → 走 DSH 原生 zh/en 回退
```

**关键约束**：覆盖只在 DSH active locale 为 `'en'` 时生效（覆盖借用 DSH 的英文槽位）。DSH 在中文时覆盖完全惰性。

你的插件如果要跟随覆盖，需要做两件事：
1. 把你的插件词典（zh/en）照常注册到 `ctx.locale`（DSH 原生 i18n）。
2. 把你的插件的**覆盖词典**（ja/ko/fr/...）注册到 `ctx.betterLocale`（本插件）。

---

## 服务契约

`ctx.betterLocale` 是一个 `BetterLocaleStore` 实例（结构类型，你的插件不需要 value-import 本插件）：

```ts
interface BetterLocaleStore {
  /** 当前选中的覆盖语言 id；undefined 表示无覆盖（用 DSH 原生 zh/en）。 */
  readonly active: string | undefined
  /** 已注册的可选语言列表（注册顺序）。 */
  readonly languages: readonly { id: string; label: string }[]

  /** 切换覆盖语言；undefined 清除覆盖。 */
  setActive(localeId: string | undefined): void

  /** 订阅 store 变化（覆盖切换 / 语言注册 / 词典注册）。 */
  subscribe(listener: () => void): () => void

  /** 注册一个可选语言（出现在设置页下拉）。 */
  registerLanguage(def: { id: string; label: string }): () => void

  /**
   * 注册一个命名空间的多语言词典。
   * @param ns - 命名空间（与 ctx.locale.register 的 ns 一致）
   * @param dicts - { localeId: { key: text } }
   * @returns disposer（移除本次注册的所有 locale）
   */
  register(ns: string, dicts: Record<string, Record<string, string>>): () => void

  /** 读取覆盖文本（patched lookup 内部调用；一般不直接用）。 */
  getOverride(dshActive: string, ns: string, key: string): string | undefined

  /** 覆盖是否实际生效（active 有值且 dshActive === 'en'）。 */
  isOverrideActive(dshActive: string): boolean
}
```

未安装 better-locale 时 `ctx.get('betterLocale')` 返回 `undefined`——你的注册代码应该跳过，插件照常工作（zh/en 行为不变）。

---

## 接入：让你的插件跟随覆盖

### 1. 声明 optional peer

`package.json`：

```jsonc
{
  "peerDependencies": {
    "cordis": "^4.0.0-rc.8",
    "@huanlin/dsh-plugin-better-locale": "workspace:*"
    // ... 其他 peer（react、@deepseek-ai/* 等）
  },
  "peerDependenciesMeta": {
    "@huanlin/dsh-plugin-better-locale": { "optional": true }
  }
}
```

`optional: true` 让你的插件在 better-locale 未安装时也能加载。

### 2. 准备覆盖词典

在你的插件的 client 源码里建一个 `dictionaries.ts`，为每种语言导出一份词典（key 集与你的 zh/en 词典一致）：

```ts
// src/client/dictionaries.ts
export const dicts: Record<string, Record<string, string>> = {
  ja: {
    'tab.title': 'サブエージェント',
    'settings.title': 'サブエージェント設定',
    // ... 你的所有 key
  },
  ko: {
    'tab.title': '서브에이전트',
    'settings.title': '서브에이전트 설정',
  },
  // ... 其他语言
}
```

### 3. 注册（activation-order-safe 模式）

在你的 client `apply(ctx)` 里：

```ts
import { dicts } from './dictionaries.ts'
import { en, NS, zh } from './locales.ts'

export const inject = ['slots', 'locale']  // 不要把 'betterLocale' 加进 inject

export function apply(ctx: ClientContext): void {
  // 先注册 zh/en 到 DSH 原生 i18n（照常）
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'my-plugin: dictionaries')

  // 注册覆盖词典到 better-locale（activation-order-safe）
  ctx.effect(() => {
    let dispose: (() => void) | undefined
    const sync = (): void => {
      dispose?.()
      dispose = undefined
      const store = ctx.get('betterLocale') as
        | { register(ns: string, dicts: Record<string, Record<string, string>>): () => void }
        | undefined
      if (store !== undefined) {
        dispose = store.register(NS, dicts)
      }
    }
    sync()
    const unsubscribe = ctx.locale.subscribe(sync)
    return () => {
      unsubscribe()
      dispose?.()
    }
  }, 'my-plugin: better-locale override dicts')
}
```

完成。用户在 better-locale 设置页选了覆盖语言（且 DSH 在 English）后，你的插件的 `t(key)` 调用会自动返回覆盖语言文本。

---

## Activation order（激活顺序）

**这是接入时最容易踩的坑，务必用上面的 activation-order-safe 模式。**

问题：better-locale 通过 `ctx.provide('betterLocale', store)` 发布服务，发生在它的 `apply()` 执行时。但 cordis 的 `inject` 数组只序列化**已声明**的服务依赖——better-locale 是 **optional peer**，不在你的 `inject` 里，所以 cordis **不保证** better-locale 在你的插件之前激活。

如果你的插件在 better-locale 之前激活，`ctx.get('betterLocale')` 在你的 `apply()` 时返回 `undefined`——naive 的「读一次」模式会跳过注册，覆盖永远不生效：

```ts
// ❌ 错误：naive 一次性读取
const betterLocale = ctx.get('betterLocale')
if (betterLocale) {
  ctx.effect(() => betterLocale.register(NS, dicts), '...')
}
// 如果 better-locale 还没激活，这段什么都不做，且永远不会重试。
```

正确做法：订阅 `ctx.locale`，在每次 revision bump 时重新检查 `ctx.get('betterLocale')`。better-locale 在以下时机会 bump revision：

- **激活时**（如果 localStorage 有持久化的覆盖选择）→ 已挂载的 outlet 重新渲染，你的 `sync` 此时能拿到 store。
- **用户切换覆盖语言时**。
- **第三方插件注册新词典 / 新语言时**。

所以 `ctx.locale.subscribe(sync)` 保证了：无论激活顺序如何，better-locale 一旦就绪，你的 `sync` 会在下一次 revision bump 时拿到 store 并注册词典。

> **为什么不把 `'betterLocale'` 加进 `inject`？** 那会让你的插件在 better-locale 未安装时**无法加载**（cordis 会一直 PENDING）。optional peer 必须用 `ctx.get` + 运行时检查，不能用 `inject` 声明。

---

## 完整示例

一个最小插件的 client half，支持日语覆盖：

```tsx
// src/client/index.tsx
import { createElement } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { dicts } from './dictionaries.ts'
import { en, NS, zh, type MyPluginKey } from './locales.ts'

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  // 1. 注册 zh/en 到 DSH 原生 i18n
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'my-plugin: dictionaries')

  // 2. 注册覆盖词典到 better-locale（activation-order-safe）
  ctx.effect(() => {
    let dispose: (() => void) | undefined
    const sync = (): void => {
      dispose?.()
      dispose = undefined
      const store = ctx.get('betterLocale') as
        | { register(ns: string, dicts: Record<string, Record<string, string>>): () => void }
        | undefined
      if (store !== undefined) {
        dispose = store.register(NS, dicts)
      }
    }
    sync()
    const unsubscribe = ctx.locale.subscribe(sync)
    return () => {
      unsubscribe()
      dispose?.()
    }
  }, 'my-plugin: better-locale override dicts')

  // 3. 你的正常 slot 注册...
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'my-plugin',
    locale: NS,
    inject: () => ({}),
  }, MyPluginSection))
}
```

```ts
// src/client/locales.ts
export const NS = 'my-plugin'
export const zh = { 'tab.title': '我的插件', 'settings.title': '我的插件设置' }
export const en = { 'tab.title': 'My Plugin', 'settings.title': 'My Plugin Settings' }
export type MyPluginKey = keyof typeof en
```

```ts
// src/client/dictionaries.ts
export const dicts: Record<string, Record<string, string>> = {
  ja: { 'tab.title': 'マイプラグイン', 'settings.title': 'マイプラグイン設定' },
  ko: { 'tab.title': '내 플러그인', 'settings.title': '내 플러그인 설정' },
  // ... 其他语言（key 集必须与 en 一致）
}
```

---

## 注册新的可选语言

better-locale 内置 19 种语言。如果你的插件想增加一种 better-locale 不内置的语言（如 `eo` 世界语）：

```ts
ctx.effect(() => {
  const store = ctx.get('betterLocale')
  if (store === undefined) return
  // 注册可选语言（出现在设置页下拉）
  const disposeLang = store.registerLanguage({ id: 'eo', label: 'Esperanto' })
  // 注册你的命名空间的 eo 词典
  const disposeDict = store.register(NS, { eo: { 'tab.title': 'Mia kromaĵo' } })
  return () => { disposeLang(); disposeDict() }
}, 'my-plugin: eo language')
```

注意：这只让你的插件的 `NS` 有 eo 翻译。DSH 本体和其他插件在 eo 下会回退到英文——除非它们也注册了 eo 词典。better-locale 本身不阻止你注册任意语言 id。

---

## 为 better-locale 本体添加翻译

如果你想为 better-locale 内置的 DSH 命名空间（`common` / `settings.locale` / `command` / ...）补充某种语言的翻译，或新增一种内置语言：

1. **新增语言文件**：`src/client/dictionaries/<lang>.ts`，导出 `dicts: Record<string, Record<string, string>>`，覆盖 DSH 内置命名空间。参考 `ja.ts` 的结构。
2. **注册到 `BUILTIN_LANGUAGES` 和 `ALL_LANG_DICTS`**：在 `src/client/index.tsx` 里加两行：
   ```ts
   import { dicts as eoDicts } from './dictionaries/eo.ts'
   // ...
   const BUILTIN_LANGUAGES = [
     // ...
     { id: 'eo', label: 'Esperanto' },
   ] as const
   const ALL_LANG_DICTS = {
     // ...
     eo: eoDicts,
   }
   ```
3. **重新生成翻译对照表**：`pnpm run gen:translations`（更新 `TRANSLATION.md`）。
4. **重建 + 测试**：`pnpm run build && pnpm test`。

key 集参考 DSH 源码 `packages/client/locale/src/locales/` 以及现有语言文件。缺失的 key 在运行时回退到英文（不会报错）。

---

## 测试你的接入

### 单元测试

你的 `dictionaries.ts` 应该有一个 key-set 完整性测试，确保覆盖词典与 zh/en 的 key 集一致：

```ts
// tests/dictionaries.spec.ts
import { describe, it, expect } from 'vitest'
import { en } from '../src/client/locales.ts'
import { dicts } from '../src/client/dictionaries.ts'

describe('dictionaries key-set integrity', () => {
  const enKeys = Object.keys(en).sort()
  for (const [lang, dict] of Object.entries(dicts)) {
    it(`${lang} has the same key set as en`, () => {
      expect(Object.keys(dict).sort()).toEqual(enKeys)
    })
  }
})
```

### 手动验证

1. 安装 better-locale + 你的插件到 profile。
2. 启动 `dsh web`，浏览器硬刷新。
3. DSH 设置 → 语言 → English。
4. 设置 → General → better-locale 行 → 选目标语言。
5. 你的插件的界面文案应切换为覆盖语言。
6. 选「使用 DSH 原生」→ 回到英文。
7. DSH 切回中文 → 你的插件显示中文（覆盖惰性）。

### 常见问题

| 症状 | 原因 |
|---|---|
| 选了覆盖语言但插件文案没变 | 没用 activation-order-safe 模式（见 [Activation order](#activation-order激活顺序)） |
| 插件文案部分变部分没变 | 覆盖词典缺 key（缺的 key 回退英文）；补全词典 |
| DSH 在中文时插件显示英文 | 覆盖只在 DSH=English 时生效（设计如此）；切 DSH 到 English |
| 浏览器刷新后选择丢失 | localStorage 被清；检查浏览器隐私模式 |
| 控制台报 `already patched` | 有两个 better-locale 实例（重复安装 / HMR bug）；检查 profile 依赖 |
