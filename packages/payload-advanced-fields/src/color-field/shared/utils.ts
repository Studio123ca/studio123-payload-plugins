import type { ColorOption, ColorValue, RGB, RGBA, HSL, HSLA, HSV, HSVA } from './types.js';

// Basic CSS color name to hex mapping for server-side use
const CSS_COLOR_NAMES: Record<string, string> = {
	'aliceblue': '#F0F8FF',
	'antiquewhite': '#FAEBD7',
	'aqua': '#00FFFF',
	'aquamarine': '#7FFFD4',
	'azure': '#F0FFFF',
	'beige': '#F5F5DC',
	'bisque': '#FFE4C4',
	'black': '#000000',
	'blanchedalmond': '#FFEBCD',
	'blue': '#0000FF',
	'blueviolet': '#8A2BE2',
	'brown': '#A52A2A',
	'burlywood': '#DEB887',
	'cadetblue': '#5F9EA0',
	'chartreuse': '#7FFF00',
	'chocolate': '#D2691E',
	'coral': '#FF7F50',
	'cornflowerblue': '#6495ED',
	'cornsilk': '#FFF8DC',
	'crimson': '#DC143C',
	'cyan': '#00FFFF',
	'darkblue': '#00008B',
	'darkcyan': '#008B8B',
	'darkgoldenrod': '#B8860B',
	'darkgray': '#A9A9A9',
	'darkgrey': '#A9A9A9',
	'darkgreen': '#006400',
	'darkkhaki': '#BDB76B',
	'darkmagenta': '#8B008B',
	'darkolivegreen': '#556B2F',
	'darkorange': '#FF8C00',
	'darkorchid': '#9932CC',
	'darkred': '#8B0000',
	'darksalmon': '#E9967A',
	'darkseagreen': '#8FBC8F',
	'darkslateblue': '#483D8B',
	'darkslategray': '#2F4F4F',
	'darkslategrey': '#2F4F4F',
	'darkturquoise': '#00CED1',
	'darkviolet': '#9400D3',
	'deeppink': '#FF1493',
	'deepskyblue': '#00BFFF',
	'dimgray': '#696969',
	'dimgrey': '#696969',
	'dodgerblue': '#1E90FF',
	'firebrick': '#B22222',
	'floralwhite': '#FFFAF0',
	'forestgreen': '#228B22',
	'fuchsia': '#FF00FF',
	'gainsboro': '#DCDCDC',
	'ghostwhite': '#F8F8FF',
	'gold': '#FFD700',
	'goldenrod': '#DAA520',
	'gray': '#808080',
	'grey': '#808080',
	'green': '#008000',
	'greenyellow': '#ADFF2F',
	'honeydew': '#F0FFF0',
	'hotpink': '#FF69B4',
	'indianred': '#CD5C5C',
	'indigo': '#4B0082',
	'ivory': '#FFFFF0',
	'khaki': '#F0E68C',
	'lavender': '#E6E6FA',
	'lavenderblush': '#FFF0F5',
	'lawngreen': '#7CFC00',
	'lemonchiffon': '#FFFACD',
	'lightblue': '#ADD8E6',
	'lightcoral': '#F08080',
	'lightcyan': '#E0FFFF',
	'lightgoldenrodyellow': '#FAFAD2',
	'lightgray': '#D3D3D3',
	'lightgrey': '#D3D3D3',
	'lightgreen': '#90EE90',
	'lightpink': '#FFB6C1',
	'lightsalmon': '#FFA07A',
	'lightseagreen': '#20B2AA',
	'lightskyblue': '#87CEFA',
	'lightslategray': '#778899',
	'lightslategrey': '#778899',
	'lightsteelblue': '#B0C4DE',
	'lightyellow': '#FFFFE0',
	'lime': '#00FF00',
	'limegreen': '#32CD32',
	'linen': '#FAF0E6',
	'magenta': '#FF00FF',
	'maroon': '#800000',
	'mediumaquamarine': '#66CDAA',
	'mediumblue': '#0000CD',
	'mediumorchid': '#BA55D3',
	'mediumpurple': '#9370DB',
	'mediumseagreen': '#3CB371',
	'mediumslateblue': '#7B68EE',
	'mediumspringgreen': '#00FA9A',
	'mediumturquoise': '#48D1CC',
	'mediumvioletred': '#C71585',
	'midnightblue': '#191970',
	'mintcream': '#F5FFFA',
	'mistyrose': '#FFE4E1',
	'moccasin': '#FFE4B5',
	'navajowhite': '#FFDEAD',
	'navy': '#000080',
	'oldlace': '#FDF5E6',
	'olive': '#808000',
	'olivedrab': '#6B8E23',
	'orange': '#FFA500',
	'orangered': '#FF4500',
	'orchid': '#DA70D6',
	'palegoldenrod': '#EEE8AA',
	'palegreen': '#98FB98',
	'paleturquoise': '#AFEEEE',
	'palevioletred': '#DB7093',
	'papayawhip': '#FFEFD5',
	'peachpuff': '#FFDAB9',
	'peru': '#CD853F',
	'pink': '#FFC0CB',
	'plum': '#DDA0DD',
	'powderblue': '#B0E0E6',
	'purple': '#800080',
	'red': '#FF0000',
	'rosybrown': '#BC8F8F',
	'royalblue': '#4169E1',
	'saddlebrown': '#8B4513',
	'salmon': '#FA8072',
	'sandybrown': '#F4A460',
	'seagreen': '#2E8B57',
	'seashell': '#FFF5EE',
	'sienna': '#A0522D',
	'silver': '#C0C0C0',
	'skyblue': '#87CEEB',
	'slateblue': '#6A5ACD',
	'slategray': '#708090',
	'slategrey': '#708090',
	'snow': '#FFFAFA',
	'springgreen': '#00FF7F',
	'steelblue': '#4682B4',
	'tan': '#D2B48C',
	'teal': '#008080',
	'thistle': '#D8BFD8',
	'tomato': '#FF6347',
	'turquoise': '#40E0D0',
	'violet': '#EE82EE',
	'wheat': '#F5DEB3',
	'white': '#FFFFFF',
	'whitesmoke': '#F5F5F5',
	'yellow': '#FFFF00',
	'yellowgreen': '#9ACD32',
	'transparent': '#00000000',
};

export const generateColorSlug = (hex: string): string => {
	// Remove # and convert to lowercase
	const cleanHex = hex.replace('#', '').toLowerCase();
	return `custom-${cleanHex}`;
};

export const processColorOption = (color: ColorOption | string | undefined): ColorOption | undefined => {
	if (!color) return undefined;

	if (typeof color === 'string') {
		return {
			hex: color,
			slug: generateColorSlug(color),
		};
	}

	return {
		...color,
		slug: color.slug || generateColorSlug(color.hex || '#FFFFFF'),
		label: color.label || color.slug || color.hex,
	};
};

/**
 * Parse hex color string (with optional alpha channel)
 * Supports: #RGB, #RRGGBB, #RGBA, #RRGGBBAA
 */
export const parseHexWithAlpha = (hex: string): { hex: string; alpha?: number } => {
	const cleanHex = hex.replace('#', '').toUpperCase();
	
	if (cleanHex.length === 3) {
		// #RGB -> #RRGGBB
		const expanded = cleanHex.split('').map(c => c + c).join('');
		return { hex: `#${expanded}` };
	} else if (cleanHex.length === 4) {
		// #RGBA -> #RRGGBBAA
		const [r, g, b, a] = cleanHex.split('');
		const expanded = `${r}${r}${g}${g}${b}${b}${a}${a}`;
		const alphaValue = parseInt(a + a, 16) / 255;
		return { hex: `#${expanded.substring(0, 6)}`, alpha: alphaValue };
	} else if (cleanHex.length === 6) {
		return { hex: `#${cleanHex}` };
	} else if (cleanHex.length === 8) {
		// #RRGGBBAA
		const alphaValue = parseInt(cleanHex.substring(6), 16) / 255;
		return { hex: `#${cleanHex.substring(0, 6)}`, alpha: alphaValue };
	}
	
	throw new Error(`Invalid hex color format: ${hex}`);
};

/**
 * Parse rgba string: rgba(r, g, b, a) or rgb(r, g, b)
 */
export const parseRgbaString = (rgba: string): { rgb: RGB; hex: string; alpha?: number } => {
	const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
	if (!match) throw new Error(`Invalid rgba format: ${rgba}`);
	
	const r = parseInt(match[1], 10);
	const g = parseInt(match[2], 10);
	const b = parseInt(match[3], 10);
	const a = match[4] ? parseFloat(match[4]) : undefined;
	
	const hex = rgbToHex(r, g, b);
	return { 
		rgb: { r, g, b, ...(a !== undefined && { a }) }, 
		hex,
		alpha: a
	};
};

/**
 * Convert hex to RGB
 */
export const hexToRgb = (hex: string): RGB | null => {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result
		? {
				r: parseInt(result[1], 16),
				g: parseInt(result[2], 16),
				b: parseInt(result[3], 16),
		  }
		: null;
};

/**
 * Convert RGB to hex
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
	return '#' + [r, g, b].map(x => {
		const hex = x.toString(16);
		return hex.length === 1 ? '0' + hex : hex;
	}).join('');
};

/**
 * Convert RGB to HSV
 */
export const rgbToHsv = (rgb: RGB): HSV => {
	const r = rgb.r / 255;
	const g = rgb.g / 255;
	const b = rgb.b / 255;
	
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;
	
	let h = 0;
	let s = 0;
	const v = max;
	
	if (delta !== 0) {
		s = delta / max;
		
		if (max === r) {
			h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
		} else if (max === g) {
			h = ((b - r) / delta + 2) / 6;
		} else {
			h = ((r - g) / delta + 4) / 6;
		}
	}
	
	return {
		h: Math.round(h * 360),
		s: Math.round(s * 100),
		v: Math.round(v * 100),
		...(rgb.a !== undefined && { a: rgb.a }),
	};
};

/**
 * Convert HSV to RGB
 */
export const hsvToRgb = (hsv: HSV): RGB => {
	const h = hsv.h / 360;
	const s = hsv.s / 100;
	const v = hsv.v / 100;
	
	let r = 0, g = 0, b = 0;
	
	const i = Math.floor(h * 6);
	const f = h * 6 - i;
	const p = v * (1 - s);
	const q = v * (1 - f * s);
	const t = v * (1 - (1 - f) * s);
	
	switch (i % 6) {
		case 0: r = v; g = t; b = p; break;
		case 1: r = q; g = v; b = p; break;
		case 2: r = p; g = v; b = t; break;
		case 3: r = p; g = q; b = v; break;
		case 4: r = t; g = p; b = v; break;
		case 5: r = v; g = p; b = q; break;
	}
	
	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255),
		...(hsv.a !== undefined && { a: hsv.a }),
	};
};

/**
 * Convert HSVA to RGB (wrapper for hsvToRgb that handles alpha)
 */
export const hsvaToRgb = (hsva: HSVA): RGB => {
	return hsvToRgb(hsva);
};

/**
 * Convert HSL to RGB
 */
export const hslToRgb = (hsl: HSL): RGB => {
	const h = hsl.h / 360;
	const s = hsl.s / 100;
	const l = hsl.l / 100;

	let r = 0, g = 0, b = 0;

	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255),
		...(hsl.a !== undefined && { a: hsl.a }),
	};
};

/**
 * Convert hex to HSVA (for pickers that expect this format)
 */
export const hexToHsva = (hex: string, alpha?: number): HSVA => {
	const rgb = hexToRgb(hex);
	if (!rgb) throw new Error(`Invalid hex color: ${hex}`);
	
	const hsv = rgbToHsv(rgb);
	
	return {
		h: hsv.h,
		s: hsv.s,
		v: hsv.v,
		a: alpha !== undefined ? alpha : (hsv.a !== undefined ? hsv.a : 1),
	};
};

/**
 * Convert HSVA to hex
 */
export const hsvaToHex = (hsva: HSVA): string => {
	const rgb = hsvToRgb(hsva);
	return rgbToHex(rgb.r, rgb.g, rgb.b);
};

/**
 * Resolve a color input from any format
 * Supports: hex, hex with alpha, CSS color names, rgba strings, objects
 */
export const parseColorInput = (input: unknown): { hex: string; alpha?: number } => {
	if (!input) throw new Error('No color provided');
	
	if (typeof input === 'string') {
		// Try CSS color name first (case-insensitive)
		const lowerInput = input.toLowerCase();
		if (lowerInput in CSS_COLOR_NAMES) {
			return { hex: CSS_COLOR_NAMES[lowerInput] };
		}
		
		// Try hex format (with optional alpha)
		if (input.startsWith('#')) {
			return parseHexWithAlpha(input);
		}
		
		// Try rgba format
		if (input.startsWith('rgba') || input.startsWith('rgb')) {
			return parseRgbaString(input);
		}
		
		throw new Error(`Invalid color format: ${input}`);
	}
	
	if (typeof input === 'object' && input !== null) {
		const obj = input as Record<string, unknown>;
		
		// If it's already a ColorValue with hex, extract hex and alpha
		if (typeof obj.hex === 'string') {
			return {
				hex: obj.hex,
				alpha: typeof obj.alpha === 'number' ? obj.alpha : undefined,
			};
		}
		
		// If it's an HSVA object
		if ('h' in obj && 's' in obj && 'v' in obj) {
			const hsva = obj as unknown as HSVA;
			return {
				hex: hsvaToHex(hsva),
				alpha: hsva.a,
			};
		}
		
		// If it's an RGB object
		if ('r' in obj && 'g' in obj && 'b' in obj) {
			const rgb = obj as unknown as RGB;
			const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
			return {
				hex,
				alpha: rgb.a,
			};
		}
		
		throw new Error(`Invalid color object format`);
	}
	
	throw new Error(`Invalid color type: ${typeof input}`);
};

/**
 * Normalize any color input to a complete ColorValue with all formats
 */
export const normalizeColorValue = (value: unknown): ColorValue | null => {
	if (!value) return null;
	
	try {
		const { hex, alpha } = parseColorInput(value);
		const rgb = hexToRgb(hex);
		
		if (!rgb) return null;
		
		const hsv = rgbToHsv(rgb);
		const slug = generateColorSlug(hex);
		
		// Build RGBA and HSVA with alpha if provided
		const rgba: RGBA | undefined = alpha !== undefined 
			? { ...rgb, a: alpha } 
			: undefined;
		
		const hsva: HSVA | undefined = alpha !== undefined
			? { ...hsv, a: alpha }
			: undefined;
		
		return {
			hex,
			slug,
			alpha,
			rgb,
			rgba,
			hsv,
			hsva,
			...(typeof value === 'object' && value !== null && 'label' in value && typeof (value as any).label === 'string'
				? { label: (value as any).label }
				: {}),
		};
	} catch (e) {
		// If parsing fails, report the error and return null
		console.error('Color normalization error:', e);
		return null;
	}
};

/**
 * Convert normalized ColorValue to HSVA for pickers
 */
export const colorValueToHsva = (colorValue: ColorValue | null): HSVA => {
	if (!colorValue) {
		return { h: 0, s: 0, v: 100, a: 1 };
	}
	
	return colorValue.hsva || {
		h: 0,
		s: 0,
		v: 100,
		a: colorValue.alpha ?? 1,
	};
};

/**
 * Resolve a ColorOption to its hex representation
 * Validates that only one color format is provided
 * Returns { hex, slug?, label? } for use with pickers
 */
/**
 * Extract alpha value from any format in ColorOption
 */
export const getAlphaFromOption = (option: ColorOption): number => {
	if (option.alpha !== undefined) return option.alpha;
	if (option.rgba?.a !== undefined) return option.rgba.a;
	if (option.hsla?.a !== undefined) return option.hsla.a;
	if (option.hsva?.a !== undefined) return option.hsva.a;
	return 1; // Default to fully opaque
};

export const resolveColorOption = (option: ColorOption): { hex: string; alpha: number; slug?: string; label?: string } => {
	// Count how many color formats are provided
	const colorFormats = [option.hex, option.rgb, option.rgba, option.hsl, option.hsla, option.hsv, option.hsva].filter(
		(format) => format !== undefined
	);

	if (colorFormats.length === 0) {
		throw new Error('ColorOption must have at least one color format (hex, rgb, rgba, hsl, hsla, hsv, or hsva)');
	}

	if (colorFormats.length > 1) {
		throw new Error(
			`ColorOption can only have one color format, but got ${colorFormats.length}. Please provide only one of: hex, rgb, rgba, hsl, hsla, hsv, or hsva`
		);
	}

	let hex: string;

	try {
		if (option.hex) {
			hex = option.hex;
		} else if (option.rgba) {
			hex = rgbToHex(option.rgba.r, option.rgba.g, option.rgba.b);
		} else if (option.rgb) {
			hex = rgbToHex(option.rgb.r, option.rgb.g, option.rgb.b);
		} else if (option.hsla) {
			const hsl = { h: option.hsla.h, s: option.hsla.s, l: option.hsla.l } as HSL;
			const rgb = hslToRgb(hsl);
			hex = rgbToHex(rgb.r, rgb.g, rgb.b);
		} else if (option.hsl) {
			const rgb = hslToRgb(option.hsl);
			hex = rgbToHex(rgb.r, rgb.g, rgb.b);
		} else if (option.hsva) {
			const rgb = hsvaToRgb(option.hsva);
			hex = rgbToHex(rgb.r, rgb.g, rgb.b);
		} else if (option.hsv) {
			const rgb = hsvToRgb(option.hsv);
			hex = rgbToHex(rgb.r, rgb.g, rgb.b);
		} else {
			throw new Error('Unable to determine color format');
		}
	} catch (error) {
		throw new Error(`Failed to resolve ColorOption: ${error instanceof Error ? error.message : String(error)}`);
	}

	const alpha = getAlphaFromOption(option);

	return {
		hex,
		alpha,
		...(option.slug && { slug: option.slug }),
		...(option.label && { label: option.label }),
	};
};
