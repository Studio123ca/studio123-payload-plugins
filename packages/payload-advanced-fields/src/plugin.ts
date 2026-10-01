import type { Plugin } from 'payload';
import type { LinkCollectionOption } from './link-field/shared/types.js';
import { configureAdvancedFields } from './config.js';

export type AdvancedFieldsPluginConfig = {
  link?: { collections?: LinkCollectionOption[] };
};

export function advancedFieldsPlugin(config: AdvancedFieldsPluginConfig = {}): Plugin {
  return (incomingConfig) => {
    if (config.link?.collections) configureAdvancedFields({ link: { collections: config.link.collections } });
    return incomingConfig;
  };
}
