# Link Field

A comprehensive link field supporting internal Payload relationships and external URLs with validation.

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
  description: 'Configure where this link points to',
  required: true,
  localized: false,
  collectionSlugs: ['pages', 'posts'],
  defaultType: 'internal',
})
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
})
```

`collectionSlugs` on `linkField(...)` narrows the available collections for a specific field, while the plugin config defines the global collection registry and URL generation.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | `'link'` | Field name in the database |
| `label` | string | `'Link'` | Display label in admin UI |
| `description` | string | `undefined` | Help text for the field |
| `required` | boolean | `false` | Whether the field is required |
| `localized` | boolean | `false` | Enable multi-language support |
| `collectionSlugs` | string[] | `[]` | Collections available for internal links |
| `defaultType` | LinkType | `undefined` | Default link type (internal/external/email/phone) |

## Link Types

- **internal** - Link to another Payload document
- **external** - External URL
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

### Internal Link

```typescript
{
  type: 'internal',
  value: {
    relationTo: 'pages',
    value: '123456' // Document ID
  }
}
```

### External Link

```typescript
{
  type: 'external',
  value: 'https://example.com'
}
```

### Email Link

```typescript
{
  type: 'email',
  value: 'user@example.com'
}
```

### Phone Link

```typescript
{
  type: 'phone',
  value: '+1-555-0123'
}
```

## API Usage

```typescript
// In your API/Frontend
const link = doc.navigationLink;

// Check link type
if (link.type === 'internal') {
  // Access the related document
  const relatedDoc = link.value.value; // Document ID
  const collection = link.value.relationTo; // Collection slug
} else if (link.type === 'external') {
  const url = link.value; // Full URL
} else if (link.type === 'email') {
  const email = link.value; // Email address
} else if (link.type === 'phone') {
  const phone = link.value; // Phone number
}
```

## Frontend Helper Example

```typescript
function getLinkHref(linkField: LinkValue): string {
  if (linkField.type === 'internal') {
    // You would need to resolve the document to get its URL
    return `/docs/${linkField.value.value}`;
  } else if (linkField.type === 'external') {
    return linkField.value;
  } else if (linkField.type === 'email') {
    return `mailto:${linkField.value}`;
  } else if (linkField.type === 'phone') {
    return `tel:${linkField.value}`;
  }
  return '#';
}
```
