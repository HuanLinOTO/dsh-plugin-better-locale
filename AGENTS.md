# dsh-plugin-better-locale — Agent Guide

## Plugin overview

Bundle-style DSH plugin that adds third-language (ja / ko / ...) override support to DSH i18n. The plugin monkey-patches `LocaleRuntime.prototype.lookup` at client-apply time so calls to `ctx.locale`'s translate chain consult the plugin's override store before falling back to DSH's native zh/en dictionaries. The dsh active locale is never mutated — schema, LanguageRow, and `<html lang>` all keep their original behaviour; only the rendered text is replaced when an override translation exists AND DSH's active locale is `'en'` (the override borrows DSH's English slot to render a third language).

The plugin is **client-only** (host `apply` is empty). The browser half:
- patches `LocaleRuntime.prototype.lookup` (HMR-safe, idempotent, with a startup probe that downgrades to no-op if the upstream class shape changes),
- publishes `ctx.betterLocale` (the override store) as a cordis service,
- registers bundled ja dictionaries for DSH's `common` + `settings.locale` namespaces,
- registers a language-override preference row into DSH's settings General section (`settings.general.item` slot) listing the override languages + a "use DSH native zh/en" option.

## Key conventions

- **Bundle form**: `cordis.patch.yml` inserts one plugin row with no config; `package.json` has `dsh.bundle.patch`. No source patches to DSH staging.
- **Client-only**: the host half (`src/index.ts`) has an empty `apply`. All work is in the browser half (`src/client/`).
- **Pre-built `lib/` strategy**: `lib/` is committed (not in `.gitignore`); no `prepare` script; `github:` install works out of the box. Required because the client half depends on `@deepseek-ai/dsh-client-*` private peer deps that pnpm cannot fetch in a temporary git-install directory.
- **Peer deps**: cordis + react + react-dom + `@deepseek-ai/dsh-client-locale` + `@deepseek-ai/dsh-client-runtime` + `@deepseek-ai/dsh-client-ui-primitives` + `@deepseek-ai/dsh-client-ui-settings` (type-only) + `@deepseek-ai/dsh-client-ui-slots` (type-only) + `@deepseek-ai/dsh-invariants`. Zero runtime npm deps. The plugin does NOT depend on better-sidebar.
- **Settings row, not a tab**: the user-facing switcher UI is a settings General-section row (`settings.general.item` slot), registered via `ctx.slots.inject` + `ctx.slots.register` — the same pattern the locale package's own Language row uses. The row reads from a slot store (`createLanguageRowStore`) mirroring (active, options, dshActive, revision); the apply function wires two subscriptions to keep it in sync (better-locale store + DSH locale service).
- **Framework-free store**: `store.ts` has no React / no cordis imports — pure TypeScript class. The apply function wires it to cordis (provide + subscribe → bumpRevision); the settings row's slot store (`settings-store.ts`) mirrors it to React via the slot system's `PropsStore` contract. This keeps the override store unit-testable in pure node.
- **Pure patch helpers**: `patch.ts` exports `probeLocaleRuntime` / `installPatch` / `bumpRevision` — all pure functions taking explicit arguments (no module-level side effects on import). Unit tests cover them with a mock LocaleRuntime-like class.

## File responsibilities

| File | Role |
|------|------|
| `src/index.ts` | Host entry: `name`, empty `apply` (client-only plugin) |
| `src/invariant.ts` | `./invariant` companion (empty installer: patch is HMR-proven; localStorage writes are try/catch contained) |
| `src/client/index.tsx` | Client entry: `inject = ['slots', 'locale']`, registers own copy namespace + constructs store + installs patch + provides service + registers bundled dicts + subscribes store→bumpRevision + registers the settings General-section row |
| `src/client/store.ts` | `BetterLocaleStore` class: registry of (ns, locale) → dict + active override id + listeners; localStorage persistence |
| `src/client/patch.ts` | `probeLocaleRuntime` / `installPatch` / `bumpRevision` helpers |
| `src/client/LanguageRow.tsx` | The settings General-section row component: title on the left, selector pill (Menu) on the right; shows a "switch DSH to English" hint when an override is selected but DSH is not on `en` |
| `src/client/settings-store.ts` | `createLanguageRowStore` factory: slot store mirroring (active, options, dshActive, revision) for the row component's `PropsStore` |
| `src/client/locales.ts` | English + Chinese dictionaries for the `dsh-plugin-better-locale` namespace |
| `src/client/dictionaries/dsh-common-ja.ts` | ja translation of DSH's `common` namespace |
| `src/client/dictionaries/dsh-settings-locale-ja.ts` | ja translation of DSH's `settings.locale` namespace |
| `tests/store.spec.ts` | Unit tests for `BetterLocaleStore` (register / setActive / getOverride / isOverrideActive / subscribe / duplicate throws / disposer) |
| `tests/patch.spec.ts` | Unit tests for `installPatch` (override wins on en / inert on zh / fallback / idempotent / uninstall restores) + `bumpRevision` (publishes with active unchanged) |

## Commands

```sh
pnpm run typecheck    # tsc --noEmit (resolves DSH src through ../dsh paths)
pnpm test             # vitest run (pure-function unit tests)
pnpm run build        # tsdown + tsc → lib/index.js, lib/invariant.js, lib/client.js
pnpm run bundle:client # tsdown only (skip tsc; for fast client rebuilds)
```

## Data flow

### Patch install (apply time)

1. `apply(ctx)` runs.
2. Plugin's own copy namespace (`dsh-plugin-better-locale`) registered with `ctx.locale.register` — zh + en dicts.
3. Store constructed with `loadActiveFromStorage()` as initial active (page refresh restores last selection).
4. `probeLocaleRuntime()` checks `LocaleRuntime.prototype.lookup` is a function. If not (upstream refactor), logs console error; `installPatch` will be a no-op.
5. `installPatch(store)` called inside `ctx.effect`:
   - Captures `origLookup = proto.lookup`.
   - Checks `proto.lookup !== origLookup` (already patched by another instance) → no-op + console error.
   - Wraps `proto.lookup` with a function that calls `store.getOverride(this.getLocale().active, ns, key)` first; if override exists, returns it; else calls `origLookup.call(this, ns, key)`. The override only fires when DSH's active locale is `'en'` (the override borrows DSH's English slot to render a third language); while DSH is on `'zh'` the override is inert and the user sees native zh.
   - Returns disposer that restores `origLookup` only if the current method is still the wrapper.
6. `ctx.provide('betterLocale', store)` — service published AFTER patch is installed so consumers' `register` calls (which notify → bumpRevision) hit the patched lookup.
7. Curated languages + bundled dicts registered (each in its own `ctx.effect` for HMR-safe disposal).
8. `store.subscribe(() => bumpRevision(ctx.locale))` — wired in `ctx.effect` so subscription released on fiber disposal.
9. If `store.active !== undefined` at startup (persisted selection), `bumpRevision(ctx.locale)` called once so already-mounted outlets re-render.
10. `ctx.get('betterSidebar')` — if present, registers the switcher tab. The tab component reads `ctx.locale.getLocale().active` on every render and passes it to `LanguageSwitcher` as `dshActive`; when an override is selected but DSH is not on `'en'`, the switcher shows a hint telling the user to switch DSH to English.

### Translate call (every render)

1. React render triggers `t(key)` somewhere in DSH.
2. `t` calls `LocaleRuntime.prototype.translate(ns, key, params)`.
3. `translate` calls `this.lookup(ns, key)` — which is now the patched wrapper.
4. Patched wrapper calls `store.getOverride(this.getLocale().active, ns, key)`:
   - If `store.active === undefined` → returns `undefined` (no override; fall back).
   - If `this.getLocale().active !== 'en'` → returns `undefined` (override borrows the en slot; inert while DSH is on zh).
   - Else looks up `dicts.get(ns)?.get(store.active)?.[key]` — if defined, returns it; else `undefined`.
5. If override is `undefined`, wrapper calls `origLookup.call(this, ns, key)` — DSH's native lookup, which reads `this.snapshot.active` (zh or en) and falls back to en.
6. `translate` interpolates `{name}` placeholders and returns.

### User picks a language (switcher click)

1. User clicks "日本語" in the LanguageSwitcher.
2. `store.setActive('ja')` — dedupes (no-op if already 'ja'); updates `activeOverride`; persists to localStorage; notifies subscribers.
3. The apply function's subscription fires: `bumpRevision(ctx.locale)`.
4. `bumpRevision` calls `(ctx.locale as any).publish(ctx.locale.getLocale().active, true)`:
   - Snapshots a new object with `revision + 1` (same `active`, same `locales`).
   - `localeChanged=true` → emits `locale/change` event.
   - Notifies LocaleFace subscribers (uSES) → React re-renders every outlet.
5. During re-render, patched `lookup` is consulted → returns ja text where available (only when DSH is on `'en'`); falls back to en where not. If DSH is on `'zh'`, the override is inert and the user sees native zh — the switcher shows a hint telling the user to switch DSH to English.

## Gotchas

- **`publish` is private**: `bumpRevision` uses `(locale as unknown as { publish(...) }).publish(...)` to bypass TypeScript. Encapsulated in `patch.ts` so the cast lives in one place. If dsh upstream changes `publish` to ES `#private` (true private field), this breaks at runtime — the startup probe + console.error downgrade is the mitigation, not a fix.
- **`lookup` is private**: same pattern. The wrapper is installed via `proto.lookup = wrapper` (runtime prototype mutation); TypeScript can't see this, so the wrapper's `this` is typed `LocaleRuntime` and calls `this.getLocale()` (public).
- **Idempotent patch**: `installPatch` checks `proto.lookup !== origLookup` before patching. If a second better-locale instance tries to patch (HMR bug, duplicate install), it logs an error and skips. The disposer restores `origLookup` only if `proto.lookup === wrapper` (so a double-uninstall or an intervening re-patch is a no-op).
- **Store is a single instance per fiber**: constructed in `apply`, captured in closures. HMR remount creates a new store, but `loadActiveFromStorage()` re-reads localStorage so the persisted selection recovers. In-memory dict registrations are lost on remount (they re-register via `ctx.effect` on the next apply).
- **better-sidebar is optional**: `ctx.get('betterSidebar')` returns undefined when better-sidebar is not installed. The plugin still loads, the service is still exposed, the patch still works — there's just no built-in UI to switch languages. Other plugins can still call `ctx.betterLocale.setActive(...)` programmatically.
- **`ctx.get` vs `ctx.<name>`**: `ctx.get('betterSidebar')` is the documented way to access optional services (DSH AGENTS.md). `ctx.betterSidebar` (property proxy) is topology-sensitive and would throw or return undefined unpredictably without `inject` declaration.
- **Plugin's own copy falls back to en under override**: when the user selects 'ja' override, the plugin's own namespace (`dsh-plugin-better-locale`) has no ja dict, so the patched lookup returns undefined and the original lookup returns en text. The switcher chrome is in English while the user is picking Japanese. Acceptable for MVP (the switcher's job is to pick the override, not to be itself translated). Future versions can add a ja dict for the plugin's own namespace.
- **`bumpRevision` fires `locale/change` with unchanged `active`**: this is by design — the override changed, so the effective language changed, even though DSH's `active` field didn't. `attachLocale`-style listeners read `service.getSnapshot().active` and re-render; they don't compare to detect changes. Better-sidebar's `attachLocale` is benign under this pattern. Future listeners that DO compare active before/after would see no change and skip — that's a known limitation, not a bug.
- **MVP ships only ja for `common` + `settings.locale`**: other DSH namespaces (settings.general, settings.plugins, ...) and other languages (ko, fr, ...) are deferred. The store API supports them; the plugin just doesn't ship dicts for them yet. Third-party plugins can register their own.
