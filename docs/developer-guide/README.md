# better-locale Developer Guide

[中文](README.zh-CN.md) | **English**

For **third-party plugin authors**: how to make your plugin follow better-locale's third-language override, and how to register your own translations with better-locale.

## Contents

- [Overview](#overview)
- [Service contract](#service-contract)
- [Opting in: make your plugin follow the override](#opting-in-make-your-plugin-follow-the-override)
- [Activation order](#activation-order)
- [Full example](#full-example)
- [Registering a new selectable language](#registering-a-new-selectable-language)
- [Adding translations for better-locale itself](#adding-translations-for-better-locale-itself)
- [Testing your integration](#testing-your-integration)

---

## Overview

`@huanlin/dsh-plugin-better-locale` monkey-patches `LocaleRuntime.prototype.lookup` at client-apply time and publishes `ctx.betterLocale` (the override store) as an optional cordis service.

The chain:

```
User picks "Japanese" in settings
  → store.setActive('ja')
  → bumpRevision(ctx.locale)  // triggers full re-render
  → during re-render, t(key) calls the patched lookup
  → store.getOverride(dshActive, ns, key)
      ├─ dshActive === 'en' + ja selected + ja dict has the key → return ja text
      └─ otherwise → fall back to DSH native zh/en
```

**Key constraint:** the override only takes effect when DSH's active locale is `'en'` (it borrows DSH's English slot). While DSH is on Chinese, the override is fully inert.

To make your plugin follow the override, you do two things:
1. Register your plugin's dictionaries (zh/en) with `ctx.locale` as usual (DSH native i18n).
2. Register your plugin's **override dictionaries** (ja/ko/fr/...) with `ctx.betterLocale` (this plugin).

---

## Service contract

`ctx.betterLocale` is a `BetterLocaleStore` instance (structurally typed — your plugin does not need to value-import this plugin):

```ts
interface BetterLocaleStore {
  /** Currently selected override language id; undefined means no override (use DSH native zh/en). */
  readonly active: string | undefined
  /** Registered selectable languages (in registration order). */
  readonly languages: readonly { id: string; label: string }[]

  /** Switch the override language; undefined clears it. */
  setActive(localeId: string | undefined): void

  /** Subscribe to store changes (override switch / language registration / dict registration). */
  subscribe(listener: () => void): () => void

  /** Register a selectable language (appears in the settings dropdown). */
  registerLanguage(def: { id: string; label: string }): () => void

  /**
   * Register dictionaries for a namespace, all locales in one call.
   * @param ns - namespace (same ns you pass to ctx.locale.register)
   * @param dicts - { localeId: { key: text } }
   * @returns disposer (removes every locale registered by this call)
   */
  register(ns: string, dicts: Record<string, Record<string, string>>): () => void

  /** Read an override translation (called internally by the patched lookup; usually not used directly). */
  getOverride(dshActive: string, ns: string, key: string): string | undefined

  /** Whether the override is effectively active (active is set AND dshActive === 'en'). */
  isOverrideActive(dshActive: string): boolean
}
```

When better-locale is not installed, `ctx.get('betterLocale')` returns `undefined` — your registration code should skip, and your plugin keeps working (zh/en behavior unchanged).

---

## Opting in: make your plugin follow the override

### 1. Declare the optional peer

`package.json`:

```jsonc
{
  "peerDependencies": {
    "cordis": "^4.0.0-rc.8",
    "@huanlin/dsh-plugin-better-locale": "workspace:*"
    // ... other peers (react, @deepseek-ai/*, etc.)
  },
  "peerDependenciesMeta": {
    "@huanlin/dsh-plugin-better-locale": { "optional": true }
  }
}
```

`optional: true` lets your plugin load even when better-locale is not installed.

### 2. Prepare the override dictionaries

Create a `dictionaries.ts` in your plugin's client source, exporting one dict per language (key set must match your zh/en dict):

```ts
// src/client/dictionaries.ts
export const dicts: Record<string, Record<string, string>> = {
  ja: {
    'tab.title': 'サブエージェント',
    'settings.title': 'サブエージェント設定',
    // ... all your keys
  },
  ko: {
    'tab.title': '서브에이전트',
    'settings.title': '서브에이전트 설정',
  },
  // ... other languages
}
```

### 3. Register (activation-order-safe pattern)

In your client `apply(ctx)`:

```ts
import { dicts } from './dictionaries.ts'
import { en, NS, zh } from './locales.ts'

export const inject = ['slots', 'locale']  // do NOT add 'betterLocale' to inject

export function apply(ctx: ClientContext): void {
  // First register zh/en with DSH native i18n (as usual)
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'my-plugin: dictionaries')

  // Register override dicts with better-locale (activation-order-safe)
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

Done. After the user picks an override language in better-locale's settings (with DSH on English), your plugin's `t(key)` calls will automatically return the override-language text.

---

## Activation order

**This is the most common pitfall when integrating — you must use the activation-order-safe pattern above.**

The problem: better-locale publishes its service via `ctx.provide('betterLocale', store)`, which happens during its `apply()`. But cordis's `inject` array only sequences **declared** service dependencies — better-locale is an **optional peer**, not in your `inject`, so cordis does **not** guarantee better-locale activates before your plugin.

If your plugin activates before better-locale, `ctx.get('betterLocale')` returns `undefined` at your `apply()` time — a naive "read once" pattern skips registration and the override never takes effect:

```ts
// ❌ Wrong: naive one-shot read
const betterLocale = ctx.get('betterLocale')
if (betterLocale) {
  ctx.effect(() => betterLocale.register(NS, dicts), '...')
}
// If better-locale hasn't activated yet, this does nothing and never retries.
```

The correct approach: subscribe to `ctx.locale` and re-check `ctx.get('betterLocale')` on every revision bump. better-locale bumps the revision on these occasions:

- **On activation** (if localStorage has a persisted override selection) → already-mounted outlets re-render, and your `sync` can grab the store at that point.
- **When the user switches the override language.**
- **When a third-party plugin registers new dicts / new languages.**

So `ctx.locale.subscribe(sync)` guarantees: regardless of activation order, once better-locale is ready, your `sync` will pick up the store on the next revision bump and register your dicts.

> **Why not add `'betterLocale'` to `inject`?** That would make your plugin **fail to load** when better-locale is not installed (cordis would stay PENDING forever). An optional peer must use `ctx.get` + a runtime check, not an `inject` declaration.

---

## Full example

A minimal plugin client half, with Japanese override support:

```tsx
// src/client/index.tsx
import { createElement } from 'react'
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { dicts } from './dictionaries.ts'
import { en, NS, zh, type MyPluginKey } from './locales.ts'

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  // 1. Register zh/en with DSH native i18n
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'my-plugin: dictionaries')

  // 2. Register override dicts with better-locale (activation-order-safe)
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

  // 3. Your normal slot registration...
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
  // ... other languages (key set must match en)
}
```

---

## Registering a new selectable language

better-locale ships 19 built-in languages. If your plugin wants to add a language that better-locale does not ship (e.g. `eo` Esperanto):

```ts
ctx.effect(() => {
  const store = ctx.get('betterLocale')
  if (store === undefined) return
  // Register the selectable language (appears in the settings dropdown)
  const disposeLang = store.registerLanguage({ id: 'eo', label: 'Esperanto' })
  // Register your namespace's eo dict
  const disposeDict = store.register(NS, { eo: { 'tab.title': 'Mia kromaĵo' } })
  return () => { disposeLang(); disposeDict() }
}, 'my-plugin: eo language')
```

Note: this only gives your plugin's `NS` an eo translation. DSH itself and other plugins will fall back to English under eo — unless they also register an eo dict. better-locale itself does not prevent you from registering arbitrary language ids.

---

## Adding translations for better-locale itself

If you want to add a translation for one of better-locale's built-in DSH namespaces (`common` / `settings.locale` / `command` / ...) in a new language, or add a new built-in language:

1. **Add a language file:** `src/client/dictionaries/<lang>.ts`, exporting `dicts: Record<string, Record<string, string>>` covering DSH's built-in namespaces. See `ja.ts` for the structure.
2. **Register it in `BUILTIN_LANGUAGES` and `ALL_LANG_DICTS`:** add two lines in `src/client/index.tsx`:
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
3. **Regenerate the coverage table:** `pnpm run gen:translations` (updates `TRANSLATION.md`).
4. **Rebuild + test:** `pnpm run build && pnpm test`.

The key set is defined by DSH source at `packages/client/locale/src/locales/` and the existing language files. Missing keys fall back to English at runtime (no error).

---

## Testing your integration

### Unit tests

Your `dictionaries.ts` should have a key-set integrity test ensuring the override dicts match the zh/en key set:

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

### Manual verification

1. Install better-locale + your plugin into the profile.
2. Start `dsh web`, hard-refresh the browser.
3. DSH Settings → Language → English.
4. Settings → General → better-locale row → pick the target language.
5. Your plugin's UI copy should switch to the override language.
6. Pick "Use DSH native" → back to English.
7. Switch DSH back to Chinese → your plugin shows Chinese (override inert).

### Troubleshooting

| Symptom | Cause |
|---|---|
| Picked an override language but plugin copy didn't change | Did not use the activation-order-safe pattern (see [Activation order](#activation-order)) |
| Plugin copy partially switches, partially doesn't | Override dict is missing keys (missing keys fall back to English); fill in the dict |
| Plugin shows English while DSH is on Chinese | Override only takes effect when DSH = English (by design); switch DSH to English |
| Selection lost after browser refresh | localStorage was cleared; check browser privacy mode |
| Console reports `already patched` | Two better-locale instances (duplicate install / HMR bug); check profile deps |
