import type { JSONField } from 'payload';
import type { PhoneField, PhoneFieldClientProps } from '../shared/types.js';
import { validatePhoneInput, resolveDefaultCountry } from '../shared/utils.js';

export type PhoneFieldConfig = Partial<Omit<PhoneField, 'type'>> & PhoneFieldClientProps;

export type { PhoneField } from '../shared/types.js';

export const phoneField = (config: PhoneFieldConfig = {}): PhoneField => {
	const {
		name = 'phone',
		label = 'Phone',
		localized = false,
		required = false,
		defaultCountry,
		showCountrySelector = false,
		allowedCountries,
		admin,
		...rest
	} = config;

	const normalizedDefaultCountry = resolveDefaultCountry(defaultCountry, allowedCountries);

	return {
		name,
		label,
		type: 'json',
		localized,
		required,
		validate: value => {
			const phoneValue = value as { number?: string } | null | undefined;
			if (!phoneValue?.number) {
				return required ? 'Enter a phone number.' : true;
			}

			return validatePhoneInput(phoneValue.number, {
				allowedCountries,
				defaultCountry: normalizedDefaultCountry,
				required,
			});
		},
		admin: {
			...admin,
			components: {
				Field: {
					path: '@studio123/payload-advanced-fields/phone/client',
					exportName: 'PhoneField',
					clientProps: {
						allowedCountries,
						defaultCountry: normalizedDefaultCountry,
						showCountrySelector,
					},
				},
				...(admin?.components || {}),
			},
		},
		...rest,
	} as PhoneField;
};
