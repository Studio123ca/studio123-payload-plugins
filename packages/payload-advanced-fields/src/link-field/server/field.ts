import type { getAdvancedFieldsConfig, getLinkCollections } from '../../config.js';
import { getAdvancedFieldsConfig as getAdvancedFieldsConfigDefault, getLinkCollections as getLinkCollectionsDefault } from '../../config.js';
import { DEFAULT_LINK_COLLECTIONS } from '../shared/constants.js';
import type { LinkField, LinkCollectionOption, LinkType, LinkValue, LinkHrefResolver } from '../shared/types.js';
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

const filterCollections = (collectionSlugs?: string[], getLinkCollectionsFn?: typeof getLinkCollections) => {
  const globalCollections = sanitizeCollections(getLinkCollectionsFn?.());
  if (!collectionSlugs || collectionSlugs.length === 0) return globalCollections;
  return globalCollections.filter(collection => collectionSlugs.includes(collection.slug));
};

const toClientCollection = (collection: LinkCollectionOption): { slug: string } => ({
  slug: collection.slug,
});

export type LinkFieldConfig = Partial<Omit<LinkField, 'type'>> & {
  collectionSlugs?: string[];
  defaultType?: LinkType;
  resolveInternalHref?: LinkHrefResolver;
};

export type { LinkField } from '../shared/types.js';

export const linkField = (
  config: LinkFieldConfig = {},
  getAdvancedFieldsConfigFn?: typeof getAdvancedFieldsConfig,
  getLinkCollectionsFn?: typeof getLinkCollections,
): LinkField => {
  const {
    collectionSlugs,
    defaultType,
    label = 'Link',
    localized = false,
    name = 'link',
    required = false,
    resolveInternalHref,
    admin,
    ...rest
  } = config;

  const getConfigFn = getAdvancedFieldsConfigFn || getAdvancedFieldsConfigDefault;
  const getCollectionsFn = getLinkCollectionsFn || getLinkCollectionsDefault;

  const globalConfig = getConfigFn().link;
  const normalizedDefaultType = defaultType ?? globalConfig?.defaultType ?? 'external';

  return {
    name,
    label,
    type: 'json',
    localized,
    defaultValue: { ...defaultValue, type: normalizedDefaultType },
    validate: value => {
      // Get collections at validate time, not at field definition time
      const normalizedCollections = filterCollections(collectionSlugs, getCollectionsFn);
      return validateLink(value as LinkValue | null | undefined, { collections: normalizedCollections, required });
    },
    admin: {
      ...admin,
      components: {
        Field: {
          path: '@studio123/payload-advanced-fields/link-field/client',
          exportName: 'LinkField',
          clientProps: {
            collectionSlugs: collectionSlugs,
            defaultType: normalizedDefaultType,
            localized,
            required,
          },
        },
        ...(admin?.components || {}),
      },
    },
    hooks: (() => {
      // Pass the collectionSlugs, not the collections - hooks will resolve at runtime
      return createLinkFieldHooks(collectionSlugs, resolveInternalHref ?? globalConfig?.resolveInternalHref);
    })(),
    ...rest,
  } as LinkField;
};
