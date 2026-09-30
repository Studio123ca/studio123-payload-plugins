import type { Meta, StoryObj } from '@storybook/react-vite';
import { useAllFormFields } from '@payloadcms/ui';
import { reduceFieldsToValues } from 'payload/shared';
import { useEffect, useMemo, useState } from 'react';
import { DataTableField } from '../src/data-table-field/admin/DataTableField.js';
import { dataTableField } from '../src/data-table-field/server/field.js';
import { createDataTable, resolveDataTableOptions } from '../src/data-table-field/shared/dataTable.js';
import { csvToDataTable } from '../src/data-table-field/shared/csv.js';
import type { DataTableValue, ResolvedDataTableOptions } from '../src/data-table-field/shared/types.js';
import { PayloadField, commonArgs, commonArgTypes, fieldProps } from './support/PayloadField.js';
import type { FieldControls } from './support/PayloadField.js';

type Args = FieldControls & {
  columns: { initial: number; max?: number; min: number };
  rows: { initial: number; max?: number; min: number };
  maxHeight: number;
  formulas: boolean | { enabled?: boolean; compute?: boolean };
  apiResponse: { includeIds?: boolean; computeFormulas?: boolean };
  formats: Array<{
    key: string;
    label: string;
    background: string | { light: string; dark: string };
    text?: string | { light: string; dark: string };
  }>;
  textFormats:
    | boolean
    | {
        enabled?: boolean;
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        strikethrough?: boolean;
        alignment?: boolean;
        wrapping?: boolean;
        link?: boolean;
      };
  stickyRows: { enabled?: boolean; top?: number; bottom?: number };
};

const options = resolveDataTableOptions();
const example = createDataTable(options);
example.columns[0].label = 'Product';
example.columns[1].label = 'Price';
example.columns[2].label = 'Notes';
example.rows[0].cells = ['Widget', '$24.00', 'Available'];
example.rows[1].cells = ['Gizmo', '$40.00', 'Made to order'];
const formulaOptions = resolveDataTableOptions({
  columns: { initial: 3 },
  rows: { initial: 3 },
  formulas: { enabled: true },
  apiResponse: { computeFormulas: true },
});
const formulaExample = createDataTable(formulaOptions);
formulaExample.columns[0].label = 'Units';
formulaExample.columns[1].label = 'Price';
formulaExample.columns[2].label = 'Total';
formulaExample.rows[0].cells = ['2', '12.5', { formula: '=A1*B1' }];
formulaExample.rows[1].cells = ['3', '8', { formula: '=A2*B2' }];
formulaExample.rows[2].cells = ['Total', '', { formula: '=SUM(C1:C2)' }];
const formatOptions = resolveDataTableOptions({
  columns: { initial: 3 },
  rows: { initial: 3 },
  formats: [
    { key: 'highlight', label: 'Highlight', background: 'var(--color-bg-warning-tertiary, #fff3c4)' },
    { key: 'success', label: 'Success', background: 'var(--color-bg-success-tertiary, #d9f0df)' },
  ],
});
const formattingExample = createDataTable(
  resolveDataTableOptions({
    ...formatOptions,
    rows: { initial: 4 },
    textFormats: true,
  }),
);
formattingExample.columns[0].label = 'Product';
formattingExample.columns[1].label = 'Status';
formattingExample.columns[2].label = 'Notes';
formattingExample.rows[0].cells = ['Widget', 'Ready', 'Background and text formatting'];
formattingExample.rows[1].cells = ['Gizmo', 'Review', 'Select cells, then use Format'];
formattingExample.rows[2].cells = [
  'Wrapping test',
  'Wrapped',
  'This deliberately long cell value should wrap across multiple lines when wrapping is enabled.',
];
formattingExample.rows[3].cells = [
  'No wrapping',
  'Toggle me',
  'This deliberately long cell value starts without wrapping so the toolbar can toggle it back on.',
];
formattingExample.appearance = {
  rows: { [formattingExample.rows[0].id]: 'highlight' },
  text: {
    [formattingExample.rows[0].id]: {
      [formattingExample.columns[0].id]: { bold: true },
      [formattingExample.columns[1].id]: { italic: true, align: 'center' },
    },
    [formattingExample.rows[3].id]: {
      [formattingExample.columns[2].id]: { wrap: false },
    },
  },
  links: {
    [formattingExample.rows[0].id]: {
      [formattingExample.columns[0].id]: { url: 'https://payloadcms.com' },
    },
  },
};
const formattedValuesExample = createDataTable(
  resolveDataTableOptions({
    columns: { initial: 10 },
    rows: { initial: 4 },
    formulas: { enabled: true },
  }),
);
[
  'Currency',
  'Percent',
  'Duration',
  'Date',
  'Time',
  'Date difference',
  'Time offset',
  'Mixed units',
  'Formula',
  'Notes',
].forEach((label, index) => {
  formattedValuesExample.columns[index].label = label;
});
formattedValuesExample.rows[0].cells = [
  '$4.10',
  '10%',
  '2.40ms',
  '2026-09-30',
  '12:30',
  '1d',
  '1h',
  '1s',
  '2',
  'Compatible formats',
];
formattedValuesExample.rows[1].cells = [
  '$1.50',
  '5%',
  '1.20ms',
  '2026-10-02',
  '2h',
  '',
  '1h',
  '2.40ms',
  '3',
  'Mixed units return #VALUE!',
];
formattedValuesExample.rows[2].cells = [
  { formula: '=SUM(A1:A2)' },
  { formula: '=B1+B2' },
  { formula: '=C1+C2' },
  { formula: '=D1+F1' },
  { formula: '=E1+G1' },
  { formula: '=D2-D1' },
  { formula: '=G1+E2' },
  { formula: '=H1+H2' },
  { formula: '=A3*B3' },
  'Duration units and currencies must match.',
];
formattedValuesExample.rows[3].cells = [
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'Formatted results retain compatible display formats.',
];
const freezeOptions = resolveDataTableOptions({
  columns: { initial: 3 },
  rows: { initial: 8 },
  stickyRows: { enabled: true, top: 1, bottom: 1 },
});
const freezeExample = createDataTable(freezeOptions);
freezeExample.columns.forEach((column, index) => {
  column.label = ['Name', 'Status', 'Notes'][index] ?? column.label;
});
freezeExample.rows.forEach((row, index) => {
  row.cells = [`Row ${index + 1}`, index % 2 ? 'In progress' : 'Complete', 'Scroll to test sticky rows'];
});
freezeExample.appearance = { stickyRows: { top: 1, bottom: 1 } };

function LargeDataTableStory(args: Args, { globals }: any) {
  const [value, setValue] = useState<DataTableValue | null>(null);
  const options = useMemo(() => resolveDataTableOptions(args), [args]);
  useEffect(() => {
    let active = true;
    fetch('./customers-1000.csv')
      .then((response) => response.text())
      .then((csv) => {
        if (active) setValue(csvToDataTable(csv, options));
      });
    return () => {
      active = false;
    };
  }, [options]);
  if (!value) return <p>Loading large data table…</p>;
  return (
    <PayloadField args={{ ...args, initialValue: value }} theme={globals.theme} locale={globals.locale}>
      <DataTableField {...fieldProps(args, 'json')} options={options} maxHeight={args.maxHeight} />
    </PayloadField>
  );
}

function APIResponsePanel({ options }: { options: ResolvedDataTableOptions }) {
  const [fields] = useAllFormFields();
  const value = reduceFieldsToValues(fields, true).example ?? null;
  const response = useMemo(() => {
    const field = dataTableField({
      formulas: { enabled: options.formulas.enabled },
      apiResponse: options.apiResponse,
    });
    const afterRead = field.hooks?.afterRead?.[0] as ((args: { value: unknown }) => unknown) | undefined;
    return afterRead ? afterRead({ value }) : value;
  }, [options, value]);
  return (
    <aside className="story-value" data-testid="api-response">
      <div className="story-value__heading">
        <strong>API response</strong>
        <span>
          IDs: {options.apiResponse.includeIds ? 'on' : 'off'} · Formulas:{' '}
          {options.apiResponse.computeFormulas ? 'computed' : 'raw'}
        </span>
      </div>
      <pre>{JSON.stringify(response, null, 2)}</pre>
    </aside>
  );
}

function storyColumnName(index: number) {
  let name = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function PaginatedAPIResponsePanel({ value, options }: { value: DataTableValue; options: ResolvedDataTableOptions }) {
  const [page, setPage] = useState(1);
  const pageSize = 50;
  const totalRows = value.rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);
  const rowOffset = (currentPage - 1) * pageSize;
  const pageValue = {
    ...value,
    rows: value.rows.slice(rowOffset, currentPage * pageSize),
  };
  const response = useMemo(() => {
    const field = dataTableField({
      apiResponse: { includeIds: true, computeFormulas: options.apiResponse.computeFormulas },
    });
    const afterRead = field.hooks?.afterRead?.[0] as ((args: { value: unknown }) => unknown) | undefined;
    const pageResponse = afterRead ? afterRead({ value: pageValue }) : pageValue;
    const responseRows = (pageResponse as { rows: Array<{ rowId?: string; cells: Array<Record<string, unknown>> }> })
      .rows;
    return {
      ...(pageResponse as Record<string, unknown>),
      rows: responseRows.map((row, pageRowIndex) => ({
        ...row,
        rowId: value.rows[rowOffset + pageRowIndex]?.id ?? row.rowId,
        cells: row.cells.map((cell, columnIndex) => ({
          ...cell,
          cellId: `${storyColumnName(columnIndex)}${rowOffset + pageRowIndex + 1}`,
        })),
      })),
      pagination: {
        page: currentPage,
        limit: pageSize,
        totalRows,
        totalPages,
        hasPreviousPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
    };
  }, [currentPage, options.apiResponse.computeFormulas, pageValue, rowOffset, totalPages, totalRows, value.rows]);
  return (
    <aside className="story-value" data-testid="paginated-api-response">
      <div className="story-value__heading">
        <strong>Paginated API response</strong>
        <span>
          Page {currentPage} of {totalPages} · {pageSize} rows per page
        </span>
      </div>
      <div className="story-value__actions">
        <button type="button" disabled={currentPage === 1} onClick={() => setPage((current) => current - 1)}>
          Previous
        </button>
        <button type="button" disabled={currentPage === totalPages} onClick={() => setPage((current) => current + 1)}>
          Next
        </button>
      </div>
      <pre>{JSON.stringify(response, null, 2)}</pre>
    </aside>
  );
}

function PaginatedAPIStory(args: Args, { globals }: any) {
  const [value, setValue] = useState<DataTableValue | null>(null);
  const options = useMemo(() => resolveDataTableOptions(args), [args]);
  useEffect(() => {
    let active = true;
    fetch('./customers-1000.csv')
      .then((response) => response.text())
      .then((csv) => {
        if (active) setValue(csvToDataTable(csv, options));
      });
    return () => {
      active = false;
    };
  }, [options]);
  if (!value) return <p>Loading paginated data table…</p>;
  return (
    <PayloadField args={{ ...args, initialValue: value }} theme={globals.theme} locale={globals.locale}>
      <DataTableField {...fieldProps(args, 'json')} options={options} maxHeight={args.maxHeight} />
      <PaginatedAPIResponsePanel value={value} options={options} />
    </PayloadField>
  );
}

const meta = {
  title: 'Fields/Data Table',
  tags: ['autodocs'],
  args: {
    ...commonArgs,
    label: 'Data Table',
    columns: { initial: 3, min: 1 },
    rows: { initial: 3, min: 1 },
    maxHeight: 420,
    formulas: false,
    apiResponse: { includeIds: false, computeFormulas: false },
    formats: [],
    textFormats: false,
    stickyRows: { enabled: true, top: 0, bottom: 0 },
  },
  argTypes: {
    ...commonArgTypes,
    columns: { control: 'object', description: 'Configure initial, minimum, and maximum columns.' },
    rows: { control: 'object', description: 'Configure initial, minimum, and maximum rows.' },
    maxHeight: { control: { type: 'number', min: 120, max: 1_000 } },
    formulas: { control: 'object', description: 'Configure formula editing and evaluation.' },
    apiResponse: { control: 'object', description: 'Opt into response IDs and computed formula values.' },
    formats: { control: 'object', description: 'Optional format choices. The Format menu is hidden when empty.' },
    textFormats: { control: 'object', description: 'Enable cell text formatting options.' },
    stickyRows: { control: 'object', description: 'Configure sticky top and bottom row counts.' },
  },
  render: (args, { globals }) => {
    const resolved = resolveDataTableOptions(args);
    return (
      <PayloadField args={args} theme={globals.theme} locale={globals.locale}>
        <DataTableField {...fieldProps(args, 'json')} options={resolved} maxHeight={args.maxHeight} />
      </PayloadField>
    );
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};
export const Populated: Story = { args: { initialValue: example } };
export const Formulas: Story = {
  args: { initialValue: formulaExample, formulas: { enabled: true }, apiResponse: { computeFormulas: true } },
};
export const APIResponse: Story = {
  args: {
    initialValue: formulaExample,
    formulas: { enabled: true },
    apiResponse: { includeIds: true, computeFormulas: true },
  },
  render: (args, { globals }) => {
    const resolved = resolveDataTableOptions(args);
    return (
      <PayloadField args={args} theme={globals.theme} locale={globals.locale}>
        <DataTableField {...fieldProps(args, 'json')} options={resolved} maxHeight={args.maxHeight} />
        <APIResponsePanel options={resolved} />
      </PayloadField>
    );
  },
};
export const PaginatedAPI: Story = {
  args: {
    apiResponse: { includeIds: true, computeFormulas: false },
    maxHeight: 420,
  },
  render: PaginatedAPIStory,
};
export const Formatting: Story = {
  args: { initialValue: formattingExample, formats: formatOptions.formats, textFormats: true },
};
export const FormulaFormats: Story = {
  args: {
    initialValue: formattedValuesExample,
    formulas: { enabled: true },
    maxHeight: 340,
  },
};
export const FreezeRows: Story = {
  args: {
    initialValue: freezeExample,
    maxHeight: 220,
    stickyRows: { enabled: true, top: 1, bottom: 1 },
  },
};
export const LimitedColumnsRows: Story = {
  args: {
    columns: { initial: 3, min: 1, max: 6 },
    rows: { initial: 3, min: 1, max: 8 },
  },
};
export const LargeDataTable: Story = {
  args: { maxHeight: 520 },
  render: LargeDataTableStory,
};
export const ReadOnly: Story = { args: { initialValue: example, readOnly: true } };
export const RequiredEmpty: Story = { args: { required: true, showError: true } };
