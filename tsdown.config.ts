/**
 * Dev/CI tsdown config: emits three artifacts:
 *
 *   - `lib/index.js`      — node half (plain ESM, bundles src/index.ts)
 *   - `lib/invariant.js`  — node half (plain ESM, bundles src/invariant.ts)
 *   - `lib/client.js`     — browser half (CJS wrapped in DSH's
 *                            `window.__ModuleLoader__.load({id, factory})`
 *                            so the client module loader can compose it)
 *
 * The browser bundle externals React and the DSH platform modules
 * (@deepseek-ai/cordis, @deepseek-ai/dsh-client-*) — the loader's module
 * table provides them at runtime. `@deepseek-ai/dsh-client-ui-primitives`
 * (Menu + chevron icon), `@deepseek-ai/dsh-client-ui-settings` (settings
 * slot types — type-only), and `@deepseek-ai/dsh-client-ui-slots`
 * (PropsStore/PropsLocale + LocaleNamespaceMap merge — type-only) are
 * also external: they are baseline platform modules seeded by the web
 * shell. No CSS-modules pipeline: the settings row uses inline styles
 * over DSH CSS tokens, so the client bundle stays self-contained
 * without a CSS plugin.
 */
import { defineConfig, type UserConfig } from 'tsdown'

const ID = '@huanlin/dsh-plugin-better-locale'

/** DSH platform modules that stay external in the host bundles (peer deps). */
const HOST_EXTERNALS = [
  '@deepseek-ai/cordis',
  'schemastery',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-invariants',
]

/** DSH platform modules that stay external in the browser bundle. */
const CLIENT_EXTERNALS = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-locale',
  '@deepseek-ai/dsh-client-locale/client',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-primitives/client',
  '@deepseek-ai/dsh-client-ui-settings',
  '@deepseek-ai/dsh-client-ui-settings/client',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-slots/client',
]

const libConfig: UserConfig = {
  name: ID,
  entry: { index: 'src/index.ts', invariant: 'src/invariant.ts' },
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  dts: false,
  clean: true,
  external: HOST_EXTERNALS,
}

const clientBundleConfig: UserConfig = {
  name: `${ID}/client`,
  entry: { client: 'src/client/index.tsx' },
  outDir: 'lib',
  format: ['cjs'],
  platform: 'browser',
  target: 'es2024',
  dts: false,
  sourcemap: true,
  clean: false,
  external: CLIENT_EXTERNALS,
  noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
}

export default defineConfig([libConfig, clientBundleConfig])
