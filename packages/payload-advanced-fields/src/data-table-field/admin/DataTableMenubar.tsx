'use client';

import * as Menubar from '@radix-ui/react-menubar';
import {
  ConfirmationModal,
  DialogBody,
  DialogCancel,
  DialogConfirm,
  DialogFooter,
  DialogHeader,
  DialogModal,
  Drawer,
  useModal,
} from '@payloadcms/ui';
import {
  FiChevronRight,
  FiCopy,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiArrowDown,
  FiArrowUp,
  FiDelete,
  FiDownload,
  FiHelpCircle,
  FiHash,
  FiPlus,
  FiScissors,
  FiTrash2,
  FiUpload,
} from 'react-icons/fi';
import { TbFreezeRow } from 'react-icons/tb';
import { useId, useState, type CSSProperties } from 'react';
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

const formulaHelpSections = [
  {
    title: 'Formula syntax',
    entries: [
      ['Cell references', '=A1+B1', 'Adds values from two cells.'],
      ['Arithmetic', '=(A1+B1)*2', 'Use +, -, *, /, ^, and parentheses.'],
      ['Multiple cells', '=SUM(A1,B1,C3)', 'Separate individual cells with commas.'],
      ['SUM', '=SUM(A1:A5)', 'Adds every numeric value in a range.'],
      ['AVERAGE', '=AVERAGE(B2:B6)', 'Returns the average of numeric values.'],
      ['MIN / MAX', '=MIN(C1:C5) / =MAX(C1:C5)', 'Returns the smallest or largest value.'],
      ['COUNT', '=COUNT(D1:D10)', 'Counts numeric values in a range.'],
    ],
  },
  {
    title: 'Formatted values',
    entries: [
      ['Currency values', '=SUM(A1:A3)', 'With $4.10, $2.40, and $1.50 in A1:A3, the result displays as $8.00.'],
      ['Percent values', '=A1+B1', 'With 10% and 5% in A1:B1, the result displays as 15%.'],
      ['Durations', '=A1+B1', 'With 2.40ms and 1.20ms in A1:B1, the result displays as 3.6ms.'],
      ['Dates and times', '=A1+B1', 'Add a duration to an ISO date or time to preserve its date or time display.'],
    ],
  },
] as const;

const formulaInsertOptions = [
  ['SUM', 'Adds values in the current selection.'],
  ['AVERAGE', 'Averages values in the current selection.'],
  ['MIN', 'Returns the smallest value in the current selection.'],
  ['MAX', 'Returns the largest value in the current selection.'],
  ['COUNT', 'Counts numeric values in the current selection.'],
] as const;

type Props = {
  canAddRow: boolean;
  canAddColumn: boolean;
  canAddRows: boolean;
  canAddColumns: boolean;
  maxRowsToAdd: number;
  maxColumnsToAdd: number;
  onAddRow: () => void;
  onAddColumn: () => void;
  onAddRows: (count: number) => void;
  onAddColumns: (count: number) => void;
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
  canFreezeRows: boolean;
  onFreezeThroughCurrentRow: () => void;
  onFreezeFromCurrentRow: () => void;
  onUnfreezeRows: () => void;
  onImportCSV: () => void;
  onExportCSV: () => void;
  formats: DataTableFormat[];
  hasSelection: boolean;
  formulasEnabled: boolean;
  onApplyBackground: (key?: string) => void;
  selectionLabel?: string;
  onCopySelection?: () => void;
  onInsertFormula: (functionName: (typeof formulaInsertOptions)[number][0]) => void;
};

export function DataTableMenubar({
  canAddRow,
  canAddColumn,
  canAddRows,
  canAddColumns,
  maxRowsToAdd,
  maxColumnsToAdd,
  onAddRow,
  onAddColumn,
  onAddRows,
  onAddColumns,
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
  canFreezeRows,
  onFreezeThroughCurrentRow,
  onFreezeFromCurrentRow,
  onUnfreezeRows,
  onImportCSV,
  onExportCSV,
  formats,
  hasSelection,
  formulasEnabled,
  onApplyBackground,
  selectionLabel,
  onCopySelection,
  onInsertFormula,
}: Props) {
  const { closeModal, openModal } = useModal();
  const id = useId();
  const shortcutsDrawerSlug = `data-table-keyboard-shortcuts-${id}`;
  const formulaHelpDrawerSlug = `data-table-formula-help-${id}`;
  const clearTableModalSlug = `data-table-clear-${id}`;
  const addRowsDialogSlug = `data-table-add-rows-${id}`;
  const addColumnsDialogSlug = `data-table-add-columns-${id}`;
  const [bulkCount, setBulkCount] = useState('1');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkKind, setBulkKind] = useState<'rows' | 'columns'>('rows');
  const bulkLimit = bulkKind === 'rows' ? maxRowsToAdd : maxColumnsToAdd;
  const bulkDialogSlug = bulkKind === 'rows' ? addRowsDialogSlug : addColumnsDialogSlug;
  const openBulkInsert = (kind: 'rows' | 'columns') => {
    setBulkKind(kind);
    setBulkCount('1');
    setBulkError(null);
    openModal(kind === 'rows' ? addRowsDialogSlug : addColumnsDialogSlug);
  };
  const submitBulkInsert = () => {
    const count = Number.parseInt(bulkCount, 10);
    if (!Number.isInteger(count) || count < 1 || count > bulkLimit) {
      setBulkError(
        Number.isFinite(bulkLimit)
          ? `Enter a whole number between 1 and ${bulkLimit}.`
          : 'Enter a whole number greater than 0.',
      );
      return;
    }
    if (bulkKind === 'rows') onAddRows(count);
    else onAddColumns(count);
    closeModal(bulkDialogSlug);
  };
  return (
    <>
      <div className="data-table__toolbar">
        <Menubar.Root className="data-table__menubar" aria-label="Data table actions">
          <Menubar.Menu>
            <Menubar.Trigger className="data-table__menu-trigger">Table</Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
                <Menubar.Item className="data-table__menu-item" onSelect={onImportCSV}>
                  <span className="data-table__context-icon" aria-hidden>
                    <FiUpload />
                  </span>
                  Import CSV
                </Menubar.Item>
                <Menubar.Item className="data-table__menu-item" onSelect={onExportCSV}>
                  <span className="data-table__context-icon" aria-hidden>
                    <FiDownload />
                  </span>
                  Export CSV
                </Menubar.Item>
                <Menubar.Separator className="data-table__menu-separator" />
                <Menubar.Item
                  className="data-table__menu-item data-table__menu-item--danger"
                  onSelect={() => openModal(clearTableModalSlug)}
                >
                  <span className="data-table__context-icon" aria-hidden>
                    <FiTrash2 />
                  </span>
                  Clear table
                </Menubar.Item>
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
          <Menubar.Menu>
            <Menubar.Trigger className="data-table__menu-trigger">Edit</Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
                <Menubar.Item className="data-table__menu-item" disabled={!canUndo} onSelect={onUndo}>
                  <span className="data-table__context-icon" aria-hidden>
                    <FiCornerUpLeft />
                  </span>
                  Undo
                  <kbd className="data-table__shortcut">⌘Z</kbd>
                </Menubar.Item>
                <Menubar.Item className="data-table__menu-item" disabled={!canRedo} onSelect={onRedo}>
                  <span className="data-table__context-icon" aria-hidden>
                    <FiCornerUpRight />
                  </span>
                  Redo
                  <kbd className="data-table__shortcut">⇧⌘Z</kbd>
                </Menubar.Item>
                <Menubar.Separator className="data-table__menu-separator" />
                <Menubar.Item className="data-table__menu-item" disabled={!canCopy} onSelect={onCopy}>
                  <span className="data-table__context-icon" aria-hidden>
                    <FiCopy />
                  </span>
                  Copy cells
                  <kbd className="data-table__shortcut">⌘C</kbd>
                </Menubar.Item>
                <Menubar.Item className="data-table__menu-item" disabled={!canPaste} onSelect={onPaste}>
                  <span className="data-table__context-icon" aria-hidden>
                    <FiCopy />
                  </span>
                  Paste cells
                  <kbd className="data-table__shortcut">⌘V</kbd>
                </Menubar.Item>
                <Menubar.Item className="data-table__menu-item" disabled={!canCut} onSelect={onCut}>
                  <span className="data-table__context-icon" aria-hidden>
                    <FiScissors />
                  </span>
                  Cut cells
                  <kbd className="data-table__shortcut">⌘X</kbd>
                </Menubar.Item>
                <Menubar.Item
                  className="data-table__menu-item data-table__menu-item--danger"
                  disabled={!canCopy}
                  onSelect={onClearSelection}
                >
                  <span className="data-table__context-icon" aria-hidden>
                    <FiTrash2 />
                  </span>
                  Clear cells
                  <kbd className="data-table__shortcut">⌫</kbd>
                </Menubar.Item>
                <Menubar.Separator className="data-table__menu-separator" />
                <Menubar.Sub>
                  <Menubar.SubTrigger className="data-table__menu-item" disabled={!canFreezeRows}>
                    <span className="data-table__context-icon" aria-hidden>
                      <TbFreezeRow />
                    </span>
                    Freeze rows
                    <FiChevronRight className="data-table__context-chevron" aria-hidden />
                  </Menubar.SubTrigger>
                  <Menubar.Portal>
                    <Menubar.SubContent className="data-table__context-content">
                      <Menubar.Item className="data-table__menu-item" onSelect={onFreezeThroughCurrentRow}>
                        <span className="data-table__context-icon" aria-hidden>
                          <FiArrowDown />
                        </span>
                        Freeze through current row
                      </Menubar.Item>
                      <Menubar.Item className="data-table__menu-item" onSelect={onFreezeFromCurrentRow}>
                        <span className="data-table__context-icon" aria-hidden>
                          <FiArrowUp />
                        </span>
                        Freeze from current row
                      </Menubar.Item>
                      <Menubar.Item className="data-table__menu-item" onSelect={onUnfreezeRows}>
                        <span className="data-table__context-icon" aria-hidden>
                          <FiDelete />
                        </span>
                        Unfreeze rows
                      </Menubar.Item>
                    </Menubar.SubContent>
                  </Menubar.Portal>
                </Menubar.Sub>
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
          <Menubar.Menu>
            <Menubar.Trigger className="data-table__menu-trigger">Insert</Menubar.Trigger>
            <Menubar.Portal>
              <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
                <Menubar.Item className="data-table__menu-item" disabled={!canAddRow} onSelect={onAddRow}>
                  <span className="data-table__context-icon" aria-hidden>
                    <FiPlus />
                  </span>
                  Add row
                </Menubar.Item>
                <Menubar.Item className="data-table__menu-item" disabled={!canAddColumn} onSelect={onAddColumn}>
                  <span className="data-table__context-icon" aria-hidden>
                    <FiPlus />
                  </span>
                  Add column
                </Menubar.Item>
                <Menubar.Separator className="data-table__menu-separator" />
                <Menubar.Item
                  className="data-table__menu-item"
                  disabled={!canAddRows}
                  onSelect={() => openBulkInsert('rows')}
                >
                  <span className="data-table__context-icon" aria-hidden>
                    <FiPlus />
                  </span>
                  Add rows…
                </Menubar.Item>
                <Menubar.Item
                  className="data-table__menu-item"
                  disabled={!canAddColumns}
                  onSelect={() => openBulkInsert('columns')}
                >
                  <span className="data-table__context-icon" aria-hidden>
                    <FiPlus />
                  </span>
                  Add columns…
                </Menubar.Item>
                {formulasEnabled && (
                  <>
                    <Menubar.Separator className="data-table__menu-separator" />
                    <Menubar.Sub>
                      <Menubar.SubTrigger className="data-table__menu-item" disabled={!hasSelection}>
                        <span className="data-table__context-icon" aria-hidden>
                          <FiHash />
                        </span>
                        Formulas
                        <FiChevronRight className="data-table__menu-chevron" aria-hidden />
                      </Menubar.SubTrigger>
                      <Menubar.Portal>
                        <Menubar.SubContent className="data-table__context-content">
                          {formulaInsertOptions.map(([name, description]) => (
                            <Menubar.Item
                              key={name}
                              className="data-table__menu-item"
                              disabled={!hasSelection}
                              title={description}
                              onSelect={() => onInsertFormula(name)}
                            >
                              <span className="data-table__context-icon" aria-hidden>
                                <FiHash />
                              </span>
                              {name}
                            </Menubar.Item>
                          ))}
                        </Menubar.SubContent>
                      </Menubar.Portal>
                    </Menubar.Sub>
                  </>
                )}
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
          {formats.length > 0 && (
            <Menubar.Menu>
              <Menubar.Trigger className="data-table__menu-trigger" disabled={!hasSelection}>
                Format
              </Menubar.Trigger>
              <Menubar.Portal>
                <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
                  <Menubar.Label className="data-table__menu-label">Background</Menubar.Label>
                  {formats.map((entry) => (
                    <Menubar.Item
                      key={entry.key}
                      className="data-table__menu-item"
                      disabled={!hasSelection}
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
                  <Menubar.Item
                    className="data-table__menu-item"
                    disabled={!hasSelection}
                    onSelect={() => onApplyBackground()}
                  >
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
                  <span className="data-table__context-icon" aria-hidden>
                    <FiHelpCircle />
                  </span>
                  Keyboard shortcuts
                </Menubar.Item>
                {formulasEnabled && <Menubar.Separator className="data-table__menu-separator" />}
                {formulasEnabled && (
                  <Menubar.Item className="data-table__menu-item" onSelect={() => openModal(formulaHelpDrawerSlug)}>
                    <span className="data-table__context-icon" aria-hidden>
                      <FiHash />
                    </span>
                    Formula help
                  </Menubar.Item>
                )}
              </Menubar.Content>
            </Menubar.Portal>
          </Menubar.Menu>
        </Menubar.Root>
        {selectionLabel && (
          <div className="data-table__selection-indicator">
            <span>{selectionLabel}</span>
            <button
              type="button"
              className="data-table__selection-copy"
              aria-label="Copy current selection"
              title="Copy current selection"
              onClick={onCopySelection}
            >
              <FiCopy aria-hidden />
            </button>
          </div>
        )}
      </div>
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
      <Drawer
        slug={formulaHelpDrawerSlug}
        title="Formula help"
        className="data-table__help-drawer data-table__formula-help-drawer"
      >
        <div className="data-table__help-content">
          <p className="data-table__help-intro">
            Enter a formula in a cell. References use spreadsheet addresses such as A1; the examples below show the
            supported calculations.
          </p>
          <div className="data-table__formula-sections">
            {formulaHelpSections.map((section) => (
              <section className="data-table__formula-section" key={section.title}>
                <h3 className="data-table__help-section-title">{section.title}</h3>
                {section.title === 'Formatted values' && (
                  <p className="data-table__formula-section-note">
                    Formatted operands must use compatible formats. Mixing duration units or currencies is not supported
                    and returns <code>#VALUE!</code>.
                  </p>
                )}
                <dl className="data-table__formula-list">
                  {section.entries.map(([label, example, description]) => (
                    <div className="data-table__formula-row" key={label}>
                      <dt>{label}</dt>
                      <dd>
                        <code>{example}</code>
                        <span>{description}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </Drawer>
      <ConfirmationModal
        modalSlug={clearTableModalSlug}
        heading="Clear table?"
        body="This will remove all rows, columns, and cell contents from the table."
        confirmLabel="Clear table"
        confirmingLabel="Clearing table..."
        onConfirm={onClear}
      />
      <DialogModal slug={addRowsDialogSlug} className="data-table__bulk-dialog" size="small">
        <DialogHeader title="Add rows" />
        <DialogBody>
          <div className="data-table__bulk-field">
            <label htmlFor={`${id}-bulk-count`}>Number of rows</label>
            <input
              id={`${id}-bulk-count`}
              className="data-table__bulk-input"
              type="number"
              min={1}
              max={Number.isFinite(maxRowsToAdd) ? maxRowsToAdd : undefined}
              step={1}
              value={bulkKind === 'rows' ? bulkCount : '1'}
              onChange={(event) => setBulkCount(event.target.value)}
              autoFocus
            />
          </div>
          {Number.isFinite(maxRowsToAdd) && (
            <p className="data-table__bulk-hint">Up to {maxRowsToAdd} rows can be added.</p>
          )}
          {bulkKind === 'rows' && bulkError && <p className="data-table__bulk-error">{bulkError}</p>}
        </DialogBody>
        <DialogFooter>
          <DialogCancel label="Cancel" onClick={() => closeModal(addRowsDialogSlug)} />
          <DialogConfirm label="Add rows" onClick={submitBulkInsert} />
        </DialogFooter>
      </DialogModal>
      <DialogModal slug={addColumnsDialogSlug} className="data-table__bulk-dialog" size="small">
        <DialogHeader title="Add columns" />
        <DialogBody>
          <div className="data-table__bulk-field">
            <label htmlFor={`${id}-bulk-count`}>Number of columns</label>
            <input
              id={`${id}-bulk-count`}
              className="data-table__bulk-input"
              type="number"
              min={1}
              max={Number.isFinite(maxColumnsToAdd) ? maxColumnsToAdd : undefined}
              step={1}
              value={bulkKind === 'columns' ? bulkCount : '1'}
              onChange={(event) => setBulkCount(event.target.value)}
              autoFocus
            />
          </div>
          {Number.isFinite(maxColumnsToAdd) && (
            <p className="data-table__bulk-hint">Up to {maxColumnsToAdd} columns can be added.</p>
          )}
          {bulkKind === 'columns' && bulkError && <p className="data-table__bulk-error">{bulkError}</p>}
        </DialogBody>
        <DialogFooter>
          <DialogCancel label="Cancel" onClick={() => closeModal(addColumnsDialogSlug)} />
          <DialogConfirm label="Add columns" onClick={submitBulkInsert} />
        </DialogFooter>
      </DialogModal>
    </>
  );
}
