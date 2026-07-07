# @studio123/payload-advanced-fields

Reusable advanced Payload fields for Studio123.

## Install

```bash
npm install @studio123/payload-advanced-fields
```

## Setup

```ts
import { configureAdvancedFields } from '@studio123/payload-advanced-fields';

configureAdvancedFields({
	link: {
		resolveInternalHref: ({ collection, doc, req }) => {
			// return an href string for internal links
			return '';
		},
	},
});
```

## Link Field

```ts
import { linkField } from '@studio123/payload-advanced-fields';

fields: [
	linkField({
		name: 'link',
		label: 'Link',
		collections: [
			{ slug: 'pages', label: 'Pages', useUri: true },
		],
		resolveInternalHref: ({ collection, doc, req }) => {
			return '';
		},
	}),
]
```

## Code Field

```ts
import { codeField } from '@studio123/payload-advanced-fields';

fields: [
	codeField({
		name: 'code',
		label: 'Code',
		language: 'html',
		height: 200,
	}),
]
```

## Notes

- Field-level `resolveInternalHref` overrides the global config.
- The link field still falls back to `uri`, localized route patterns, and breadcrumbs when no resolver is provided.
