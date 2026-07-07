import type { LinkCollectionOption } from './types.js';

export const DEFAULT_LINK_COLLECTIONS: LinkCollectionOption[] = [{ slug: 'pages' }];

export const LINK_TYPES = [
  { label: 'Internal', value: 'internal' },
  { label: 'External', value: 'external' },
  { label: 'Email', value: 'email' },
  { label: 'Phone', value: 'phone' },
] as const;

export const LINK_MODAL_PREFIX = 'link-field';
