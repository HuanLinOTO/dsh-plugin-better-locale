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
import { defineStore } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * Declares the Language row state and write surface.
 * @returns the store handle.
 */
export function createLanguageRowStore() {
    return defineStore({
        init: () => ({
            active: undefined,
            options: [],
            dshActive: 'en',
            revision: -1,
        }),
        actions: {
            sync: (draft, active, options, dshActive, revision) => {
                if (revision <= draft.revision)
                    return;
                draft.active = active;
                draft.options = options;
                draft.dshActive = dshActive;
                draft.revision = revision;
            },
        },
    });
}
