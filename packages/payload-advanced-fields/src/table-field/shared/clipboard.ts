import { MAX_CELL_LENGTH, MAX_IMPORT_LENGTH } from './table.js';

/** CSV/TSV with escaped quotes, embedded newlines, CRLF, and a trailing line ending. */
export function parseDelimited(
  text: string,
  delimiter: ',' | '\t' = '\t',
  maxRows = 1000,
  maxColumns = 100,
): string[][] {
  if (text.length > MAX_IMPORT_LENGTH) throw new Error('Import is too large (maximum 2 MB of text).');
  text = text.replace(/^\uFEFF/, '');
  if (!text) return [];
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false;
  const pushCell = () => {
    if (cell.length > MAX_CELL_LENGTH) throw new Error(`Cells may contain at most ${MAX_CELL_LENGTH} characters.`);
    row.push(cell);
    cell = '';
    closed = false;
    if (row.length > maxColumns) throw new Error(`Import exceeds ${maxColumns} columns.`);
  };
  const pushRow = () => {
    pushCell();
    rows.push(row);
    row = [];
    if (rows.length > maxRows) throw new Error(`Import exceeds ${maxRows} rows.`);
  };
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += char;
    } else if (char === delimiter) pushCell();
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++;
      pushRow();
    } else if (char === '"' && cell === '' && !closed) quoted = true;
    else {
      if (closed) throw new Error('Unexpected text after a quoted cell.');
      cell += char;
    }
  }
  if (quoted) throw new Error('Unclosed quote in imported data.');
  if (cell || row.length || closed || !/[\r\n]$/.test(text)) pushRow();
  return rows;
}

export function stringifyDelimited(matrix: string[][], delimiter: ',' | '\t' = '\t'): string {
  return matrix
    .map((row) =>
      row
        .map((cell) => {
          return cell === '' || cell.includes(delimiter) || /["\r\n]/.test(cell)
            ? `"${cell.replace(/"/g, '""')}"`
            : cell;
        })
        .join(delimiter),
    )
    .join('\r\n');
}

/** Export values as text when a spreadsheet might otherwise execute them. */
export function safeCSVCell(value: string): string {
  return /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
}
