# Code Field

A syntax-highlighted code editor field powered by CodeMirror with support for multiple languages.

## Import

```typescript
import { codeField } from '@studio123/payload-advanced-fields/code';
```

## Basic Configuration

```typescript
{
  name: 'code',
  label: 'Code',
  language: 'html',
}
```

## Full Configuration

```typescript
import { codeField } from '@studio123/payload-advanced-fields/code';

codeField({
  name: 'htmlCode',
  label: 'HTML Code',
  description: 'Enter your HTML code here',
  required: true,
  localized: false,
  language: 'html',
  height: 400,
})
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | `'code'` | Field name in the database |
| `label` | string | `'Code'` | Display label in admin UI |
| `description` | string | `undefined` | Help text for the field |
| `required` | boolean | `true` | Whether the field is required |
| `localized` | boolean | `false` | Enable multi-language support |
| `language` | 'html' \| 'text' | `'html'` | Syntax highlighting language |
| `height` | number | `360` | Editor height in pixels |

## Supported Languages

- **html** - HTML with syntax highlighting
- **text** - Plain text (no highlighting)

## Example Field Definition

```typescript
import { CollectionConfig } from 'payload';
import { codeField } from '@studio123/payload-advanced-fields/code';

export const Pages: CollectionConfig = {
  slug: 'pages',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    codeField({
      name: 'customCode',
      label: 'Custom HTML/CSS',
      language: 'html',
      height: 500,
    }),
  ],
};
```

## Stored Data

The field stores the code as a plain text string:

```typescript
{
  customCode: '<div class="hero">...</div>'
}
```

## API Usage

```typescript
// In your API/Frontend
const code = doc.customCode;

// Use directly
const html = code; // '<div class="hero">...</div>'
```
