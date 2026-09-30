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
  FiAlignCenter,
  FiAlignLeft,
  FiAlignRight,
  FiBold,
  FiChevronRight,
  FiCopy,
  FiCornerUpLeft,
  FiCornerUpRight,
  FiArrowDown,
  FiArrowUp,
  FiCheck,
  FiDelete,
  FiDroplet,
  FiDownload,
  FiHelpCircle,
  FiHash,
  FiItalic,
  FiLink,
  FiPlus,
  FiScissors,
  FiTrash2,
  FiType,
  FiUnderline,
  FiUpload,
} from 'react-icons/fi';
import { MdStrikethroughS, MdWrapText } from 'react-icons/md';
import { TbClearFormatting, TbColumnInsertRight, TbFreezeRow, TbLinkOff, TbRowInsertBottom } from 'react-icons/tb';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type {
  DataTableFormat,
  DataTableLink,
  DataTableTextStyle,
  ResolvedDataTableTextFormats,
} from '../shared/types.js';
import { isSafeDataTableURL } from '../shared/dataTable.js';

const shortcuts = [
  ['Copy selected cells', '⌘ C / Ctrl C'],
  ['Paste into the active cell', '⌘ V / Ctrl V'],
  ['Cut selected cells', '⌘ X / Ctrl X'],
  ['Select the current column', '⌘ Space / Ctrl Space'],
  ['Select the current row', '⇧ Space'],
  ['Insert selected columns', '⌘ ⌥ = / Ctrl Alt ='],
  ['Delete selected columns', '⌘ ⌥ - / Ctrl Alt -'],
  ['Insert selected rows', '⌘ ⌥ = / Ctrl Alt ='],
  ['Delete selected rows', '⌘ ⌥ - / Ctrl Alt -'],
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

function TextFormatChoices({
  formats,
  activeLink,
  onOpenLink,
  onClearLink,
  onApply,
  onToggle,
}: {
  formats: ResolvedDataTableTextFormats;
  activeLink?: DataTableLink;
  onOpenLink: () => void;
  onClearLink: () => void;
  onApply: (patch: DataTableTextStyle | undefined) => void;
  onToggle: (key: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'wrap') => void;
}) {
  return (
    <>
      {formats.bold && (
        <Menubar.Item className="data-table__menu-item" onSelect={() => onToggle('bold')}>
          <span className="data-table__context-icon" aria-hidden>
            <FiBold />
          </span>
          Bold <kbd className="data-table__shortcut">⌘B</kbd>
        </Menubar.Item>
      )}
      {formats.italic && (
        <Menubar.Item className="data-table__menu-item" onSelect={() => onToggle('italic')}>
          <span className="data-table__context-icon" aria-hidden>
            <FiItalic />
          </span>
          Italic <kbd className="data-table__shortcut">⌘I</kbd>
        </Menubar.Item>
      )}
      {formats.underline && (
        <Menubar.Item className="data-table__menu-item" onSelect={() => onToggle('underline')}>
          <span className="data-table__context-icon" aria-hidden>
            <FiUnderline />
          </span>
          Underline <kbd className="data-table__shortcut">⌘U</kbd>
        </Menubar.Item>
      )}
      {formats.strikethrough && (
        <Menubar.Item className="data-table__menu-item" onSelect={() => onToggle('strikethrough')}>
          <span className="data-table__context-icon" aria-hidden>
            <MdStrikethroughS />
          </span>
          Strikethrough <kbd className="data-table__shortcut">⇧⌘X</kbd>
        </Menubar.Item>
      )}
      {(formats.alignment || formats.wrapping) && <Menubar.Separator className="data-table__menu-separator" />}
      {formats.alignment && (
        <Menubar.Sub>
          <Menubar.SubTrigger className="data-table__menu-item">
            <span className="data-table__context-icon" aria-hidden>
              <FiAlignLeft />
            </span>
            Alignment
            <FiChevronRight className="data-table__menu-chevron" aria-hidden />
          </Menubar.SubTrigger>
          <Menubar.Portal>
            <Menubar.SubContent className="data-table__context-content">
              <Menubar.Item className="data-table__menu-item" onSelect={() => onApply({ align: 'left' })}>
                <span className="data-table__context-icon" aria-hidden>
                  <FiAlignLeft />
                </span>
                Left
              </Menubar.Item>
              <Menubar.Item className="data-table__menu-item" onSelect={() => onApply({ align: 'center' })}>
                <span className="data-table__context-icon" aria-hidden>
                  <FiAlignCenter />
                </span>
                Center <kbd className="data-table__shortcut">⇧⌘E</kbd>
              </Menubar.Item>
              <Menubar.Item className="data-table__menu-item" onSelect={() => onApply({ align: 'right' })}>
                <span className="data-table__context-icon" aria-hidden>
                  <FiAlignRight />
                </span>
                Right <kbd className="data-table__shortcut">⇧⌘R</kbd>
              </Menubar.Item>
            </Menubar.SubContent>
          </Menubar.Portal>
        </Menubar.Sub>
      )}
      {formats.wrapping && (
        <Menubar.Item className="data-table__menu-item" onSelect={() => onToggle('wrap')}>
          <span className="data-table__context-icon" aria-hidden>
            <MdWrapText />
          </span>
          Toggle wrapping
        </Menubar.Item>
      )}
      {formats.link && (
        <>
          <Menubar.Separator className="data-table__menu-separator" />
          <Menubar.Item className="data-table__menu-item" onSelect={activeLink ? onClearLink : onOpenLink}>
            <span className="data-table__context-icon" aria-hidden>
              {activeLink ? <TbLinkOff /> : <FiLink />}
            </span>
            {activeLink ? 'Remove link' : 'Add link'}
            <kbd className="data-table__shortcut">⌘K</kbd>
          </Menubar.Item>
        </>
      )}
      <Menubar.Item className="data-table__menu-item" onSelect={() => onApply(undefined)}>
        Clear text formatting
      </Menubar.Item>
    </>
  );
}

function TextFormattingToolbar({
  formats,
  activeStyle,
  activeLink,
  onOpenLink,
  onClearLink,
  onApply,
  onToggle,
}: {
  formats: ResolvedDataTableTextFormats;
  activeStyle?: DataTableTextStyle;
  activeLink?: DataTableLink;
  onOpenLink: () => void;
  onClearLink: () => void;
  onApply: (patch: DataTableTextStyle | undefined) => void;
  onToggle: (key: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'wrap') => void;
}) {
  const hasTextStyleOptions = formats.bold || formats.italic || formats.underline || formats.strikethrough;
  const actions = [
    formats.bold && {
      label: 'Bold',
      icon: <FiBold aria-hidden />,
      onClick: () => onToggle('bold'),
      active: activeStyle?.bold,
    },
    formats.italic && {
      label: 'Italic',
      icon: <FiItalic aria-hidden />,
      onClick: () => onToggle('italic'),
      active: activeStyle?.italic,
    },
    formats.underline && {
      label: 'Underline',
      icon: <FiUnderline aria-hidden />,
      onClick: () => onToggle('underline'),
      active: activeStyle?.underline,
    },
    formats.strikethrough && {
      label: 'Strikethrough',
      icon: <MdStrikethroughS aria-hidden />,
      onClick: () => onToggle('strikethrough'),
      active: activeStyle?.strikethrough,
    },
    hasTextStyleOptions && formats.alignment && { divider: true },
    formats.alignment && {
      label: 'Align left',
      icon: <FiAlignLeft aria-hidden />,
      onClick: () => onApply({ align: 'left' }),
      // Left is the table's default alignment when no explicit style is stored.
      active: !activeStyle?.align || activeStyle.align === 'left',
    },
    formats.alignment && {
      label: 'Align center',
      icon: <FiAlignCenter aria-hidden />,
      onClick: () => onApply({ align: 'center' }),
      active: activeStyle?.align === 'center',
    },
    formats.alignment && {
      label: 'Align right',
      icon: <FiAlignRight aria-hidden />,
      onClick: () => onApply({ align: 'right' }),
      active: activeStyle?.align === 'right',
    },
    formats.wrapping && {
      label: 'Toggle wrapping',
      icon: <MdWrapText aria-hidden />,
      onClick: () => onToggle('wrap'),
      active: activeStyle?.wrap !== false,
    },
    (hasTextStyleOptions || formats.alignment || formats.wrapping) && { divider: true },
    formats.link && {
      label: activeLink ? 'Remove link' : 'Add link',
      icon: activeLink ? <TbLinkOff aria-hidden /> : <FiLink aria-hidden />,
      onClick: activeLink ? onClearLink : onOpenLink,
      active: Boolean(activeLink),
    },
    { label: 'Clear text formatting', icon: <TbClearFormatting aria-hidden />, onClick: () => onApply(undefined) },
  ].filter(Boolean) as Array<
    { divider: true } | { label: string; icon: React.ReactNode; onClick: () => void; active?: boolean }
  >;

  return (
    <div className="data-table__text-toolbar" aria-label="Text formatting">
      {actions.map((action, index) =>
        'divider' in action ? (
          <span className="data-table__text-toolbar-divider" key={`divider-${index}`} aria-hidden />
        ) : (
          <button
            className="data-table__text-toolbar-button"
            key={action.label}
            type="button"
            aria-label={action.label}
            title={action.label}
            aria-pressed={action.active ?? false}
            data-active={action.active || undefined}
            onClick={action.onClick}
          >
            {action.icon}
          </button>
        ),
      )}
    </div>
  );
}

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
  textFormats: ResolvedDataTableTextFormats;
  activeTextStyle?: DataTableTextStyle;
  activeLink?: DataTableLink;
  hasSelection: boolean;
  formulasEnabled: boolean;
  onApplyBackground: (key?: string) => void;
  onApplyTextColor: (key?: string) => void;
  onApplyLink: (link: DataTableLink) => void;
  onClearLink: () => void;
  onApplyTextStyle: (patch: DataTableTextStyle | undefined) => void;
  onToggleTextStyle: (key: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'wrap') => void;
  selectionLabel?: string;
  onCopySelection?: () => void | Promise<void>;
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
  textFormats,
  activeTextStyle,
  activeLink,
  hasSelection,
  formulasEnabled,
  onApplyBackground,
  onApplyTextColor,
  onApplyLink,
  onClearLink,
  onApplyTextStyle,
  onToggleTextStyle,
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
  const linkDialogSlug = `data-table-link-${id}`;
  const [bulkCount, setBulkCount] = useState('1');
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkKind, setBulkKind] = useState<'rows' | 'columns'>('rows');
  const [linkURL, setLinkURL] = useState('');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [selectionCopied, setSelectionCopied] = useState(false);
  const selectionCopyTimer = useRef<number | null>(null);
  const bulkLimit = bulkKind === 'rows' ? maxRowsToAdd : maxColumnsToAdd;
  const bulkDialogSlug = bulkKind === 'rows' ? addRowsDialogSlug : addColumnsDialogSlug;
  useEffect(() => {
    return () => {
      if (selectionCopyTimer.current !== null) window.clearTimeout(selectionCopyTimer.current);
    };
  }, []);
  useEffect(() => {
    if (!textFormats.link || !hasSelection) return;
    const handleLinkShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        const target = event.target as HTMLElement | null;
        if (target?.closest('.data-table')) {
          event.preventDefault();
          openLinkDialog();
        }
      }
    };
    document.addEventListener('keydown', handleLinkShortcut);
    return () => document.removeEventListener('keydown', handleLinkShortcut);
  }, [hasSelection, textFormats.link, activeLink]);
  const copyCurrentSelection = async () => {
    if (!onCopySelection) return;
    try {
      await onCopySelection();
      setSelectionCopied(true);
      if (selectionCopyTimer.current !== null) window.clearTimeout(selectionCopyTimer.current);
      selectionCopyTimer.current = window.setTimeout(() => setSelectionCopied(false), 1_000);
    } catch {
      setSelectionCopied(false);
    }
  };
  const openBulkInsert = (kind: 'rows' | 'columns') => {
    setBulkKind(kind);
    setBulkCount('1');
    setBulkError(null);
    openModal(kind === 'rows' ? addRowsDialogSlug : addColumnsDialogSlug);
  };
  const openLinkDialog = () => {
    setLinkURL(activeLink?.url ?? '');
    setLinkError(null);
    openModal(linkDialogSlug);
  };
  const submitLink = () => {
    const url = linkURL.trim();
    if (!isSafeDataTableURL(url)) {
      setLinkError('Enter a valid http, https, or mailto URL.');
      return;
    }
    onApplyLink({ url });
    closeModal(linkDialogSlug);
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
        <div className="data-table__toolbar-main">
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
                  <Menubar.Sub>
                    <Menubar.SubTrigger className="data-table__menu-item">
                      <span className="data-table__context-icon" aria-hidden>
                        <TbRowInsertBottom />
                      </span>
                      Rows
                      <FiChevronRight className="data-table__menu-chevron" aria-hidden />
                    </Menubar.SubTrigger>
                    <Menubar.Portal>
                      <Menubar.SubContent className="data-table__context-content">
                        <Menubar.Item className="data-table__menu-item" disabled={!canAddRow} onSelect={onAddRow}>
                          <span className="data-table__context-icon" aria-hidden>
                            <TbRowInsertBottom />
                          </span>
                          Add row
                          <kbd className="data-table__shortcut">⌘⌥=</kbd>
                        </Menubar.Item>
                        <Menubar.Item
                          className="data-table__menu-item"
                          disabled={!canAddRows}
                          onSelect={() => openBulkInsert('rows')}
                        >
                          <span className="data-table__context-icon" aria-hidden>
                            <TbRowInsertBottom />
                          </span>
                          Add rows…
                        </Menubar.Item>
                      </Menubar.SubContent>
                    </Menubar.Portal>
                  </Menubar.Sub>
                  <Menubar.Sub>
                    <Menubar.SubTrigger className="data-table__menu-item">
                      <span className="data-table__context-icon" aria-hidden>
                        <TbColumnInsertRight />
                      </span>
                      Columns
                      <FiChevronRight className="data-table__menu-chevron" aria-hidden />
                    </Menubar.SubTrigger>
                    <Menubar.Portal>
                      <Menubar.SubContent className="data-table__context-content">
                        <Menubar.Item className="data-table__menu-item" disabled={!canAddColumn} onSelect={onAddColumn}>
                          <span className="data-table__context-icon" aria-hidden>
                            <TbColumnInsertRight />
                          </span>
                          Add column
                          <kbd className="data-table__shortcut">⌘⌥=</kbd>
                        </Menubar.Item>
                        <Menubar.Item
                          className="data-table__menu-item"
                          disabled={!canAddColumns}
                          onSelect={() => openBulkInsert('columns')}
                        >
                          <span className="data-table__context-icon" aria-hidden>
                            <TbColumnInsertRight />
                          </span>
                          Add columns…
                        </Menubar.Item>
                      </Menubar.SubContent>
                    </Menubar.Portal>
                  </Menubar.Sub>
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
            {(formats.length > 0 || textFormats.enabled) && (
              <Menubar.Menu>
                <Menubar.Trigger className="data-table__menu-trigger" disabled={!hasSelection}>
                  Format
                </Menubar.Trigger>
                <Menubar.Portal>
                  <Menubar.Content className="data-table__menu-content" align="start" sideOffset={5}>
                    {textFormats.enabled && (
                      <>
                        <Menubar.Sub>
                          <Menubar.SubTrigger className="data-table__menu-item" disabled={!hasSelection}>
                            <span className="data-table__context-icon" aria-hidden>
                              <FiType />
                            </span>
                            Text
                            <FiChevronRight className="data-table__menu-chevron" aria-hidden />
                          </Menubar.SubTrigger>
                          <Menubar.Portal>
                            <Menubar.SubContent className="data-table__context-content">
                              <TextFormatChoices
                                formats={textFormats}
                                activeLink={activeLink}
                                onOpenLink={openLinkDialog}
                                onClearLink={onClearLink}
                                onApply={onApplyTextStyle}
                                onToggle={onToggleTextStyle}
                              />
                            </Menubar.SubContent>
                          </Menubar.Portal>
                        </Menubar.Sub>
                      </>
                    )}
                    {formats.length > 0 && (
                      <>
                        {textFormats.enabled && <Menubar.Separator className="data-table__menu-separator" />}
                        <Menubar.Sub>
                          <Menubar.SubTrigger className="data-table__menu-item" disabled={!hasSelection}>
                            <span className="data-table__context-icon" aria-hidden>
                              <FiDroplet />
                            </span>
                            Background
                            <FiChevronRight className="data-table__menu-chevron" aria-hidden />
                          </Menubar.SubTrigger>
                          <Menubar.Portal>
                            <Menubar.SubContent className="data-table__context-content">
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
                                          typeof entry.background === 'string'
                                            ? entry.background
                                            : entry.background.light,
                                        '--data-table-swatch-dark':
                                          typeof entry.background === 'string'
                                            ? entry.background
                                            : entry.background.dark,
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
                            </Menubar.SubContent>
                          </Menubar.Portal>
                        </Menubar.Sub>
                        {formats.some((entry) => entry.text) && (
                          <Menubar.Separator className="data-table__menu-separator" />
                        )}
                        {formats.some((entry) => entry.text) && (
                          <Menubar.Sub>
                            <Menubar.SubTrigger className="data-table__menu-item" disabled={!hasSelection}>
                              <span className="data-table__context-icon" aria-hidden>
                                <FiType />
                              </span>
                              Text color
                              <FiChevronRight className="data-table__menu-chevron" aria-hidden />
                            </Menubar.SubTrigger>
                            <Menubar.Portal>
                              <Menubar.SubContent className="data-table__context-content">
                                {formats
                                  .filter((entry) => entry.text)
                                  .map((entry) => (
                                    <Menubar.Item
                                      key={entry.key}
                                      className="data-table__menu-item"
                                      disabled={!hasSelection}
                                      onSelect={() => onApplyTextColor(entry.key)}
                                    >
                                      <span
                                        className="data-table__format-swatch"
                                        aria-hidden
                                        style={
                                          {
                                            '--data-table-swatch-light':
                                              typeof entry.text === 'string' ? entry.text : entry.text!.light,
                                            '--data-table-swatch-dark':
                                              typeof entry.text === 'string' ? entry.text : entry.text!.dark,
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
                                  onSelect={() => onApplyTextColor()}
                                >
                                  Clear text color
                                </Menubar.Item>
                              </Menubar.SubContent>
                            </Menubar.Portal>
                          </Menubar.Sub>
                        )}
                      </>
                    )}
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
          {hasSelection && textFormats.enabled && (
            <TextFormattingToolbar
              formats={textFormats}
              activeStyle={activeTextStyle}
              activeLink={activeLink}
              onOpenLink={openLinkDialog}
              onClearLink={onClearLink}
              onApply={onApplyTextStyle}
              onToggle={onToggleTextStyle}
            />
          )}
        </div>
        {selectionLabel && (
          <div className="data-table__selection-indicator">
            <span>{selectionLabel}</span>
            <button
              type="button"
              className="data-table__selection-copy"
              aria-label={selectionCopied ? 'Selection copied' : 'Copy current selection'}
              title={selectionCopied ? 'Selection copied' : 'Copy current selection'}
              onClick={copyCurrentSelection}
            >
              {selectionCopied ? <FiCheck aria-hidden /> : <FiCopy aria-hidden />}
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
      <DialogModal slug={linkDialogSlug} className="data-table__link-dialog" size="small">
        <DialogHeader title={activeLink ? 'Edit link' : 'Add link'} />
        <DialogBody>
          <div className="data-table__link-field">
            <label htmlFor={`${id}-link-url`}>Enter a URL</label>
            <input
              id={`${id}-link-url`}
              className="data-table__link-input"
              type="url"
              value={linkURL}
              onChange={(event) => setLinkURL(event.target.value)}
              autoFocus
            />
          </div>
          {linkError && <p className="data-table__bulk-error">{linkError}</p>}
        </DialogBody>
        <DialogFooter>
          <DialogCancel label="Cancel" onClick={() => closeModal(linkDialogSlug)} />
          <DialogConfirm label={activeLink ? 'Save link' : 'Add link'} onClick={submitLink} />
        </DialogFooter>
      </DialogModal>
    </>
  );
}
