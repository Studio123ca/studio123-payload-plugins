export function parseDelimited(text: string, delimiter = '\t', maxRows = 1_000, maxColumns = 100): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      if (rows.length > maxRows) throw new Error(`Pasted data exceeds ${maxRows} rows.`);
    } else {
      cell += character;
    }
  }
  if (cell.length || row.length) row.push(cell);
  if (row.length) rows.push(row);
  if (rows.some((entry) => entry.length > maxColumns)) throw new Error(`Pasted data exceeds ${maxColumns} columns.`);
  return rows;
}

export function stringifyDelimited(rows: string[][], delimiter = '\t'): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell ?? '');
          return value.includes(delimiter) || /[\r\n"]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
        })
        .join(delimiter),
    )
    .join('\n');
}
