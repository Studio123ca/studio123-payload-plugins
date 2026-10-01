import { CODE_LANGUAGES, type CodeLanguage } from './types.js';

export const DEFAULT_CODE_LANGUAGE: CodeLanguage = 'html';
export const DEFAULT_CODE_FIELD_HEIGHT = 360;
export const MIN_CODE_FIELD_HEIGHT = 120;
export const MAX_CODE_FIELD_HEIGHT = 1200;
export const CODE_FIELD_ROW_HEIGHT = 24;

export const isCodeLanguage = (value: unknown): value is CodeLanguage =>
  typeof value === 'string' && (CODE_LANGUAGES as readonly string[]).includes(value);

export function assertCodeLanguage(value: unknown): asserts value is CodeLanguage {
  if (!isCodeLanguage(value)) {
    throw new Error(`Unsupported code language "${String(value)}". Expected one of: ${CODE_LANGUAGES.join(', ')}.`);
  }
}

export const resolveCodeLanguage = (value: unknown, fallback: CodeLanguage = DEFAULT_CODE_LANGUAGE): CodeLanguage =>
  isCodeLanguage(value) ? value : fallback;

export const normalizeCodeFieldHeight = (value: unknown, rows?: unknown): number => {
  const rowCount = normalizeCodeFieldRows(rows);
  const rowHeight = rowCount ? rowCount * CODE_FIELD_ROW_HEIGHT + 32 : DEFAULT_CODE_FIELD_HEIGHT;
  const fallback = Math.min(Math.max(rowHeight, MIN_CODE_FIELD_HEIGHT), MAX_CODE_FIELD_HEIGHT);

  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;

  return Math.min(Math.max(Math.round(value), MIN_CODE_FIELD_HEIGHT), MAX_CODE_FIELD_HEIGHT);
};

export const normalizeCodeFieldRows = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return undefined;
  return Math.min(Math.floor(value), 50);
};

export const normalizeCodeValue = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || typeof value === 'undefined') return '';
  if (typeof value === 'object' || typeof value === 'function') return '';
  return String(value);
};

export const normalizeCodeLength = (value: unknown): number | undefined => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return Math.floor(value);
};
