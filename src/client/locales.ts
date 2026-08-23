/**
 * Plugin's own i18n dictionaries. The plugin's UI (the better-sidebar
 * tab + its buttons) follows DSH's `ctx.locale` for zh/en — the user
 * navigating the language switcher sees the surrounding chrome in their
 * DSH language. The switcher itself has only a handful of copy keys;
 * they live in the `dsh-plugin-better-locale` namespace, registered
 * through `ctx.locale.register` so DSH's native translate chain
 * (which the plugin's own patch wraps) handles them.
 *
 * Note: when the user has selected an override (e.g. ja), the plugin's
 * own copy keys fall back to en (no ja dict for this namespace) —
 * acceptable for MVP since the switcher's job is to pick the override,
 * not to be itself translated. Future versions may add ja/ko dicts here.
 *
 * @module @huanlin/dsh-plugin-better-locale/client/locales
 */

/** All copy keys for the dsh-plugin-better-locale namespace. */
export type BetterLocaleKey =
  | 'rowTitle'
  | 'heading'
  | 'description'
  | 'nativeOption'
  | 'nativeOptionDesc'
  | 'overrideActive'
  | 'switchToEnHint'

/** Locale namespace id (matches the cordis.patch.yml plugin id). */
export const NS = 'dsh-plugin-better-locale'

/** English dictionary. */
export const en: Record<BetterLocaleKey, string> = {
  rowTitle: 'Language override',
  heading: 'Language override',
  description: 'Override DSH\'s zh/en with a third language. The override borrows DSH\'s English slot — switch DSH to English to see the selected language. Keys without a translation fall back to DSH native.',
  nativeOption: 'Use DSH native (zh/en)',
  nativeOptionDesc: 'No override; DSH\'s language preference wins.',
  overrideActive: 'Active',
  switchToEnHint: 'Switch DSH\'s language to English to see {label}.',
}

/** Chinese dictionary. */
export const zh: Record<BetterLocaleKey, string> = {
  rowTitle: '语言覆盖',
  heading: '语言覆盖',
  description: '用第三语言覆盖 DSH 的中英文。覆盖借用 DSH 的英文槽位——请将 DSH 切换到英文以查看所选语言。未翻译的 key 自动回退到 DSH 原生语言。',
  nativeOption: '使用 DSH 原生（zh/en）',
  nativeOptionDesc: '不覆盖；以 DSH 的语言偏好为准。',
  overrideActive: '已启用',
  switchToEnHint: '请将 DSH 的语言切换到英文以查看{label}。',
}
