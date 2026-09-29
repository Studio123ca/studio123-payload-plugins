import type { TableValue } from './types.js';
import { MAX_FORMULA_LENGTH } from './table.js';

export type TableResult = string | number | boolean | null;
type Expression = TableResult | TableResult[];
class FormulaError extends Error {}
const fail = (message: string): never => {
  throw new FormulaError(message);
};
const numeric = (value: Expression): number => {
  if (Array.isArray(value)) return fail('#VALUE!');
  if (value === null || value === '') return 0;
  if (typeof value === 'boolean') return Number(value);
  if (typeof value !== 'number' || !Number.isFinite(value)) return fail('#VALUE!');
  return value;
};

/** Small, bounded grammar. No eval, Function, property access, or external calls. */
class Parser {
  private tokens: string[] = [];
  private index = 0;
  private depth = 0;
  constructor(
    source: string,
    private read: (reference: string) => TableResult,
    private range: (from: string, to: string) => TableResult[],
    private tick: () => void,
  ) {
    if (!source.startsWith('=') || source.length > MAX_FORMULA_LENGTH) fail('#ERROR!');
    const expression = source.slice(1).toUpperCase();
    const pattern = /\s*(\d+(?:\.\d*)?(?:E[+-]?\d+)?|\.\d+(?:E[+-]?\d+)?|[A-Z]+[1-9]\d*|[A-Z]+|[()+\-*/^,:])/gy;
    let offset = 0;
    while (offset < expression.trimEnd().length) {
      pattern.lastIndex = offset;
      const match = pattern.exec(expression);
      if (!match) fail('#ERROR!');
      this.tokens.push(match![1]);
      offset = pattern.lastIndex;
    }
  }
  private peek() {
    return this.tokens[this.index];
  }
  private take() {
    this.tick();
    return this.tokens[this.index++];
  }
  private expect(token: string) {
    if (this.take() !== token) fail('#ERROR!');
  }
  parse(): TableResult {
    const result = this.add();
    if (this.index !== this.tokens.length || Array.isArray(result)) return fail('#ERROR!');
    if (typeof result === 'number' && !Number.isFinite(result)) return fail('#NUM!');
    return result;
  }
  private add(): Expression {
    let value = this.multiply();
    while (this.peek() === '+' || this.peek() === '-') {
      const op = this.take(),
        right = numeric(this.multiply());
      value = op === '+' ? numeric(value) + right : numeric(value) - right;
    }
    return value;
  }
  private multiply(): Expression {
    let value = this.unary();
    while (this.peek() === '*' || this.peek() === '/') {
      const op = this.take(),
        right = numeric(this.unary());
      if (op === '/' && right === 0) fail('#DIV/0!');
      value = op === '*' ? numeric(value) * right : numeric(value) / right;
    }
    return value;
  }
  private unary(): Expression {
    if (++this.depth > 64) fail('#LIMIT!');
    let value: Expression;
    if (this.peek() === '+' || this.peek() === '-') {
      const op = this.take();
      value = numeric(this.unary()) * (op === '-' ? -1 : 1);
    } else {
      value = this.primary();
      if (this.peek() === '^') {
        this.take();
        value = numeric(value) ** numeric(this.unary());
      }
    }
    this.depth--;
    return value;
  }
  private primary(): Expression {
    const token = this.take();
    if (!token) return fail('#ERROR!');
    if (/^(?:\d|\.)/.test(token)) return Number(token);
    if (token === '(') {
      const value = this.add();
      this.expect(')');
      return value;
    }
    if (/^[A-Z]+[1-9]\d*$/.test(token)) {
      if (this.peek() === ':') {
        this.take();
        return this.range(token, this.take());
      }
      return this.read(token);
    }
    if (!['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT'].includes(token)) return fail('#NAME?');
    this.expect('(');
    const values: TableResult[] = [];
    if (this.peek() !== ')') {
      while (true) {
        const argument = this.add();
        if (Array.isArray(argument)) values.push(...argument);
        else values.push(argument);
        if (this.peek() !== ',') break;
        this.take();
      }
    }
    this.expect(')');
    const numbers = values.filter((value): value is number => typeof value === 'number');
    if (token === 'COUNT') return numbers.length;
    if (token === 'SUM') return numbers.reduce((sum, value) => sum + value, 0);
    if (!numbers.length) return token === 'AVERAGE' ? fail('#DIV/0!') : 0;
    if (token === 'AVERAGE') return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
    return numbers.reduce((result, value) => (token === 'MIN' ? Math.min(result, value) : Math.max(result, value)));
  }
}

/** A1 addresses refer to body cells; headers do not change row numbering. */
export function evaluateTable(table: TableValue): TableResult[][] {
  const cache = new Map<string, TableResult | FormulaError>();
  const visiting = new Set<string>();
  let budget = 200_000;
  const tick = () => {
    if (--budget < 0) fail('#LIMIT!');
  };
  const address = (reference: string): [number, number] => {
    const match = /^([A-Z]+)([1-9]\d*)$/.exec(reference);
    if (!match) return fail('#REF!');
    const column = [...match[1]].reduce((index, letter) => index * 26 + letter.charCodeAt(0) - 64, 0) - 1;
    const row = Number(match[2]) - 1;
    if (column >= table.columns.length || row >= table.rows.length) return fail('#REF!');
    return [row, column];
  };
  const read = (row: number, column: number): TableResult => {
    const key = `${row}:${column}`;
    const cached = cache.get(key);
    if (cached instanceof FormulaError) throw cached;
    if (cache.has(key)) return cached as TableResult;
    const cell = table.rows[row].cells[column];
    if (cell === null || typeof cell !== 'object') return cell;
    if (visiting.has(key)) return fail('#CYCLE!');
    if (visiting.size >= 64) return fail('#LIMIT!');
    visiting.add(key);
    try {
      const result = new Parser(
        cell.formula,
        (ref) => read(...address(ref)),
        (from, to) => {
          const [r1, c1] = address(from),
            [r2, c2] = address(to);
          const values: TableResult[] = [];
          for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) {
            for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) {
              tick();
              values.push(read(r, c));
            }
          }
          return values;
        },
        tick,
      ).parse();
      cache.set(key, result);
      return result;
    } catch (error) {
      const failure = error instanceof FormulaError ? error : new FormulaError('#ERROR!');
      cache.set(key, failure);
      throw failure;
    } finally {
      visiting.delete(key);
    }
  };
  return table.rows.map((row, r) =>
    row.cells.map((_, c) => {
      try {
        return read(r, c);
      } catch (error) {
        return error instanceof FormulaError ? error.message : '#ERROR!';
      }
    }),
  );
}
