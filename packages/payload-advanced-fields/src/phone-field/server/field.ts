import type { JSONField } from 'payload';
import type {
  PhoneField,
  PhoneFieldClientProps,
  PhoneFieldValue,
  PhoneCountrySelectorConfig,
  PhoneNumberFormatter,
} from '../shared/types.js';
import {
  normalizePhoneValue,
  resolveDefaultCountry,
  toPhoneFormatterParts,
  validatePhoneInput,
} from '../shared/utils.js';

export type PhoneFieldConfig = Partial<Omit<PhoneField, 'type' | 'formatter'>> &
  PhoneFieldClientProps & {
    formatter?: 'international' | 'national' | PhoneNumberFormatter;
    admin?: JSONField['admin'] & {
      placeholder?: Record<string, string> | string;
    };
  };

export type { PhoneField } from '../shared/types.js';

export const phoneField = (config: PhoneFieldConfig = {}): PhoneField => {
  const {
    name = 'phone',
    label = 'Phone',
    localized = false,
    required = false,
    defaultCountry,
    countries,
    extension,
    formatter,
    admin,
    hooks,
    ...rest
  } = config;
  const clientFormatter = typeof formatter === 'function' ? 'custom' : formatter;

  const normalizedCountries: Required<Pick<PhoneCountrySelectorConfig, 'enabled'>> & PhoneCountrySelectorConfig = {
    enabled: countries?.enabled ?? false,
    enabledCountries: countries?.enabledCountries,
    showFlag: countries?.showFlag ?? true,
    showCountryCode: countries?.showCountryCode ?? true,
    countryLabelStyle: countries?.countryLabelStyle ?? 'short',
  };
  const normalizedExtension = {
    enabled: extension?.enabled ?? false,
    placeholder: extension?.placeholder,
  };
  const normalizedDefaultCountry = resolveDefaultCountry(defaultCountry, normalizedCountries.enabledCountries);
  const normalizeHook = ({ value }: { value: unknown }) => {
    if (value == null || value === '') return null;
    const normalized = normalizePhoneValue(value as PhoneFieldValue, {
      allowedCountries: normalizedCountries.enabledCountries,
    });
    if (!normalized) return value;
    if (typeof formatter === 'function') {
      return { ...normalized, custom: formatter(toPhoneFormatterParts(normalized)) };
    }
    return normalized;
  };

  return {
    name,
    label,
    type: 'json',
    defaultCountry: normalizedDefaultCountry,
    localized,
    required,
    validate: (value) => {
      const phoneValue = value as { number?: unknown } | null | undefined;
      if (!phoneValue?.number) return required ? 'Enter a phone number.' : true;

      return validatePhoneInput(phoneValue.number, {
        allowedCountries: normalizedCountries.enabledCountries,
        defaultCountry: normalizedDefaultCountry,
        required,
        promptForCountry: normalizedCountries.enabled,
      });
    },
    countries: normalizedCountries,
    extension: normalizedExtension,
    hooks: {
      ...hooks,
      beforeValidate: [normalizeHook, ...(hooks?.beforeValidate ?? [])],
    },
    admin: {
      ...admin,
      components: {
        Field: {
          path: '@studio123/payload-advanced-fields/phone/client',
          exportName: 'PhoneField',
          clientProps: {
            defaultCountry: normalizedDefaultCountry,
            countries: normalizedCountries,
            extension: normalizedExtension,
            formatterMode: clientFormatter,
          },
        },
        ...(admin?.components || {}),
      },
    },
    ...rest,
  } as PhoneField;
};
