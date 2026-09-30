import type { DataTableCell, DataTableValue } from './types.js';

export type DataTableResult = string | number | boolean | null;

type NumericFormat =
  | { kind: 'currency'; prefix: string }
  | { kind: 'percent' }
  | { kind: 'duration'; unit: string };

type NumericValue = { value: number; format?: NumericFormat };
type EvaluatedValue = DataTableResult | NumericValue;

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

function numeric(value: EvaluatedValue): NumericValue {
  if (typeof value === 'object' && value !== null && 'value' in value) return value;
  if (value === null || value === '') return { value: 0 };
  if (typeof value === 'boolean') return { value: Number(value) };
  if (typeof value === 'number' && Number.isFinite(value)) return { value };
  if (typeof value === 'string') {
    const match = /^\s*([+-]?)\s*((?:(?:[$€£¥]|USD|CAD|EUR|GBP)\s*)?)((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?)\s*(%|ns|us|μs|µs|ms|min|s|h)?\s*$/i.exec(value);
    if (match) {
      const sign = match[1] === '-' ? -1 : 1;
      const prefix = match[2].trim();
      const unit = match[4]?.toLowerCase();
      const amount = Number(match[3].replaceAll(',', '')) * sign;
      if (prefix) return { value: amount, format: { kind: 'currency', prefix } };
      if (unit === '%') return { value: amount / 100, format: { kind: 'percent' } };
      if (unit) return { value: amount, format: { kind: 'duration', unit } };
      return { value: amount };
    }
  }
  throw new Error('#VALUE!');
}

function formatNumber(value: number, decimals = 6) {
  return Number(value.toFixed(decimals)).toString();
}

function formatResult(value: EvaluatedValue): DataTableResult {
  if (typeof value !== 'object' || value === null || !('value' in value)) return value;
  if (!value.format) return value.value;
  if (value.format.kind === 'currency') return `${value.format.prefix}${value.value.toFixed(2)}`;
  if (value.format.kind === 'percent') return `${formatNumber(value.value * 100)}%`;
  return `${formatNumber(value.value)}${value.format.unit}`;
}

function mergeFormats(left?: NumericFormat, right?: NumericFormat): NumericFormat | undefined {
  if (!left) return right;
  if (!right) return left;
  if (left.kind !== right.kind) throw new Error('#VALUE!');
  if (left.kind === 'currency' && right.kind === 'currency' && left.prefix !== right.prefix)
    throw new Error('#VALUE!');
  if (left.kind === 'duration' && right.kind === 'duration' && left.unit !== right.unit) throw new Error('#VALUE!');
  return left;
}

function addValues(left: EvaluatedValue, right: EvaluatedValue, sign = 1): NumericValue {
  const a = numeric(left);
  const b = numeric(right);
  return { value: a.value + sign * b.value, format: mergeFormats(a.format, b.format) };
}

function multiplyValues(left: EvaluatedValue, right: EvaluatedValue): NumericValue {
  const a = numeric(left);
  const b = numeric(right);
  let format: NumericFormat | undefined;
  if (a.format?.kind === 'percent' && b.format?.kind === 'percent') format = a.format;
  else if (a.format?.kind === 'percent') format = b.format;
  else if (b.format?.kind === 'percent') format = a.format;
  else format = mergeFormats(a.format, b.format);
  return { value: a.value * b.value, format };
}

function divideValues(left: EvaluatedValue, right: EvaluatedValue): NumericValue {
  const a = numeric(left);
  const b = numeric(right);
  if (b.value === 0) throw new Error('#DIV/0!');
  const format = a.format?.kind === 'percent' ? a.format : b.format ? undefined : a.format;
  return { value: a.value / b.value, format };
}

function evaluateFormula(
  source: string,
  read: (reference: string) => EvaluatedValue,
  range: (from: string, to: string) => EvaluatedValue[],
) {
  if (!source.startsWith('=') || source.length > MAX_FORMULA_LENGTH) throw new Error('#ERROR!');
  const expression = source.slice(1).toUpperCase();
  const tokens = expression.match(/\d+(?:\.\d+)?|[A-Z]+\d*|[()+\-*/^,:]/g) ?? [];
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const primary = (): EvaluatedValue => {
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
        return range(token, take()).reduce<NumericValue>((sum, value) => addValues(sum, value), { value: 0 });
      }
      return read(token);
    }
    if (!/^[A-Z]+$/.test(token) || take() !== '(') throw new Error('#NAME?');
    const values: EvaluatedValue[] = [];
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
    const numbers = values.flatMap((value) => {
      try {
        return [numeric(value)];
      } catch {
        return [];
      }
    });
    if (token === 'COUNT') return numbers.length;
    if (token === 'SUM') return numbers.reduce<NumericValue>((sum, value) => addValues(sum, value), { value: 0 });
    if (!numbers.length && token === 'AVERAGE') throw new Error('#DIV/0!');
    if (!numbers.length) return 0;
    const format = numbers.reduce<NumericFormat | undefined>((current, value) => mergeFormats(current, value.format), undefined);
    if (token === 'AVERAGE') return { value: numbers.reduce((sum, value) => sum + value.value, 0) / numbers.length, format };
    return { value: token === 'MIN' ? Math.min(...numbers.map((value) => value.value)) : Math.max(...numbers.map((value) => value.value)), format };
  };
  const unary = (): EvaluatedValue => {
    if (peek() === '+' || peek() === '-') {
      const sign = take() === '-' ? -1 : 1;
      const value = numeric(unary());
      return { ...value, value: sign * value.value };
    }
    const value = primary();
    if (peek() === '^') {
      take();
      return { value: numeric(value).value ** numeric(unary()).value };
    }
    return value;
  };
  const multiply = (): EvaluatedValue => {
    let value = unary();
    while (peek() === '*' || peek() === '/') {
      const operator = take();
      const right = unary();
      value = operator === '*' ? multiplyValues(value, right) : divideValues(value, right);
    }
    return value;
  };
  function add(): EvaluatedValue {
    let value = multiply();
    while (peek() === '+' || peek() === '-') {
      const operator = take();
      const right = multiply();
      value = operator === '+' ? addValues(value, right) : addValues(value, right, -1);
    }
    return value;
  }
  const result = add();
  if (index !== tokens.length) throw new Error('#ERROR!');
  return result;
}

export function evaluateDataTable(table: DataTableValue): DataTableResult[][] {
  const cache = new Map<string, EvaluatedValue>();
  const visiting = new Set<string>();
  let steps = MAX_EVALUATION_STEPS;
  const read = (row: number, column: number): EvaluatedValue => {
    const key = `${row}:${column}`;
    if (cache.has(key)) return cache.get(key)!;
    if (visiting.has(key)) return '#CYCLE!';
    if (--steps < 0) return '#LIMIT!';
    const cell: DataTableCell = table.rows[row].cells[column];
    if (typeof cell === 'string') return numericOrText(cell);
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
          const values: EvaluatedValue[] = [];
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
      const result: DataTableResult = error instanceof Error ? error.message : '#ERROR!';
      cache.set(key, result);
      return result;
    } finally {
      visiting.delete(key);
    }
  };
  return table.rows.map((row, rowIndex) => row.cells.map((_, columnIndex) => formatResult(read(rowIndex, columnIndex))));
}

function numericOrText(value: string): EvaluatedValue {
  if (value.trim() === '') return value;
  try {
    return numeric(value);
  } catch {
    return value;
  }
}
