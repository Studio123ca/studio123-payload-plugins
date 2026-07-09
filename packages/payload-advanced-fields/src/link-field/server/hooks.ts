import type { FieldHook, PayloadRequest } from 'payload';
import { getAdvancedFieldsConfig, getLinkCollections } from '../../config.js';
import { getLinkHref } from '../shared/getLinkHref.js';
import type { LinkCollectionOption, LinkHrefResolver, LinkValue } from '../shared/types.js';
import { normalizeLinkValue } from '../shared/validateLink.js';
import { DEFAULT_LINK_COLLECTIONS } from '../shared/constants.js';

const fetchInternalDoc = async (req: PayloadRequest | undefined, relationTo: string, id: string | number) => {
  if (!req) return null;

  try {
    const nestedReq = {
      ...req,
      context: {
        ...(req.context ?? {}),
        skipLinkHydration: true,
      },
    };

    return await req.payload.findByID({
      collection: relationTo,
      id,
      depth: 0,
      req: nestedReq as PayloadRequest,
      overrideAccess: true,
    });
  } catch {
    return null;
  }
};

const trim = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

const appendAnchor = (url: string | null, anchor?: string | null) => {
  if (!url) return url;
  const cleaned = trim(anchor).replace(/^#/, '');
  if (!cleaned) return url;
  return `${url}#${cleaned}`;
};

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

const populateInternalLink = async (
  value: LinkValue | null | undefined,
  collections: LinkCollectionOption[],
  req: PayloadRequest | undefined,
) => {
  const current = value as LinkValue | null | undefined;
  if (!current?.internal?.relationTo || !current.internal.value) return { hydrated: current ?? null, doc: null };

  const selectedID = getPrimitiveInternalValue(current.internal);

  if (selectedID === null || selectedID === undefined || selectedID === '') return { hydrated: current, doc: null };

  const doc = await fetchInternalDoc(req, current.internal.relationTo, selectedID);
  const title = doc && typeof (doc as Record<string, unknown>).title === 'string' ? ((doc as Record<string, unknown>).title as string) : current.internal.title ?? null;
  const hydrated = {
    ...current,
    internal: {
      ...current.internal,
      title,
      value: selectedID,
    },
  };

  return { hydrated, doc: (doc as Record<string, unknown> | null) ?? null };
};

const resolveStoredHref = async (
  value: LinkValue | null | undefined,
  collections: LinkCollectionOption[],
  req: PayloadRequest | undefined,
  hrefResolver?: LinkHrefResolver,
  doc?: Record<string, unknown> | null,
) => {
  if (!value) return null;

  if (value.type === 'internal' && value.internal) {
    const collection = collections.find(item => item.slug === value.internal?.relationTo);
    if (collection) {
      // Try custom resolver first
      if (hrefResolver) {
        const resolvedHref = await hrefResolver({
          collection,
          value: value.internal,
          doc: doc ?? null,
          req,
        });

        if (resolvedHref) return appendAnchor(resolvedHref, value.anchor);
      }

       // Fall back to collection's generateURL
       if (collection.generateURL && doc) {
         // Prefer request locale, fall back to doc locale
         const locale = typeof req?.locale === 'string' ? req.locale : typeof doc.locale === 'string' ? doc.locale : undefined;
         const generatedHref = await collection.generateURL({
           collection,
           doc,
           locale,
           req,
         });
         return appendAnchor(generatedHref, value.anchor);
       }
    } else {
      // collection not found
    }
  }

  return getLinkHref(value, collections, { req }) || appendAnchor(value.url || null, value.anchor) || null;
};

const stripInternalDoc = (value: LinkValue) => {
  if (!value.internal) return value;

  const { doc: _doc, ...internal } = value.internal as LinkValue['internal'] & { doc?: unknown };
  const valueId = getPrimitiveInternalValue(internal);

  return {
    ...value,
    internal: {
      relationTo: internal.relationTo,
      value: valueId,
      title: internal.title ?? null,
    },
  };
};

const sanitizeCollections = (collections?: LinkCollectionOption[]) => {
  if (!collections || collections.length === 0) return DEFAULT_LINK_COLLECTIONS;
  return collections;
};

const filterCollections = (collectionSlugs?: string[]) => {
  const globalCollections = sanitizeCollections(getLinkCollections());
  if (!collectionSlugs || collectionSlugs.length === 0) return globalCollections;
  return globalCollections.filter(collection => collectionSlugs.includes(collection.slug));
};

export function createLinkFieldHooks(collectionSlugs?: string[], resolveInternalHref?: LinkHrefResolver) {
  const globalResolveInternalHref = getAdvancedFieldsConfig().link?.resolveInternalHref;
  const hrefResolver = resolveInternalHref ?? globalResolveInternalHref;

  const normalizeHook: FieldHook = ({ value }) => {
    // Get collections at hook EXECUTION time, not definition time
    const normalizedCollections = filterCollections(collectionSlugs);
    return normalizeLinkValue(value as LinkValue | null | undefined, normalizedCollections);
  };

  const hydrateHook: FieldHook = async ({ req, value }) => {
    if (req?.context && (req.context as Record<string, unknown>).skipLinkHydration) {
      return value ?? null;
    }

    // Get collections at hook EXECUTION time, not definition time
    const normalizedCollections = filterCollections(collectionSlugs);
    
    const result = await populateInternalLink(value as LinkValue | null | undefined, normalizedCollections, req);
    const hydrated = result.hydrated;
    if (!hydrated) {
      return null;
    }

    const url = await resolveStoredHref(hydrated, normalizedCollections, req, hrefResolver, result.doc);
    return {
      ...stripInternalDoc(hydrated),
      url,
    };
  };

  return {
    afterRead: [hydrateHook],
    beforeChange: [normalizeHook],
  };
}

// Helper for backward compatibility - old signature
export function createLinkFieldHooksLazy(collectionSlugs?: string[], resolveInternalHref?: LinkHrefResolver) {
  return createLinkFieldHooks(collectionSlugs, resolveInternalHref);
}
