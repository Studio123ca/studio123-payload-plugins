import type { TableFieldPluginConfig } from './table-field/shared/types.js';
import type { Config, Plugin } from 'payload';
import type { LinkCollectionOption } from './link-field/shared/types.js';
import { configureAdvancedFields } from './config.js';

export type AdvancedFieldsPluginConfig = {
  table?: TableFieldPluginConfig;
  link?: {
    collections?: LinkCollectionOption[];
  };
};

/**
 * Payload plugin for advanced fields (link field, code field, etc)
 * Configures the global link collection registry
 */
export function advancedFieldsPlugin(config: AdvancedFieldsPluginConfig = {}): Plugin {
  return (incomingConfig: Config) => {
    if (config.table) configureAdvancedFields({ table: config.table });
    // Configure the link field collections globally
    if (config.link?.collections) {
      configureAdvancedFields({
        link: {
          collections: config.link.collections,
        },
      });
    }

    return incomingConfig;
  };
}
