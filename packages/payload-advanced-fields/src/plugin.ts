import type { CollectionConfig, Field, Plugin } from 'payload';
import type { LinkCollectionOption } from './link-field/shared/types.js';
import { configureAdvancedFields } from './config.js';
import {
  createDataTableRowsCollection,
  createDataTableRevisionsCollection,
  createDataTableRowsEndpoint,
  createDataTableStorageFieldHooks,
  createDataTableDeleteHook,
  createDataTableOwnerHook,
  createDataTableGlobalHook,
  DEFAULT_DATA_TABLE_STORAGE_COLLECTION,
  DEFAULT_DATA_TABLE_REVISION_COLLECTION,
} from './data-table-field/server/storage.js';
import { hasTableField, mapTableFields, tableOptions } from './data-table-field/server/traversal.js';

export type AdvancedFieldsPluginConfig = {
  link?: { collections?: LinkCollectionOption[] };
  dataTable?: { storageCollection?: string; revisionCollection?: string };
};

export function advancedFieldsPlugin(config: AdvancedFieldsPluginConfig = {}): Plugin {
  return (incomingConfig) => {
    if (config.link?.collections) configureAdvancedFields({ link: { collections: config.link.collections } });
    const storage = {
      storageCollection: config.dataTable?.storageCollection ?? DEFAULT_DATA_TABLE_STORAGE_COLLECTION,
      revisionCollection: config.dataTable?.revisionCollection ?? DEFAULT_DATA_TABLE_REVISION_COLLECTION,
    };
    let enabled = false;
    const transform = (field: Field): Field => {
      if (field.type !== 'json') throw new Error('Data Table storage requires a JSON field.');
      enabled = true;
      const hooks = createDataTableStorageFieldHooks(storage, tableOptions(field)!);
      return {
        ...field,
        hooks: { ...field.hooks, beforeChange: [...(field.hooks?.beforeChange ?? []), hooks.beforeChange] },
      };
    };
    const blocks = (incomingConfig.blocks ?? []).map((block) => ({
      ...block,
      fields: mapTableFields(block.fields, incomingConfig.blocks ?? [], transform),
    }));
    const collections = (incomingConfig.collections ?? []).map((collection) => ({
      ...collection,
      fields: mapTableFields(collection.fields, blocks, transform),
    }));
    const globals = (incomingConfig.globals ?? []).map((global) => {
      const fields = mapTableFields(global.fields, blocks, transform);
      return {
        ...global,
        fields,
        hooks: {
          ...global.hooks,
          afterChange: hasTableField(fields, blocks)
            ? [...(global.hooks?.afterChange ?? []), createDataTableGlobalHook(storage, blocks)]
            : global.hooks?.afterChange,
        },
      };
    });
    if (!enabled) return incomingConfig;
    if (
      storage.storageCollection === storage.revisionCollection ||
      collections.some((c) => c.slug === storage.storageCollection || c.slug === storage.revisionCollection)
    )
      throw new Error('Data Table storage collection slugs must be distinct and reserved for the plugin.');
    if (
      incomingConfig.endpoints?.some(
        (endpoint) => endpoint.method === 'get' && endpoint.path === '/data-tables/:tableId/rows',
      )
    )
      throw new Error('The Data Table row endpoint path is already registered.');
    return {
      ...incomingConfig,
      blocks,
      endpoints: [...(incomingConfig.endpoints ?? []), createDataTableRowsEndpoint(storage)],
      collections: [
        ...collections.map((collection): CollectionConfig => ({
          ...collection,
          hooks: {
            ...collection.hooks,
            afterChange: hasTableField(collection.fields, blocks)
              ? [createDataTableOwnerHook(storage, blocks), ...(collection.hooks?.afterChange ?? [])]
              : collection.hooks?.afterChange,
            afterDelete: hasTableField(collection.fields, blocks)
              ? [...(collection.hooks?.afterDelete ?? []), createDataTableDeleteHook(storage)]
              : collection.hooks?.afterDelete,
          },
        })),
        createDataTableRowsCollection(storage.storageCollection),
        createDataTableRevisionsCollection(storage.revisionCollection),
      ],
      globals,
    };
  };
}
