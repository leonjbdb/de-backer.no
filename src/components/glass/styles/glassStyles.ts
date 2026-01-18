/**
 * Glassmorphism style constants
 * Follows Open/Closed Principle - extend by adding new variants, don't modify existing
 */

import { CSSProperties } from 'react';

export const glassStyles = {
	background: {
		default: {
			background: 'rgba(255, 255, 255, 0.08)',
		},
		hover: {
			background: 'rgba(255, 255, 255, 0.2)',
		},
		subtle: {
			background: 'rgba(255, 255, 255, 0.04)',
		},
	},
	backdrop: {
		blur: {
			backdropFilter: 'blur(24px) saturate(120%)',
			WebkitBackdropFilter: 'blur(24px) saturate(120%)',
		},
		blurLight: {
			backdropFilter: 'blur(12px)',
			WebkitBackdropFilter: 'blur(12px)',
		},
	},
	border: {
		default: {
			border: '1px solid rgba(255, 255, 255, 0.15)',
		},
		subtle: {
			border: '1px solid rgba(255, 255, 255, 0.08)',
		},
		hover: {
			border: '1px solid rgba(255, 255, 255, 0.3)',
		},
	},
	shadow: {
		card: {
			boxShadow: `
				0 25px 50px rgba(0, 0, 0, 0.25),
				0 10px 20px rgba(0, 0, 0, 0.15),
				inset 0 1px 0 rgba(255, 255, 255, 0.2),
				inset 0 -1px 0 rgba(0, 0, 0, 0.1)
			`,
		},
		button: {
			boxShadow: `
				0 2px 8px rgba(0, 0, 0, 0.1),
				inset 0 1px 0 rgba(255, 255, 255, 0.05)
			`,
		},
		buttonHover: {
			boxShadow: `
				0 12px 32px rgba(0, 0, 0, 0.25),
				0 4px 12px rgba(0, 0, 0, 0.15),
				inset 0 1px 0 rgba(255, 255, 255, 0.3)
			`,
		},
		handle: {
			boxShadow: `
				0 4px 12px rgba(0, 0, 0, 0.3),
				0 2px 4px rgba(0, 0, 0, 0.2),
				inset 0 1px 0 rgba(255, 255, 255, 0.3)
			`,
		},
		handleDragging: {
			boxShadow: `
				0 12px 32px rgba(0, 0, 0, 0.25),
				0 4px 12px rgba(0, 0, 0, 0.15),
				inset 0 1px 0 rgba(255, 255, 255, 0.3)
			`,
		},
	},
} as const;

/**
 * Helper to combine multiple glass styles
 */
export function combineGlassStyles(...styles: CSSProperties[]): CSSProperties {
	return Object.assign({}, ...styles);
}

/**
 * Gradient for top edge highlight
 */
export const topEdgeHighlight = {
	background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 20%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.5) 80%, transparent 100%)',
} as const;

/**
 * Handle and arrow color constants
 */
export const handleColors = {
	arrowDefault: 'var(--color-white, #ffffff)',
	arrowActive: 'var(--color-maroon, #4E0506)',
} as const;

/**
 * Highlight configuration for glass elements
 */
export const highlightDefaults = {
	borderRadius: 14,
	insetPercent: 8,
} as const;
