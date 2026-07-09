# Payload Advanced Fields

A collection of enhanced field types for Payload CMS.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Field Types](#field-types)
- [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [License](#license)

## Features

- **Color Picker Field** - 10 different color picker styles with preset colors
- **Code Editor Field** - Syntax-highlighted code editing with CodeMirror
- **Link Field** - Internal/external link management with validation
- **Optimized Bundling** - Each field is independently bundled for minimal bloat
- **Tree-shakeable** - Import only what you need
- **Full TypeScript Support** - Complete type definitions included
- **Localization Ready** - Support for multi-language content

## Installation

```bash
npm install @studio123/payload-advanced-fields
```

## Field Types

| Field | Docs | Import | Summary |
|---|---|---|---|
| Color | [Documentation](docs/COLOR_FIELD.md) | `@studio123/payload-advanced-fields/color` | Color picker field with swatches and multiple `react-color` styles. |
| Code | [Documentation](docs/CODE_FIELD.md) | `@studio123/payload-advanced-fields/code` | Syntax-highlighted code editor powered by CodeMirror. |
| Link | [Documentation](docs/LINK_FIELD.md) | `@studio123/payload-advanced-fields/link` | Internal/external link field with plugin-level collection config. |

---

## Usage Examples

### Complete Global Configuration with Multiple Fields

```typescript
import { GlobalConfig } from 'payload';
import { colorField } from '@studio123/payload-advanced-fields/color';
import { codeField } from '@studio123/payload-advanced-fields/code';
import { linkField } from '@studio123/payload-advanced-fields/link';

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          name: 'branding',
          label: 'Branding',
          fields: [
            colorField({
              name: 'primaryColor',
              label: 'Primary Color',
              pickerType: 'sketch',
              required: true,
              presetColors: [
                { hex: '#000000', slug: 'black' },
                { hex: '#FFFFFF', slug: 'white' },
              ],
            }),
            colorField({
              name: 'secondaryColor',
              label: 'Secondary Color',
              pickerType: 'compact',
            }),
          ],
        },
        {
          name: 'content',
          label: 'Content',
          fields: [
            codeField({
              name: 'customCSS',
              label: 'Custom CSS',
              language: 'html',
              height: 400,
            }),
            linkField({
              name: 'privacyPolicy',
              label: 'Privacy Policy Link',
              collectionSlugs: ['pages'],
            }),
          ],
        },
      ],
    },
  ],
};
```

### Collection with Mix of Field Types

```typescript
import { CollectionConfig } from 'payload';
import { colorField } from '@studio123/payload-advanced-fields/color';
import { linkField } from '@studio123/payload-advanced-fields/link';

export const Products: CollectionConfig = {
  slug: 'products',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
    },
    colorField({
      name: 'tagColor',
      label: 'Tag Color',
      pickerType: 'block',
      presetColors: [
        { hex: '#FF6B6B', label: 'Hot Pink', slug: 'hot-pink' },
        { hex: '#4ECDC4', label: 'Teal', slug: 'teal' },
        { hex: '#FFE66D', label: 'Golden', slug: 'golden' },
      ],
    }),
    linkField({
      name: 'externalLink',
      label: 'Product Link',
      description: 'Link to the product page or storefront',
    }),
  ],
};
```

---

## Architecture

### Entry Points

Each field has its own entry point to minimize bundle size. Import only what you need:

```typescript
// Import server-side field factory
import { colorField } from '@studio123/payload-advanced-fields/color';

// Import client-side component (bundled with dependencies)
import { ColorField } from '@studio123/payload-advanced-fields/color/client';
```

### Bundling Strategy

- **Color Field** - Bundled with esbuild (includes @uiw/react-color and dependencies)
- **Code Field** - Compiled with TypeScript (uses external @codemirror)
- **Link Field** - Compiled with TypeScript (minimal dependencies)

This ensures users only pay for what they use - if you only use ColorField, you don't load CodeMirror.

### Color Format Support

The ColorField supports multiple input formats that are automatically normalized:

- **Hex colors** - `#FF0000`, `#F00`
- **Hex with alpha** - `#FF0000AA`, `#F00A`
- **RGB/RGBA** - `rgb(255, 0, 0)`, `rgba(255, 0, 0, 0.5)`
- **CSS color names** - `red`, `transparent`, `blue`, etc.
- **Existing ColorValue objects** - Full color data preserved

All formats are automatically converted to internal HSV representation for pickers, then stored with complete RGB, HSL, and HSV data.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

For information about bundled dependencies and their licenses, see [LICENSES.md](LICENSES.md).
