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

	/** Gradient softness for closest orbs (z=0). Lower = sharper edges. */
	minBlurSoftness: number;

	/** Gradient softness for furthest orbs (z=maxLayer). Higher = softer/blurrier. */
	maxBlurSoftness: number;

	/** Opacity for furthest orbs (0-1). */
	minOpacity: number;

	/** Opacity for closest orbs (0-1). */
	maxOpacity: number;

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
	glowSpread: 5.0,       // Very large glow radius for soft, diffused edges

	// Depth blur - soft and diffused, but cores remain visible
	minBlurSoftness: 0.5,  // Close orbs have moderate softness
	maxBlurSoftness: 0.85, // Far orbs are soft but still have visible cores

	// Opacity - controls overall visibility
	minOpacity: 0.7,       // Distant orbs remain quite visible
	maxOpacity: 1.0,       // Close orbs at full strength (gradient handles falloff)

	// Size scaling - larger orbs are significantly bigger visually
	baseRadiusPx: 35,      // Base radius for size 1 orbs
	sizeExponent: 0.85,    // Near-linear scaling so large orbs are visually much bigger
};
