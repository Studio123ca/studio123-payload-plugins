'use client';

import * as Menubar from '@radix-ui/react-menubar';

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
}: Props) {
  return (
    <Menubar.Root className="data-table__menubar" aria-label="Data table actions">
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
        <Menubar.Trigger className="data-table__menu-trigger">Table</Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
            <Menubar.Item className="data-table__menu-item" onSelect={onClear}>
              Clear table
            </Menubar.Item>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>
    </Menubar.Root>
  );
}
