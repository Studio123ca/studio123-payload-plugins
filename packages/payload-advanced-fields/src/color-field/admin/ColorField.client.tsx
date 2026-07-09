'use client';

import {
	Sketch,
	Block,
	Circle,
	Compact,
	Slider,
	Github,
	Material,
	Colorful,
	Wheel,
	Chrome,
} from '@uiw/react-color';
import { useField } from '@payloadcms/ui/forms/useField';
import { FieldDescription } from '@payloadcms/ui/fields/FieldDescription';
import { FieldError } from '@payloadcms/ui/fields/FieldError';
import { FieldLabel } from '@payloadcms/ui/fields/FieldLabel';
import { fieldBaseClass } from '@payloadcms/ui/fields/shared';
import { Button } from '@payloadcms/ui/elements/Button';
import type { JSONFieldClientProps } from 'payload';
import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import type { ColorValue, RGB, HSL, ColorOption } from '../shared/types.js';
import { generateColorSlug, normalizeColorValue, colorValueToHsva, resolveColorOption } from '../shared/utils.js';
import { CustomSwatchPicker } from './CustomSwatchPicker.js';

/**
 * SVG checkerboard pattern for transparency visualization
 */
const CheckerboardSVG = () => (
	<svg
		width="100%"
		height="100%"
		xmlns="http://www.w3.org/2000/svg"
		style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
	>
		<defs>
			<pattern id="checkerboard" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
				<rect x="0" y="0" width="8" height="8" fill="#ffffff" />
				<rect x="0" y="0" width="4" height="4" fill="#d0d0d0" />
				<rect x="4" y="4" width="4" height="4" fill="#d0d0d0" />
			</pattern>
		</defs>
		<rect width="100%" height="100%" fill="url(#checkerboard)" />
	</svg>
);

/**
 * Tooltip-based picker wrapper for Sketch, Block, Github, Chrome, Material
 */
const TooltipPickerWrapper = ({ PickerComponent, color, onChange, pickerProps, isReadOnly, pickerType }: any) => {
	const [isOpen, setIsOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	// color can be a string (hex) or object with hex and alpha
	const hexColor = typeof color === 'string' ? color : color?.hex || '#ffffff';
	const alphaValue = typeof color === 'object' && color?.alpha ? color.alpha : 1;

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Enter' && isOpen) {
				event.preventDefault();
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			document.addEventListener('keydown', handleKeyDown);
			return () => {
				document.removeEventListener('mousedown', handleClickOutside);
				document.removeEventListener('keydown', handleKeyDown);
			};
		}
	}, [isOpen]);

	// Only apply styling for Material picker
	const tooltipStyle = pickerType === 'material' ? {
		position: 'absolute' as const,
		top: '100%',
		left: '0',
		marginTop: '8px',
		zIndex: 1000,
		padding: '12px',
		backgroundColor: '#fff',
		borderRadius: '4px',
		border: '1px solid #e0e0e0',
		boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
		minWidth: '320px',
	} : {
		position: 'absolute' as const,
		top: '100%',
		left: '0',
		marginTop: '8px',
		zIndex: 1000,
		minWidth: '320px',
	};

	return (
		<div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
			<Button
				onClick={(e: any) => {
					e.preventDefault();
					e.stopPropagation();
					if (!isReadOnly) {
						setIsOpen(!isOpen);
					}
				}}
				buttonStyle="secondary"
				size="medium"
				disabled={isReadOnly}
			>
			<div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
				<div
					style={{
						width: '16px',
						height: '16px',
						borderRadius: '3px',
						backgroundColor: hexColor,
						border: '1px solid #999',
						flexShrink: 0,
						position: 'relative',
						overflow: 'hidden',
					}}
				>
					{/* Checkerboard for transparency */}
					{alphaValue < 1 && <CheckerboardSVG />}
					{/* Color overlay with alpha */}
					<div
						style={{
							position: 'absolute',
							inset: 0,
							backgroundColor: hexColor,
							opacity: alphaValue,
						}}
					/>
				</div>
				<span>Select Color</span>
			</div>
		</Button>

			{isOpen && (
				<div style={tooltipStyle}>
					<PickerComponent
						{...pickerProps}
						onChange={(colorData: any) => {
							onChange(colorData);
						}}
					/>
				</div>
			)}
		</div>
	);
};

export type ColorFieldClientProps = {
	pickerType?: 'sketch' | 'block' | 'swatches' | 'compact' | 'slider' | 'github' | 'material' | 'colorful' | 'wheel' | 'chrome';
	presetColors?: ColorOption[];
	defaultColor?: ColorOption;
	disableAlpha?: boolean;
	swatchRadius?: string; // '50%' (circles), '4px' (rounded squares), '0' (sharp squares)
	swatchSize?: string; // Size of swatches in swatches picker, e.g. '40px' (default), '32px'
};

type Props = JSONFieldClientProps & ColorFieldClientProps;

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

const PickerMap = {
	sketch: Sketch,
	block: Block,
	circle: Circle,
	compact: Compact,
	slider: Slider,
	github: Github,
	material: Material,
	colorful: Colorful,
	wheel: Wheel,
	chrome: Chrome,
};

// Pickers that support alpha channel transparency
// Note: Circle picker is replaced with custom component that supports alpha
const PickersWithAlpha = new Set(['sketch', 'block', 'compact', 'slider', 'github', 'chrome']);

const ColorField = ({
	path,
	field,
	readOnly,
	pickerType = 'sketch',
	presetColors = [],
	defaultColor,
	disableAlpha = false,
	swatchRadius = '50%',
	swatchSize = '40px',
}: Props) => {
	const { value = null, setValue, showError, disabled } = useField<ColorValue | null>({ path });
	const label = resolveLocalizedLabel(field.label, 'en', field.name);
	const description = resolveLocalizedLabel(field.admin?.description, 'en', '');
	const isLocalized = Boolean(field.localized);
	const isReadOnly = Boolean(readOnly || disabled || field.admin?.readOnly);
	const className = [fieldBaseClass, showError && 'error', isReadOnly && 'read-only'].filter(Boolean).join(' ');

	// Process and validate presetColors - resolve all formats to hex with alpha preserved
	const processedPresetColors = useMemo(() => {
		try {
			return presetColors.map((option) => {
				const resolved = resolveColorOption(option);
				return {
					hex: resolved.hex,
					alpha: resolved.alpha,
					slug: resolved.slug,
					label: resolved.label,
				};
			});
		} catch (error) {
			console.error('Error processing preset colors:', error);
			return [];
		}
	}, [presetColors]);

	// Normalize the current value
	const normalizedValue = useMemo(() => normalizeColorValue(value), [value]);
	const hexValue = normalizedValue?.hex || (defaultColor ? resolveColorOption(defaultColor).hex : '#FFFFFF');

	// Determine if the current picker supports alpha channel
	const supportsAlpha = PickersWithAlpha.has(pickerType);
	const shouldShowAlpha = supportsAlpha && !disableAlpha;

	// Get the picker component
	const PickerComponent = PickerMap[pickerType as keyof typeof PickerMap] || Sketch;

	// Convert preset colors for different picker types
	// Note: Sketch, Block, and Github use 'presets' prop
	// Circle uses 'colors' prop
	const presets = useMemo(() => {
		const presetsArray = processedPresetColors.map(p => p.hex);
		if (['sketch', 'block', 'github'].includes(pickerType)) {
			return presetsArray;
		}
		return undefined;
	}, [processedPresetColors, pickerType]);

	// Handle color change from picker
	const handleColorChange = useCallback(
		(colorData: any) => {
			const newHex = colorData?.hex || '#FFFFFF';
			
			// Extract alpha from various possible locations:
			// 1. Direct alpha property (CustomSwatchPicker)
			// 2. hsva.a (react-color Sketch, Colorful with alpha)
			// 3. rgba.a (react-color RGBA pickers)
			// 4. Default to 1 if no alpha found
			let newAlpha = 1;
			if (typeof colorData?.alpha === 'number') {
				newAlpha = colorData.alpha;
			} else if (colorData?.hsva?.a !== undefined) {
				newAlpha = colorData.hsva.a;
			} else if (colorData?.rgba?.a !== undefined) {
				newAlpha = colorData.rgba.a;
			} else if (colorData?.h !== undefined && colorData?.a !== undefined) {
				// Direct HSVA object (h, s, v, a properties at top level)
				newAlpha = colorData.a;
			}
			
			const newSlug = generateColorSlug(newHex);

			// Check if color is a preset color and use its slug/label if available
			let finalSlug = newSlug;
			let finalLabel: string | undefined = undefined;

			for (const preset of processedPresetColors) {
				if (
					preset.hex.toLowerCase() === newHex.toLowerCase() &&
					Math.abs((preset.alpha ?? 1) - newAlpha) < 0.01
				) {
					finalSlug = preset.slug || newSlug;
					finalLabel = preset.label;
					break;
				}
			}

			// Normalize the incoming color data to get all formats
			const normalized = normalizeColorValue({
				hex: newHex,
				alpha: newAlpha,
				rgb: colorData?.rgb,
				rgba: colorData?.rgba,
				hsl: colorData?.hsl,
				hsla: colorData?.hsla,
				hsv: colorData?.hsv,
				hsva: colorData?.hsva,
			});

			const newColorValue: ColorValue = {
				hex: newHex,
				slug: finalSlug,
				...(finalLabel && { label: finalLabel }),
				...(normalized?.alpha !== undefined && { alpha: normalized.alpha }),
				...(normalized?.rgb && { rgb: normalized.rgb }),
				...(normalized?.rgba && { rgba: normalized.rgba }),
				...(normalized?.hsl && { hsl: normalized.hsl }),
				...(normalized?.hsla && { hsla: normalized.hsla }),
				...(normalized?.hsv && { hsv: normalized.hsv }),
				...(normalized?.hsva && { hsva: normalized.hsva }),
			};

			setValue(newColorValue);
		},
		[processedPresetColors, setValue]
	);

	// Build picker props dynamically based on picker type
	// Wheel picker needs explicit sizing, Circle picker renders naturally
	const pickerSize = pickerType === 'wheel' ? 200 : undefined;
	
	// For pickers that expect HSVA format (Colorful, Sketch with alpha support, Chrome with alpha)
	// For others, pass just the hex string
	const colorForPicker = useMemo(() => {
		if (pickerType === 'colorful' || (pickerType === 'sketch' && supportsAlpha) || (pickerType === 'chrome' && supportsAlpha)) {
			// Ensure we have a valid HSVA object
			let hsva = normalizedValue?.hsva || { h: 0, s: 0, v: 100, a: 1 };
			// Make sure all properties are present and valid
			return {
				h: typeof hsva.h === 'number' ? hsva.h : 0,
				s: typeof hsva.s === 'number' ? hsva.s : 0,
				v: typeof hsva.v === 'number' ? hsva.v : 100,
				a: typeof hsva.a === 'number' ? hsva.a : 1,
			};
		} else {
			return hexValue;
		}
	}, [pickerType, normalizedValue?.hsva, supportsAlpha, hexValue]);
	
	const pickerProps: Record<string, any> = useMemo(() => {
		const props: Record<string, any> = {
			color: colorForPicker,
			onChange: handleColorChange,
			style: {
				...(pickerSize && { width: pickerSize, height: pickerSize }),
				...(!pickerSize && { width: '100%' }),
				maxWidth: '320px',
				pointerEvents: 'auto',
				opacity: isReadOnly ? 0.6 : 1,
			},
		};

		// Only add showAlpha for pickers that support it and are not using tooltip
		// Sketch and Chrome support showAlpha prop for alpha controls
		if ((pickerType === 'sketch' || pickerType === 'chrome') && supportsAlpha) {
			props.showAlpha = shouldShowAlpha;
		}

		// Colorful picker uses disableAlpha instead of showAlpha
		if (pickerType === 'colorful') {
			props.disableAlpha = disableAlpha;
		}

		// Only add presets for pickers that support it (NOT for wheel, colorful, chrome, material)
		const presetsOnlyPickers = ['sketch', 'block', 'github'];
		if (presets && presetsOnlyPickers.includes(pickerType)) {
			props.presets = presets;
		}

		// Circle picker replaced with CustomSwatchPicker (no longer uses presets prop)

		// Compact picker should only show preset colors
		if (pickerType === 'compact' && processedPresetColors.length > 0) {
			props.colors = processedPresetColors.map(p => p.hex);
		}

		// Add showTriangle={false} for Sketch, Block, Github, Chrome, Material (all will use tooltip)
		if (['sketch', 'block', 'github', 'chrome', 'material'].includes(pickerType)) {
			props.showTriangle = false;
		}

		return props;
	}, [pickerType, colorForPicker, handleColorChange, pickerSize, isReadOnly, supportsAlpha, shouldShowAlpha, disableAlpha, presets, processedPresetColors]);

	// Build picker props for tooltip pickers
	// Remove showAlpha for Sketch/Block/Github (causes DOM warning in tooltips)
	// BUT keep showAlpha for Chrome (needs it for alpha slider)
	const tooltipPickerProps = { ...pickerProps };
	if (pickerType !== 'chrome') {
		delete tooltipPickerProps.showAlpha;
	}

	return (
		<div className={className} id={`field-${path.replace(/\./g, '__')}`}>
			<div style={{ whiteSpace: 'nowrap' }}>
				<FieldLabel label={label} localized={isLocalized} path={path} required={field.required} />
			</div>
			<div className={`${fieldBaseClass}__wrap`}>
				<FieldError path={path} showError={showError} />

		{/* Color Picker */}
		<div style={{ marginBottom: '16px' }}>
		{pickerType === 'swatches' ? (
			<CustomSwatchPicker
				colors={processedPresetColors}
				color={{ hex: hexValue, alpha: normalizedValue?.alpha }}
				onChange={handleColorChange}
				swatchRadius={swatchRadius}
				swatchSize={swatchSize}
				readOnly={isReadOnly}
			/>
			) : ['sketch', 'block', 'github', 'chrome', 'material'].includes(pickerType) ? (
				<TooltipPickerWrapper
					PickerComponent={PickerComponent}
					color={{ hex: hexValue, alpha: normalizedValue?.alpha }}
					onChange={handleColorChange}
					pickerProps={tooltipPickerProps}
					isReadOnly={isReadOnly}
					pickerType={pickerType}
				/>
			) : pickerType === 'wheel' ? (
				<div style={{ display: 'flex', justifyContent: 'center' }}>
					<PickerComponent {...pickerProps} />
				</div>
			) : (
				<PickerComponent {...pickerProps} />
			)}
		</div>

				<FieldDescription description={description} path={path} />
			</div>
		</div>
	);
};

export default ColorField;
