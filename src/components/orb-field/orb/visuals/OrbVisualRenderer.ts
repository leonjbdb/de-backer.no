// =============================================================================
// OrbVisualRenderer - Visual rendering for orbs with depth-based effects
// =============================================================================

import { type Orb } from '../types';
import { type OrbVisualConfig, DEFAULT_ORB_VISUAL_CONFIG } from './OrbVisualConfig';

/**
 * Represents the current window dimensions.
 */
interface WindowSize {
	width: number;
	height: number;
}

/**
 * Handles the visual rendering of orbs with maroon coloring, glow effects,
 * and depth-based blur simulation.
 *
 * Single Responsibility: Only responsible for drawing visual orb representations.
 * Uses radial gradients for performant glow and blur effects.
 *
 * Design Notes:
 * - Orbs are rendered back-to-front (sorted by z-depth) for proper layering
 * - Depth affects opacity and gradient softness (bokeh simulation)
 * - Glow is achieved via extended radial gradient with color fade
 */
export class OrbVisualRenderer {
	/**
	 * Renders all orbs to the canvas with visual effects.
	 * 
	 * All orbs across ALL z-layers are rendered, sorted back-to-front.
	 * Depth affects opacity and blur but does not filter visibility.
	 *
	 * @param ctx - The 2D canvas rendering context.
	 * @param windowSize - Current window dimensions.
	 * @param orbs - Array of orbs to render (from ALL layers).
	 * @param totalLayers - Total number of z-layers in the system.
	 * @param config - Visual configuration for orb appearance.
	 */
	static draw(
		ctx: CanvasRenderingContext2D,
		windowSize: WindowSize,
		orbs: Orb[],
		totalLayers: number,
		config: OrbVisualConfig = DEFAULT_ORB_VISUAL_CONFIG
	): void {
		const { width, height } = windowSize;

		// Clear the canvas
		ctx.clearRect(0, 0, width, height);

		// Skip if no orbs
		if (orbs.length === 0) return;

		// Sort ALL orbs by z-depth (back to front) for proper layering
		// Higher z = further back = render first
		// NOTE: No layer filtering - all orbs from all z-layers are rendered
		const sortedOrbs = [...orbs].sort((a, b) => b.z - a.z);

		// Use 'screen' blend mode for additive-like blending
		// This makes overlapping orbs blend together nicely (brighter where they overlap)
		ctx.globalCompositeOperation = 'screen';

		// Render ALL orbs (no layer filtering)
		for (const orb of sortedOrbs) {
			this.drawOrb(ctx, orb, totalLayers, config);
		}

		// Reset composite operation
		ctx.globalCompositeOperation = 'source-over';
	}

	/**
	 * Draws a single orb with radial gradient for glow and depth blur effect.
	 *
	 * @param ctx - The 2D canvas rendering context.
	 * @param orb - The orb to render.
	 * @param totalLayers - Total number of z-layers.
	 * @param config - Visual configuration.
	 */
	private static drawOrb(
		ctx: CanvasRenderingContext2D,
		orb: Orb,
		totalLayers: number,
		config: OrbVisualConfig
	): void {
		const { pxX, pxY, z, size } = orb;

		// Calculate depth factor (0 = closest, 1 = furthest)
		const depthFactor = this.calculateDepthFactor(z, totalLayers);

		// Calculate orb visual radius based on size
		const baseRadius = config.baseRadiusPx * Math.pow(size, config.sizeExponent);

		// Calculate glow radius (extends beyond base radius)
		const glowRadius = baseRadius * config.glowSpread;

		// Calculate depth-based properties
		const opacity = this.lerp(config.maxOpacity, config.minOpacity, depthFactor);
		const blurSoftness = this.lerp(config.minBlurSoftness, config.maxBlurSoftness, depthFactor);

		// Create and apply the radial gradient
		const gradient = this.createOrbGradient(
			ctx,
			pxX,
			pxY,
			baseRadius,
			glowRadius,
			blurSoftness,
			opacity,
			config
		);

		// Draw the orb as a circle with the gradient
		ctx.beginPath();
		ctx.arc(pxX, pxY, glowRadius, 0, Math.PI * 2);
		ctx.fillStyle = gradient;
		ctx.fill();
	}

	/**
	 * Calculates the depth factor from z-position.
	 * Returns 0 for closest (z=0) and 1 for furthest (z=totalLayers).
	 *
	 * @param z - Current z-position of the orb.
	 * @param totalLayers - Total number of z-layers.
	 * @returns Depth factor from 0 (close) to 1 (far).
	 */
	private static calculateDepthFactor(z: number, totalLayers: number): number {
		return Math.max(0, Math.min(1, z / totalLayers));
	}

	/**
	 * Creates a radial gradient for an orb with glow and blur effects.
	 *
	 * The gradient structure:
	 * - Center: Solid maroon color (core of the orb)
	 * - Inner edge: Color with blur softness transition
	 * - Outer glow: Color fades to transparent
	 *
	 * @param ctx - The 2D canvas rendering context.
	 * @param x - Center X position.
	 * @param y - Center Y position.
	 * @param baseRadius - The orb's base visual radius.
	 * @param glowRadius - The extended radius including glow.
	 * @param blurSoftness - How soft the edge transition is (0-1).
	 * @param opacity - Overall opacity of the orb.
	 * @param config - Visual configuration.
	 * @returns A radial gradient for filling the orb.
	 */
	private static createOrbGradient(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		baseRadius: number,
		glowRadius: number,
		blurSoftness: number,
		opacity: number,
		config: OrbVisualConfig
	): CanvasGradient {
		const { baseHue, baseSaturation, baseLightness, glowIntensity } = config;

		// Create radial gradient from center to glow edge
		const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);

		// Calculate brightened center for glowing effect
		// The core is brighter (higher lightness) to simulate internal luminosity
		const coreLightness = Math.min(baseLightness + 35, 55);
		const innerLightness = Math.min(baseLightness + 22, 42);
		const midLightness = Math.min(baseLightness + 12, 32);

		// Opacity curve - make sure distant orbs remain visible
		// Keep core relatively high opacity even for distant orbs
		const coreOpacity = opacity * 0.9;  // Increased from 0.7
		const innerOpacity = opacity * 0.65 * (1 - blurSoftness * 0.25); // Increased from 0.45
		const midOpacity = opacity * 0.4 * (1 - blurSoftness * 0.4);      // Increased from 0.25
		const glowOpacity = opacity * glowIntensity * 0.2;                 // Increased from 0.12
		const outerOpacity = opacity * glowIntensity * 0.08;               // Increased from 0.04

		// Colors with gradual opacity falloff for soft, diffused look
		const coreColor = `hsla(${baseHue}, ${baseSaturation}%, ${coreLightness}%, ${coreOpacity})`;
		const innerColor = `hsla(${baseHue}, ${baseSaturation}%, ${innerLightness}%, ${innerOpacity})`;
		const midColor = `hsla(${baseHue}, ${baseSaturation}%, ${midLightness}%, ${midOpacity})`;
		const glowColor = `hsla(${baseHue}, ${baseSaturation}%, ${baseLightness}%, ${glowOpacity})`;
		const outerGlow = `hsla(${baseHue}, ${baseSaturation}%, ${baseLightness}%, ${outerOpacity})`;
		const transparentColor = `hsla(${baseHue}, ${baseSaturation}%, ${baseLightness}%, 0)`;

		// Gradient stops for soft, diffused edges with visible core
		// Even very blurry orbs keep a minimum core size for visibility
		// blurSoftness affects how quickly it fades, but core remains visible
		const minCoreSize = 0.08;  // Minimum 8% of radius is core
		const minInnerSize = 0.15; // Minimum 15% for inner color

		// Calculate stops - blur softness reduces core size but with minimums
		const stop1 = 0.0;                                                    // Center - brightest
		const stop2 = Math.max(minCoreSize, 0.15 * (1 - blurSoftness * 0.7)); // Core end
		const stop3 = Math.max(minInnerSize, 0.25 * (1 - blurSoftness * 0.5)); // Inner end
		const stop4 = 0.35;                                                   // Mid fade
		const stop5 = 0.55;                                                   // Glow region
		const stop6 = 0.75;                                                   // Outer glow
		// stop 1.0 = fully transparent

		// Add gradient color stops for soft, diffused glow with visible cores
		gradient.addColorStop(stop1, coreColor);
		gradient.addColorStop(stop2, coreColor);
		gradient.addColorStop(stop3, innerColor);
		gradient.addColorStop(stop4, midColor);
		gradient.addColorStop(stop5, glowColor);
		gradient.addColorStop(stop6, outerGlow);
		gradient.addColorStop(1, transparentColor);

		return gradient;
	}

	/**
	 * Linear interpolation between two values.
	 *
	 * @param a - Start value.
	 * @param b - End value.
	 * @param t - Interpolation factor (0-1).
	 * @returns Interpolated value.
	 */
	private static lerp(a: number, b: number, t: number): number {
		return a + (b - a) * t;
	}
}
