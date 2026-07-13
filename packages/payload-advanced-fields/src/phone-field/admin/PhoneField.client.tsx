'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FocusEvent } from 'react';
import { useField } from '@payloadcms/ui/forms/useField';
import { FieldDescription } from '@payloadcms/ui/fields/FieldDescription';
import { FieldError } from '@payloadcms/ui/fields/FieldError';
import { FieldLabel } from '@payloadcms/ui/fields/FieldLabel';
import { fieldBaseClass } from '@payloadcms/ui/fields/shared';
import type { JSONFieldClientProps } from 'payload';
import type { CountryCode } from 'libphonenumber-js/max';
import type { PhoneFieldClientProps, PhoneFieldValue, PhoneNumberFormatter } from '../shared/types.js';
import {
	composePhoneDraft,
	formatPhoneDisplayValue,
	getCountryCallingCodeLabel,
	getCountryFlagEmoji,
	inferPhoneCountry,
	normalizeAllowedCountries,
	parsePhoneDraft,
	parsePhoneInput,
	toPhoneFormatterParts,
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

const getCountryLabel = (
	country: CountryCode,
	localeCode: string,
	options?: { showFlag?: boolean; showCountryCode?: boolean; countryLabelStyle?: 'long' | 'short' },
) => {
	const displayNames = typeof Intl !== 'undefined' && 'DisplayNames' in Intl ? new Intl.DisplayNames([localeCode], { type: 'region' }) : null;
	const countryName = options?.countryLabelStyle === 'short' ? country : displayNames?.of(country) || country;
	const callingCode = options?.showCountryCode === false ? '' : getCountryCallingCodeLabel(country);
	const label = callingCode ? `${countryName} (${callingCode})` : countryName;
	return label;
};

const getCountrySelectLabel = (
	country: CountryCode,
	localeCode: string,
	options?: { showFlag?: boolean; showCountryCode?: boolean; countryLabelStyle?: 'long' | 'short' },
) => {
	const flag = options?.showFlag === false ? '' : `${getCountryFlagEmoji(country)} `;
	return `${flag}${getCountryLabel(country, localeCode, options)}`;
};

const mergeFieldStyles = (field: Props['field']) => ({
	...(field?.admin?.style || {}),
	...(field?.admin?.width ? { '--field-width': field.admin.width } : { flex: '1 1 0%' }),
	...(field?.admin?.style?.flex ? { flex: field.admin.style.flex } : {}),
});

const getInitialCountry = (value: PhoneFieldValue | null | undefined, defaultCountry?: string, enabledCountries?: CountryCode[]) => {
	if (value?.country) return value.country as CountryCode;
	return resolveDefaultCountry(defaultCountry, enabledCountries);
};

const getDraftPartsFromValue = (value: PhoneFieldValue | null | undefined) => {
	if (!value) return { number: '', extension: '' };
	return {
		number: value.national || value.international || value.number || '',
		extension: value.ext || '',
	};
};

const isFormatablePhoneValue = (value: PhoneFieldValue | null | undefined) => Boolean(value?.number && (value.national || value.international));

export function PhoneField(props: Props) {
	const { field, path, readOnly, defaultCountry, countries, extension, formatterMode = 'international', formatterSource } = props;
	const countriesEnabled = Boolean(countries?.enabled);
	const extensionEnabled = Boolean(extension?.enabled);
	const normalizedEnabledCountries = useMemo(() => normalizeAllowedCountries(countries?.enabledCountries), [countries?.enabledCountries]);
	const normalizedDefaultCountry = resolveDefaultCountry(defaultCountry, normalizedEnabledCountries);
	const customFormatter = useMemo(() => {
		if (formatterMode !== 'custom' || !formatterSource) return undefined;
		try {
			return new Function('parts', `return (${formatterSource})(parts);`) as PhoneNumberFormatter;
		} catch {
			return undefined;
		}
	}, [formatterMode, formatterSource]);
	const getDisplayValue = (phoneValue: PhoneFieldValue) => {
		if (formatterMode === 'national') return formatPhoneDisplayValue(phoneValue, 'national');
		if (formatterMode === 'custom' && customFormatter) return customFormatter(toPhoneFormatterParts(phoneValue));
		return formatPhoneDisplayValue(phoneValue, 'international');
	};
	const [draftNumber, setDraftNumber] = useState<string>('');
	const [draftExtension, setDraftExtension] = useState<string>('');
	const [selectedCountry, setSelectedCountry] = useState<CountryCode | undefined>(getInitialCountry(undefined, normalizedDefaultCountry, normalizedEnabledCountries));
	const [isDraftDirty, setIsDraftDirty] = useState(false);
	const { value = null, setValue, showError, disabled } = useField<PhoneFieldValue | null>({
		path,
		validate: (): true | string => validatePhoneInput(
			composePhoneDraft(draftNumber, extensionEnabled ? draftExtension : undefined),
			{
				allowedCountries: normalizedEnabledCountries,
				defaultCountry: selectedCountry || normalizedDefaultCountry,
				required: field.required,
				promptForCountry: countriesEnabled,
			},
		),
	});
	const [isFocused, setIsFocused] = useState(false);
	const [liveError, setLiveError] = useState<string | null>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const lastCommittedRef = useRef<string>('');

	const label = resolveLocalizedLabel(field.label, 'en', field.name);
	const description = resolveLocalizedLabel(field.admin?.description, 'en', '');
	const placeholderText = resolveLocalizedLabel((field.admin as any)?.placeholder, 'en', '');
	const extensionPlaceholder = extension?.placeholder || 'ext.';
	const isLocalized = Boolean(field.localized);
	const isReadOnly = Boolean(readOnly || disabled || field.admin?.readOnly);
	const styles = useMemo(() => mergeFieldStyles(field), [field]);
	const countryOptions = useMemo(() => normalizedEnabledCountries || [normalizedDefaultCountry || 'US'], [normalizedDefaultCountry, normalizedEnabledCountries]);
	const inferredCountry = useMemo(() => {
		return inferPhoneCountry(draftNumber, { defaultCountry: selectedCountry || normalizedDefaultCountry || 'US' });
	}, [draftNumber, normalizedDefaultCountry, selectedCountry]);
	const indicatorCountry = selectedCountry || inferredCountry || normalizedDefaultCountry || 'US';
	const countryIndicatorLabel = useMemo(() => {
		if (!countriesEnabled) return '';
		return getCountryLabel(indicatorCountry, 'en', countries);
	}, [countries, countriesEnabled, indicatorCountry]);
	const countryIndicatorWidth = useMemo(() => {
		if (!countriesEnabled) return undefined;
		const estimated = Math.max(4.75, Math.min(13, countryIndicatorLabel.length * 0.42 + (countries?.showFlag === false ? 2.2 : 3.6)));
		return `${estimated}rem`;
	}, [countries?.showFlag, countryIndicatorLabel, countriesEnabled]);

	useEffect(() => {
		if (isFocused) return;

		if (isDraftDirty) return;

		if (!value) {
			setDraftNumber('');
			setDraftExtension('');
			setSelectedCountry(selectedCountry || normalizedDefaultCountry);
			return;
		}

		const valueSignature = value.number || '';
		if (valueSignature && valueSignature === lastCommittedRef.current && value.number) {
			return;
		}

		if (!isFormatablePhoneValue(value)) {
			setDraftNumber(value.number);
			setDraftExtension(extensionEnabled ? value.ext || '' : '');
			return;
		}

		if (liveError && value.number !== draftNumber) return;

		const parts = getDraftPartsFromValue(value);
		setSelectedCountry((value.country as CountryCode | undefined) || normalizedDefaultCountry);
		setDraftNumber(value.custom || getDisplayValue(value));
		setDraftExtension(extensionEnabled ? parts.extension : '');
	}, [customFormatter, extensionEnabled, formatterMode, isDraftDirty, isFocused, normalizedDefaultCountry, selectedCountry, value]);

	const commitDraft = (rawNumber: string, rawExtension: string, countryOverride?: CountryCode) => {
		const country = countryOverride ?? selectedCountry ?? inferredCountry ?? normalizedDefaultCountry;
		const parsedNumber = parsePhoneDraft(rawNumber);
		const extensionValue = extensionEnabled ? (rawExtension.trim() || parsedNumber.extension) : parsedNumber.extension;
		const shouldReinterpretInternationalInput = Boolean(countryOverride && parsedNumber.base.trim().startsWith('+'));
		const previousCallingCode = normalizedEnabledCountries?.find(country => parsedNumber.base.trim().startsWith(getCountryCallingCodeLabel(country)));
		const inputBase = shouldReinterpretInternationalInput && previousCallingCode
			? parsedNumber.base.trim().replace(getCountryCallingCodeLabel(previousCallingCode), '').trim()
			: parsedNumber.base;
		const combinedInput = composePhoneDraft(inputBase, extensionValue);

		lastCommittedRef.current = combinedInput;
		setDraftNumber(rawNumber);
		if (extensionEnabled) setDraftExtension(rawExtension);

		if (!parsedNumber.base.trim()) {
			setLiveError(null);
			setIsDraftDirty(false);
			setDraftNumber('');
			setDraftExtension('');
			setValue(null);
			return;
		}

		const validation = validatePhoneInput(combinedInput, {
			allowedCountries: normalizedEnabledCountries,
			defaultCountry: country,
			required: field.required,
			promptForCountry: countriesEnabled,
		});

		if (validation !== true) {
			setLiveError(validation);
			setIsDraftDirty(true);
			setValue({ number: rawNumber, ext: extensionEnabled ? rawExtension : undefined } as PhoneFieldValue);
			return;
		}

		const normalized = parsePhoneInput(combinedInput, {
			allowedCountries: normalizedEnabledCountries,
			defaultCountry: country,
			extension: extensionValue,
		});

		if (!normalized) {
			setLiveError('Enter a valid phone number.');
			setIsDraftDirty(true);
			setValue({ number: rawNumber, ext: extensionEnabled ? rawExtension : undefined } as PhoneFieldValue);
			return;
		}

		setLiveError(null);
		setIsDraftDirty(false);
		const displayValue = getDisplayValue(normalized);
		setValue(customFormatter ? { ...normalized, custom: displayValue } : normalized);
		setSelectedCountry(normalized.country as CountryCode | undefined);
		setDraftNumber(displayValue);
		setDraftExtension(extensionEnabled ? normalized.ext || extensionValue : '');
	};

	const handleFocus = () => setIsFocused(true);
	const handleBlur = (event: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
		setIsFocused(false);
		commitDraft(draftNumber, draftExtension);
	};
	const handleCountryChange = (country: CountryCode) => {
		setSelectedCountry(country);
		setIsDraftDirty(true);
		commitDraft(draftNumber, draftExtension, country);
	};

	const className = [fieldBaseClass, 'text', isReadOnly && 'read-only'].filter(Boolean).join(' ');
	const fieldId = `field-${path.replace(/\./g, '__')}`;
	const inputError = liveError || undefined;
	const showInputError = Boolean(liveError) || showError;
	const hasInputError = showInputError;
	const sharedControlStyle = {
		background: 'transparent',
		border: 'none',
		borderRadius: 0,
		boxShadow: 'none',
	};
	const controlBorderColor = hasInputError ? 'var(--field-color-border-error)' : 'var(--theme-elevation-150)';
	const rootStyle = {
		...styles,
		...(field.admin?.width ? { width: field.admin.width } : { flex: '1 1 0%' }),
	};

	return (
		<div className={className} data-size="large" id={fieldId} style={rootStyle}>
			<div style={{ whiteSpace: 'nowrap' }}>
				<FieldLabel label={label} localized={isLocalized} path={path} required={field.required} />
			</div>
			<div className={`${fieldBaseClass}__wrap`}>
				<FieldError message={inputError} path={path} showError={showInputError} />
				<div ref={wrapperRef} style={{ display: 'grid', gap: '0.5rem', width: '100%' }}>
					<div
						style={{
							alignItems: 'stretch',
							border: `1px solid ${controlBorderColor}`,
							borderRadius: '8px',
							display: 'flex',
							overflow: 'hidden',
							width: '100%',
						}}
					>
				{countriesEnabled ? (
							<label
								aria-label="Country"
								style={{
									...sharedControlStyle,
									alignItems: 'center',
									background: 'var(--theme-elevation-100)',
									borderRight: `1px solid ${controlBorderColor}`,
									color: 'var(--theme-text)',
									display: 'inline-flex',
									flex: '0 0 auto',
									fontSize: 'inherit',
									gap: '0.4rem',
									justifyContent: 'center',
									padding: '0 0.75rem',
									whiteSpace: 'nowrap',
									width: countryIndicatorWidth,
								}}
						>
								<select
									disabled={isReadOnly}
									style={{
										...sharedControlStyle,
										appearance: 'auto',
										color: 'inherit',
										cursor: isReadOnly ? 'default' : 'pointer',
										font: 'inherit',
										padding: '0.625rem 0',
									}}
									value={indicatorCountry}
									onChange={event => handleCountryChange(event.target.value as CountryCode)}
									onFocus={handleFocus}
									onBlur={handleBlur}
								>
									{countryOptions.map(country => (
										<option key={country} value={country}>{getCountrySelectLabel(country, 'en', countries)}</option>
									))}
								</select>
							</label>
					) : null}
						<input
							aria-label={label}
							className="form-input"
							disabled={isReadOnly}
							name={path}
							placeholder={placeholderText}
							style={{ ...sharedControlStyle, flex: 1, minWidth: 0 }}
							type="text"
							value={draftNumber}
								onChange={event => {
								setDraftNumber(event.target.value);
								setLiveError(null);
								setIsDraftDirty(true);
							}}
							onFocus={handleFocus}
							onBlur={handleBlur}
							onKeyDown={event => {
								if (event.key === 'Escape') setLiveError(null);
							}}
						/>
							{extensionEnabled ? (
							<input
								aria-label="Extension"
								className="form-input"
								disabled={isReadOnly}
								inputMode="numeric"
								pattern="[0-9]*"
								placeholder={extensionPlaceholder}
								style={{ ...sharedControlStyle, width: '8rem', maxWidth: '8rem', borderLeft: `1px solid ${controlBorderColor}` }}
								type="text"
								value={draftExtension}
								onChange={event => {
									setDraftExtension(event.target.value.replace(/\D+/g, ''));
									setIsDraftDirty(true);
								}}
								onFocus={handleFocus}
								onBlur={handleBlur}
							/>
							) : null}
						</div>
				</div>
				<FieldDescription description={description} path={path} />
			</div>
		</div>
	);
}

export default PhoneField;
