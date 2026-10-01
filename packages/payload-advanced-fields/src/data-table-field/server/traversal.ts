import type { Block, Field } from 'payload';
import type { ResolvedDataTableOptions } from '../shared/types.js';

export function tableOptions(field: Field): ResolvedDataTableOptions | undefined {
  const options = field.custom?.dataTable?.options as ResolvedDataTableOptions | undefined;
  return options?.storage.mode === 'rows' ? options : undefined;
}

export function mapTableFields(fields: Field[], blocks: Block[], transform: (field: Field) => Field): Field[] {
  return fields.map((field) => {
    let next = { ...field };
    if ('fields' in next) next.fields = mapTableFields(next.fields, blocks, transform);
    if (next.type === 'tabs') {
      next.tabs = next.tabs.map((tab) => ({ ...tab, fields: mapTableFields(tab.fields, blocks, transform) }));
    }
    if (next.type === 'blocks') {
      next.blocks = next.blocks.map((block) =>
        typeof block === 'string'
          ? block
          : {
              ...block,
              fields: mapTableFields(block.fields, blocks, transform),
            },
      );
    }
    if (tableOptions(next)) next = transform(next);
    return next;
  });
}

export type TableInstance = { value: unknown; path: string; options: ResolvedDataTableOptions };

/** Traverse the schema as well as the document: arbitrary JSON is never an authorization source. */
export function tableInstances(
  fields: Field[],
  document: unknown,
  blocks: Block[],
  path = '',
  allLocales = false,
): TableInstance[] {
  if (!document || typeof document !== 'object') return [];
  const data = document as Record<string, unknown>;
  const result: TableInstance[] = [];
  for (const field of fields) {
    const name = 'name' in field ? field.name : undefined;
    const fieldPath = name ? [path, name].filter(Boolean).join('.') : path;
    const value = name ? data[name] : data;
    if (allLocales && name && 'localized' in field && field.localized && value && typeof value === 'object') {
      for (const localized of Object.values(value)) {
        result.push(...tableInstances([{ ...field, localized: false } as Field], { [name]: localized }, blocks, path));
      }
      continue;
    }
    const options = tableOptions(field);
    if (options) result.push({ value, path: fieldPath, options });
    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        const tabName = 'name' in tab ? tab.name : undefined;
        result.push(
          ...tableInstances(
            tab.fields,
            tabName ? data[tabName] : data,
            blocks,
            tabName ? [path, tabName].filter(Boolean).join('.') : path,
            allLocales,
          ),
        );
      }
    } else if (field.type === 'array' && Array.isArray(value)) {
      value.forEach((row, index) =>
        result.push(...tableInstances(field.fields, row, blocks, `${fieldPath}.${index}`, allLocales)),
      );
    } else if (field.type === 'blocks' && Array.isArray(value)) {
      value.forEach((row, index) => {
        if (!row || typeof row !== 'object') return;
        const candidates = field.blocks;
        const block = candidates
          .map((entry) => (typeof entry === 'string' ? blocks.find((b) => b.slug === entry) : entry))
          .find((entry) => entry?.slug === row.blockType);
        if (block) result.push(...tableInstances(block.fields, row, blocks, `${fieldPath}.${index}`, allLocales));
      });
    } else if ('fields' in field) {
      result.push(...tableInstances(field.fields, value, blocks, fieldPath, allLocales));
    }
  }
  return result;
}

export function hasTableField(fields: Field[], blocks: Block[], seen = new Set<string>()): boolean {
  for (const field of fields) {
    if (tableOptions(field)) return true;
    if (field.type === 'tabs' && field.tabs.some((tab) => hasTableField(tab.fields, blocks, seen))) return true;
    if (field.type === 'blocks') {
      for (const candidate of field.blocks) {
        const block = typeof candidate === 'string' ? blocks.find((item) => item.slug === candidate) : candidate;
        if (!block || seen.has(block.slug)) continue;
        seen.add(block.slug);
        if (hasTableField(block.fields, blocks, seen)) return true;
      }
    } else if ('fields' in field && hasTableField(field.fields, blocks, seen)) return true;
  }
  return false;
}
