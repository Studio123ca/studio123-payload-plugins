# Link Field

A comprehensive link field supporting internal Payload relationships and absolute or relative URLs with validation.

## Import

```typescript
import { linkField } from '@studio123/payload-advanced-fields/link';
```

## Basic Configuration

```typescript
{
  name: 'link',
  label: 'Link',
}
```

## Full Configuration

```typescript
import { linkField } from '@studio123/payload-advanced-fields/link';

linkField({
  name: 'navigationLink',
  label: 'Navigation Link',
  admin: { description: 'Configure where this link points to' },
  required: true,
  localized: false,
  collectionSlugs: ['pages', 'posts'],
  defaultType: 'internal',
});
```

## Plugin Configuration

The link field also uses a plugin-level registry for internal collections. Register the collections you want to allow globally:

```typescript
import { advancedFieldsPlugin } from '@studio123/payload-advanced-fields';

advancedFieldsPlugin({
  link: {
    collections: [
      {
        slug: 'pages',
        generateURL: async ({ doc, locale, req }) => {
          return await getPagePath({
            doc: doc as any,
            locale: typeof locale === 'string' ? locale : undefined,
            req,
          });
        },
      },
      {
        slug: 'news',
        generateURL: async ({ doc, locale, req }) => {
          return getNewsPath({
            doc,
            locale: typeof locale === 'string' ? locale : undefined,
            req,
          });
        },
      },
      {
        slug: 'projects',
        generateURL: async ({ doc, locale, req }) => {
          return getProjectPath({
            doc,
            locale: typeof locale === 'string' ? locale : undefined,
            req,
          });
        },
      },
    ],
  },
});
```

`collectionSlugs` on `linkField(...)` narrows the available collections for a specific field, while the plugin config defines the global collection registry and URL generation.

## Configuration Options

| Option              | Type     | Default     | Description                                       |
| ------------------- | -------- | ----------- | ------------------------------------------------- |
| `name`              | string   | `'link'`    | Field name in the database                        |
| `label`             | string   | `'Link'`    | Display label in admin UI                         |
| `admin.description` | string   | `undefined` | Help text for the field                           |
| `required`          | boolean  | `false`     | Whether the field is required                     |
| `localized`         | boolean  | `false`     | Enable multi-language support                     |
| `collectionSlugs`   | string[] | `[]`        | Collections available for internal links          |
| `defaultType`       | LinkType | `undefined` | Default link type (internal/external/email/phone) |

## Link Types

- **internal** - Link to another Payload document
- **external** - Absolute or relative URL
- **email** - Email link (mailto:)
- **phone** - Phone link (tel:)

## Example Field Definition

```typescript
import { CollectionConfig } from 'payload';
import { linkField } from '@studio123/payload-advanced-fields/link';

export const Menus: CollectionConfig = {
  slug: 'menus',
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    linkField({
      name: 'link',
      label: 'Navigation Link',
      collectionSlugs: ['pages', 'blog'],
      defaultType: 'internal',
    }),
  ],
};
```

## Stored Data Structure

The JSON value is `null` when cleared. A configured link includes `type`, `label`, `newTab`, `enableAnchor`, and the destination properties below. Inactive destination properties can be `null`.

```typescript
// Internal link
{
  type: 'internal',
  label: 'About us',
  internal: { relationTo: 'pages', value: '123456', title: 'About' },
  enableAnchor: true,
  anchor: 'team',
  newTab: false,
  url: '/about#team',
}

// External link
{ type: 'external', label: 'About', external: '/about', url: '/about' }

// Email link
{ type: 'email', label: 'Contact', email: 'user@example.com', url: 'mailto:user@example.com' }

// Phone link
{ type: 'phone', label: 'Call', phone: '+1 555 0123', url: 'tel:+15550123' }
```

External links accept HTTP(S) URLs and relative references such as `/about`, `../contact`, `?preview=true`, and `#details`. Unsupported schemes and URLs containing whitespace are rejected in both the drawer and server validation.

Internal destinations must belong to the field's allowed collections and have a document ID; numeric ID `0` is supported. Email destinations require an address. All configured links require a label.

## Hydration and Access Control

The field's `beforeChange` hook normalizes the value. Its `afterRead` hook resolves internal URLs using `resolveInternalHref`, or the collection's `generateURL`. Internal `url` values are computed on read and are not a permanent stored URL. Destination titles use the target collection's `admin.useAsTitle` (falling back to `title`). The drawer's title prefill uses the configured API route and current locale.

Internal document lookups respect access control and preserve the request's user, locale, and transaction context. Missing, inaccessible, or disallowed destinations return `url: null` and `internal.title: null`, while retaining the saved link label and destination ID. URL resolvers are only called for readable documents. Frontends should handle a missing URL rather than constructing one from the ID.

Custom `hooks.beforeChange` and `hooks.afterRead` run after the built-in hooks. Other hook arrays are preserved. An explicit custom `validate` still overrides the default validator, following standard field configuration behavior.

## API / Frontend Usage

```tsx
import type { LinkValue } from '@studio123/payload-advanced-fields/link';

function NavigationLink({ link }: { link: LinkValue | null }) {
  if (!link?.url) return null;

  return (
    <a
      href={link.url}
      target={link.newTab ? '_blank' : undefined}
      rel={link.newTab ? 'noopener noreferrer' : undefined}
    >
      {link.label}
    </a>
  );
}
```

To inspect a destination directly, use `link.internal?.value` and `link.internal?.relationTo`, `link.external`, `link.email`, or `link.phone` according to `link.type`.
