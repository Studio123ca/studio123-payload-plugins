# @studio123/payload-advanced-fields

Reusable advanced Payload fields for Studio123, including a powerful link field with support for internal and external links, and a code field for editing code with syntax highlighting.

## Installation

```bash
npm install @studio123/payload-advanced-fields
```

## Setup

Register the plugin in your Payload config:

```ts
import { advancedFieldsPlugin } from '@studio123/payload-advanced-fields';

export default buildConfig({
  // ... other config
  plugins: [
    advancedFieldsPlugin({
      link: {
        collections: [
          {
            slug: 'pages',
            generateURL: ({ doc, locale, req }) => {
              // Return the URL/path for this document
              return `/pages/${doc.slug}`;
            },
          },
          {
            slug: 'posts',
            generateURL: ({ doc, locale, req }) => {
              return `/blog/${doc.slug}`;
            },
          },
        ],
      },
    }),
  ],
});
```

## Link Field

A flexible link field that supports internal links (to Payload collections), external URLs, emails, and phone numbers.

### Usage

```ts
import { linkField } from '@studio123/payload-advanced-fields';

fields: [
  linkField({
    name: 'link',
    label: 'Link',
    collectionSlugs: ['pages', 'posts'], // Only show these collections in the picker
    defaultType: 'external', // 'external' | 'internal' | 'email' | 'phone'
  }),
];
```

### Field Options

- `name` - Field name (default: `'link'`)
- `label` - Field label (default: `'Link'`)
- `collectionSlugs` - Array of collection slugs to show in the internal link picker (must be configured in plugin)
- `defaultType` - Default link type when creating new links (default: `'external'`)
- `required` - Whether the field is required (default: `false`)
- `resolveInternalHref` - Optional custom function to resolve internal link URLs (overrides global config)

### Data Structure

```ts
type LinkValue = {
  type: 'internal' | 'external' | 'email' | 'phone';
  label?: string | null;
  url?: string | null; // Computed on server for internal links
  newTab?: boolean | null;
  enableAnchor?: boolean | null;
  anchor?: string | null;
  
  // For internal links
  internal?: {
    relationTo: string; // Collection slug
    value: string | number | null; // Document ID
    title?: string | null; // Document title
  } | null;
  
  // For external links
  external?: string | null;
  
  // For email links
  email?: string | null;
  
  // For phone links
  phone?: string | null;
};
```

### Features

- **Internal Links**: Select from configured collections, with automatic title population
- **Auto-updating Labels**: Labels automatically update when changing the linked document (unless manually edited)
- **URL Computation**: URLs are computed server-side based on `generateURL` functions defined in the plugin config
- **Localization**: URL generation respects the request locale for multi-language sites
- **External Links**: Support for external URLs, emails, and phone numbers
- **Anchors**: Optional anchor support for linking to sections within pages
- **New Tab**: Option to open links in a new tab

## Code Field

A code editor field with syntax highlighting, powered by CodeMirror.

### Usage

```ts
import { codeField } from '@studio123/payload-advanced-fields';

fields: [
  codeField({
    name: 'code',
    label: 'Code',
    language: 'html',
    height: 300,
  }),
];
```

### Field Options

- `name` - Field name (default: `'code'`)
- `label` - Field label (default: `'Code'`)
- `language` - Language for syntax highlighting: `'html'`, `'javascript'`, `'css'`, etc.
- `height` - Editor height in pixels (default: `200`)
- `required` - Whether the field is required (default: `false`)

## Notes

- The plugin must be registered before fields are created to ensure URL generation functions are available
- Internal link URLs are computed on the server during the `afterRead` hook and are not persisted to the database
- Client-side collections list is derived from the global plugin configuration
- Field-level `resolveInternalHref` overrides the global plugin configuration for that specific field
