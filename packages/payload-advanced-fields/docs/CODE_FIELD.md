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
  required: true,
  localized: false,
  language: 'html',
  height: 400,
  admin: {
    description: 'Enter your HTML code here',
  },
});
```

## Configuration Options

| Option              | Type           | Default     | Description                                   |
| ------------------- | -------------- | ----------- | --------------------------------------------- |
| `name`              | string         | `'code'`    | Field name in the database                    |
| `label`             | string         | `'Code'`    | Display label in admin UI                     |
| `admin.description` | string         | `undefined` | Help text for the field                       |
| `required`          | boolean        | `true`      | Whether the field is required                 |
| `localized`         | boolean        | `false`     | Enable multi-language support                 |
| `language`          | `CodeLanguage` | `'html'`    | Syntax highlighting language                  |
| `height`            | number         | `360`       | Editor height in pixels                       |
| `admin.rows`        | number         | `undefined` | Fallback editor height based on textarea rows |

## Supported Languages

- **html** - HTML with syntax highlighting
- **css** - CSS with syntax highlighting
- **javascript** - JavaScript with syntax highlighting
- **typescript** - TypeScript with syntax highlighting
- **jsx** - JavaScript with JSX syntax highlighting
- **tsx** - TypeScript with JSX syntax highlighting
- **json** - JSON with syntax highlighting
- **markdown** - Markdown with syntax highlighting
- **text** - Plain text (no highlighting)

The `height` option takes precedence over `admin.rows`. Heights are clamped to a safe range for the admin editor, and values longer than `maxLength` are truncated while editing. `minLength` and `maxLength` remain Payload validation constraints.

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
  customCode: '<div class="hero">...</div>';
}
```

## API Usage

```typescript
// In your API/Frontend
const code = doc.customCode;

// Use directly
const html = code; // '<div class="hero">...</div>'
```
