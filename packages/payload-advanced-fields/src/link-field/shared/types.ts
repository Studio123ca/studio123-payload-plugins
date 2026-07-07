import type { CollectionSlug, PayloadRequest } from 'payload';

export type LinkType = 'internal' | 'external' | 'email' | 'phone';

export type LinkCollectionOption = {
  slug: CollectionSlug;
  generateURL?: LinkCollectionURLResolver;
};

export type LinkCollectionURLResolverArgs = {
  collection: LinkCollectionOption;
  doc: Record<string, unknown> | null;
  locale?: string;
  req?: PayloadRequest;
};

export type LinkCollectionURLResolver = (args: LinkCollectionURLResolverArgs) => string | Promise<string>;

export type LinkInternalValue = {
  relationTo: CollectionSlug;
  value: string | number | null;
  title?: string | null;
};

export type LinkValue = {
  url?: string | null;
  label?: string | null;
  newTab?: boolean | null;
  enableAnchor?: boolean | null;
  type: LinkType;
  internal?: LinkInternalValue | null;
  external?: string | null;
  email?: string | null;
  phone?: string | null;
  anchor?: string | null;
};

export type LinkInternalHrefResolverArgs = {
  collection: LinkCollectionOption;
  value: LinkInternalValue;
  doc?: Record<string, unknown> | null;
  req?: PayloadRequest;
};

export type LinkHrefResolver = (args: LinkInternalHrefResolverArgs) => string | Promise<string>;

export type LinkFieldConfig = {
  collectionSlugs?: CollectionSlug[];
  defaultType?: LinkType;
  label?: string;
  name?: string;
  required?: boolean;
  resolveInternalHref?: LinkHrefResolver;
};

export type LinkFieldPluginConfig = {
  collections?: LinkCollectionOption[];
  defaultType?: LinkType;
  resolveInternalHref?: LinkHrefResolver;
};
