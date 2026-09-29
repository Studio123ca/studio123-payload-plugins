import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { TableField } from '../../src/table-field/admin/TableField.js';
import { createTable, pasteCells, resolveTableOptions } from '../../src/table-field/shared/table.js';
import { Fixture } from './payload-ui.js';

const content = resolveTableOptions();
const csv = resolveTableOptions({ storage: 'csv' });
const spreadsheet = resolveTableOptions({ mode: 'spreadsheet', formulas: true });
const specifications = pasteCells(
  createTable(content),
  [
    ['Dimensions', '24 × 36 in'],
    ['Material', 'Recycled aluminum'],
    ['Warranty', '5 years'],
  ],
  0,
  0,
  content,
);
specifications.columns[0].label = 'Specification';
specifications.columns[1].label = 'Details';
specifications.caption = 'Studio Series — product specifications';
const estimates = pasteCells(
  createTable(spreadsheet),
  [
    ['12', '49', '=A1*B1'],
    ['8', '25', '=A2*B2'],
    ['', '', '=SUM(C1:C2)'],
  ],
  0,
  0,
  spreadsheet,
);
estimates.columns.forEach((column, index) => {
  column.label = ['Quantity', 'Unit price', 'Total'][index];
});
const examples = {
  content: { value: specifications, options: content },
  csv: { value: 'Product,Price\r\n"Widget, large",19.95\r\nWidget small,9.95', options: csv },
  spreadsheet: { value: estimates, options: spreadsheet },
};
function Preview() {
  const [mode, setMode] = useState<keyof typeof examples>('content');
  const [readOnly, setReadOnly] = useState(false);
  const [dark, setDark] = useState(false);
  const example = examples[mode];
  return (
    <main data-dark={dark}>
      <div className="preview-header">
        <div>
          <small>STUDIO123 · ADVANCED FIELDS</small>
          <h1>Table field</h1>
          <p>Local editor preview with a lightweight Payload context adapter.</p>
        </div>
        <label>
          <input type="checkbox" checked={dark} onChange={(event) => setDark(event.target.checked)} /> Dark theme
        </label>
      </div>
      <nav>
        {(['content', 'csv', 'spreadsheet'] as const).map((item) => (
          <button key={item} type="button" aria-pressed={item === mode} onClick={() => setMode(item)}>
            {item === 'csv' ? 'CSV storage' : item === 'content' ? 'Content table' : 'Spreadsheet'}
          </button>
        ))}
        <label>
          <input type="checkbox" checked={readOnly} onChange={(event) => setReadOnly(event.target.checked)} /> Read only
        </label>
      </nav>
      <Fixture key={mode} initialValue={example.value}>
        <TableField
          field={{ name: 'table', type: 'json', label: 'Table data' }}
          path="table"
          options={example.options}
          readOnly={readOnly}
        />
      </Fixture>
    </main>
  );
}
createRoot(document.getElementById('root')!).render(<Preview />);
