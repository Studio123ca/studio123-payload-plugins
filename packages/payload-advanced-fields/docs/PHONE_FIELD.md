# Phone Field

A JSON-backed phone field powered by `libphonenumber-js`, with optional country selection and canonical phone metadata storage.

## Import

```typescript
import { phoneField } from '@studio123/payload-advanced-fields/phone';
```

## Basic Configuration

```typescript
{
  name: 'phone',
  label: 'Phone',
}
```

## Full Configuration

```typescript
import { phoneField } from '@studio123/payload-advanced-fields/phone';

phoneField({
  name: 'contactPhone',
  label: 'Contact Phone',
  defaultCountry: 'US',
  showCountrySelector: true,
  allowedCountries: ['US', 'CA', 'GB'],
})
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | `'phone'` | Field name in the database |
| `label` | string | `'Phone'` | Display label in admin UI |
| `required` | boolean | `false` | Whether the field is required |
| `localized` | boolean | `false` | Enable multi-language support |
| `defaultCountry` | string | `undefined` | Default country for national-format parsing |
| `showCountrySelector` | boolean | `false` | Render a country dropdown |
| `allowedCountries` | string[] | all countries | Restrict country selection and validation |

## Stored Data

The field stores canonical phone metadata:

```typescript
{
  number: '+12133734253',
  country: 'US',
  countryCallingCode: '1',
  nationalNumber: '2133734253',
  international: '+1 213 373 4253',
  national: '(213) 373-4253',
  uri: 'tel:+12133734253'
}
```

## Notes

- If the country selector is disabled, national-format numbers rely on `defaultCountry`
- If `allowedCountries` is omitted, all supported countries are available
