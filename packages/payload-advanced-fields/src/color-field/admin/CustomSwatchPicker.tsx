'use client';

import { useCallback, useMemo, useState } from 'react';
import { FiCheck } from 'react-icons/fi';
import type { RGBA, HSVA } from '../shared/types.js';
import { hexToHsva, hsvaToRgb } from '../shared/utils.js';

interface ColorSwatch {
	hex: string;
	alpha?: number;
	slug?: string;
	label?: string;
}

interface CustomSwatchPickerProps {
	colors: ColorSwatch[];
	color?: { hex: string; alpha?: number };
	onChange: (colorData: { hex: string; alpha: number; rgba: RGBA; hsva: HSVA; hexString: string }) => void;
	swatchRadius?: string; // '50%' for circles, '4px' for rounded, '0' for squares
	swatchSize?: string; // Size of the swatches, e.g. '40px' (default), '32px', '48px'
	readOnly?: boolean;
}

const CHECKERBOARD_BACKGROUND_IMAGE =
	'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%278%27 height=%278%27 viewBox=%270 0 8 8%27%3E%3Crect width=%278%27 height=%278%27 fill=%27%23ffffff%27/%3E%3Cpath d=%27M0 0h4v4H0zM4 4h4v4H4z%27 fill=%27%23d0d0d0%27/%3E%3C/svg%3E")';

const hexToRgb = (hex: string) => {
	const normalized = hex.replace('#', '').trim();
	if (normalized.length === 3) {
		const [r, g, b] = normalized.split('');
		return {
			r: Number.parseInt(`${r}${r}`, 16),
			g: Number.parseInt(`${g}${g}`, 16),
			b: Number.parseInt(`${b}${b}`, 16),
		};
	}

	if (normalized.length >= 6) {
		return {
			r: Number.parseInt(normalized.slice(0, 2), 16),
			g: Number.parseInt(normalized.slice(2, 4), 16),
			b: Number.parseInt(normalized.slice(4, 6), 16),
		};
	}

	return { r: 255, g: 255, b: 255 };
};

const getLuminance = (hex: string) => {
	const { r, g, b } = hexToRgb(hex);
	const toLinear = (channel: number) => {
		const value = channel / 255;
		return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	};

	return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
};

const getContrastTone = (hex: string) => {
	return getLuminance(hex) > 0.62
		? {
			border: 'rgba(15, 23, 42, 0.32)',
			icon: '#111827',
		}
		: {
			border: 'rgba(255, 255, 255, 0.55)',
			icon: '#ffffff',
		};
};

/**
 * Custom swatch/circle color picker component
 * Replaces react-color Circle picker with full alpha support
 * Displays colors as circles, rounded squares, or sharp squares
 */
export const CustomSwatchPicker = ({
	colors,
	color,
	onChange,
	swatchRadius = '50%',
	swatchSize = '40px',
	readOnly = false,
}: CustomSwatchPickerProps) => {
	const currentHex = color?.hex || '#FFFFFF';
	const currentAlpha = color?.alpha ?? 1;
	const [hoveredKey, setHoveredKey] = useState<string | null>(null);

	// Precompute color data for each swatch
	const swatchData = useMemo(() => {
		return colors.map((swatch) => {
			try {
				const alpha = swatch.alpha ?? 1;
				const hsva = hexToHsva(swatch.hex, alpha);
				const rgb = hsvaToRgb(hsva);
				const rgba: RGBA = { ...rgb, a: alpha };

				return {
					...swatch,
					alpha,
					hsva,
					rgba,
					hexa: `${swatch.hex}${Math.round(alpha * 255)
						.toString(16)
						.padStart(2, '0')
						.toUpperCase()}`,
				};
			} catch (error) {
				console.error(`Failed to process swatch ${swatch.hex}:`, error);
				return {
					...swatch,
					alpha: swatch.alpha ?? 1,
					hsva: { h: 0, s: 0, v: 100, a: 1 },
					rgba: { r: 255, g: 255, b: 255, a: 1 },
					hexa: swatch.hex,
				};
			}
		});
	}, [colors]);

	// Handle swatch click
	const handleSwatchClick = useCallback(
		(swatch: (typeof swatchData)[number]) => {
			if (readOnly) return;

			const hexa = swatch.hexa;
			const hexString = `rgba(${swatch.rgba.r}, ${swatch.rgba.g}, ${swatch.rgba.b}, ${swatch.alpha})`;

			onChange({
				hex: swatch.hex,
				alpha: swatch.alpha,
				rgba: swatch.rgba,
				hsva: swatch.hsva,
				hexString,
			});
		},
		[onChange, readOnly]
	);

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: `repeat(auto-fill, minmax(${swatchSize}, 1fr))`,
				gap: '8px',
			}}
		>
		{swatchData.map((swatch, index) => {
			const isSelected =
				swatch.hex.toLowerCase() === currentHex.toLowerCase() &&
				Math.abs(swatch.alpha - currentAlpha) < 0.01;
			const swatchKey = swatch.slug || `${swatch.hex}-${index}`;
			const contrastTone = getContrastTone(swatch.hex);
			const shadow = `0 0 0 1px ${contrastTone.border}`;
			const isHovered = hoveredKey === swatchKey;

			return (
				<div
					key={swatchKey}
					style={{ position: 'relative' }}
					onMouseEnter={() => {
						if (!readOnly) setHoveredKey(swatchKey);
					}}
					onMouseLeave={() => {
						if (!readOnly) setHoveredKey(null);
					}}
				>
					<button
						onClick={() => handleSwatchClick(swatch)}
						disabled={readOnly}
						aria-label={swatch.label || swatch.hex}
						style={{
							width: '100%',
							aspectRatio: '1 / 1',
							padding: 0,
							border: 'none',
							boxShadow: shadow,
							borderRadius: swatchRadius,
							backgroundImage: swatch.alpha < 1 ? CHECKERBOARD_BACKGROUND_IMAGE : 'none',
							backgroundSize: '8px 8px',
							backgroundPosition: '0 0',
							cursor: readOnly ? 'default' : 'pointer',
							backgroundColor: swatch.hex,
							position: 'relative',
							opacity: readOnly ? 0.6 : 1,
							transition: 'box-shadow 150ms ease-in-out',
							transform: isHovered && !readOnly ? 'translate3d(0, 0, 0) scale(1.04)' : 'translate3d(0, 0, 0) scale(1)',
							transformOrigin: 'center center',
							willChange: 'transform',
							backfaceVisibility: 'hidden',
							overflow: 'hidden',
						}}
					>
						{/* Color overlay */}
						<div
							style={{
								position: 'absolute',
								inset: 0,
								borderRadius: swatchRadius,
								backgroundColor: swatch.hex,
								opacity: swatch.alpha,
								pointerEvents: 'none',
							}}
						/>

						{isSelected && (
							<div
								aria-hidden="true"
								style={{
									position: 'absolute',
									inset: 0,
									display: 'grid',
									placeItems: 'center',
									pointerEvents: 'none',
								}}
							>
								<FiCheck
									aria-hidden="true"
									size={16}
									strokeWidth={3}
									style={{
										color: contrastTone.icon,
										filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35))',
									}}
								/>
							</div>
						)}
					</button>
				</div>
			);
		})}
		</div>
	);
};
