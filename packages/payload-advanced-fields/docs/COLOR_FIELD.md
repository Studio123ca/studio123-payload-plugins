# Color Field

A flexible color picker field supporting 10 different picker interfaces (Sketch, Block, Swatches, Compact, Slider, Github, Material, Colorful, Wheel, Chrome).

## Import

```typescript
import { colorField } from '@studio123/payload-advanced-fields/color';
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
import { colorField } from '@studio123/payload-advanced-fields/color';

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
| `swatches.size` | string | `'40px'` | Size of swatches in the swatches picker |
| `swatches.radius` | string | `'50%'` | Border radius for the swatches picker (e.g., '50%' for circles, '4px' for rounded, '0' for squares) |

## Picker Types

- **sketch** - Full-featured Sketch-style picker with all options
- **block** - Grid-based color block selector
- **swatches** - Custom swatch grid with alpha support and configurable size/radius
- **compact** - Minimal compact interface
- **slider** - Simple horizontal slider
- **github** - GitHub's color picker style
- **material** - Material Design style
- **colorful** - Colorful interactive picker
- **wheel** - Traditional color wheel
- **chrome** - Chrome DevTools style (now with alpha channel support)

## Preset Color Options

You can pass multiple color formats in `presetColors` - each preset can use any one of these formats:

```typescript
presetColors: [
  // Hex format (opaque)
  { hex: '#000000', label: 'Black', slug: 'black' },
  
  // Hex format with separate alpha value
  { hex: '#FF0000', alpha: 0.5, label: 'Semi-transparent Red', slug: 'red-transparent' },
  
  // RGBA format (alpha included in color data)
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

### Alpha Channel Support

Transparent colors are supported in two ways:

1. **Separate alpha property** - Add `alpha?: number` (0-1) to any color format:
   ```typescript
   { hex: '#FF0000', alpha: 0.5, label: 'Semi-transparent Red', slug: 'red-transparent' }
   ```

2. **Alpha in color data** - Use RGBA, HSLA, or HSVA formats with embedded alpha:
   ```typescript
   { rgba: { r: 255, g: 0, b: 0, a: 0.5 }, label: 'Semi-transparent Red', slug: 'red-transparent' }
   ```

In the Swatches picker, transparent preset colors display with a checkered background pattern for visual indication of transparency.

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
import { colorField } from '@studio123/payload-advanced-fields/color';

export const SiteOptions: GlobalConfig = {
  slug: 'site-options',
  fields: [
    // Sketch picker with opaque colors
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
    
    // Swatches picker with transparent presets
    colorField({
      name: 'overlayColor',
      label: 'Overlay Color',
      pickerType: 'swatches',
      swatches: {
        radius: '50%', // Show as circles (default)
      },
      presetColors: [
        { hex: '#000000', alpha: 0.3, label: 'Black 30%', slug: 'black-30' },
        { hex: '#000000', alpha: 0.6, label: 'Black 60%', slug: 'black-60' },
        { hex: '#000000', alpha: 0.9, label: 'Black 90%', slug: 'black-90' },
      ],
      disableAlpha: false,
    }),
    
    // Swatches picker with rounded square swatches
    colorField({
      name: 'accentColor',
      label: 'Accent Color',
      pickerType: 'swatches',
      swatches: {
        radius: '4px', // Show as rounded squares
      },
      presetColors: [
        { hex: '#FF6B6B', label: 'Red', slug: 'red' },
        { hex: '#4ECDC4', label: 'Teal', slug: 'teal' },
      ],
      disableAlpha: true,
    }),
    
    // Swatches picker with square swatches
    colorField({
      name: 'borderColor',
      label: 'Border Color',
      pickerType: 'swatches',
      swatches: {
        radius: '0', // Show as sharp squares
      },
      disableAlpha: false,
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
