/**
 * Language row slot store: a mirror of (a) the better-locale override
 * store's state (active override id + registered languages) and (b) DSH's
 * active locale id. The plugin's apply-world subscribers are the only
 * writers; the row component reads via props.useStore.
 *
 * Mirroring is required because the settings row follows the slot system's
 * `PropsStore` contract: the component reads through `useStore`, not
 * directly from the better-locale store. The apply function wires the two
 * stores together (subscribe to both → call `bound.sync(...)`).
 */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client';
/** One selectable language row (id + self-described label). */
export interface LanguageOptionRow {
    /** Language id (the setActive argument; e.g. 'ja'). */
    id: string;
    /** Display name in its own language (e.g. '日本語'). */
    label: string;
}
/** Store state mirrored from the better-locale store + DSH locale snapshot. */
export interface LanguageRowState {
    /** Active override id; `undefined` means "no override, use DSH native". */
    active: string | undefined;
    /** Selectable languages in registration order. */
    options: LanguageOptionRow[];
    /** DSH's current active locale id ('zh' | 'en' | ...). */
    dshActive: string;
    /**
     * Monotonic change counter; -1 until first sync so revision 0 lands as a
     * change. Combines the better-locale store's notification count and the
     * DSH locale revision — any change from either source bumps this.
     */
    revision: number;
}
/** Declared action shape giving the exported factory a stable return type. */
type LanguageRowActions = {
    /**
     * Mirror a new state. The revision guard drops stale duplicates (a
     * better-locale store change + a DSH locale revision bump firing in
     * sequence both call sync; the second is a no-op if nothing moved).
     */
    sync: (draft: LanguageRowState, active: string | undefined, options: LanguageOptionRow[], dshActive: string, revision: number) => void;
};
/**
 * Declares the Language row state and write surface.
 * @returns the store handle.
 */
export declare function createLanguageRowStore(): EngineStoreHandle<LanguageRowState, LanguageRowActions>;
export {};
