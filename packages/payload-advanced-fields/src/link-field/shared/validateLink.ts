import type { LinkCollectionOption, LinkValue } from './types.js';
import { getLinkHref } from './getLinkHref.js';

const trim = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

const getPrimitiveInternalValue = (value: LinkValue['internal']): string | number | null => {
  if (!value?.value) return null;

  // If it's already a primitive, return it
  if (typeof value.value === 'string' || typeof value.value === 'number') {
    return value.value;
  }

  // If it's an object with a .value property (relationship field structure), extract that
  if (typeof value.value === 'object' && value.value !== null && 'value' in value.value) {
    const nested = (value.value as { value?: unknown }).value;
    if (typeof nested === 'string' || typeof nested === 'number') {
      return nested;
    }
  }

  return null;
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isURL = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export function normalizeLinkValue(value: LinkValue | null | undefined, collections: LinkCollectionOption[]) {
  if (!value) return null;
  const anchor = trim(value.anchor).replace(/^#/, '') || null;
  const keepAnchor = value.type === 'internal';

  const next: LinkValue = {
    type: value.type,
    label: trim(value.label) || null,
    newTab: Boolean(value.newTab),
    enableAnchor: Boolean(value.enableAnchor),
    internal: value.internal
      ? {
          relationTo: value.internal.relationTo,
          value: getPrimitiveInternalValue(value.internal),
          title: value.internal.title ?? null,
        }
      : null,
    external: trim(value.external) || null,
    email: trim(value.email) || null,
    phone: trim(value.phone) || null,
    anchor: keepAnchor && Boolean(value.enableAnchor) ? anchor : null,
  };

  next.url = getLinkHref(next, collections) || null;
  return next;
}

export function validateLink(
  value: LinkValue | null | undefined,
  options: { collections: LinkCollectionOption[]; required?: boolean } = { collections: [] },
) {
  const normalized = normalizeLinkValue(value, options.collections);

  if (!normalized) {
    return options.required ? 'A link is required.' : true;
  }

  if (!normalized.label) {
    return 'Enter a label.';
  }

  if (normalized.type === 'external') {
    if (!normalized.external) return 'Enter a URL.';
    if (!isURL(normalized.external)) {
      return 'Please enter a valid URL.';
    }
  }

  if (normalized.type === 'email' && normalized.email && !isEmail(normalized.email)) {
    return 'Please enter a valid email address.';
  }

  if (normalized.type === 'phone' && !normalized.phone) {
    return 'Enter a phone number.';
  }

  return true;
}
