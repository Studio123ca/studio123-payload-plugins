import type { PayloadRequest } from 'payload';
import type { LinkCollectionOption, LinkValue } from './types.js';

const trim = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

const appendAnchor = (href: string, anchor?: string | null) => {
  const cleaned = trim(anchor).replace(/^#/, '');
  if (!cleaned) return href;
  return `${href}#${cleaned}`;
};

type GetLinkHrefOptions = {
  req?: PayloadRequest;
};

export function getLinkHref(
  value: LinkValue | null | undefined,
  collections: LinkCollectionOption[],
  options: GetLinkHrefOptions = {},
) {
  if (!value) return '';

  switch (value.type) {
    case 'internal': {
      // For internal links, the href is computed in the server-side afterRead hook
      // which has access to generateURL and req. This function is mainly for client-side
      // display and non-async scenarios.
      return '';
    }
    case 'external':
      return trim(value.external);
    case 'email':
      return trim(value.email) ? `mailto:${trim(value.email)}` : '';
    case 'phone': {
      const phone = trim(value.phone);
      return phone ? `tel:${phone.replace(/\s+/g, '')}` : '';
    }
    default:
      return '';
  }
}
