# Phone Field

A JSON-backed phone field powered by `libphonenumber-js`, with optional country selection, inline extension input, validation, and canonical phone metadata storage. The admin input accepts numbers as entered and formats them when the field loses focus if the value can be parsed.

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
  admin: {
    placeholder: 'Enter a phone number',
    width: '50%',
  },
  countries: {
    enabled: true,
    enabledCountries: ['US', 'CA', 'GB'],
    showFlag: true,
    showCountryCode: true,
    countryLabelStyle: 'short',
  },
  extension: {
    enabled: true,
  },
  formatter: 'international',
})
```

## Custom Formatting

```typescript
phoneField({
  name: 'billingPhone',
  label: 'Billing Phone',
  defaultCountry: 'US',
  formatter: parts => {
    if (!parts.national) {
      return parts.international || parts.number;
    }

    return parts.national
      .replace(/\D/g, '')
      .replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');
  },
})
```

## Country Selection

When `countries.enabled` is true, the admin field renders a country selector. The selected country is the parsing context for national-format numbers. For example, a number entered without a leading `+` is interpreted using the selected country, then formatted according to `formatter` on blur.

Numbers entered with an explicit international prefix, such as `+1` or `+44`, are parsed internationally and can update the selected country after a successful commit.

If the number is invalid for the selected country, the draft value and selected country remain visible so the user can fix the error instead of the field reverting to the previously saved value.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | `'phone'` | Field name in the database |
| `label` | string | `'Phone'` | Display label in admin UI |
| `required` | boolean | `false` | Whether the field is required |
| `localized` | boolean | `false` | Enable multi-language support |
| `defaultCountry` | string | `'US'` | Default country for national-format parsing |
| `admin.placeholder` | string | `undefined` | Input placeholder (Payload standard) |
| `admin.width` | string | `undefined` | Field width (Payload standard) |
| `countries.enabled` | boolean | `false` | Render the country selector |
| `countries.enabledCountries` | string[] | all countries | Restrict country validation and selector options |
| `countries.showFlag` | boolean | `true` | Show the country flag in the selector |
| `countries.showCountryCode` | boolean | `true` | Show the calling code in the selector |
| `countries.countryLabelStyle` | `long` \| `short` | `'short'` | Country label style in the selector |
| `extension.enabled` | boolean | `false` | Render an inline extension input |
| `extension.placeholder` | string | `'ext.'` | Placeholder text for the extension input |
| `formatter` | `'international' \| 'national' \| function` | `'international'` | Format the number visually on blur |

## Stored Data

The field stores canonical phone metadata:

```typescript
{
  number: '+15555625980',
  custom: '555-867-5309',
  country: 'US',
  countryCallingCode: '1',
  nationalNumber: '5555625980',
  ext: '333',
  international: '+1 555 562 5980 ext. 333',
  national: '(555) 562-5980 ext. 333',
  uri: 'tel:+15555625980,333'
}
```

## Notes

- Users can type or paste phone numbers freely; input is not masked or restricted while typing
- Valid numbers are normalized and formatted on blur
- Invalid numbers remain visible as entered and fail validation instead of being silently rewritten
- When the country selector is enabled, national-format numbers are parsed using the selected country
- If the number is cleared, the selected country remains in place for the next entry
- If `countries.enabledCountries` is omitted, all supported countries are available
- The extension field is optional and stored as `ext` in the JSON value
- If `formatter` is a function, it receives the parsed phone parts and the formatted output is stored on the saved value as `custom`
