import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  Endpoint,
  PayloadRequest,
} from 'payload';
import { APIError } from 'payload';
import { evaluateDataTable } from '../shared/formulas.js';
import { createDataTableStorageManifest, isDataTableStorageManifest } from '../shared/storage.js';
import type { DataTableRow, DataTableValue, ResolvedDataTableOptions } from '../shared/types.js';

export const DEFAULT_DATA_TABLE_STORAGE_COLLECTION = 'data-table-rows';

type StoredRow = {
  rowID: string;
  position: number;
  cells: DataTableRow['cells'];
};

export type DataTableRowsEndpointConfig = {
  collectionSlug: string;
  fieldName: string;
  options: ResolvedDataTableOptions;
  storageCollection?: string;
};

export type DataTableStorageDefinition = {
  fieldName: string;
  options: ResolvedDataTableOptions;
};

type PendingTable = { fieldName: string; value: DataTableValue };
const pendingTablesKey = '__studio123DataTableRows';

function getNestedValue(value: unknown, path: string) {
  return path.split('.').reduce<unknown>((current, segment) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

function setNestedValue(value: Record<string, unknown>, path: string, nextValue: unknown) {
  const segments = path.split('.');
  const last = segments.pop();
  if (!last) return;
  let target = value;
  for (const segment of segments) {
    const child = target[segment];
    if (!child || typeof child !== 'object' || Array.isArray(child)) target[segment] = {};
    target = target[segment] as Record<string, unknown>;
  }
  target[last] = nextValue;
}

export function createDataTableStorageHooks(
  collectionSlug: string,
  definitions: DataTableStorageDefinition[],
  storageCollection = DEFAULT_DATA_TABLE_STORAGE_COLLECTION,
): { beforeChange: CollectionBeforeChangeHook; afterChange: CollectionAfterChangeHook } {
  const beforeChange: CollectionBeforeChangeHook = ({ data, req }) => {
    if (!data || typeof data !== 'object') return data;
    const pending: PendingTable[] = [];
    const nextData = data as Record<string, unknown>;
    for (const definition of definitions) {
      const value = getNestedValue(nextData, definition.fieldName);
      if (
        value &&
        typeof value === 'object' &&
        Array.isArray((value as Partial<DataTableValue>).rows) &&
        Array.isArray((value as Partial<DataTableValue>).columns)
      ) {
        if (isDataTableStorageManifest(value)) continue;
        pending.push({ fieldName: definition.fieldName, value: value as DataTableValue });
        setNestedValue(nextData, definition.fieldName, createDataTableStorageManifest(value as DataTableValue));
      }
    }
    if (pending.length) {
      const context = req.context as Record<string, unknown>;
      context[pendingTablesKey] = { collectionSlug, storageCollection, tables: pending };
    }
    return nextData;
  };

  const afterChange: CollectionAfterChangeHook = async ({ doc, req }) => {
    const context = req.context as Record<string, unknown>;
    const pendingContext = context[pendingTablesKey] as
      { collectionSlug: string; storageCollection: string; tables: PendingTable[] } | undefined;
    if (!pendingContext || pendingContext.collectionSlug !== collectionSlug) return doc;
    delete context[pendingTablesKey];
    const parentID = String((doc as { id?: string | number }).id ?? '');
    if (!parentID) return doc;

    for (const table of pendingContext.tables) {
      while (true) {
        const existing = await req.payload.find({
          collection: pendingContext.storageCollection,
          depth: 0,
          limit: 500,
          overrideAccess: true,
          page: 1,
          req,
          where: {
            and: [
              { parentCollection: { equals: collectionSlug } },
              { parentID: { equals: parentID } },
              { fieldPath: { equals: table.fieldName } },
            ],
          },
        });
        for (const row of existing.docs) {
          await req.payload.delete({
            collection: pendingContext.storageCollection,
            id: row.id,
            overrideAccess: true,
            req,
          });
        }
        if (existing.docs.length < 500) break;
      }
      await Promise.all(
        table.value.rows.map((row, position) =>
          req.payload.create({
            collection: pendingContext.storageCollection,
            data: {
              parentCollection: collectionSlug,
              parentID,
              fieldPath: table.fieldName,
              rowID: row.id,
              position,
              cells: row.cells,
            },
            overrideAccess: true,
            req,
          }),
        ),
      );
    }
    return doc;
  };
  return { beforeChange, afterChange };
}

export function createDataTableRowsCollection(slug = DEFAULT_DATA_TABLE_STORAGE_COLLECTION): CollectionConfig {
  return {
    slug,
    admin: { hidden: true },
    access: {
      create: () => false,
      delete: () => false,
      read: () => false,
      update: () => false,
    },
    fields: [
      { name: 'parentCollection', type: 'text', required: true },
      { name: 'parentID', type: 'text', required: true },
      { name: 'fieldPath', type: 'text', required: true },
      { name: 'rowID', type: 'text', required: true },
      { name: 'position', type: 'number', required: true },
      { name: 'cells', type: 'json', required: true },
    ],
    indexes: [
      {
        fields: ['parentCollection', 'parentID', 'fieldPath', 'position'],
      },
      {
        fields: ['parentCollection', 'parentID', 'fieldPath', 'rowID'],
        unique: true,
      },
    ],
  };
}

function columnName(index: number) {
  let name = '';
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26)) {
    name = String.fromCharCode(65 + ((value - 1) % 26)) + name;
  }
  return name;
}

function parsePositiveInteger(value: string | null, fallback: number) {
  if (value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function findRows(req: PayloadRequest, config: DataTableRowsEndpointConfig, parentID: string) {
  const rows: StoredRow[] = [];
  const batchSize = 500;
  let page = 1;
  while (true) {
    const result = await req.payload.find({
      collection: config.storageCollection ?? DEFAULT_DATA_TABLE_STORAGE_COLLECTION,
      depth: 0,
      limit: batchSize,
      overrideAccess: true,
      page,
      req,
      sort: 'position',
      where: {
        and: [
          { parentCollection: { equals: config.collectionSlug } },
          { parentID: { equals: parentID } },
          { fieldPath: { equals: config.fieldName } },
        ],
      },
    });
    rows.push(...(result.docs as unknown as StoredRow[]));
    if (result.docs.length < batchSize) break;
    page += 1;
  }
  return rows;
}

function responseValue(
  table: DataTableValue,
  rows: DataTableRow[],
  options: ResolvedDataTableOptions,
  formulaRows: DataTableRow[] = rows,
  rowPositions = new Map<string, number>(),
) {
  const results = options.apiResponse.computeFormulas ? evaluateDataTable({ ...table, rows: formulaRows }) : undefined;
  const resultIndexes = new Map(formulaRows.map((row, index) => [row.id, index]));
  return {
    ...table,
    columns: options.apiResponse.includeIds
      ? table.columns.map((column) => ({ ...column, columnId: column.id }))
      : table.columns,
    rows: rows.map((row, rowIndex) => ({
      ...row,
      ...(options.apiResponse.includeIds ? { rowId: row.id } : {}),
      ...(options.apiResponse.computeFormulas || options.apiResponse.includeIds
        ? {
            cells: row.cells.map((cell, columnIndex) => ({
              ...(options.apiResponse.includeIds
                ? { cellId: `${columnName(columnIndex)}${rowPositions.get(row.id) ?? rowIndex + 1}` }
                : {}),
              value:
                results?.[resultIndexes.get(row.id) ?? rowIndex]?.[columnIndex] ??
                (typeof cell === 'object' ? cell.formula : cell),
              ...(typeof cell === 'object' ? { formula: cell.formula } : {}),
            })),
          }
        : {}),
    })),
  };
}

export function createDataTableRowsEndpoint(config: DataTableRowsEndpointConfig): Endpoint {
  return {
    path: '/:id/data-table-rows/:field',
    method: 'get',
    handler: async (req) => {
      const parentID = String(req.routeParams?.id ?? '');
      const fieldName = decodeURIComponent(String(req.routeParams?.field ?? ''));
      if (!parentID || fieldName !== config.fieldName) throw new APIError('Data Table field not found.', 404);

      // The parent read enforces the parent collection's access rules. Internal row reads
      // are only performed after that check succeeds.
      const document = await req.payload.findByID({
        collection: config.collectionSlug,
        depth: 0,
        id: parentID,
        overrideAccess: false,
        req,
      });
      const manifest = getNestedValue(document, config.fieldName);
      if (!isDataTableStorageManifest(manifest)) throw new APIError('Data Table storage is not enabled.', 400);

      const url = new URL(req.url ?? 'http://localhost');
      const totalRows = manifest.storage.rowCount;
      const pagination = config.options.storage.pagination;
      const requestedLimit = parsePositiveInteger(url.searchParams.get('limit'), pagination.defaultLimit);
      const loadAll = url.searchParams.get('all') === 'true';
      const limit = loadAll || !pagination.enabled ? totalRows || 1 : Math.min(requestedLimit, pagination.maxLimit);
      const totalPages = Math.max(1, Math.ceil(totalRows / Math.max(limit, 1)));
      const page = Math.min(parsePositiveInteger(url.searchParams.get('page'), 1), totalPages);
      const allRows =
        loadAll || !pagination.enabled || config.options.apiResponse.computeFormulas
          ? await findRows(req, config, parentID)
          : undefined;
      const pageRows = allRows
        ? allRows.slice((page - 1) * limit, page * limit)
        : await req.payload
            .find({
              collection: config.storageCollection ?? DEFAULT_DATA_TABLE_STORAGE_COLLECTION,
              depth: 0,
              limit,
              overrideAccess: true,
              page,
              req,
              sort: 'position',
              where: {
                and: [
                  { parentCollection: { equals: config.collectionSlug } },
                  { parentID: { equals: parentID } },
                  { fieldPath: { equals: config.fieldName } },
                ],
              },
            })
            .then((result) => result.docs as unknown as StoredRow[]);
      const tableRows = pageRows.map((row) => ({ id: row.rowID, cells: row.cells }));
      const formulaRows = allRows?.map((row) => ({ id: row.rowID, cells: row.cells }));
      const rowPositions = new Map(pageRows.map((row) => [row.rowID, row.position + 1]));
      const response = responseValue(manifest, tableRows, config.options, formulaRows, rowPositions);
      return Response.json({
        ...response,
        pagination: {
          page,
          limit,
          totalRows,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      });
    },
  };
}
