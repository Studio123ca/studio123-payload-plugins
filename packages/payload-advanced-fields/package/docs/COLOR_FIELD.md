# Color Field

A flexible color picker field supporting 10 different picker interfaces (Sketch, Block, Circle, Compact, Slider, Github, Material, Colorful, Wheel, Chrome).

## Import

```typescript
import { colorField } from '@studio123/payload-advanced-fields/color-field';
```

## Basic Configuration

```typescript
{
  name: 'brandColor',
  label: 'Brand Color',
  pickerType: 'sketch',
}
```

## Full Configuration

```typescript
import { colorField } from '@studio123/payload-advanced-fields/color-field';

colorField({
  name: 'brandColor',
  label: 'Brand Color',
  description: 'Primary color for the brand',
  required: true,
  localized: false,
  pickerType: 'sketch',
  disableAlpha: false,
  presetColors: [
    { hex: '#000000', label: 'Black', slug: 'black' },
    { hex: '#FFFFFF', label: 'White', slug: 'white' },
    { hex: '#FF6B6B', label: 'Red', slug: 'red' },
    { hex: '#4ECDC4', label: 'Teal', slug: 'teal' },
  ],
  defaultColor: { hex: '#4ECDC4', label: 'Teal', slug: 'teal' },
})
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | `'color'` | Field name in the database |
| `label` | string | `'Color'` | Display label in admin UI |
| `description` | string | `undefined` | Help text for the field |
| `required` | boolean | `false` | Whether the field is required |
| `localized` | boolean | `false` | Enable multi-language support |
| `pickerType` | string | `'sketch'` | Color picker interface style |
| `disableAlpha` | boolean | `false` | Disable alpha channel slider |
| `presetColors` | ColorOption[] | `[]` | Predefined color options |
| `defaultColor` | ColorOption \| string | `undefined` | Initial color value |

## Picker Types

- **sketch** - Full-featured Sketch-style picker with all options
- **block** - Grid-based color block selector
- **circle** - Circular color wheel picker
- **compact** - Minimal compact interface
- **slider** - Simple horizontal slider
- **github** - GitHub's color picker style
- **material** - Material Design style
- **colorful** - Colorful interactive picker
- **wheel** - Traditional color wheel
- **chrome** - Chrome DevTools style

## Preset Color Options

You can pass multiple color formats in `presetColors` - each preset can use any one of these formats:

```typescript
presetColors: [
  // Hex format
  { hex: '#000000', label: 'Black', slug: 'black' },
  
  // RGBA format
  {
    rgba: { r: 255, g: 0, b: 0, a: 0.5 },
    label: 'Semi-transparent Red',
    slug: 'semi-transparent-red',
  },
  
  // HSL format
  {
    hsl: { h: 120, s: 100, l: 50 },
    label: 'Pure Green',
    slug: 'pure-green',
  },
  
  // HSV format
  {
    hsv: { h: 240, s: 100, v: 100 },
    label: 'Pure Blue',
    slug: 'pure-blue',
  },
]
```

**Note:** Each ColorOption must have exactly ONE color format. If multiple formats are provided, an error will be thrown.

## Color Value Structure

The field stores colors as JSON objects with all supported color formats:

```typescript
{
  hex: '#4ECDC4',           // Hex color code (required)
  slug?: 'teal',            // Optional identifier (auto-generated if not provided)
  label?: 'Teal',           // Optional display name
  alpha?: 0.8,              // Optional alpha value (0-1)
  rgb?: {
    r: 78,
    g: 205,
    b: 196,
    a?: 1
  },
  rgba?: {
    r: 78,
    g: 205,
    b: 196,
    a: 1
  },
  hsl?: {
    h: 174,
    s: 44,
    l: 54,
    a?: 1
  },
  hsla?: {
    h: 174,
    s: 44,
    l: 54,
    a: 1
  },
  hsv?: {
    h: 174,
    s: 62,
    v: 80,
    a?: 1
  },
  hsva?: {
    h: 174,
    s: 62,
    v: 80,
    a: 1
  }
}
```

## Example Field Definition

```typescript
import { GlobalConfig } from 'payload';
import { colorField } from '@studio123/payload-advanced-fields/color-field';

export const SiteOptions: GlobalConfig = {
  slug: 'site-options',
  fields: [
    colorField({
      name: 'brandColor',
      label: 'Brand Color',
      pickerType: 'sketch',
      presetColors: [
        { hex: '#FF6B6B', label: 'Red', slug: 'red' },
        { hex: '#4ECDC4', label: 'Teal', slug: 'teal' },
        { hex: '#95E1D3', label: 'Mint', slug: 'mint' },
      ],
      defaultColor: { hex: '#4ECDC4', label: 'Teal', slug: 'teal' },
      disableAlpha: false,
    }),
    colorField({
      name: 'accentColor',
      label: 'Accent Color',
      pickerType: 'compact',
      disableAlpha: true,
    }),
  ],
};
```

## Color Format Support

The ColorField supports multiple input formats that are automatically normalized:

- **Hex colors** - `#FF0000`, `#F00`
- **Hex with alpha** - `#FF0000AA`, `#F00A`
- **RGB/RGBA** - `rgb(255, 0, 0)`, `rgba(255, 0, 0, 0.5)`
- **CSS color names** - `red`, `transparent`, `blue`, etc.
- **Existing ColorValue objects** - Full color data preserved

All formats are automatically converted to internal HSV representation for pickers, then stored with complete RGB, HSL, and HSV data.

## API Usage

Once stored, you can access the color in multiple formats:

```typescript
// In your API/Frontend
const color = doc.brandColor;

// Use any format you need
const hexValue = color.hex;           // '#4ECDC4'
const rgbValue = color.rgb;           // { r: 78, g: 205, b: 196 }
const hslValue = color.hsl;           // { h: 174, s: 44, l: 54 }
const tailwindClass = `bg-${color.slug}`; // e.g., 'bg-teal'
```
