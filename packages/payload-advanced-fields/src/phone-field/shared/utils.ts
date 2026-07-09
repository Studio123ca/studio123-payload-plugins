import { AsYouType, getCountries, getCountryCallingCode, parsePhoneNumber, validatePhoneNumberLength } from 'libphonenumber-js/max';
import type { CountryCode, PhoneNumber } from 'libphonenumber-js/max';
import type { PhoneFieldValue } from './types.js';

const COUNTRY_SET = new Set<CountryCode>(getCountries());

const normalizeCountry = (country?: string): CountryCode | undefined => {
	if (!country) return undefined;
	const upper = country.trim().toUpperCase();
	return COUNTRY_SET.has(upper as CountryCode) ? (upper as CountryCode) : undefined;
};

export const normalizeAllowedCountries = (allowedCountries?: string[]): CountryCode[] | undefined => {
	if (!allowedCountries || allowedCountries.length === 0) return undefined;
	const unique = new Set<CountryCode>();
	for (const country of allowedCountries) {
		const normalized = normalizeCountry(country);
		if (normalized) unique.add(normalized);
	}
	return unique.size > 0 ? [...unique] : undefined;
};

export const resolveDefaultCountry = (defaultCountry?: string, allowedCountries?: string[]): CountryCode | undefined => {
	const normalizedDefaultCountry = normalizeCountry(defaultCountry);
	if (normalizedDefaultCountry) return normalizedDefaultCountry;

	const normalizedAllowedCountries = normalizeAllowedCountries(allowedCountries);
	return normalizedAllowedCountries?.[0];
};

export const formatPhoneInput = (value: string, country?: CountryCode) => {
	const formatter = new AsYouType(country);
	return formatter.input(value);
};

export const phoneToValue = (phoneNumber: PhoneNumber): PhoneFieldValue => ({
	number: phoneNumber.number,
	country: phoneNumber.country,
	countryCallingCode: phoneNumber.countryCallingCode,
	nationalNumber: phoneNumber.nationalNumber,
	ext: phoneNumber.ext,
	international: phoneNumber.formatInternational(),
	national: phoneNumber.formatNational(),
	uri: phoneNumber.getURI(),
});

export const validatePhoneInput = (
	input: string,
	options: { allowedCountries?: string[]; defaultCountry?: CountryCode; required?: boolean } = {},
) => {
	const trimmed = input.trim();
	if (!trimmed) {
		return options.required ? 'Enter a phone number.' : true;
	}

	const lengthError = validatePhoneNumberLength(trimmed, {
		defaultCountry: options.defaultCountry,
	});

	if (lengthError) {
		if (lengthError === 'NOT_A_NUMBER') return 'Enter a phone number.';
		if (lengthError === 'INVALID_COUNTRY') return 'Choose a country first.';
		if (lengthError === 'TOO_SHORT') return 'Phone number is too short.';
		if (lengthError === 'TOO_LONG') return 'Phone number is too long.';
		return 'Enter a valid phone number.';
	}

	const phoneNumber = parsePhoneNumber(trimmed, {
		defaultCountry: options.defaultCountry,
	});

	if (!phoneNumber || !phoneNumber.isValid()) {
		return 'Enter a valid phone number.';
	}

	const allowedCountries = normalizeAllowedCountries(options.allowedCountries);
	if (allowedCountries && phoneNumber.country && !allowedCountries.includes(phoneNumber.country)) {
		return 'Choose an allowed country.';
	}

	return true;
};

export const normalizePhoneValue = (
	value: PhoneFieldValue | null | undefined,
	options: { allowedCountries?: string[] } = {},
) => {
	if (!value?.number) return null;

	const phoneNumber = parsePhoneNumber(value.number);
	if (!phoneNumber) return null;

	const allowedCountries = normalizeAllowedCountries(options.allowedCountries);
	if (allowedCountries && phoneNumber.country && !allowedCountries.includes(phoneNumber.country)) return null;

	return phoneToValue(phoneNumber);
};

export const getCountryCallingCodeLabel = (country: CountryCode) => {
	try {
		return `+${getCountryCallingCode(country)}`;
	} catch {
		return '';
	}
};
