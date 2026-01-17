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
	 * Uses Gaussian-like exponential decay for soft, natural-looking edges.
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

		// Calculate blur width - scales with both size (via baseRadius) and depth
		// Far orbs get additional blur width for out-of-focus effect
		const blurWidth = baseRadius * (config.blurWidthBase + depthFactor * config.blurWidthDepthScale);

		// Total glow radius = core + blur region, scaled by glowSpread
		const glowRadius = (baseRadius * config.coreRatio + blurWidth) * config.glowSpread;

		// Calculate depth-based opacity
		const opacity = this.lerp(config.maxOpacity, config.minOpacity, depthFactor);

		// Calculate depth-based falloff exponent
		// Close orbs: higher exponent = sharper falloff = "in focus"
		// Far orbs: lower exponent = softer falloff = "out of focus"
		const falloffExponent = config.falloffExponentBase * (1 - depthFactor * config.falloffDepthScale);

		// Create and apply the radial gradient with Gaussian-like falloff
		const gradient = this.createGaussianGradient(
			ctx,
			pxX,
			pxY,
			glowRadius,
			falloffExponent,
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
	 * Creates a radial gradient with Gaussian-like exponential decay.
	 * 
	 * Uses the formula: opacity = e^(-(t/sigma)^exponent)
	 * Where t is the normalized distance from center (0-1).
	 * 
	 * This creates smooth, mathematically continuous falloff that mimics
	 * real-world blur and depth-of-field effects.
	 *
	 * @param ctx - The 2D canvas rendering context.
	 * @param x - Center X position.
	 * @param y - Center Y position.
	 * @param glowRadius - The total radius including glow.
	 * @param falloffExponent - Controls curve steepness (higher = sharper).
	 * @param opacity - Overall opacity of the orb.
	 * @param config - Visual configuration.
	 * @returns A radial gradient for filling the orb.
	 */
	private static createGaussianGradient(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		glowRadius: number,
		falloffExponent: number,
		opacity: number,
		config: OrbVisualConfig
	): CanvasGradient {
		const { baseHue, baseSaturation, baseLightness, glowIntensity, gradientStopCount, coreRatio } = config;

		// Create radial gradient from center to glow edge
		const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);

		// Sigma controls the width of the Gaussian curve
		// A sigma of ~0.4 means the curve reaches ~37% opacity at 40% of the radius
		const sigma = 0.4;

		// Pre-calculate lightness values for luminous center effect
		const coreLightness = Math.min(baseLightness + 35, 55);
		const glowLightness = baseLightness;

		// Generate gradient stops using Gaussian-like falloff
		for (let i = 0; i <= gradientStopCount; i++) {
			// Normalized position in gradient (0 = center, 1 = edge)
			const t = i / gradientStopCount;

			// Calculate Gaussian-like opacity falloff
			// e^(-(t/sigma)^exponent) creates smooth decay curve
			const gaussianFactor = Math.exp(-Math.pow(t / sigma, falloffExponent));

			// Apply overall opacity and glow intensity
			const stopOpacity = opacity * gaussianFactor * glowIntensity;

			// Interpolate lightness from bright core to base color
			// Core region (t < coreRatio) stays bright, then fades
			const lightnessT = Math.max(0, (t - coreRatio) / (1 - coreRatio));
			const lightness = this.lerp(coreLightness, glowLightness, Math.pow(lightnessT, 0.5));

			// Create color with calculated opacity
			const color = `hsla(${baseHue}, ${baseSaturation}%, ${lightness}%, ${stopOpacity})`;
			gradient.addColorStop(t, color);
		}

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
