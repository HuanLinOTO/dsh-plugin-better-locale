/**
 * Language override preference row, registered into the settings General
 * section's item slot. Mirrors the locale package's own LanguageRow layout
 * (figma 'Setting-Cell': title on the left, selector pill on the right
 * opening a Menu) but drives the better-locale override store instead of
 * DSH's native locale.
 *
 * The row reads three facts from the slot store (mirrored by the apply
 * function): the active override id, the registered languages list, and
 * DSH's current active locale. When an override is selected but DSH is
 * not on `'en'`, the row renders a hint below the title telling the user
 * to switch DSH to English (the override borrows DSH's English slot —
 * see `store.ts` for the rationale).
 *
 * Inline styles over DSH CSS tokens (`var(--dsw-alias-*)`) keep the
 * bundle CSS-pipeline-free (no CSS modules plugin needed in tsdown);
 * the tokens come from dsh-web-ui's theme layer, so skin overrides
 * propagate.
 *
 * @module @huanlin/dsh-plugin-better-locale/client/LanguageRow
 */
import type { PropsLocale, PropsStore } from '@deepseek-ai/dsh-client-ui-slots';
import type { createLanguageRowStore } from './settings-store.ts';
/** Injected face: the override write + translate function (the apply closure provides). */
export interface LanguageRowInjected {
    /** Switch the active override; `undefined` clears it (use DSH native zh/en). */
    setActive: (id: string | undefined) => void;
}
/** Full component props: store share + locale seat + injected face. */
export type LanguageRowComponentProps = PropsStore<ReturnType<typeof createLanguageRowStore>> & PropsLocale<'dsh-plugin-better-locale'> & LanguageRowInjected;
/**
 * Render the Language override row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export declare function LanguageRow({ t, useStore, setActive }: LanguageRowComponentProps): React.ReactNode;
