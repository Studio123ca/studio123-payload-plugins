import type { LinkCollectionOption, LinkValue } from './types.js';
import { getLinkHref } from './getLinkHref.js';

const trim = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

const getCollectionLabel = (collectionSlug: string, collections: LinkCollectionOption[]) => {
  // Just use the slug as the label since we removed the label property
  return collectionSlug;
};

export function getLinkLabel(value: LinkValue | null | undefined, collections: LinkCollectionOption[]) {
  if (!value) return 'No destination set';

  const href = getLinkHref(value, collections);
  const label = trim(value.label);
  if (label) return label;

  switch (value.type) {
    case 'internal': {
      const relationTo = trim(value.internal?.relationTo);
      if (!relationTo || !value.internal?.value) return 'No destination set';
      const title = trim(value.internal.title);
      if (title) return title;
      const relationValue = value.internal.value;
      const id = typeof relationValue === 'string' || typeof relationValue === 'number' ? String(relationValue) : '';
      return id ? `${getCollectionLabel(relationTo, collections)}: ${id}` : getCollectionLabel(relationTo, collections);
    }
    case 'external':
      return href || 'No destination set';
    case 'email':
      return trim(value.email) || 'No destination set';
    case 'phone':
      return trim(value.phone) || 'No destination set';
    default:
      return 'No destination set';
  }
}
