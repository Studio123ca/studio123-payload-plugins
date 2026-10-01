import { createHash, randomUUID } from 'node:crypto';
import type {
  Block,
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  Endpoint,
  Field,
  FieldHook,
  GlobalAfterChangeHook,
  PayloadRequest,
  Where,
} from 'payload';
import { APIError } from 'payload';
import { normalizeDataTableValue, validateDataTable } from '../shared/dataTable.js';
import { evaluateDataTableRows } from '../shared/formulas.js';
import {
  createDataTableStorageManifest,
  hydrateDataTableStorageManifest,
  isDataTableStorageManifest,
} from '../shared/storage.js';
import type { DataTableStorageManifest } from '../shared/storage.js';
import type { DataTableRow, DataTableValue, ResolvedDataTableOptions } from '../shared/types.js';
import { tableInstances } from './traversal.js';

export const DEFAULT_DATA_TABLE_STORAGE_COLLECTION = 'data-table-rows';
export const DEFAULT_DATA_TABLE_REVISION_COLLECTION = 'data-table-revisions';
export type DataTableStorageConfig = { storageCollection: string; revisionCollection: string };
type StoredRow = { id: string | number; rowKey: string; rowID: string; cells: DataTableRow['cells'] };
type RowRef = { rowKey: string; rowID: string; hash: string };
type Revision = {
  id: string | number;
  createdAt?: string;
  committed: boolean;
  tableId: string;
  revisionId: string;
  ownerKind: 'collection' | 'global';
  ownerSlug: string;
  ownerID?: string;
  manifest: DataTableStorageManifest;
  rowRefs: RowRef[];
};

const missing = () => new APIError('Data Table revision not found or not accessible.', 404);
const revisionWhere = (tableId: string, revisionId: string): Where => ({
  and: [{ tableId: { equals: tableId } }, { revisionId: { equals: revisionId } }],
});

async function getRevision(req: PayloadRequest, config: DataTableStorageConfig, tableId: string, revisionId: string) {
  const result = await req.payload.find({
    collection: config.revisionCollection,
    where: revisionWhere(tableId, revisionId),
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  });
  const revision = result.docs[0] as unknown as Revision | undefined;
  if (!revision) throw missing();
  if (!Array.isArray(revision.rowRefs)) throw new APIError('Unsupported Data Table row revision format.', 409);
  return revision;
}

function rowHash(cells: DataTableRow['cells']) {
  return createHash('sha256').update(JSON.stringify(cells)).digest('hex');
}

async function readRows(req: PayloadRequest, collection: string, refs: RowRef[]): Promise<DataTableRow[]> {
  if (!refs.length) return [];
  const found = new Map<string, StoredRow>();
  for (let start = 0; start < refs.length; start += 100) {
    const keys = refs.slice(start, start + 100).map((ref) => ref.rowKey);
    const result = await req.payload.find({
      collection,
      where: { rowKey: { in: keys } },
      limit: keys.length,
      depth: 0,
      overrideAccess: true,
      req,
    });
    for (const row of result.docs as unknown as StoredRow[]) found.set(row.rowKey, row);
  }
  return refs.map((ref) => {
    const row = found.get(ref.rowKey);
    if (!row || row.rowID !== ref.rowID || rowHash(row.cells) !== ref.hash)
      throw new APIError('Data Table row snapshot is incomplete.', 409);
    return { id: ref.rowID, cells: row.cells };
  });
}

function ownerFields(req: PayloadRequest, kind: Revision['ownerKind'], slug: string): Field[] {
  const owner =
    kind === 'collection'
      ? req.payload.config.collections.find((c) => c.slug === slug)
      : req.payload.config.globals.find((g) => g.slug === slug);
  if (!owner) throw missing();
  return owner.fields;
}

async function readOwner(
  req: PayloadRequest,
  revision: Pick<Revision, 'ownerKind' | 'ownerSlug' | 'ownerID'>,
  draft: boolean,
  overrideAccess = false,
) {
  const common = {
    depth: 0,
    draft,
    locale: req.locale,
    fallbackLocale: typeof req.fallbackLocale === 'string' ? req.fallbackLocale : (false as const),
    overrideAccess,
    req,
  };
  if (revision.ownerKind === 'global') return req.payload.findGlobal({ ...common, slug: revision.ownerSlug });
  if (!revision.ownerID) throw missing();
  return req.payload.findByID({ ...common, collection: revision.ownerSlug, id: revision.ownerID });
}

/** Parent and field access must succeed, and the selected snapshot must actually reference this revision. */
async function authorizeRevision(
  req: PayloadRequest,
  revision: Revision,
  {
    draft = false,
    versionId,
    overrideAccess = false,
  }: { draft?: boolean; versionId?: string; overrideAccess?: boolean } = {},
) {
  const fields = ownerFields(req, revision.ownerKind, revision.ownerSlug);
  let document: unknown = await readOwner(req, revision, draft, overrideAccess);
  if (versionId) {
    const common = {
      id: versionId,
      depth: 0,
      locale: req.locale,
      fallbackLocale: typeof req.fallbackLocale === 'string' ? req.fallbackLocale : (false as const),
      overrideAccess,
      req,
    };
    const version =
      revision.ownerKind === 'collection'
        ? await req.payload.findVersionByID({ ...common, collection: revision.ownerSlug })
        : await req.payload.findGlobalVersionByID({ ...common, slug: revision.ownerSlug });
    if (revision.ownerKind === 'collection' && String(version.parent) !== revision.ownerID) throw missing();
    document = version.version;
  }
  const match = tableInstances(fields, document, req.payload.config.blocks ?? []).find(
    ({ value }) =>
      isDataTableStorageManifest(value) &&
      value.tableId === revision.tableId &&
      value.revisionId === revision.revisionId,
  );
  if (!match || !isDataTableStorageManifest(match.value)) throw missing();
  return { manifest: match.value, options: match.options };
}

function sameManifestContent(left: DataTableStorageManifest, right: DataTableStorageManifest) {
  const comparable = (manifest: DataTableStorageManifest) => ({
    version: manifest.version,
    tableId: manifest.tableId,
    revisionId: manifest.revisionId,
    headerRow: manifest.headerRow,
    caption: manifest.caption,
    appearance: manifest.appearance,
    storage: manifest.storage,
    columns: manifest.columns,
    rows: manifest.rows,
  });
  return JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));
}

export function createDataTableStorageFieldHooks(
  config: DataTableStorageConfig,
  options: ResolvedDataTableOptions,
): { beforeChange: FieldHook } {
  const beforeChange: FieldHook = async (args) => {
    const { value, previousValue, req, collection, global, operation, originalDoc, overrideAccess } = args;
    if (value == null) return value;
    if (req.locale === 'all') throw new APIError('Save row-backed Data Tables one locale at a time.', 400);
    let table = normalizeDataTableValue(value);
    if (!table) throw new APIError('Invalid Data Table value.', 400);
    const previous = normalizeDataTableValue(previousValue);
    const ownerKind = collection ? 'collection' : 'global';
    const ownerSlug = collection?.slug ?? global?.slug;
    if (!ownerSlug) throw new APIError('Data Table storage requires a collection or global.', 400);
    const ownerID =
      ownerKind === 'global' ? ownerSlug : operation === 'update' ? String(originalDoc?.id ?? '') : undefined;
    const sameTable = operation !== 'create' && Boolean(previous?.tableId) && table.tableId === previous?.tableId;
    if (table.storage?.mode === 'rows' && table.rows.length === 0 && !isDataTableStorageManifest(table))
      throw new APIError('Data Table manifest is missing a table ID or revision ID.', 400);
    if (isDataTableStorageManifest(table)) {
      const revision = await getRevision(req, config, table.tableId, table.revisionId);
      const sameOwner =
        revision.ownerKind === ownerKind && revision.ownerSlug === ownerSlug && revision.ownerID === ownerID;
      const unchangedReference = sameTable && previous?.revisionId === table.revisionId && sameOwner;
      const restoring = req.context.isRestoringVersion && sameOwner;
      if (!unchangedReference && !restoring) {
        // Copying a table requires access to its source, including the source field.
        try {
          await authorizeRevision(req, revision, { draft: true, overrideAccess });
        } catch (error) {
          if (!(error instanceof APIError) || ![403, 404].includes(error.status)) throw error;
          await authorizeRevision(req, revision, { overrideAccess });
        }
      }
      if ((unchangedReference || restoring) && sameManifestContent(table, revision.manifest)) return table;
      if (revision.rowRefs.length !== table.storage.rowCount)
        throw new APIError('Data Table row snapshot is incomplete.', 409);
      table = hydrateDataTableStorageManifest(table, await readRows(req, config.storageCollection, revision.rowRefs));
    }
    const validation = validateDataTable(table, options);
    if (validation !== true) throw new APIError(validation, 400);
    const tableId = sameTable ? table.tableId! : randomUUID();
    const revisionId = randomUUID();
    const manifest = createDataTableStorageManifest({ ...table, tableId, revisionId });
    const previousRevision =
      sameTable && previous?.revisionId ? await getRevision(req, config, tableId, previous.revisionId) : undefined;
    const previousRefs = new Map(previousRevision?.rowRefs.map((ref) => [ref.rowID, ref]) ?? []);
    const rowRefs = table.rows.map((row) => {
      const hash = rowHash(row.cells);
      const prior = previousRefs.get(row.id);
      return prior?.hash === hash ? prior : { rowKey: randomUUID(), rowID: row.id, hash };
    });
    // No destructive replacement and no request-global pending buffer. Pass req for the parent transaction.
    await req.payload.create({
      collection: config.revisionCollection,
      data: {
        tableId,
        revisionId,
        ownerKind,
        ownerSlug,
        ...(ownerID ? { ownerID } : {}),
        manifest,
        rowRefs,
        committed: false,
      },
      overrideAccess: true,
      req,
    });
    for (const [position, row] of table.rows.entries()) {
      if (previousRefs.get(row.id)?.rowKey === rowRefs[position].rowKey) continue;
      await req.payload.create({
        collection: config.storageCollection,
        data: {
          tableId,
          rowKey: rowRefs[position].rowKey,
          rowID: row.id,
          cells: row.cells,
        },
        overrideAccess: true,
        req,
      });
    }
    return manifest;
  };
  return { beforeChange };
}

/** Read the saved record independently of response field access/select when assigning newly created owners. */
export function createDataTableOwnerHook(config: DataTableStorageConfig, blocks: Block[]): CollectionAfterChangeHook {
  return async ({ collection, doc, operation, req }) => {
    const saved = await req.payload.db.findOne({
      collection: collection.slug,
      locale: 'all',
      req,
      where: { id: { equals: doc.id } },
    });
    for (const { value } of tableInstances(collection.fields, saved, blocks, '', true)) {
      if (operation !== 'create') break;
      if (!isDataTableStorageManifest(value) || !value.tableId || !value.revisionId) continue;
      const revision = await getRevision(req, config, value.tableId, value.revisionId);
      if (
        revision.ownerKind !== 'collection' ||
        revision.ownerSlug !== collection.slug ||
        (revision.ownerID && revision.ownerID !== String(doc.id))
      )
        throw missing();
      if (!revision.ownerID)
        await req.payload.update({
          collection: config.revisionCollection,
          id: revision.id,
          data: { ownerID: String(doc.id) },
          overrideAccess: true,
          req,
        });
    }
    await pruneOwnerRevisions(
      req,
      config,
      blocks,
      'collection',
      collection.slug,
      String(doc.id),
      saved,
      collection.fields,
    );
    return doc;
  };
}

async function findAllVersions(req: PayloadRequest, kind: Revision['ownerKind'], slug: string, ownerID: string) {
  const owner =
    kind === 'collection'
      ? req.payload.config.collections.find((collection) => collection.slug === slug)
      : req.payload.config.globals.find((global) => global.slug === slug);
  if (!owner?.versions) return [];
  const versions: unknown[] = [];
  let page = 1;
  while (true) {
    const result =
      kind === 'collection'
        ? await req.payload.findVersions({
            collection: slug,
            where: { parent: { equals: ownerID } },
            limit: 100,
            page,
            depth: 0,
            locale: 'all',
            overrideAccess: true,
            req,
          })
        : await req.payload.findGlobalVersions({
            slug,
            limit: 100,
            page,
            depth: 0,
            locale: 'all',
            overrideAccess: true,
            req,
          });
    versions.push(...result.docs.map((doc) => doc.version));
    if (!result.hasNextPage) break;
    page++;
  }
  return versions;
}

async function pruneOwnerRevisions(
  req: PayloadRequest,
  config: DataTableStorageConfig,
  blocks: Block[],
  kind: Revision['ownerKind'],
  slug: string,
  ownerID: string,
  saved: unknown,
  fields: Field[],
) {
  const referenced = new Set<string>();
  const current = new Set<string>();
  for (const { value } of tableInstances(fields, saved, blocks, '', true))
    if (isDataTableStorageManifest(value)) current.add(value.revisionId);
  for (const snapshot of [saved, ...(await findAllVersions(req, kind, slug, ownerID))]) {
    for (const { value } of tableInstances(fields, snapshot, blocks, '', true))
      if (isDataTableStorageManifest(value)) referenced.add(value.revisionId);
  }
  const where: Where = {
    and: [{ ownerKind: { equals: kind } }, { ownerSlug: { equals: slug } }, { ownerID: { equals: ownerID } }],
  };
  const revisions: Revision[] = [];
  let page = 1;
  while (true) {
    const result = await req.payload.find({
      collection: config.revisionCollection,
      where,
      limit: 100,
      page,
      depth: 0,
      overrideAccess: true,
      req,
    });
    revisions.push(...(result.docs as unknown as Revision[]));
    if (!result.hasNextPage) break;
    page++;
  }
  for (const revision of revisions) {
    if (current.has(revision.revisionId) && !revision.committed) {
      await req.payload.update({
        collection: config.revisionCollection,
        id: revision.id,
        data: { committed: true },
        overrideAccess: true,
        req,
      });
      revision.committed = true;
    }
  }
  const isPending = (revision: Revision) =>
    !revision.committed && (!revision.createdAt || Date.now() - Date.parse(revision.createdAt) < 86_400_000);
  const retainedKeys = new Set(
    revisions
      .filter((revision) => referenced.has(revision.revisionId) || isPending(revision))
      .flatMap((revision) => revision.rowRefs.map((ref) => ref.rowKey)),
  );
  const deadKeys = new Set<string>();
  const deadRevisions: Revision[] = [];
  for (const revision of revisions) {
    if (referenced.has(revision.revisionId)) continue;
    // Another save may have created this revision before its parent afterChange hook runs.
    if (isPending(revision)) continue;
    for (const ref of revision.rowRefs) {
      if (retainedKeys.has(ref.rowKey)) continue;
      deadKeys.add(ref.rowKey);
    }
    deadRevisions.push(revision);
  }
  const keys = [...deadKeys];
  for (let start = 0; start < keys.length; start += 100)
    await deleteMatching(req, config.storageCollection, { rowKey: { in: keys.slice(start, start + 100) } });
  for (const revision of deadRevisions)
    await req.payload.delete({ collection: config.revisionCollection, id: revision.id, overrideAccess: true, req });
}

export function createDataTableGlobalHook(config: DataTableStorageConfig, blocks: Block[]): GlobalAfterChangeHook {
  return async ({ global, doc, req }) => {
    const saved = await req.payload.findGlobal({
      slug: global.slug,
      depth: 0,
      locale: 'all',
      overrideAccess: true,
      req,
    });
    await pruneOwnerRevisions(req, config, blocks, 'global', global.slug, global.slug, saved, global.fields);
    return doc;
  };
}

export function createDataTableRowsCollection(slug = DEFAULT_DATA_TABLE_STORAGE_COLLECTION): CollectionConfig {
  return {
    slug,
    admin: { hidden: true },
    access: { create: () => false, delete: () => false, read: () => false, update: () => false },
    fields: [
      { name: 'tableId', type: 'text', required: true },
      { name: 'rowKey', type: 'text', required: true, unique: true },
      { name: 'rowID', type: 'text', required: true },
      { name: 'cells', type: 'json', required: true },
    ],
    indexes: [{ fields: ['tableId', 'rowKey'] }],
  };
}

export function createDataTableRevisionsCollection(slug = DEFAULT_DATA_TABLE_REVISION_COLLECTION): CollectionConfig {
  return {
    slug,
    admin: { hidden: true },
    access: { create: () => false, delete: () => false, read: () => false, update: () => false },
    fields: [
      { name: 'tableId', type: 'text', required: true, index: true },
      { name: 'revisionId', type: 'text', required: true, unique: true },
      { name: 'ownerKind', type: 'select', options: ['collection', 'global'], required: true },
      { name: 'ownerSlug', type: 'text', required: true },
      { name: 'ownerID', type: 'text' },
      { name: 'manifest', type: 'json', required: true },
      { name: 'rowRefs', type: 'json', required: true },
      { name: 'committed', type: 'checkbox', defaultValue: false },
    ],
    indexes: [{ fields: ['ownerKind', 'ownerSlug', 'ownerID'] }],
  };
}

async function deleteMatching(req: PayloadRequest, collection: string, where: Where) {
  while (true) {
    const result = await req.payload.find({ collection, where, limit: 100, depth: 0, overrideAccess: true, req });
    for (const doc of result.docs) await req.payload.delete({ collection, id: doc.id, overrideAccess: true, req });
    if (!result.docs.length) break;
  }
}

/** Hard deletion removes every revision and its immutable row records. */
export function createDataTableDeleteHook(config: DataTableStorageConfig): CollectionAfterDeleteHook {
  return async ({ doc, req, collection }) => {
    const where: Where = {
      and: [
        { ownerKind: { equals: 'collection' } },
        { ownerSlug: { equals: collection.slug } },
        { ownerID: { equals: String(doc.id) } },
      ],
    };
    while (true) {
      const result = await req.payload.find({
        collection: config.revisionCollection,
        where,
        limit: 100,
        depth: 0,
        overrideAccess: true,
        req,
      });
      for (const item of result.docs) {
        const revision = item as unknown as Revision;
        await deleteMatching(req, config.storageCollection, { tableId: { equals: revision.tableId } });
        await req.payload.delete({ collection: config.revisionCollection, id: revision.id, overrideAccess: true, req });
      }
      if (!result.docs.length) break;
    }
    return doc;
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

function responseValue(
  table: DataTableValue,
  rows: DataTableRow[],
  options: ResolvedDataTableOptions,
  results?: ReturnType<typeof evaluateDataTableRows>,
  rowPositions = new Map<string, number>(),
) {
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
              value: results?.[rowIndex]?.[columnIndex] ?? (typeof cell === 'object' ? cell.formula : cell),
              ...(typeof cell === 'object' ? { formula: cell.formula } : {}),
            })),
          }
        : {}),
    })),
  };
}

async function evaluatePageRows(
  req: PayloadRequest,
  config: DataTableStorageConfig,
  revision: Revision,
  pageIndexes: number[],
  pageRows: DataTableRow[],
) {
  const snapshot: DataTableRow[] = new Array(revision.rowRefs.length);
  for (let index = 0; index < pageIndexes.length; index++) snapshot[pageIndexes[index]] = pageRows[index];
  const inspected = new Set<number>();
  let pending = pageIndexes;
  while (pending.length) {
    const dependencies = new Set<number>();
    for (const position of pending) {
      if (inspected.has(position)) continue;
      inspected.add(position);
      for (const cell of snapshot[position].cells) {
        if (typeof cell !== 'object' || cell === null) continue;
        for (const match of cell.formula.toUpperCase().matchAll(/([A-Z]+)([1-9]\d*)(?::([A-Z]+)([1-9]\d*))?/g)) {
          const first = Number(match[2]) - 1;
          const last = match[4] ? Number(match[4]) - 1 : first;
          for (
            let row = Math.max(0, Math.min(first, last));
            row <= Math.min(snapshot.length - 1, Math.max(first, last));
            row++
          )
            if (!snapshot[row]) dependencies.add(row);
        }
      }
    }
    pending = [...dependencies];
    for (let start = 0; start < pending.length; start += 100) {
      const positions = pending.slice(start, start + 100);
      const rows = await readRows(
        req,
        config.storageCollection,
        positions.map((position) => revision.rowRefs[position]),
      );
      positions.forEach((position, index) => {
        snapshot[position] = rows[index];
      });
    }
  }
  return evaluateDataTableRows({ ...revision.manifest, rows: snapshot }, pageIndexes);
}

async function rowsResponse(
  req: PayloadRequest,
  config: DataTableStorageConfig,
  revision: Revision,
  manifest: DataTableStorageManifest,
  options: ResolvedDataTableOptions,
) {
  const url = new URL(req.url ?? 'http://localhost');
  if (url.searchParams.get('raw') === 'true')
    options = { ...options, apiResponse: { includeIds: false, computeFormulas: false } };
  const pagination = options.storage.pagination;
  // Only fetch the requested page unless formula evaluation needs referenced rows.
  const limit = Math.min(
    parsePositiveInteger(url.searchParams.get('limit'), pagination.defaultLimit),
    pagination.maxLimit,
  );
  const totalRows = manifest.storage.rowCount;
  const totalPages = Math.max(1, Math.ceil(totalRows / limit));
  const page = Math.min(parsePositiveInteger(url.searchParams.get('page'), 1), totalPages);
  if (revision.rowRefs.length !== totalRows) throw new APIError('Data Table row snapshot is incomplete.', 409);
  const firstPosition = (page - 1) * limit;
  const pageRows = await readRows(req, config.storageCollection, revision.rowRefs.slice(firstPosition, page * limit));
  const pageIndexes = pageRows.map((_, index) => firstPosition + index);
  const results = options.apiResponse.computeFormulas
    ? await evaluatePageRows(req, config, revision, pageIndexes, pageRows)
    : undefined;
  const expectedRows = Math.min(limit, Math.max(0, totalRows - (page - 1) * limit));
  if (pageRows.length !== expectedRows) throw new APIError('Data Table row snapshot is incomplete.', 409);
  const response = responseValue(
    manifest,
    pageRows,
    options,
    results,
    new Map(pageRows.map((row, index) => [row.id, firstPosition + index + 1])),
  );
  return Response.json({
    ...response,
    pagination: { page, limit, totalRows, totalPages, hasPreviousPage: page > 1, hasNextPage: page < totalPages },
  });
}

export function createDataTableRowsEndpoint(config: DataTableStorageConfig): Endpoint {
  return {
    path: '/data-tables/:tableId/rows',
    method: 'get',
    handler: async (req) => {
      const url = new URL(req.url ?? 'http://localhost');
      const tableId = String(req.routeParams?.tableId ?? '');
      const revisionId = url.searchParams.get('revision');
      if (!tableId || !revisionId) throw new APIError('A table ID and revision are required.', 400);
      if (req.locale === 'all') throw new APIError('Read a Data Table in one locale at a time.', 400);
      const revision = await getRevision(req, config, tableId, revisionId);
      const { manifest, options } = await authorizeRevision(req, revision, {
        draft: url.searchParams.get('draft') === 'true',
        versionId: url.searchParams.get('version') ?? undefined,
      });
      return rowsResponse(req, config, revision, manifest, options);
    },
  };
}
