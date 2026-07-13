'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useField } from '@payloadcms/ui/forms/useField';
import { FieldDescription } from '@payloadcms/ui/fields/FieldDescription';
import { FieldError } from '@payloadcms/ui/fields/FieldError';
import { FieldLabel } from '@payloadcms/ui/fields/FieldLabel';
import { fieldBaseClass } from '@payloadcms/ui/fields/shared';
import type { JSONFieldClientProps } from 'payload';
import { AsYouType, getCountries, parsePhoneNumber } from 'libphonenumber-js/max';
import type { CountryCode } from 'libphonenumber-js/max';
import type { PhoneFieldClientProps, PhoneFieldValue } from '../shared/types.js';
import {
	formatPhoneDisplayValue,
	getCountryCallingCodeLabel,
	getCountryFlagEmoji,
	normalizeAllowedCountries,
	phoneToValueWithExtension,
	parsePhoneDraft,
	resolveDefaultCountry,
	validatePhoneInput,
} from '../shared/utils.js';

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

const getStoredDraft = (value: PhoneFieldValue | null | undefined) => {
	if (!value) return '';
	return value.raw || value.national || value.international || value.number || '';
};

export function PhoneField(props: Props) {
	const { field, path, readOnly, defaultCountry, showCountrySelector = false, allowedCountries } = props;
	const normalizedAllowedCountries = useMemo(() => normalizeAllowedCountries(allowedCountries), [allowedCountries]);
	const [draftValue, setDraftValue] = useState<string>('');
	const { value = null, setValue, showError, disabled } = useField<PhoneFieldValue | null>({
		path,
		validate: (): true | string => validatePhoneInput(draftValue, {
			allowedCountries,
			defaultCountry: resolveDefaultCountry(defaultCountry, allowedCountries),
			required: field.required,
		}),
	});
	const [selectedCountry, setSelectedCountry] = useState<CountryCode | undefined>(resolveDefaultCountry(defaultCountry, normalizedAllowedCountries));
	const [isFocused, setIsFocused] = useState(false);
	const [liveError, setLiveError] = useState<string | null>(null);
	const [countryMenuOpen, setCountryMenuOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const label = resolveLocalizedLabel(field.label, 'en', field.name);
	const description = resolveLocalizedLabel(field.admin?.description, 'en', '');
	const placeholderText = resolveLocalizedLabel((field.admin as any)?.placeholder, 'en', '');
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
		if (isFocused) return;
		setDraftValue(getStoredDraft(value));
		setSelectedCountry(getInitialCountry(value, defaultCountry, normalizedAllowedCountries));
	}, [defaultCountry, isFocused, normalizedAllowedCountries, value]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
				setCountryMenuOpen(false);
			}
		};

		if (countryMenuOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [countryMenuOpen]);

	const commitDraft = (rawValue: string, countryOverride?: CountryCode) => {
		const country = countryOverride ?? selectedCountry ?? resolveDefaultCountry(defaultCountry, normalizedAllowedCountries);
		const { base, extension } = parsePhoneDraft(rawValue);
		const trimmedBase = base.trim();

		setDraftValue(rawValue);
		if (!trimmedBase) {
			setLiveError(null);
			setValue(null);
			return;
		}

		const validation = validatePhoneInput(rawValue, {
			allowedCountries: normalizedAllowedCountries,
			defaultCountry: country,
			required: field.required,
		});

		if (validation !== true) {
			setLiveError(validation);
			setValue(null);
			return;
		}

		const parsed = parsePhoneNumber(base, country ? { defaultCountry: country } : undefined);
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

		const normalized = phoneToValueWithExtension(parsed, extension);
		normalized.raw = rawValue;
		setLiveError(null);
		setValue(normalized);
		if (parsed.country) {
			setSelectedCountry(parsed.country as CountryCode);
		}
	};

	const className = [fieldBaseClass, 'text', showError || Boolean(liveError) ? 'error' : null, isReadOnly && 'read-only'].filter(Boolean).join(' ');
	const fieldId = `field-${path.replace(/\./g, '__')}`;
	const inputError = liveError || undefined;
	const showInputError = Boolean(liveError) || showError;
	const selectedFlag = getCountryFlagEmoji(selectedCountry);
	const previewContent = !isFocused
		? (() => {
			const { base, extension } = parsePhoneDraft(draftValue);
			const formattedBase = base.trim() ? new AsYouType(selectedCountry).input(base) : '';
			if (!formattedBase) {
				return <span style={{ color: 'var(--theme-text-light)' }}>{placeholderText || ''}</span>;
			}

			return extension ? (
				<>
					<span>{formattedBase}</span>
					<span style={{ color: 'var(--theme-text-light)' }}> ext. </span>
					<span>{extension}</span>
				</>
			) : (
				<span>{formattedBase}</span>
			);
		})()
		: null;

	return (
		<div className={className} data-size="large" id={fieldId}>
			<div style={{ whiteSpace: 'nowrap' }}>
				<FieldLabel label={label} localized={isLocalized} path={path} required={field.required} />
			</div>
			<div className={`${fieldBaseClass}__wrap`}>
				<FieldError message={inputError} path={path} showError={showInputError} />
				<div ref={wrapperRef} style={{ position: 'relative' }}>
					<div
						style={{
							alignItems: 'stretch',
							background: 'var(--theme-elevation-50)',
							border: '1px solid var(--theme-elevation-150)',
							borderRadius: '4px',
							display: 'flex',
							overflow: 'hidden',
							position: 'relative',
						}}
					>
						<button
							type="button"
							disabled={isReadOnly || !showCountrySelector}
							aria-label="Choose country"
							title={selectedCountry ? getCountryLabel(selectedCountry, 'en') : 'Choose country'}
							style={{
								alignItems: 'center',
								background: 'transparent',
								border: 'none',
								borderRight: '1px solid var(--theme-elevation-150)',
								color: 'var(--theme-text)',
								cursor: isReadOnly || !showCountrySelector ? 'default' : 'pointer',
								display: 'inline-flex',
								fontSize: '1.1rem',
								justifyContent: 'center',
								minWidth: '3.25rem',
								padding: '0.625rem 0.75rem',
								position: 'relative',
								userSelect: 'none',
							}}
							onClick={() => {
								if (showCountrySelector && !isReadOnly) setCountryMenuOpen(prev => !prev);
							}}
						>
							<span aria-hidden="true">{selectedFlag}</span>
							{showCountrySelector ? <span aria-hidden="true" style={{ marginLeft: '0.35rem', fontSize: '0.7rem' }}>▾</span> : null}
						</button>
						<div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
							{previewContent ? (
								<div
									aria-hidden="true"
									style={{
										alignItems: 'center',
										color: 'var(--theme-text)',
										display: 'flex',
										gap: '0.25rem',
										inset: 0,
										paddingLeft: '0.875rem',
										paddingRight: '0.875rem',
										pointerEvents: 'none',
										position: 'absolute',
										whiteSpace: 'nowrap',
									}}
								>
									{previewContent}
								</div>
							) : null}
							<input
								className="form-input"
								disabled={isReadOnly}
								name={path}
								placeholder=""
								style={{
									background: 'transparent',
									border: 'none',
									boxShadow: 'none',
									caretColor: 'var(--theme-text)',
									color: isFocused ? 'var(--theme-text)' : 'transparent',
									flex: 1,
									minWidth: 0,
									paddingLeft: '0.875rem',
									paddingRight: '0.875rem',
									position: 'relative',
									zIndex: 1,
								}}
								type="text"
								value={draftValue}
								onChange={event => {
									commitDraft(event.target.value);
								}}
								onFocus={() => setIsFocused(true)}
								onBlur={() => setIsFocused(false)}
								onKeyDown={event => {
									if (event.key === 'Escape') setCountryMenuOpen(false);
								}}
							/>
						</div>
					</div>
					{countryMenuOpen && showCountrySelector && !isReadOnly ? (
						<div style={{ background: 'var(--theme-elevation-50)', border: '1px solid var(--theme-elevation-150)', borderRadius: '4px', boxShadow: '0 10px 24px rgba(0, 0, 0, 0.12)', left: 0, marginTop: '0.35rem', maxHeight: '18rem', overflow: 'auto', position: 'absolute', top: '100%', width: 'min(100%, 22rem)', zIndex: 30 }}>
							{countryOptions.map(option => (
								<button
									key={option.value}
									type="button"
									style={{ alignItems: 'center', background: option.value === selectedCountry ? 'var(--theme-elevation-100)' : 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', gap: '0.625rem', padding: '0.625rem 0.875rem', textAlign: 'left', width: '100%' }}
									title={option.label}
									onClick={() => {
										setSelectedCountry(option.value);
										setCountryMenuOpen(false);
										commitDraft(draftValue, option.value);
									}}
								>
									<span aria-hidden="true" style={{ fontSize: '1.1rem' }}>{getCountryFlagEmoji(option.value)}</span>
									<span style={{ fontSize: '0.9rem' }}>{option.value}</span>
								</button>
							))}
						</div>
					) : null}
				</div>
				<FieldDescription description={description} path={path} />
			</div>
		</div>
	);
}

export default PhoneField;
