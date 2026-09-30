'use client';

import * as Menubar from '@radix-ui/react-menubar';
import { Drawer, useModal } from '@payloadcms/ui';
import { useId, type CSSProperties } from 'react';
import type { DataTableFormat } from '../shared/types.js';

const shortcuts = [
  ['Copy selected cells', '⌘ C / Ctrl C'],
  ['Paste into the active cell', '⌘ V / Ctrl V'],
  ['Cut selected cells', '⌘ X / Ctrl X'],
  ['Undo', '⌘ Z / Ctrl Z'],
  ['Redo', '⇧ ⌘ Z / Ctrl ⇧ Z'],
  ['Clear selected cells', 'Delete / Backspace'],
  ['Edit the active cell', 'Enter / F2'],
  ['Extend a selection', 'Shift + Arrow keys'],
] as const;

type Props = {
  canAddRow: boolean;
  canAddColumn: boolean;
  onAddRow: () => void;
  onAddColumn: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canCopy: boolean;
  canPaste: boolean;
  canCut: boolean;
  onCopy: () => void;
  onPaste: () => void;
  onCut: () => void;
  onClearSelection: () => void;
  onImportCSV: () => void;
  onExportCSV: () => void;
  formats: DataTableFormat[];
  onApplyBackground: (key?: string) => void;
};

export function DataTableMenubar({
  canAddRow,
  canAddColumn,
  onAddRow,
  onAddColumn,
  onClear,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  canCopy,
  canPaste,
  canCut,
  onCopy,
  onPaste,
  onCut,
  onClearSelection,
  onImportCSV,
  onExportCSV,
  formats,
  onApplyBackground,
}: Props) {
  const { openModal } = useModal();
  const shortcutsDrawerSlug = `data-table-keyboard-shortcuts-${useId()}`;
  return (
    <>
      <Menubar.Root className="data-table__menubar" aria-label="Data table actions">
        <Menubar.Menu>
          <Menubar.Trigger className="data-table__menu-trigger">Table</Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
              <Menubar.Item className="data-table__menu-item" onSelect={onClear}>
                Clear table
              </Menubar.Item>
              <Menubar.Separator className="data-table__menu-separator" />
              <Menubar.Item className="data-table__menu-item" onSelect={onImportCSV}>
                Import CSV
              </Menubar.Item>
              <Menubar.Item className="data-table__menu-item" onSelect={onExportCSV}>
                Export CSV
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
        <Menubar.Menu>
          <Menubar.Trigger className="data-table__menu-trigger">Edit</Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
              <Menubar.Item className="data-table__menu-item" disabled={!canUndo} onSelect={onUndo}>
                Undo
                <kbd className="data-table__shortcut">⌘Z</kbd>
              </Menubar.Item>
              <Menubar.Item className="data-table__menu-item" disabled={!canRedo} onSelect={onRedo}>
                Redo
                <kbd className="data-table__shortcut">⇧⌘Z</kbd>
              </Menubar.Item>
              <Menubar.Separator className="data-table__menu-separator" />
              <Menubar.Item className="data-table__menu-item" disabled={!canCopy} onSelect={onCopy}>
                Copy cells
                <kbd className="data-table__shortcut">⌘C</kbd>
              </Menubar.Item>
              <Menubar.Item className="data-table__menu-item" disabled={!canPaste} onSelect={onPaste}>
                Paste cells
                <kbd className="data-table__shortcut">⌘V</kbd>
              </Menubar.Item>
              <Menubar.Item className="data-table__menu-item" disabled={!canCut} onSelect={onCut}>
                Cut cells
                <kbd className="data-table__shortcut">⌘X</kbd>
              </Menubar.Item>
              <Menubar.Item className="data-table__menu-item" disabled={!canCopy} onSelect={onClearSelection}>
                Clear cells
                <kbd className="data-table__shortcut">⌫</kbd>
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
        <Menubar.Menu>
          <Menubar.Trigger className="data-table__menu-trigger">Insert</Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
              <Menubar.Item className="data-table__menu-item" disabled={!canAddRow} onSelect={onAddRow}>
                Add row
              </Menubar.Item>
              <Menubar.Item className="data-table__menu-item" disabled={!canAddColumn} onSelect={onAddColumn}>
                Add column
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
        {formats.length > 0 && (
          <Menubar.Menu>
            <Menubar.Trigger className="data-table__menu-trigger">Format</Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
                <Menubar.Label className="data-table__menu-label">Background</Menubar.Label>
                {formats.map((entry) => (
                  <Menubar.Item
                    key={entry.key}
                    className="data-table__menu-item"
                    onSelect={() => onApplyBackground(entry.key)}
                  >
                    <span
                      className="data-table__format-swatch"
                      aria-hidden
                      style={
                        {
                          '--data-table-swatch-light':
                            typeof entry.background === 'string' ? entry.background : entry.background.light,
                          '--data-table-swatch-dark':
                            typeof entry.background === 'string' ? entry.background : entry.background.dark,
                        } as CSSProperties
                      }
                    />
                    {entry.label}
                  </Menubar.Item>
                ))}
                <Menubar.Separator className="data-table__menu-separator" />
                <Menubar.Item className="data-table__menu-item" onSelect={() => onApplyBackground()}>
                  Clear background
                </Menubar.Item>
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
        )}
        <Menubar.Menu>
          <Menubar.Trigger className="data-table__menu-trigger">Help</Menubar.Trigger>
          <Menubar.Portal>
            <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
              <Menubar.Item className="data-table__menu-item" onSelect={() => openModal(shortcutsDrawerSlug)}>
                Keyboard shortcuts
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Portal>
        </Menubar.Menu>
      </Menubar.Root>
      <Drawer slug={shortcutsDrawerSlug} title="Keyboard shortcuts" className="data-table__help-drawer">
        <div className="data-table__help-content">
          <p className="data-table__help-intro">Use these shortcuts while the table is focused.</p>
          <dl className="data-table__shortcut-list">
            {shortcuts.map(([label, shortcut]) => (
              <div className="data-table__shortcut-row" key={label}>
                <dt>{label}</dt>
                <dd>
                  <kbd>{shortcut}</kbd>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </Drawer>
    </>
  );
}
