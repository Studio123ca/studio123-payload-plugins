import { getCountries, getCountryCallingCode, parsePhoneNumber, validatePhoneNumberLength } from 'libphonenumber-js/max';
import type { CountryCode, PhoneNumber } from 'libphonenumber-js/max';
import type { PhoneFieldValue, PhoneNumberFormatter, PhoneNumberFormatterParts } from './types.js';

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

export const resolveDefaultCountry = (defaultCountry?: string, _enabledCountries?: string[]): CountryCode | undefined => {
	const normalizedDefaultCountry = normalizeCountry(defaultCountry);
	if (normalizedDefaultCountry) return normalizedDefaultCountry;

	return 'US';
};

export const composePhoneDraft = (base: string, extension?: string) => {
	const trimmedBase = base.trim();
	const trimmedExtension = extension?.trim();
	if (!trimmedBase) return '';
	return trimmedExtension ? `${trimmedBase} ext. ${trimmedExtension}` : trimmedBase;
};

export const getCountryFlagEmoji = (country?: CountryCode) => {
	if (!country) return '🌐';
	return country
		.toUpperCase()
		.split('')
		.map(letter => String.fromCodePoint(letter.charCodeAt(0) + 127397))
		.join('');
};

export const parsePhoneDraft = (value: string) => {
	const match = value.match(/^(.*?)(\s*([,x]|ext\.?|extension)\s*[\d\s-]*)?\s*$/i);
	if (!match) {
		return { base: value, extension: '', separator: '', suffix: '' };
	}

	const base = match[1] ?? value;
	const suffix = match[2] ?? '';
	const separator = (match[3] ?? '').trim().toLowerCase();
	const extension = suffix.replace(/^[\s,x]+|^ext\.?|^extension/i, '').replace(/\D+/g, '');
	return { base, extension, separator, suffix };
};

export const phoneToValueWithExtension = (phoneNumber: PhoneNumber, extension?: string): PhoneFieldValue => {
	if (extension) {
		phoneNumber.setExt(extension);
	}

	const value = phoneToValue(phoneNumber);
	if (extension && value.number) {
		value.uri = `tel:${value.number},${extension}`;
	}

	return value;
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

export const toPhoneFormatterParts = (value: PhoneFieldValue): PhoneNumberFormatterParts => ({
	number: value.number,
	country: value.country,
	countryCallingCode: value.countryCallingCode,
	nationalNumber: value.nationalNumber,
	ext: value.ext,
	international: value.international ? stripPhoneExtension(value.international) : undefined,
	national: value.national ? stripPhoneExtension(value.national) : undefined,
	uri: value.uri,
});

export const stripPhoneExtension = (value: string) => value.replace(/\s+(?:ext\.?|extension|x)\s*\d+$/i, '').trim();

export const parsePhoneInput = (
	input: string,
	options: { allowedCountries?: string[]; defaultCountry?: CountryCode; extension?: string } = {},
) => {
	const { base, extension } = parsePhoneDraft(input);
	const trimmed = base.trim();
	if (!trimmed) return null;

	const phoneNumber = safelyParsePhoneNumber(trimmed, options.defaultCountry);

	if (!phoneNumber || !phoneNumber.isValid()) return null;

	const allowedCountries = normalizeAllowedCountries(options.allowedCountries);
	if (allowedCountries && phoneNumber.country && !allowedCountries.includes(phoneNumber.country)) return null;

	const value = phoneToValueWithExtension(phoneNumber, options.extension ?? extension);

	return value;
};

const safelyParsePhoneNumber = (input: string, defaultCountry?: CountryCode) => {
	try {
		return parsePhoneNumber(input, { defaultCountry });
	} catch {
		return undefined;
	}
};

export const inferPhoneCountry = (
	input: string,
	options: { defaultCountry?: CountryCode } = {},
): CountryCode | undefined => {
	const { base } = parsePhoneDraft(input);
	const trimmed = base.trim();
	if (!trimmed) return options.defaultCountry;
	if (!trimmed.startsWith('+')) return options.defaultCountry;

	const phoneNumber = safelyParsePhoneNumber(trimmed);
	return phoneNumber?.country || options.defaultCountry;
};

export const validatePhoneInput = (
	input: string,
	options: { allowedCountries?: string[]; defaultCountry?: CountryCode; required?: boolean; promptForCountry?: boolean } = {},
) => {
	const { base } = parsePhoneDraft(input);
	const trimmed = base.trim();
	if (!trimmed) {
		return options.required ? 'Enter a phone number.' : true;
	}

	let lengthError: ReturnType<typeof validatePhoneNumberLength>;
	try {
		lengthError = validatePhoneNumberLength(trimmed, {
			defaultCountry: options.defaultCountry,
		});
	} catch {
		return 'Enter a phone number.';
	}

	if (lengthError) {
		if (lengthError === 'NOT_A_NUMBER') return 'Enter a phone number.';
		if (lengthError === 'INVALID_COUNTRY') return options.promptForCountry === false ? 'Enter a valid phone number.' : 'Choose a country first.';
		if (lengthError === 'TOO_SHORT') return 'Phone number is too short.';
		if (lengthError === 'TOO_LONG') return 'Phone number is too long.';
		return 'Enter a valid phone number.';
	}

	const phoneNumber = safelyParsePhoneNumber(trimmed, options.defaultCountry);

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

	const phoneNumber = safelyParsePhoneNumber(value.number);
	if (!phoneNumber) return null;

	const allowedCountries = normalizeAllowedCountries(options.allowedCountries);
	if (allowedCountries && phoneNumber.country && !allowedCountries.includes(phoneNumber.country)) return null;

	return {
		...phoneToValue(phoneNumber),
	};
};

export const formatPhoneDisplayValue = (
	value: PhoneFieldValue | null | undefined,
	formatter: 'international' | 'national' | PhoneNumberFormatter = 'international',
) => {
	if (!value?.number) return '';

	if (typeof formatter === 'function') return formatter(toPhoneFormatterParts(value));

	const formattedBase = formatter === 'national' ? value.national : value.international;
	if (!formattedBase) return '';

	return stripPhoneExtension(formattedBase);
};

export const parsePhoneExtension = (value: string) => parsePhoneDraft(value).extension;

export const getCountryCallingCodeLabel = (country: CountryCode) => {
	try {
		return `+${getCountryCallingCode(country)}`;
	} catch {
		return '';
	}
};
