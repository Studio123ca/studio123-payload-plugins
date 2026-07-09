import type { JSONField, PayloadComponent } from 'payload';

export type ColorPickerType = 'sketch' | 'block' | 'swatches' | 'compact' | 'slider' | 'github' | 'material' | 'colorful' | 'wheel' | 'chrome';

/**
 * ColorOption accepts multiple color formats
 * Can provide: hex, rgba, hsla, or any combination
 * At least one color format must be provided
 */
export interface ColorOption {
	slug?: string;
	label?: string;
	alpha?: number; // 0-1 transparency value (optional, can also be in rgba/hsla/hsva)
	hex?: string;
	rgb?: RGB;
	rgba?: RGBA;
	hsl?: HSL;
	hsla?: HSLA;
	hsv?: HSV;
	hsva?: HSVA;
}

export interface RGB {
	r: number;
	g: number;
	b: number;
	a?: number;
}

export interface RGBA {
	r: number;
	g: number;
	b: number;
	a: number;
}

export interface HSL {
	h: number;
	s: number;
	l: number;
	a?: number;
}

export interface HSLA {
	h: number;
	s: number;
	l: number;
	a: number;
}

export interface HSV {
	h: number;
	s: number;
	v: number;
	a?: number;
}

export interface HSVA {
	h: number;
	s: number;
	v: number;
	a: number;
}

export interface ColorValue {
	hex: string;
	slug?: string;
	label?: string;
	alpha?: number;
	rgb?: RGB;
	rgba?: RGBA;
	hsl?: HSL;
	hsla?: HSLA;
	hsv?: HSV;
	hsva?: HSVA;
}

export type ColorFieldClientComponent = {
	pickerType?: ColorPickerType;
	presetColors?: ColorOption[];
	defaultColor?: ColorOption;
	disableAlpha?: boolean;
	localized?: boolean;
};

export type ColorFieldErrorComponent = {
	path: string;
	showError: boolean;
};

export type ColorFieldLabelComponent = any;

/**
 * ColorField - A custom JSON field that renders a color picker in the admin UI
 * Extends Payload's JSONField with color-specific properties
 */
export type ColorField = {
	type: 'json';
	pickerType?: ColorPickerType;
	presetColors?: ColorOption[];
	defaultColor?: ColorOption;
	disableAlpha?: boolean;
	admin?: JSONField['admin'] & {
		components?: {
			Field?: PayloadComponent<any>;
		};
	};
} & Omit<JSONField, 'admin' | 'type'>;
