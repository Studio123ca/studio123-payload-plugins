'use client';

import * as ContextMenu from '@radix-ui/react-context-menu';
import {
  FiArrowDown,
  FiArrowLeft,
  FiArrowRight,
  FiArrowUp,
  FiChevronRight,
  FiCopy,
  FiDelete,
  FiDroplet,
  FiPlus,
  FiTrash2,
} from 'react-icons/fi';
import type { CSSProperties, ReactNode } from 'react';
import type { DataTableValue, ResolvedDataTableOptions } from '../shared/types.js';

export type DataTableContextTarget =
  | { kind: 'cell'; row: number; column: number }
  | { kind: 'row'; row: number }
  | { kind: 'column'; column: number }
  | { kind: 'table' };

type Props = {
  target: DataTableContextTarget | null;
  disabled?: boolean;
  value: DataTableValue;
  options: ResolvedDataTableOptions;
  children: ReactNode;
  onTargetChange: (target: DataTableContextTarget | null) => void;
  onAddRow: () => void;
  onAddColumn: () => void;
  onInsertRow: (index: number) => void;
  onInsertColumn: (index: number) => void;
  onDuplicateRow: (index: number) => void;
  onDuplicateColumn: (index: number) => void;
  onMoveRow: (from: number, to: number) => void;
  onMoveColumn: (from: number, to: number) => void;
  onDeleteRow: (index: number) => void;
  onDeleteColumn: (index: number) => void;
  onClearSelection: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onCut: () => void;
  onApplyBackground: (key?: string) => void;
  onFreezeRows: (top: number, bottom: number) => void;
  onSort: (direction: 'ascending' | 'descending', column: number) => void;
};

function Item({
  children,
  icon,
  shortcut,
  disabled = false,
  onSelect,
}: {
  children: ReactNode;
  icon: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <ContextMenu.Item className="data-table__context-item" disabled={disabled} onSelect={onSelect}>
      <span className="data-table__context-icon" aria-hidden>
        {icon}
      </span>
      {children}
      {shortcut && <kbd className="data-table__shortcut">{shortcut}</kbd>}
    </ContextMenu.Item>
  );
}

function Separator() {
  return <ContextMenu.Separator className="data-table__context-separator" />;
}

function FormatChoices({ options, onApply }: { options: ResolvedDataTableOptions; onApply: (key?: string) => void }) {
  return (
    <>
      <ContextMenu.Label className="data-table__context-label">Background</ContextMenu.Label>
      {options.formats.map((entry) => (
        <ContextMenu.Item key={entry.key} className="data-table__context-item" onSelect={() => onApply(entry.key)}>
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
        </ContextMenu.Item>
      ))}
      <ContextMenu.Item className="data-table__context-item" onSelect={() => onApply()}>
        Clear background
      </ContextMenu.Item>
    </>
  );
}

function Submenu({ label, children, icon }: { label: string; children: ReactNode; icon: ReactNode }) {
  return (
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger className="data-table__context-item">
        <span className="data-table__context-icon" aria-hidden>
          {icon}
        </span>
        {label}
        <FiChevronRight className="data-table__context-chevron" aria-hidden />
      </ContextMenu.SubTrigger>
      <ContextMenu.Portal>
        <ContextMenu.SubContent className="data-table__context-content">{children}</ContextMenu.SubContent>
      </ContextMenu.Portal>
    </ContextMenu.Sub>
  );
}

export function DataTableContextMenu({
  target,
  disabled = false,
  value,
  options,
  children,
  onTargetChange,
  onAddRow,
  onAddColumn,
  onInsertRow,
  onInsertColumn,
  onDuplicateRow,
  onDuplicateColumn,
  onMoveRow,
  onMoveColumn,
  onDeleteRow,
  onDeleteColumn,
  onClearSelection,
  onCopy,
  onPaste,
  onCut,
  onApplyBackground,
  onFreezeRows,
  onSort,
}: Props) {
  if (disabled) return <>{children}</>;
  const close = () => onTargetChange(null);
  return (
    <ContextMenu.Root onOpenChange={(open) => !open && close()}>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="data-table__context-content" onCloseAutoFocus={close}>
          {target?.kind === 'table' && (
            <>
              <Item icon={<FiPlus />} disabled={value.rows.length >= options.rows.max} onSelect={onAddRow}>
                Add row
              </Item>
              <Item icon={<FiPlus />} disabled={value.columns.length >= options.columns.max} onSelect={onAddColumn}>
                Add column
              </Item>
              <Separator />
              <Item icon={<FiDelete />} onSelect={onClearSelection}>
                Clear selection
              </Item>
            </>
          )}
          {target?.kind === 'cell' && (
            <>
              <Item icon={<FiCopy />} shortcut="⌘C" onSelect={onCopy}>
                Copy cells
              </Item>
              <Item icon={<FiCopy />} shortcut="⌘V" onSelect={onPaste}>
                Paste cells
              </Item>
              <Item icon={<FiCopy />} shortcut="⌘X" onSelect={onCut}>
                Cut cells
              </Item>
              <Item icon={<FiDelete />} shortcut="⌫" onSelect={onClearSelection}>
                Clear cells
              </Item>
              {options.formats.length > 0 && (
                <Submenu label="Format" icon={<FiDroplet />}>
                  <FormatChoices options={options} onApply={onApplyBackground} />
                </Submenu>
              )}
              <Submenu label="Insert" icon={<FiPlus />}>
                <Item
                  icon={<FiArrowUp />}
                  disabled={value.rows.length >= options.rows.max}
                  onSelect={() => onInsertRow(target.row)}
                >
                  Row before
                </Item>
                <Item
                  icon={<FiArrowDown />}
                  disabled={value.rows.length >= options.rows.max}
                  onSelect={() => onInsertRow(target.row + 1)}
                >
                  Row after
                </Item>
                <Item
                  icon={<FiArrowLeft />}
                  disabled={value.columns.length >= options.columns.max}
                  onSelect={() => onInsertColumn(target.column)}
                >
                  Column before
                </Item>
                <Item
                  icon={<FiArrowRight />}
                  disabled={value.columns.length >= options.columns.max}
                  onSelect={() => onInsertColumn(target.column + 1)}
                >
                  Column after
                </Item>
              </Submenu>
              <Separator />
              <Item icon={<FiArrowUp />} onSelect={() => onSort('ascending', target.column)}>
                Sort ascending
              </Item>
              <Item icon={<FiArrowDown />} onSelect={() => onSort('descending', target.column)}>
                Sort descending
              </Item>
            </>
          )}
          {target?.kind === 'row' && (
            <>
              {options.formats.length > 0 && (
                <Submenu label="Format" icon={<FiDroplet />}>
                  <FormatChoices options={options} onApply={onApplyBackground} />
                </Submenu>
              )}
              {options.stickyRows.enabled && (
                <Submenu label="Freeze rows" icon={<FiArrowDown />}>
                  <Item icon={<FiArrowDown />} onSelect={() => onFreezeRows(target.row + 1, 0)}>
                    Freeze through this row
                  </Item>
                  <Item icon={<FiArrowUp />} onSelect={() => onFreezeRows(0, value.rows.length - target.row)}>
                    Freeze from this row
                  </Item>
                  <Item icon={<FiDelete />} onSelect={() => onFreezeRows(0, 0)}>
                    Unfreeze rows
                  </Item>
                </Submenu>
              )}
              <Submenu label="Insert" icon={<FiPlus />}>
                <Item
                  icon={<FiArrowUp />}
                  disabled={value.rows.length >= options.rows.max}
                  onSelect={() => onInsertRow(target.row)}
                >
                  Row before
                </Item>
                <Item
                  icon={<FiArrowDown />}
                  disabled={value.rows.length >= options.rows.max}
                  onSelect={() => onInsertRow(target.row + 1)}
                >
                  Row after
                </Item>
                <Item
                  icon={<FiCopy />}
                  disabled={value.rows.length >= options.rows.max}
                  onSelect={() => onDuplicateRow(target.row)}
                >
                  Duplicate row
                </Item>
              </Submenu>
              <Submenu label="Move" icon={<FiArrowUp />}>
                <Item
                  icon={<FiArrowUp />}
                  disabled={target.row === 0}
                  onSelect={() => onMoveRow(target.row, target.row - 1)}
                >
                  Move up
                </Item>
                <Item
                  icon={<FiArrowDown />}
                  disabled={target.row === value.rows.length - 1}
                  onSelect={() => onMoveRow(target.row, target.row + 1)}
                >
                  Move down
                </Item>
              </Submenu>
              <Separator />
              <Item
                icon={<FiTrash2 />}
                disabled={value.rows.length <= options.rows.min}
                onSelect={() => onDeleteRow(target.row)}
              >
                Delete row
              </Item>
            </>
          )}
          {target?.kind === 'column' && (
            <>
              {options.formats.length > 0 && (
                <Submenu label="Format" icon={<FiDroplet />}>
                  <FormatChoices options={options} onApply={onApplyBackground} />
                </Submenu>
              )}
              <Submenu label="Insert" icon={<FiPlus />}>
                <Item
                  icon={<FiArrowLeft />}
                  disabled={value.columns.length >= options.columns.max}
                  onSelect={() => onInsertColumn(target.column)}
                >
                  Column before
                </Item>
                <Item
                  icon={<FiArrowRight />}
                  disabled={value.columns.length >= options.columns.max}
                  onSelect={() => onInsertColumn(target.column + 1)}
                >
                  Column after
                </Item>
                <Item
                  icon={<FiCopy />}
                  disabled={value.columns.length >= options.columns.max}
                  onSelect={() => onDuplicateColumn(target.column)}
                >
                  Duplicate column
                </Item>
              </Submenu>
              <Submenu label="Move" icon={<FiArrowLeft />}>
                <Item
                  icon={<FiArrowLeft />}
                  disabled={target.column === 0}
                  onSelect={() => onMoveColumn(target.column, target.column - 1)}
                >
                  Move left
                </Item>
                <Item
                  icon={<FiArrowRight />}
                  disabled={target.column === value.columns.length - 1}
                  onSelect={() => onMoveColumn(target.column, target.column + 1)}
                >
                  Move right
                </Item>
              </Submenu>
              <Separator />
              <Item
                icon={<FiTrash2 />}
                disabled={value.columns.length <= options.columns.min}
                onSelect={() => onDeleteColumn(target.column)}
              >
                Delete column
              </Item>
            </>
          )}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}
