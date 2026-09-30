import type { CollectionConfig, Config, Plugin } from 'payload';
import type { LinkCollectionOption } from './link-field/shared/types.js';
import { configureAdvancedFields } from './config.js';
import {
  createDataTableRowsCollection,
  createDataTableRowsEndpoint,
  createDataTableStorageHooks,
  DEFAULT_DATA_TABLE_STORAGE_COLLECTION,
  type DataTableStorageDefinition,
} from './data-table-field/server/storage.js';

export type AdvancedFieldsPluginConfig = {
  link?: {
    collections?: LinkCollectionOption[];
  };
  dataTable?: {
    storageCollection?: string;
  };
};

function collectDataTableDefinitions(fields: unknown[], parentPath = ''): DataTableStorageDefinition[] {
  const definitions: DataTableStorageDefinition[] = [];
  for (const candidate of fields) {
    if (!candidate || typeof candidate !== 'object') continue;
    const field = candidate as Record<string, unknown>;
    const ownName = typeof field.name === 'string' ? field.name : '';
    const fieldPath = ownName ? (parentPath ? `${parentPath}.${ownName}` : ownName) : parentPath;
    const metadata = field.custom as { dataTable?: { options?: DataTableStorageDefinition['options'] } } | undefined;
    if (metadata?.dataTable?.options?.storage.mode === 'rows' && fieldPath) {
      definitions.push({ fieldName: fieldPath, options: metadata.dataTable.options });
    }
    if (
      Array.isArray(field.fields) &&
      ['group', 'row', 'collapsible'].includes(typeof field.type === 'string' ? field.type : '')
    )
      definitions.push(...collectDataTableDefinitions(field.fields, fieldPath));
    if (Array.isArray(field.tabs)) {
      for (const tab of field.tabs) {
        if (!tab || typeof tab !== 'object') continue;
        const tabRecord = tab as Record<string, unknown>;
        const tabName = typeof tabRecord.name === 'string' ? tabRecord.name : '';
        const tabPath = tabName ? (parentPath ? `${parentPath}.${tabName}` : tabName) : parentPath;
        if (Array.isArray(tabRecord.fields))
          definitions.push(...collectDataTableDefinitions(tabRecord.fields, tabPath));
      }
    }
  }
  return definitions;
}

/**
 * Payload plugin for advanced fields (link field, code field, etc)
 * Configures the global link collection registry
 */
export function advancedFieldsPlugin(config: AdvancedFieldsPluginConfig = {}): Plugin {
  return (incomingConfig: Config) => {
    // Configure the link field collections globally
    if (config.link?.collections) {
      configureAdvancedFields({
        link: {
          collections: config.link.collections,
        },
      });
    }
    const storageCollection = config.dataTable?.storageCollection ?? DEFAULT_DATA_TABLE_STORAGE_COLLECTION;
    let hasDataTableStorage = false;
    const collections = (incomingConfig.collections ?? []).map((collection) => {
      const definitions = collectDataTableDefinitions(collection.fields as unknown[]);
      if (!definitions.length) return collection;
      hasDataTableStorage = true;
      const storageHooks = createDataTableStorageHooks(collection.slug, definitions, storageCollection);
      return {
        ...collection,
        endpoints: (collection.endpoints === false
          ? false
          : [
              ...(collection.endpoints ?? []),
              ...definitions.map((definition) =>
                createDataTableRowsEndpoint({
                  collectionSlug: collection.slug,
                  fieldName: definition.fieldName,
                  options: definition.options,
                  storageCollection,
                }),
              ),
            ]) as CollectionConfig['endpoints'],
        hooks: {
          ...collection.hooks,
          beforeChange: [storageHooks.beforeChange, ...(collection.hooks?.beforeChange ?? [])],
          afterChange: [...(collection.hooks?.afterChange ?? []), storageHooks.afterChange],
        },
      };
    });
    if (hasDataTableStorage && !collections.some((collection) => collection.slug === storageCollection)) {
      collections.push(createDataTableRowsCollection(storageCollection));
    }
    return { ...incomingConfig, collections };
  };
}
