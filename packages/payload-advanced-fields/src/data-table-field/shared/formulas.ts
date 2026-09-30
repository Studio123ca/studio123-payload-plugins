import type { DataTableCell, DataTableValue } from './types.js';

export type DataTableResult = string | number | boolean | null;

const MAX_EVALUATION_STEPS = 100_000;
const MAX_FORMULA_LENGTH = 1_024;

function address(reference: string, table: DataTableValue): [number, number] {
  const match = /^([A-Z]+)([1-9]\d*)$/.exec(reference.toUpperCase());
  if (!match) throw new Error('#REF!');
  const column = [...match[1]].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
  const row = Number(match[2]) - 1;
  if (row >= table.rows.length || column >= table.columns.length) throw new Error('#REF!');
  return [row, column];
}

function numeric(value: DataTableResult): number {
  if (value === null || value === '') return 0;
  if (typeof value === 'boolean') return Number(value);
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  throw new Error('#VALUE!');
}

function evaluateFormula(
  source: string,
  read: (reference: string) => DataTableResult,
  range: (from: string, to: string) => DataTableResult[],
) {
  if (!source.startsWith('=') || source.length > MAX_FORMULA_LENGTH) throw new Error('#ERROR!');
  const expression = source.slice(1).toUpperCase();
  const tokens = expression.match(/\d+(?:\.\d+)?|[A-Z]+\d*|[()+\-*/^,:]/g) ?? [];
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const primary = (): DataTableResult => {
    const token = take();
    if (!token) throw new Error('#ERROR!');
    if (/^\d/.test(token)) return Number(token);
    if (token === '(') {
      const result = add();
      if (take() !== ')') throw new Error('#ERROR!');
      return result;
    }
    if (/^[A-Z]+\d+$/.test(token)) {
      if (peek() === ':') {
        take();
        return range(token, take()).reduce<number>((sum, value) => sum + numeric(value), 0);
      }
      return read(token);
    }
    if (!/^[A-Z]+$/.test(token) || take() !== '(') throw new Error('#NAME?');
    const values: DataTableResult[] = [];
    while (peek() !== ')') {
      const first = take();
      if (!first || !/^[A-Z]+\d+$/.test(first)) throw new Error('#ERROR!');
      if (peek() === ':') {
        take();
        values.push(...range(first, take()));
      } else {
        values.push(read(first));
      }
      if (peek() === ',') take();
      else break;
    }
    if (take() !== ')') throw new Error('#ERROR!');
    const numbers = values.filter((value): value is number => typeof value === 'number');
    if (token === 'COUNT') return numbers.length;
    if (token === 'SUM') return numbers.reduce((sum, value) => sum + value, 0);
    if (!numbers.length && token === 'AVERAGE') throw new Error('#DIV/0!');
    if (!numbers.length) return 0;
    if (token === 'AVERAGE') return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    return token === 'MIN' ? Math.min(...numbers) : Math.max(...numbers);
  };
  const unary = (): DataTableResult => {
    if (peek() === '+' || peek() === '-') {
      const sign = take() === '-' ? -1 : 1;
      return sign * numeric(unary());
    }
    const value = primary();
    if (peek() === '^') {
      take();
      return numeric(value) ** numeric(unary());
    }
    return value;
  };
  const multiply = (): DataTableResult => {
    let value = unary();
    while (peek() === '*' || peek() === '/') {
      const operator = take();
      const right = numeric(unary());
      if (operator === '/' && right === 0) throw new Error('#DIV/0!');
      value = operator === '*' ? numeric(value) * right : numeric(value) / right;
    }
    return value;
  };
  function add(): DataTableResult {
    let value = multiply();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const right = numeric(multiply());
      value = operator === '+' ? numeric(value) + right : numeric(value) - right;
    }
    return value;
  }
  const result = add();
  if (index !== tokens.length) throw new Error('#ERROR!');
  return result;
}

export function evaluateDataTable(table: DataTableValue): DataTableResult[][] {
  const cache = new Map<string, DataTableResult>();
  const visiting = new Set<string>();
  let steps = MAX_EVALUATION_STEPS;
  const read = (row: number, column: number): DataTableResult => {
    const key = `${row}:${column}`;
    if (cache.has(key)) return cache.get(key)!;
    if (visiting.has(key)) return '#CYCLE!';
    if (--steps < 0) return '#LIMIT!';
    const cell: DataTableCell = table.rows[row].cells[column];
    if (typeof cell === 'string') {
      const numericValue = Number(cell);
      return cell.trim() !== '' && Number.isFinite(numericValue) ? numericValue : cell;
    }
    visiting.add(key);
    try {
      const result = evaluateFormula(
        cell.formula,
        (reference) => {
          const [nextRow, nextColumn] = address(reference, table);
          return read(nextRow, nextColumn);
        },
        (from, to) => {
          const [rowA, columnA] = address(from, table);
          const [rowB, columnB] = address(to, table);
          const values: DataTableResult[] = [];
          for (let row = Math.min(rowA, rowB); row <= Math.max(rowA, rowB); row += 1) {
            for (let column = Math.min(columnA, columnB); column <= Math.max(columnA, columnB); column += 1) {
              values.push(read(row, column));
            }
          }
          return values;
        },
      );
      cache.set(key, result);
      return result;
    } catch (error) {
      const result = error instanceof Error ? error.message : '#ERROR!';
      cache.set(key, result);
      return result;
    } finally {
      visiting.delete(key);
    }
  };
  return table.rows.map((row, rowIndex) => row.cells.map((_, columnIndex) => read(rowIndex, columnIndex)));
}
