'use client';

import { useEffect, useMemo, useState } from 'react';
import { useField } from '@payloadcms/ui/forms/useField';
import { FieldDescription } from '@payloadcms/ui/fields/FieldDescription';
import { FieldError } from '@payloadcms/ui/fields/FieldError';
import { FieldLabel } from '@payloadcms/ui/fields/FieldLabel';
import { fieldBaseClass } from '@payloadcms/ui/fields/shared';
import type { JSONFieldClientProps } from 'payload';
import { AsYouType, getCountries, parsePhoneNumber } from 'libphonenumber-js/max';
import type { CountryCode } from 'libphonenumber-js/max';
import type { PhoneFieldClientProps, PhoneFieldValue } from '../shared/types.js';
import { getCountryCallingCodeLabel, normalizeAllowedCountries, phoneToValue, resolveDefaultCountry, validatePhoneInput } from '../shared/utils.js';

type Props = JSONFieldClientProps & PhoneFieldClientProps;

const resolveLocalizedLabel = (value: unknown, localeCode: string, fallback: string) => {
	if (typeof value === 'string') return value;
	if (value && typeof value === 'object') {
		const localizedValue = (value as Record<string, unknown>)[localeCode];
		if (typeof localizedValue === 'string') return localizedValue;

		const firstStringValue = Object.values(value).find(item => typeof item === 'string');
		if (typeof firstStringValue === 'string') return firstStringValue;
	}

	return fallback;
};

const getCountryLabel = (country: CountryCode, localeCode: string) => {
	const displayNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames([localeCode], { type: 'region' }) : null;
	const countryName = displayNames?.of(country) || country;
	const callingCode = getCountryCallingCodeLabel(country);
	return callingCode ? `${countryName} (${callingCode})` : countryName;
};

const getInitialCountry = (value: PhoneFieldValue | null | undefined, defaultCountry?: string, allowedCountries?: CountryCode[]) => {
	if (value?.country) return value.country as CountryCode;
	return resolveDefaultCountry(defaultCountry, allowedCountries);
};

const getDisplayValue = (value: PhoneFieldValue | null | undefined) => {
	if (!value) return '';
	return value.national || value.international || value.number || '';
};

export function PhoneField(props: Props) {
	const { field, path, readOnly, defaultCountry, showCountrySelector = false, allowedCountries } = props;
	const normalizedAllowedCountries = useMemo(() => normalizeAllowedCountries(allowedCountries), [allowedCountries]);
	const [selectedCountry, setSelectedCountry] = useState<CountryCode | undefined>(resolveDefaultCountry(defaultCountry, normalizedAllowedCountries));
	const [inputValue, setInputValue] = useState<string>('');
	const [liveError, setLiveError] = useState<string | null>(null);
	const { value = null, setValue, showError, disabled } = useField<PhoneFieldValue | null>({
		path,
		validate: () => validatePhoneInput(inputValue, {
			allowedCountries,
			defaultCountry: resolveDefaultCountry(defaultCountry, allowedCountries),
			required: field.required,
		}),
	});

	const label = resolveLocalizedLabel(field.label, 'en', field.name);
	const description = resolveLocalizedLabel(field.admin?.description, 'en', '');
	const isLocalized = Boolean(field.localized);
	const isReadOnly = Boolean(readOnly || disabled || field.admin?.readOnly);
	const countryOptions = useMemo(() => {
		const countries = normalizedAllowedCountries || getCountries();
		return countries.map(country => ({
			label: getCountryLabel(country, 'en'),
			value: country,
		}));
	}, [normalizedAllowedCountries]);

	useEffect(() => {
		setInputValue(getDisplayValue(value));
		setSelectedCountry(getInitialCountry(value, defaultCountry, normalizedAllowedCountries));
	}, [defaultCountry, normalizedAllowedCountries, value]);

	const processInput = (rawValue: string, countryOverride?: CountryCode) => {
		const country = countryOverride ?? selectedCountry ?? resolveDefaultCountry(defaultCountry, normalizedAllowedCountries);
		const trimmed = rawValue.trim();

		if (!trimmed) {
			setLiveError(null);
			setValue(null);
			return;
		}

		const formatter = new AsYouType(country);
		const formatted = formatter.input(rawValue);
		setInputValue(formatted);

		const validation = validatePhoneInput(formatted, {
			allowedCountries: normalizedAllowedCountries,
			defaultCountry: country,
			required: field.required,
		});

		if (validation !== true) {
			setLiveError(validation);
			setValue(null);
			return;
		}

		const parsed = parsePhoneNumber(formatted, { defaultCountry: country });
		if (!parsed) {
			setLiveError('Enter a valid phone number.');
			setValue(null);
			return;
		}

		if (normalizedAllowedCountries && parsed.country && !normalizedAllowedCountries.includes(parsed.country)) {
			setLiveError('Choose an allowed country.');
			setValue(null);
			return;
		}

		const normalized = phoneToValue(parsed);
		if (!normalized) {
			setLiveError('Enter a valid phone number.');
			setValue(null);
			return;
		}

		setLiveError(null);
		setValue(normalized);
	};

	const className = [fieldBaseClass, 'text', showError || Boolean(liveError) ? 'error' : null, isReadOnly && 'read-only'].filter(Boolean).join(' ');
	const fieldId = `field-${path.replace(/\./g, '__')}`;
	const inputError = liveError || undefined;
	const showInputError = Boolean(liveError) || showError;

	return (
		<div className={className} data-size="large" id={fieldId}>
			<div style={{ whiteSpace: 'nowrap' }}>
				<FieldLabel label={label} localized={isLocalized} path={path} required={field.required} />
			</div>
			<div className={`${fieldBaseClass}__wrap`}>
				<FieldError message={inputError} path={path} showError={showInputError} />
				<div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: showCountrySelector ? 'minmax(12rem, 14rem) minmax(0, 1fr)' : '1fr' }}>
						{showCountrySelector ? (
							<select
								aria-label="Country"
								className="form-input"
								disabled={isReadOnly}
							value={selectedCountry || ''}
							onChange={event => {
								const nextCountry = (event.target.value || undefined) as CountryCode | undefined;
								setSelectedCountry(nextCountry);
								processInput(inputValue, nextCountry);
							}}
						>
							<option value="">Select country</option>
							{countryOptions.map(option => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					) : null}
					<input
						className="form-input"
						disabled={isReadOnly}
						name={path}
						placeholder={showCountrySelector ? undefined : defaultCountry ? '+1 213 373 4253' : '+1 213 373 4253'}
						style={{ width: '100%' }}
						type="text"
						value={inputValue}
						onChange={event => {
							processInput(event.target.value);
						}}
					/>
				</div>
				<FieldDescription description={description} path={path} />
			</div>
		</div>
	);
}

export default PhoneField;
