// =============================================================================
// Orb Visual Configuration
// =============================================================================

/**
 * Configuration for orb visual rendering.
 * Controls the appearance of orbs including color, glow, and depth-based effects.
 */
export interface OrbVisualConfig {
	// =========================================================================
	// Base Color (HSL for easy manipulation)
	// =========================================================================

	/** Base hue for maroon color (0-360, maroon is ~0-10). */
	baseHue: number;

	/** Base saturation percentage (0-100). */
	baseSaturation: number;

	/** Base lightness percentage (0-100, 25-35 for deep maroon). */
	baseLightness: number;

	// =========================================================================
	// Glow Settings
	// =========================================================================

	/** Intensity of the glow effect (0-1). */
	glowIntensity: number;

	/** Multiplier for glow radius relative to orb size. */
	glowSpread: number;

	// =========================================================================
	// Depth-Based Visual Settings
	// =========================================================================

	/** Opacity for furthest orbs (0-1). */
	minOpacity: number;

	/** Opacity for closest orbs (0-1). */
	maxOpacity: number;

	// =========================================================================
	// Gaussian Blur Settings (Soft Edge Falloff)
	// =========================================================================

	/** 
	 * Percentage of the orb radius that remains solid/opaque core (0-1).
	 * Higher = larger bright center, lower = more diffuse throughout.
	 */
	coreRatio: number;

	/**
	 * Base blur width as a multiplier of orb radius.
	 * Controls how much the orb extends beyond its core.
	 * Higher = more spread out glow.
	 */
	blurWidthBase: number;

	/**
	 * How much depth increases blur width (0-1).
	 * Far orbs (high depth) get additional blur width = radius * depthFactor * blurWidthDepthScale.
	 */
	blurWidthDepthScale: number;

	/**
	 * Base falloff exponent for Gaussian-like curve.
	 * Higher = sharper falloff (more "in focus"), lower = softer falloff (more "out of focus").
	 * Typical range: 1.5 (very soft) to 4.0 (sharp).
	 */
	falloffExponentBase: number;

	/**
	 * How much depth reduces the falloff exponent (0-1).
	 * Close orbs use falloffExponentBase, far orbs use falloffExponentBase * (1 - falloffDepthScale).
	 */
	falloffDepthScale: number;

	/**
	 * Number of gradient color stops to use for smooth falloff.
	 * More stops = smoother gradient but slightly more computation.
	 * Recommended: 8-12.
	 */
	gradientStopCount: number;

	// =========================================================================
	// Size Scaling
	// =========================================================================

	/** Base pixel radius for size 1 orbs. */
	baseRadiusPx: number;

	/** How much larger orbs scale with size (radius = baseRadiusPx * size^sizeExponent). */
	sizeExponent: number;
}

/**
 * Default visual configuration for maroon orbs with depth-based blur and glow.
 *
 * The color is a deep blood red/maroon that matches the reference image.
 * Depth effects create a bokeh-like blur for orbs further from the viewer.
 */
export const DEFAULT_ORB_VISUAL_CONFIG: OrbVisualConfig = {
	// Deep blood red/maroon color (HSL: ~5°, 85%, 15%)
	baseHue: 5,
	baseSaturation: 90,
	baseLightness: 15,

	// Glow settings - large, soft glowing effect
	glowIntensity: 1.0,
	glowSpread: 3.5,       // Glow radius multiplier (total radius = baseRadius * glowSpread)

	// Opacity - controls overall visibility
	minOpacity: 0.65,      // Distant orbs remain visible
	maxOpacity: 1.0,       // Close orbs at full strength

	// Gaussian blur settings for soft edges
	coreRatio: 0.15,              // 15% of radius is solid core
	blurWidthBase: 0.4,           // Base blur extends 40% beyond core
	blurWidthDepthScale: 0.3,     // Depth adds up to 30% more blur width
	falloffExponentBase: 3.0,     // Sharp falloff for close orbs (in focus)
	falloffDepthScale: 0.5,       // Far orbs use 50% lower exponent (out of focus)
	gradientStopCount: 10,        // 10 stops for smooth gradient

	// Size scaling - larger orbs are significantly bigger visually
	baseRadiusPx: 35,      // Base radius for size 1 orbs
	sizeExponent: 0.85,    // Near-linear scaling so large orbs are visually much bigger
};
