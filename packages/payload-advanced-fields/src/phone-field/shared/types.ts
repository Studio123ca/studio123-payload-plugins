import type { JSONField, PayloadComponent } from 'payload';

export type PhoneFieldValue = {
	raw?: string;
	number: string;
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
	showCountrySelector?: boolean;
	allowedCountries?: string[];
};

export type PhoneField = {
	type: 'json';
	defaultCountry?: string;
	showCountrySelector?: boolean;
	allowedCountries?: string[];
	admin?: JSONField['admin'] & {
		components?: {
			Field?: PayloadComponent<any>;
		};
	};
} & Omit<JSONField, 'admin' | 'type'>;
