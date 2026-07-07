import type { Field } from 'payload';
import { getAdvancedFieldsConfig, getLinkCollections } from '../../config.js';
import { DEFAULT_LINK_COLLECTIONS } from '../shared/constants.js';
import type { LinkCollectionOption, LinkFieldConfig, LinkValue } from '../shared/types.js';
import { validateLink } from '../shared/validateLink.js';
import { createLinkFieldHooks } from './hooks.js';

const defaultValue: LinkValue = {
  type: 'external',
  label: '',
  newTab: false,
  enableAnchor: false,
  external: '',
  internal: null,
  email: '',
  phone: '',
  anchor: '',
};

const sanitizeCollections = (collections?: LinkCollectionOption[]) => {
  if (!collections || collections.length === 0) return DEFAULT_LINK_COLLECTIONS;
  return collections;
};

const filterCollections = (collectionSlugs?: LinkFieldConfig['collectionSlugs']) => {
  const globalCollections = sanitizeCollections(getLinkCollections());
  if (!collectionSlugs || collectionSlugs.length === 0) return globalCollections;
  return globalCollections.filter(collection => collectionSlugs.includes(collection.slug));
};

const toClientCollection = (collection: LinkCollectionOption): { slug: string } => ({
  slug: collection.slug,
});

export const linkField = (
  {
    collectionSlugs,
    defaultType,
    label = 'Link',
    name = 'link',
    required = false,
    resolveInternalHref,
  }: LinkFieldConfig = {},
): Field => {
  const globalConfig = getAdvancedFieldsConfig().link;
  const normalizedDefaultType = defaultType ?? globalConfig?.defaultType ?? 'external';

  return {
    name,
    label,
    type: 'json',
    defaultValue: { ...defaultValue, type: normalizedDefaultType },
    validate: value => {
      // Get collections at validate time, not at field definition time
      const normalizedCollections = filterCollections(collectionSlugs);
      return validateLink(value as LinkValue | null | undefined, { collections: normalizedCollections, required });
    },
    admin: {
      components: {
        Field: {
          path: '@studio123/payload-advanced-fields/client',
          exportName: 'LinkField',
          clientProps: {
            // Pass collectionSlugs to client - it will resolve from global config at runtime
            collectionSlugs: collectionSlugs,
            defaultType: normalizedDefaultType,
          },
        },
      },
    },
    hooks: (() => {
      // Pass the collectionSlugs, not the collections - hooks will resolve at runtime
      return createLinkFieldHooks(collectionSlugs, resolveInternalHref ?? globalConfig?.resolveInternalHref);
    })(),
  };
};
