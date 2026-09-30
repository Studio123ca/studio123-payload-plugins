'use client';

import * as ContextMenu from '@radix-ui/react-context-menu';
import { BsArrowDownUp } from 'react-icons/bs';
import { TbFreezeRow } from 'react-icons/tb';
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
  FiType,
} from 'react-icons/fi';
import type { CSSProperties, ReactNode } from 'react';
import type { DataTableTextStyle, DataTableValue, ResolvedDataTableOptions } from '../shared/types.js';

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
  onApplyTextColor: (key?: string) => void;
  onApplyTextStyle: (patch: DataTableTextStyle | undefined) => void;
  onToggleTextStyle: (key: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'wrap') => void;
  onFreezeRows: (top: number, bottom: number) => void;
  onSort: (direction: 'ascending' | 'descending', column: number) => void;
  hasSelection: boolean;
};

function Item({
  children,
  icon,
  shortcut,
  disabled = false,
  danger = false,
  onSelect,
}: {
  children: ReactNode;
  icon: ReactNode;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}) {
  return (
    <ContextMenu.Item
      className={`data-table__context-item${danger ? ' data-table__context-item--danger' : ''}`}
      disabled={disabled}
      onSelect={onSelect}
    >
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

function TextFormatChoices({
  options,
  onApply,
  onToggle,
}: {
  options: ResolvedDataTableOptions;
  onApply: (patch: DataTableTextStyle | undefined) => void;
  onToggle: (key: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'wrap') => void;
}) {
  const formats = options.textFormats;
  return (
    <>
      {formats.bold && (
        <Item icon={<FiType />} shortcut="⌘B" onSelect={() => onToggle('bold')}>
          Bold
        </Item>
      )}
      {formats.italic && (
        <Item icon={<FiType />} shortcut="⌘I" onSelect={() => onToggle('italic')}>
          Italic
        </Item>
      )}
      {formats.underline && (
        <Item icon={<FiType />} shortcut="⌘U" onSelect={() => onToggle('underline')}>
          Underline
        </Item>
      )}
      {formats.strikethrough && (
        <Item icon={<FiType />} shortcut="⇧⌘X" onSelect={() => onToggle('strikethrough')}>
          Strikethrough
        </Item>
      )}
      {formats.alignment && (
        <Submenu label="Alignment" icon={<FiType />}>
          <Item icon={<FiType />} onSelect={() => onApply({ align: 'left' })}>
            Left
          </Item>
          <Item icon={<FiType />} shortcut="⇧⌘E" onSelect={() => onApply({ align: 'center' })}>
            Center
          </Item>
          <Item icon={<FiType />} shortcut="⇧⌘R" onSelect={() => onApply({ align: 'right' })}>
            Right
          </Item>
        </Submenu>
      )}
      {formats.wrapping && (
        <Item icon={<FiType />} onSelect={() => onToggle('wrap')}>
          Toggle wrapping
        </Item>
      )}
      <Item icon={<FiDelete />} onSelect={() => onApply(undefined)}>
        Clear text formatting
      </Item>
    </>
  );
}

function FormatChoices({
  options,
  onApply,
  onApplyTextColor,
  onApplyTextStyle,
  onToggleTextStyle,
}: {
  options: ResolvedDataTableOptions;
  onApply: (key?: string) => void;
  onApplyTextColor: (key?: string) => void;
  onApplyTextStyle: (patch: DataTableTextStyle | undefined) => void;
  onToggleTextStyle: (key: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'wrap') => void;
}) {
  return (
    <>
      {options.textFormats.enabled && (
        <>
          <Submenu label="Text" icon={<FiType />}>
            <TextFormatChoices options={options} onApply={onApplyTextStyle} onToggle={onToggleTextStyle} />
          </Submenu>
          {options.formats.length > 0 && <Separator />}
        </>
      )}
      {options.formats.length > 0 && (
        <Submenu label="Background" icon={<FiDroplet />}>
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
          <Separator />
          <ContextMenu.Item className="data-table__context-item" onSelect={() => onApply()}>
            Clear background
          </ContextMenu.Item>
        </Submenu>
      )}
      {options.formats.some((entry) => entry.text) && (
        <>
          <Separator />
          <Submenu label="Text color" icon={<FiType />}>
            {options.formats
              .filter((entry) => entry.text)
              .map((entry) => (
                <ContextMenu.Item
                  key={entry.key}
                  className="data-table__context-item"
                  onSelect={() => onApplyTextColor(entry.key)}
                >
                  <span
                    className="data-table__format-swatch"
                    aria-hidden
                    style={
                      {
                        '--data-table-swatch-light': typeof entry.text === 'string' ? entry.text : entry.text!.light,
                        '--data-table-swatch-dark': typeof entry.text === 'string' ? entry.text : entry.text!.dark,
                      } as CSSProperties
                    }
                  />
                  {entry.label}
                </ContextMenu.Item>
              ))}
            <Separator />
            <ContextMenu.Item className="data-table__context-item" onSelect={() => onApplyTextColor()}>
              Clear text color
            </ContextMenu.Item>
          </Submenu>
        </>
      )}
    </>
  );
}

function Submenu({
  label,
  children,
  icon,
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  icon: ReactNode;
  disabled?: boolean;
}) {
  return (
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger className="data-table__context-item" disabled={disabled}>
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
  onApplyTextColor,
  onApplyTextStyle,
  onToggleTextStyle,
  onFreezeRows,
  onSort,
  hasSelection,
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
              <Item icon={<FiDelete />} danger disabled={!hasSelection} onSelect={onClearSelection}>
                Clear selection
              </Item>
            </>
          )}
          {target?.kind === 'cell' && (
            <>
              <Item icon={<FiCopy />} disabled={!hasSelection} shortcut="⌘C" onSelect={onCopy}>
                Copy cells
              </Item>
              <Item icon={<FiCopy />} disabled={!hasSelection} shortcut="⌘V" onSelect={onPaste}>
                Paste cells
              </Item>
              <Item icon={<FiCopy />} disabled={!hasSelection} shortcut="⌘X" onSelect={onCut}>
                Cut cells
              </Item>
              <Item icon={<FiDelete />} danger disabled={!hasSelection} shortcut="⌫" onSelect={onClearSelection}>
                Clear cells
              </Item>
              {(options.formats.length > 0 || options.textFormats.enabled) && (
                <Submenu label="Format" icon={<FiDroplet />} disabled={!hasSelection}>
                  <FormatChoices
                    options={options}
                    onApply={onApplyBackground}
                    onApplyTextColor={onApplyTextColor}
                    onApplyTextStyle={onApplyTextStyle}
                    onToggleTextStyle={onToggleTextStyle}
                  />
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
              <Submenu label="Move" icon={<BsArrowDownUp />}>
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
              {(options.formats.length > 0 || options.textFormats.enabled) && (
                <Submenu label="Format" icon={<FiDroplet />} disabled={!hasSelection}>
                  <FormatChoices
                    options={options}
                    onApply={onApplyBackground}
                    onApplyTextColor={onApplyTextColor}
                    onApplyTextStyle={onApplyTextStyle}
                    onToggleTextStyle={onToggleTextStyle}
                  />
                </Submenu>
              )}
              {options.stickyRows.enabled && (
                <Submenu label="Freeze rows" icon={<TbFreezeRow />}>
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
              <Separator />
              <Item
                icon={<FiTrash2 />}
                danger
                disabled={value.rows.length <= options.rows.min}
                onSelect={() => onDeleteRow(target.row)}
              >
                Delete row
              </Item>
            </>
          )}
          {target?.kind === 'column' && (
            <>
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
              <Submenu label="Move" icon={<BsArrowDownUp />}>
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
              {(options.formats.length > 0 || options.textFormats.enabled) && (
                <Submenu label="Format" icon={<FiDroplet />} disabled={!hasSelection}>
                  <FormatChoices
                    options={options}
                    onApply={onApplyBackground}
                    onApplyTextColor={onApplyTextColor}
                    onApplyTextStyle={onApplyTextStyle}
                    onToggleTextStyle={onToggleTextStyle}
                  />
                </Submenu>
              )}
              <Separator />
              <Item
                icon={<FiTrash2 />}
                danger
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
