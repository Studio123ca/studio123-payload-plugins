import type { LinkFieldPluginConfig, LinkCollectionOption } from './link-field/shared/types.js';

export type AdvancedFieldsConfig = {
  link?: LinkFieldPluginConfig;
};

let currentConfig: AdvancedFieldsConfig = {};

export function configureAdvancedFields(config: AdvancedFieldsConfig) {
  currentConfig = {
    ...currentConfig,
    ...config,
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
