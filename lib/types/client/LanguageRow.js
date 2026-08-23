import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { useState } from 'react';
import { IconChevronDownOutline14, Menu } from '@deepseek-ai/dsh-client-ui-primitives';
/**
 * Render the Language override row.
 * @param props - composed slot props.
 * @returns the row element tree.
 */
export function LanguageRow({ t, useStore, setActive }) {
    const active = useStore(s => s.active);
    const options = useStore(s => s.options);
    const dshActive = useStore(s => s.dshActive);
    const [open, setOpen] = useState(false);
    // The first menu entry is always "Use DSH native (zh/en)"; the rest are
    // the registered override languages. selectedId tracks the active one.
    const nativeId = '__native__';
    const selectedId = active === undefined ? nativeId : active;
    const activeLabel = active === undefined
        ? t('nativeOption')
        : options.find(o => o.id === active)?.label ?? active;
    // Override selected but DSH not on en → show the "switch to en" hint.
    const showEnSwitchHint = active !== undefined && dshActive !== 'en';
    const hintLabel = options.find(o => o.id === active)?.label ?? active ?? '';
    const menuItems = [
        { id: nativeId, label: t('nativeOption') },
        ...options.map(o => ({ id: o.id, label: o.label })),
    ];
    return (_jsxs("div", { style: {
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '16px 0',
            borderBottom: '1px solid var(--dsw-alias-border-l2, transparent)',
        }, children: [_jsxs("div", { style: {
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    paddingRight: '48px',
                }, children: [_jsx("div", { style: {
                            fontSize: 14,
                            fontWeight: 400,
                            lineHeight: '22px',
                            color: 'var(--dsw-alias-label-primary, inherit)',
                        }, children: t('rowTitle') }), showEnSwitchHint && (_jsx("div", { role: "status", style: {
                            padding: '6px 10px',
                            borderRadius: 6,
                            background: 'var(--dsw-alias-bg-module-platform, rgba(255,193,7,0.12))',
                            border: '1px solid var(--dsw-alias-border-l2, rgba(255,193,7,0.4))',
                            color: 'var(--dsw-alias-label-primary, inherit)',
                            fontSize: 12,
                            lineHeight: '18px',
                        }, children: t('switchToEnHint', { label: hintLabel }) }))] }), _jsx(Menu, { open: open, onClose: () => { setOpen(false); }, items: menuItems, selectedId: selectedId, onSelect: (id) => {
                    setActive(id === nativeId ? undefined : id);
                    setOpen(false);
                }, align: "end", portal: true, anchor: (_jsxs("button", { type: "button", style: {
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 12,
                        height: 36,
                        padding: '0 14px',
                        border: 'none',
                        borderRadius: 18,
                        background: 'var(--dsw-alias-bg-module-platform, rgba(0,0,0,0.04))',
                        font: 'inherit',
                        fontSize: 14,
                        lineHeight: '22px',
                        color: 'var(--dsw-alias-label-primary, inherit)',
                        cursor: 'pointer',
                    }, "aria-haspopup": "menu", "aria-expanded": open, onClick: () => { setOpen(v => !v); }, children: [activeLabel, _jsx(IconChevronDownOutline14, {})] })) })] }));
}
