import type { FieldLabelServerComponent } from 'payload';

export type ColorFieldClientComponent = {
	pickerType?: 'sketch' | 'block' | 'circle' | 'compact' | 'slider' | 'github' | 'material' | 'colorful' | 'wheel' | 'chrome';
	presetColors?: Array<{ slug?: string; hex: string; label?: string }>;
	defaultColor?: { slug?: string; hex: string; label?: string };
	showAlpha?: boolean;
	localized?: boolean;
};

export type ColorFieldErrorComponent = {
	path: string;
	showError: boolean;
};

export type ColorFieldLabelComponent = FieldLabelServerComponent;

export type CodeFieldClientComponent = {
	height?: number;
	language?: 'html' | 'text';
	localized?: boolean;
};

export type CodeFieldErrorComponent = {
	path: string;
	showError: boolean;
};

export type CodeFieldLabelComponent = FieldLabelServerComponent;

export type LinkFieldClientComponent = {
	collectionSlugs?: string[];
	defaultType?: 'external' | 'internal' | 'email' | 'phone';
	localized?: boolean;
	required?: boolean;
};

export type LinkFieldErrorComponent = {
	path: string;
	showError: boolean;
};

export type LinkFieldLabelComponent = FieldLabelServerComponent;

