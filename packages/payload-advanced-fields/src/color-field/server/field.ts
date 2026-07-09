import type { JSONField } from 'payload';
import type { ColorField, ColorOption, ColorPickerType } from '../shared/types.js';
import { resolveColorOption } from '../shared/utils.js';

export type ColorFieldConfig = Partial<Omit<ColorField, 'type'>> & {
	pickerType?: ColorPickerType;
	presetColors?: ColorOption[];
	defaultColor?: ColorOption | string;
	disableAlpha?: boolean;
	swatches?: {
		size?: string; // Size of swatches in circle picker, e.g. '40px' (default), '32px'
		radius?: string; // Border radius, e.g. '50%' (circles, default), '4px' (rounded), '0' (squares)
	};
};

export type { ColorField } from '../shared/types.js';

export const colorField = (config: ColorFieldConfig = {}): ColorField => {
	const {
		name = 'color',
		label = 'Color',
		required = false,
		localized = false,
		pickerType = 'sketch',
		presetColors,
		defaultColor,
		disableAlpha = false,
		swatches,
		admin,
		...rest
	} = config;

	const swatchSize = swatches?.size ?? '40px';
	const swatchRadius = swatches?.radius ?? '50%';

	const resolvedDefault = defaultColor
		? resolveColorOption(defaultColor)
		: presetColors
			? resolveColorOption(presetColors[0])
			: undefined;

	return {
		name,
		label,
		type: 'json',
		required,
		localized,
		defaultValue: resolvedDefault
			? { hex: resolvedDefault.hex, slug: resolvedDefault.slug, label: resolvedDefault.label }
			: undefined,
		admin: {
			...admin,
			components: {
				Field: {
					path: '@studio123/payload-advanced-fields/color-field/client',
					exportName: 'ColorField',
					clientProps: {
						pickerType,
						presetColors,
						defaultColor: resolvedDefault,
						disableAlpha,
						swatchRadius,
						swatchSize,
						localized,
					},
				},
				...(admin?.components || {}),
			},
		},
		...rest,
	} as ColorField;
};
