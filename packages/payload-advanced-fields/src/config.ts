import type { TableFieldPluginConfig } from './table-field/shared/types.js';
import type { LinkFieldPluginConfig, LinkCollectionOption } from './link-field/shared/types.js';

export type AdvancedFieldsConfig = {
  link?: LinkFieldPluginConfig;
  table?: TableFieldPluginConfig;
};

let currentConfig: AdvancedFieldsConfig = {};

export function configureAdvancedFields(config: AdvancedFieldsConfig) {
  currentConfig = {
    ...currentConfig,
    ...config,
    table: {
      ...currentConfig.table,
      ...config.table,
      stickyRows: { ...currentConfig.table?.stickyRows, ...config.table?.stickyRows },
    },
    link: {
      ...currentConfig.link,
      ...config.link,
    },
  };

  return currentConfig;
}

export function getAdvancedFieldsConfig() {
  return currentConfig;
}

export function getLinkCollections(): LinkCollectionOption[] {
  const collections = currentConfig.link?.collections ?? [];
  return collections;
}
