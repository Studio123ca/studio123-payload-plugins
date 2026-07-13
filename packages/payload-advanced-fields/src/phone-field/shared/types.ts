import type { JSONField, PayloadComponent } from 'payload';

export type PhoneCountrySelectorConfig = {
	enabled?: boolean;
	enabledCountries?: string[];
	showFlag?: boolean;
	showCountryCode?: boolean;
	countryLabelStyle?: 'long' | 'short';
};

export type PhoneExtensionConfig = {
	enabled?: boolean;
	placeholder?: string;
};

export type PhoneNumberFormatterParts = {
	number: string;
	country?: string;
	countryCallingCode?: string;
	nationalNumber?: string;
	ext?: string;
	international?: string;
	national?: string;
	uri?: string;
};

export type PhoneNumberFormatter = (parts: PhoneNumberFormatterParts) => string;

export type PhoneFieldValue = {
	number: string;
	custom?: string;
	country?: string;
	countryCallingCode?: string;
	nationalNumber?: string;
	ext?: string;
	international?: string;
	national?: string;
	uri?: string;
};

export type PhoneFieldClientProps = {
	defaultCountry?: string;
	countries?: PhoneCountrySelectorConfig;
	extension?: PhoneExtensionConfig;
	formatterMode?: 'international' | 'national' | 'custom';
	formatterSource?: string;
};

export type PhoneField = {
	type: 'json';
	defaultCountry?: string;
	countries?: PhoneCountrySelectorConfig;
	extension?: PhoneExtensionConfig;
	formatter?: 'international' | 'national' | PhoneNumberFormatter;
	admin?: JSONField['admin'] & {
		components?: {
			Field?: PayloadComponent<any>;
		};
	};
} & Omit<JSONField, 'admin' | 'type'>;
