import test from 'node:test';
import assert from 'node:assert/strict';
import { APIError } from 'payload';
import { advancedFieldsPlugin } from '../dist/index.js';
import {
  createDataTable,
  dataTableField,
  resolveDataTableOptions,
  createDataTableStorageManifest,
  hydrateDataTableStorageManifest,
  normalizeDataTableValue,
} from '../dist/data-table-field/index.js';
import { tableInstances } from '../dist/data-table-field/server/traversal.js';

const storage = { storageCollection: 'data-table-rows', revisionCollection: 'data-table-revisions' };
const options = resolveDataTableOptions({
  columns: { initial: 1 },
  rows: { initial: 3 },
  storage: { mode: 'rows', pagination: { enabled: true, defaultLimit: 2, maxLimit: 2 } },
});
const field = (name = 'grid') => dataTableField({ name, ...options });
const table = (label = 'value') => {
  const value = createDataTable(options);
  value.rows.forEach((row, index) => {
    row.cells[0] = `${label}-${index}`;
  });
  return value;
};
const clone = (value) => structuredClone(value);
function matches(doc, where = {}) {
  if (where.and) return where.and.every((part) => matches(doc, part));
  if (where.or) return where.or.some((part) => matches(doc, part));
  return Object.entries(where).every(([key, condition]) => {
    if ('equals' in condition) return doc[key] === condition.equals;
    if ('in' in condition) return condition.in.includes(doc[key]);
    if ('exists' in condition) return (doc[key] != null) === condition.exists;
    throw new Error(`Unsupported test query ${JSON.stringify(condition)}`);
  });
}
function fixture(fields = [field()], extras = {}) {
  const config = advancedFieldsPlugin()({ collections: [{ slug: 'pages', fields, versions: true }], ...extras });
  const collection = config.collections.find((c) => c.slug === 'pages');
  const records = new Map();
  const documents = new Map();
  const versions = new Map();
  const calls = [];
  let counter = 0;
  let redact = (doc) => doc;
  const req = {
    context: {},
    locale: 'en',
    payload: {
      config,
      find: async (args) => {
        calls.push({ method: 'find', ...args });
        const docs = [...(records.get(args.collection) ?? [])].filter((doc) => matches(doc, args.where));
        if (args.sort === 'position') docs.sort((a, b) => a.position - b.position);
        const start = ((args.page ?? 1) - 1) * args.limit;
        return { docs: clone(docs.slice(start, start + args.limit)), hasNextPage: start + args.limit < docs.length };
      },
      create: async (args) => {
        calls.push({ method: 'create', ...args });
        const doc = { ...clone(args.data), id: String(++counter) };
        records.set(args.collection, [...(records.get(args.collection) ?? []), doc]);
        return clone(doc);
      },
      update: async (args) => {
        calls.push({ method: 'update', ...args });
        const doc = records.get(args.collection).find((item) => item.id === args.id);
        Object.assign(doc, clone(args.data));
        return clone(doc);
      },
      delete: async (args) => {
        calls.push({ method: 'delete', ...args });
        records.set(
          args.collection,
          records.get(args.collection).filter((item) => item.id !== args.id),
        );
      },
      findByID: async (args) => {
        calls.push({ method: 'findByID', ...args });
        const doc = documents.get(`${args.collection}/${args.id}/${args.locale}/${Boolean(args.draft)}`);
        if (!doc) throw new APIError('Missing document', 404);
        return args.overrideAccess ? clone(doc) : redact(clone(doc));
      },
      findGlobal: async (args) => req.payload.findByID({ ...args, collection: 'globals', id: args.slug }),
      findVersionByID: async (args) => {
        calls.push({ method: 'findVersionByID', ...args });
        if (!versions.has(args.id)) throw new APIError('Forbidden version', 403);
        const version = clone(versions.get(args.id));
        version.version = redact(version.version);
        return version;
      },
      findGlobalVersionByID: async (args) => req.payload.findVersionByID(args),
      findVersions: async ({ where, limit, page }) => {
        const docs = [...versions.entries()]
          .filter(([, version]) => matches(version, where))
          .map(([id, version]) => ({ id, ...clone(version) }));
        const start = ((page ?? 1) - 1) * limit;
        return { docs: docs.slice(start, start + limit), hasNextPage: start + limit < docs.length };
      },
      findGlobalVersions: async ({ limit, page }) => {
        const docs = [...versions.entries()].map(([id, version]) => ({ id, ...clone(version) }));
        const start = ((page ?? 1) - 1) * limit;
        return { docs: docs.slice(start, start + limit), hasNextPage: start + limit < docs.length };
      },
      db: { findOne: async ({ collection, where }) => clone(documents.get(`${collection}/${where.id.equals}/raw`)) },
    },
  };
  const put = (id, doc, { draft = false, locale = req.locale, slug = 'pages' } = {}) => {
    documents.set(`${slug}/${id}/${locale}/${draft}`, { id, ...clone(doc) });
    documents.set(`${slug}/${id}/raw`, { id, ...clone(doc) });
  };
  const persist = async (
    value,
    {
      previousValue,
      id = 'p1',
      path = ['grid'],
      target = collection.fields[0],
      operation = 'update',
      global,
      hookReq = req,
    } = {},
  ) =>
    target.hooks.beforeChange.at(-1)({
      value,
      previousValue,
      operation,
      path,
      originalDoc: { id },
      collection: global ? null : collection,
      global,
      req: hookReq,
      overrideAccess: false,
    });
  const read = async (manifest, query = '') => {
    const endpoint = config.endpoints.find((e) => e.path === '/data-tables/:tableId/rows');
    const response = await endpoint.handler({
      ...req,
      routeParams: { tableId: manifest.tableId },
      url: `http://localhost/api/data-tables/${manifest.tableId}/rows?revision=${manifest.revisionId}${query}`,
    });
    return response.json();
  };
  return {
    req,
    config,
    collection,
    records,
    documents,
    versions,
    calls,
    put,
    persist,
    read,
    redact: (fn) => {
      redact = fn;
    },
  };
}

test('registers hooks for nested arrays, inline blocks, referenced blocks, tabs, and globals', () => {
  const block = { slug: 'table-block', fields: [field()] };
  const f = fixture(
    [
      { name: 'layout', type: 'blocks', blocks: [block, 'shared'] },
      { name: 'items', type: 'array', fields: [{ name: 'details', type: 'group', fields: [field()] }] },
      { type: 'tabs', tabs: [{ name: 'tab', fields: [field()] }] },
    ],
    {
      blocks: [{ slug: 'shared', fields: [field()] }],
      globals: [{ slug: 'settings', fields: [field()] }],
    },
  );
  const fields = f.collection.fields;
  for (const candidate of [
    fields[0].blocks[0].fields[0],
    fields[1].fields[0].fields[0],
    fields[2].tabs[0].fields[0],
    f.config.blocks[0].fields[0],
    f.config.globals[0].fields[0],
  ])
    assert.equal(candidate.hooks.beforeChange.length, 1);
  const value = createDataTableStorageManifest(table());
  assert.deepEqual(
    tableInstances(
      fields,
      {
        layout: [
          { blockType: 'shared', grid: value },
          { blockType: 'table-block', grid: value },
        ],
        items: [{ details: { grid: value } }],
        tab: { grid: value },
      },
      f.config.blocks,
    ).map((t) => t.path),
    ['layout.0.grid', 'layout.1.grid', 'items.0.details.grid', 'tab.grid'],
  );
  assert.equal(f.collection.endpoints?.length ?? 0, 0);
  assert.equal(f.config.endpoints.length, 1);
});

test('immutable saves preserve table identity and isolate published rows from drafts', async () => {
  const f = fixture();
  const first = table('published');
  const published = await f.persist(first);
  f.put('p1', { grid: published });
  const edited = hydrateDataTableStorageManifest(published, first.rows);
  edited.rows[0].cells[0] = 'draft-only';
  const draft = await f.persist(edited, { previousValue: published });
  f.put('p1', { grid: draft }, { draft: true });
  assert.equal(draft.tableId, published.tableId);
  assert.notEqual(draft.revisionId, published.revisionId);
  assert.equal((await f.read(published)).rows[0].cells[0], 'published-0');
  assert.equal((await f.read(draft, '&draft=true')).rows[0].cells[0], 'draft-only');
  await assert.rejects(f.read(draft), /not accessible/);
  assert.equal(
    f.calls.some((call) => call.method === 'delete'),
    false,
  );
  assert.ok(f.calls.filter((c) => ['create', 'update', 'delete'].includes(c.method)).every((c) => c.req === f.req));
});

test('unchanged manifests do not create another revision', async () => {
  const f = fixture();
  const manifest = await f.persist(table());
  const count = f.calls.filter((c) => c.method === 'create').length;
  assert.deepEqual(await f.persist(manifest, { previousValue: manifest }), manifest);
  assert.equal(f.calls.filter((c) => c.method === 'create').length, count);
});

test('API response ID enrichment does not create a new revision on an unchanged save', async () => {
  const options = resolveDataTableOptions({ storage: { mode: 'rows' }, apiResponse: { includeIds: true } });
  const f = fixture([dataTableField({ name: 'grid', ...options })]);
  const initial = await f.persist(createDataTable(options));
  const enriched = f.collection.fields[0].hooks.afterRead[0]({ value: initial });
  const count = f.calls.filter((call) => call.method === 'create').length;
  assert.deepEqual(await f.persist(enriched, { previousValue: enriched }), initial);
  assert.equal(f.calls.filter((call) => call.method === 'create').length, count);
});

test('copies get a new table identity, while block reordering preserves identity', async () => {
  const f = fixture([{ name: 'layout', type: 'blocks', blocks: [{ slug: 'table', fields: [field()] }] }]);
  const target = f.collection.fields[0].blocks[0].fields[0];
  const manifest = await f.persist(table(), { target, path: ['layout', 0, 'grid'] });
  f.put('p1', { layout: [{ id: 'b1', blockType: 'table', grid: manifest }] });
  const copy = await f.persist(manifest, { target, path: ['layout', 1, 'grid'] });
  assert.notEqual(copy.tableId, manifest.tableId);
  assert.notEqual(copy.revisionId, manifest.revisionId);
  const moved = await f.persist(manifest, { target, previousValue: manifest, path: ['layout', 3, 'grid'] });
  assert.deepEqual(moved, manifest);
  f.put('p1', {
    layout: [
      { id: 'new', blockType: 'table', grid: copy },
      { id: 'b1', blockType: 'table', grid: moved },
    ],
  });
  assert.equal((await f.read(manifest)).rows.length, 2);
});

test('nested fields hidden by read access and references in arbitrary JSON cannot authorize reads or copies', async () => {
  const f = fixture([field(), { name: 'untrusted', type: 'json' }]);
  const manifest = await f.persist(table());
  f.put('p1', { grid: manifest, untrusted: manifest });
  f.redact((doc) => {
    delete doc.grid;
    return doc;
  });
  await assert.rejects(f.read(manifest), /not accessible/);
  await assert.rejects(f.persist(manifest, { id: 'other-parent' }), /not accessible/);
  assert.ok(f.calls.filter((c) => c.method === 'findByID').every((c) => c.overrideAccess === false));
});

test('historical reads require version access and the correct parent; restoration retains immutable rows', async () => {
  const f = fixture();
  const old = await f.persist(table('old'));
  const current = await f.persist({ ...table('new'), tableId: old.tableId }, { previousValue: old });
  f.put('p1', { grid: current });
  await assert.rejects(f.read(old), /not accessible/);
  await assert.rejects(f.read(old, '&version=denied'), /Forbidden version/);
  f.versions.set('v1', { parent: 'p1', version: { grid: old } });
  assert.equal((await f.read(old, '&version=v1')).rows[0].cells[0], 'old-0');
  f.versions.set('wrong', { parent: 'p2', version: { grid: old } });
  await assert.rejects(f.read(old, '&version=wrong'), /not accessible/);
  f.req.context.isRestoringVersion = true;
  assert.deepEqual(await f.persist(old, { previousValue: current }), old);
});

test('locale selection cannot expose a revision referenced only by another locale', async () => {
  const f = fixture();
  const en = await f.persist(table('en'));
  f.put('p1', { grid: en });
  f.req.locale = 'fr';
  const fr = await f.persist(table('fr'));
  f.put('p1', { grid: fr });
  assert.equal((await f.read(fr)).rows[0].cells[0], 'fr-0');
  await assert.rejects(f.read(en), /not accessible/);
  f.req.locale = 'en';
  assert.equal((await f.read(en)).rows[0].cells[0], 'en-0');
});

test('interleaved saves sharing a request cannot swap rows or owner IDs', async () => {
  const f = fixture();
  const [a, b] = await Promise.all([f.persist(table('A'), { id: 'a' }), f.persist(table('B'), { id: 'b' })]);
  f.put('a', { grid: a });
  f.put('b', { grid: b });
  assert.equal((await f.read(a)).rows[0].cells[0], 'A-0');
  assert.equal((await f.read(b)).rows[0].cells[0], 'B-0');
  assert.deepEqual(f.req.context, {});
});

test('new document ownership is bound from storage even if response selection hides the table', async () => {
  const f = fixture();
  const manifest = await f.persist(table(), { operation: 'create' });
  f.put('created', { grid: manifest });
  await f.collection.hooks.afterChange[0]({
    doc: { id: 'created' },
    operation: 'create',
    collection: f.collection,
    req: f.req,
  });
  assert.equal((await f.read(manifest)).rows[0].cells[0], 'value-0');
  assert.equal(f.records.get(storage.revisionCollection)[0].ownerID, 'created');
});

test('new localized document ownership includes all locale snapshots', async () => {
  const f = fixture([{ ...field(), localized: true }]);
  const manifest = await f.persist(table(), { operation: 'create' });
  f.put('created', { grid: manifest });
  f.documents.set('pages/created/raw', { id: 'created', grid: { en: manifest } });
  await f.collection.hooks.afterChange[0]({
    doc: { id: 'created' },
    operation: 'create',
    collection: f.collection,
    req: f.req,
  });
  assert.equal(f.records.get(storage.revisionCollection)[0].ownerID, 'created');
});

test('global tables use the same authorized revision endpoint', async () => {
  const f = fixture([], { globals: [{ slug: 'settings', fields: [field()] }] });
  const global = f.config.globals[0];
  const manifest = await f.persist(table('global'), { target: global.fields[0], global });
  f.put('settings', { grid: manifest }, { slug: 'globals' });
  assert.equal((await f.read(manifest)).rows[0].cells[0], 'global-0');
});

test('manifests without table and revision IDs are rejected explicitly', async () => {
  const f = fixture();
  const old = createDataTableStorageManifest(table());
  delete old.tableId;
  delete old.revisionId;
  await assert.rejects(f.persist(old, { previousValue: old }), /missing a table ID or revision ID/);
  assert.equal(f.collection.endpoints?.length ?? 0, 0);
});

test('incomplete snapshots fail clearly instead of returning or copying missing rows', async () => {
  const f = fixture();
  const manifest = await f.persist(table());
  f.put('p1', { grid: manifest });
  f.records.set(storage.storageCollection, f.records.get(storage.storageCollection).slice(0, 2));
  await assert.rejects(f.read(manifest, '&page=2'), /incomplete/);
  await assert.rejects(f.persist(manifest, { id: 'copy' }), /incomplete/);
});

test('hard deletion cleans owned revisions and rows without deleting other tables', async () => {
  const f = fixture();
  const a = await f.persist(table('a'), { id: 'a' });
  const b = await f.persist(table('b'), { id: 'b' });
  f.put('b', { grid: b });
  await f.collection.hooks.afterDelete[0]({
    doc: { id: 'a', deletedAt: 'previous-trash-date' },
    req: f.req,
    collection: f.collection,
  });
  assert.equal(
    f.records.get(storage.revisionCollection).some((r) => r.revisionId === a.revisionId),
    false,
  );
  assert.equal(
    f.records.get(storage.storageCollection).some((r) => r.revisionId === a.revisionId),
    false,
  );
  assert.equal((await f.read(b)).rows[0].cells[0], 'b-0');
});

test('new table ID endpoint preserves global response cell IDs across pages', async () => {
  const options = resolveDataTableOptions({
    rows: { initial: 3 },
    columns: { initial: 1 },
    apiResponse: { includeIds: true },
    storage: { mode: 'rows', pagination: { enabled: true, defaultLimit: 2, maxLimit: 2 } },
  });
  const f = fixture([dataTableField({ name: 'grid', ...options })]);
  const manifest = await f.persist(createDataTable(options));
  f.put('p1', { grid: manifest });
  const page = await f.read(manifest, '&page=2');
  assert.equal(page.rows[0].cells[0].cellId, 'A3');
  assert.equal(page.rows[0].rowId, page.rows[0].id);
});

test('pagination is bounded; response normalization preserves identity', async () => {
  const f = fixture();
  const manifest = await f.persist(table());
  f.put('p1', { grid: manifest });
  const response = await f.read(manifest, '&limit=999');
  assert.equal(response.pagination.limit, 2);
  assert.equal(response.rows.length, 2);
  assert.equal(response.pagination.hasNextPage, true);
  assert.equal(normalizeDataTableValue(response).tableId, manifest.tableId);
  const page = await f.read(manifest, '&page=2');
  assert.equal(page.rows[0].cells[0], 'value-2');
});

test('editing one row reuses unchanged immutable row records', async () => {
  const f = fixture();
  const original = table('original');
  const first = await f.persist(original);
  const changed = clone(original);
  changed.tableId = first.tableId;
  changed.rows[1].cells[0] = 'changed';
  const second = await f.persist(changed, { previousValue: first });
  assert.equal(f.records.get(storage.storageCollection).length, original.rows.length + 1);
  const [oldRevision, newRevision] = f.records.get(storage.revisionCollection);
  assert.equal(oldRevision.rowRefs[0].rowKey, newRevision.rowRefs[0].rowKey);
  assert.notEqual(oldRevision.rowRefs[1].rowKey, newRevision.rowRefs[1].rowKey);
  f.put('p1', { grid: second });
  assert.equal((await f.read(second)).rows[1].cells[0], 'changed');
});

test('removed tables prune unreferenced revisions and retain version snapshots', async () => {
  const f = fixture();
  const original = table('first');
  const first = await f.persist(original);
  f.put('p1', { grid: first });
  await f.collection.hooks.afterChange[0]({
    doc: { id: 'p1' },
    operation: 'update',
    collection: f.collection,
    req: f.req,
  });
  const edited = { ...clone(original), tableId: first.tableId };
  edited.rows[0].cells[0] = 'edited';
  const second = await f.persist(edited, { previousValue: first });
  f.versions.set('v1', { parent: 'p1', version: { grid: first } });
  f.put('p1', { grid: second });
  await f.collection.hooks.afterChange[0]({
    doc: { id: 'p1' },
    operation: 'update',
    collection: f.collection,
    req: f.req,
  });
  assert.equal(f.records.get(storage.revisionCollection).length, 2);
  f.put('p1', {});
  await f.collection.hooks.afterChange[0]({
    doc: { id: 'p1' },
    operation: 'update',
    collection: f.collection,
    req: f.req,
  });
  assert.equal(f.records.get(storage.revisionCollection).length, 1);
  assert.equal(f.records.get(storage.revisionCollection)[0].revisionId, first.revisionId);
  assert.equal(f.records.get(storage.storageCollection).length, first.storage.rowCount);
  f.versions.clear();
  await f.collection.hooks.afterChange[0]({
    doc: { id: 'p1' },
    operation: 'update',
    collection: f.collection,
    req: f.req,
  });
  assert.equal(f.records.get(storage.revisionCollection).length, 0);
  assert.equal(f.records.get(storage.storageCollection).length, 0);
});

test('cleanup leaves a concurrent uncommitted revision and its shared rows intact', async () => {
  const f = fixture();
  const original = table('first');
  const first = await f.persist(original);
  f.put('p1', { grid: first });
  await f.collection.hooks.afterChange[0]({
    doc: { id: 'p1' },
    operation: 'update',
    collection: f.collection,
    req: f.req,
  });
  const second = await f.persist({ ...clone(original), tableId: first.tableId }, { previousValue: first });
  f.put('p1', {});
  await f.collection.hooks.afterChange[0]({
    doc: { id: 'p1' },
    operation: 'update',
    collection: f.collection,
    req: f.req,
  });
  assert.equal(f.records.get(storage.revisionCollection).length, 1);
  assert.equal(f.records.get(storage.revisionCollection)[0].revisionId, second.revisionId);
  assert.equal(f.records.get(storage.storageCollection).length, original.rows.length);
});

test('unversioned owners skip version scans and prune removed tables', async () => {
  const f = fixture();
  f.collection.versions = false;
  f.req.payload.findVersions = async () => {
    throw new Error('No version table');
  };
  const manifest = await f.persist(table());
  f.put('p1', { grid: manifest });
  await f.collection.hooks.afterChange[0]({
    doc: { id: 'p1' },
    operation: 'update',
    collection: f.collection,
    req: f.req,
  });
  f.put('p1', {});
  await f.collection.hooks.afterChange[0]({
    doc: { id: 'p1' },
    operation: 'update',
    collection: f.collection,
    req: f.req,
  });
  assert.equal(f.records.get(storage.revisionCollection).length, 0);
});

test('global changes prune removed table revisions', async () => {
  const f = fixture([], { globals: [{ slug: 'settings', fields: [field()] }] });
  const global = f.config.globals[0];
  const manifest = await f.persist(table(), { target: global.fields[0], global });
  f.put('settings', { grid: manifest }, { slug: 'globals', locale: 'all' });
  await global.hooks.afterChange[0]({ doc: { grid: manifest }, global, req: f.req });
  f.put('settings', {}, { slug: 'globals', locale: 'all' });
  await global.hooks.afterChange[0]({ doc: {}, global, req: f.req });
  assert.equal(f.records.get(storage.revisionCollection).length, 0);
  assert.equal(f.records.get(storage.storageCollection).length, 0);
});

test('formula pages fetch only the requested rows and their dependencies', async () => {
  const formulaOptions = resolveDataTableOptions({
    columns: { initial: 1 },
    rows: { initial: 3 },
    formulas: { enabled: true, compute: true },
    storage: { mode: 'rows', pagination: { enabled: true, defaultLimit: 2, maxLimit: 2 } },
  });
  const f = fixture([dataTableField({ name: 'grid', ...formulaOptions })]);
  const value = table('plain');
  value.rows[2].cells[0] = { formula: '=A1' };
  const manifest = await f.persist(value);
  f.put('p1', { grid: manifest });
  const callsBefore = f.calls.length;
  const page = await f.read(manifest, '&page=2');
  assert.equal(page.rows[0].cells[0].value, 'plain-0');
  const reads = f.calls
    .slice(callsBefore)
    .filter((call) => call.method === 'find' && call.collection === storage.storageCollection);
  assert.equal(reads.length, 2);
  assert.deepEqual(
    reads.map((read) => read.where.rowKey.in.length),
    [1, 1],
  );
});
