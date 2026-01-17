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
	 * Spawn/despawn animations affect opacity and scale.
	 *
	 * @param ctx - The 2D canvas rendering context.
	 * @param windowSize - Current window dimensions.
	 * @param orbs - Array of orbs to render (from ALL layers).
	 * @param totalLayers - Total number of z-layers in the system.
	 * @param config - Visual configuration for orb appearance.
	 * @param currentTime - Current timestamp from performance.now() for animations.
	 * @param offsetX - Horizontal offset in pixels for parallax scrolling.
	 * @param offsetY - Vertical offset in pixels for parallax scrolling.
	 */
	static draw(
		ctx: CanvasRenderingContext2D,
		windowSize: WindowSize,
		orbs: Orb[],
		totalLayers: number,
		config: OrbVisualConfig = DEFAULT_ORB_VISUAL_CONFIG,
		currentTime: number = performance.now(),
		offsetX: number = 0,
		offsetY: number = 0
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

		// Apply parallax offset translation
		ctx.save();
		ctx.translate(offsetX, offsetY);

		// Use 'screen' blend mode for additive-like blending
		// This makes overlapping orbs blend together nicely (brighter where they overlap)
		ctx.globalCompositeOperation = 'screen';

		// Render ALL orbs (no layer filtering)
		for (const orb of sortedOrbs) {
			this.drawOrb(ctx, orb, totalLayers, config, currentTime);
		}

		// Reset composite operation
		ctx.globalCompositeOperation = 'source-over';

		// Restore canvas state after parallax offset
		ctx.restore();
	}

	/**
	 * Draws a single orb with radial gradient for glow and depth blur effect.
	 * Uses Gaussian-like exponential decay for soft, natural-looking edges.
	 * Applies spawn/despawn animation for smooth fade-in/out and scale effects.
	 *
	 * @param ctx - The 2D canvas rendering context.
	 * @param orb - The orb to render.
	 * @param totalLayers - Total number of z-layers.
	 * @param config - Visual configuration.
	 * @param currentTime - Current timestamp for animation calculations.
	 */
	private static drawOrb(
		ctx: CanvasRenderingContext2D,
		orb: Orb,
		totalLayers: number,
		config: OrbVisualConfig,
		currentTime: number
	): void {
		const { pxX, pxY, z, size } = orb;

		// Skip orbs with invalid positions (NaN or Infinity)
		if (!isFinite(pxX) || !isFinite(pxY) || !isFinite(z) || !isFinite(size) || size <= 0) {
			return;
		}

		// Calculate animation factor (0 = invisible/small, 1 = fully visible/full size)
		const animationFactor = this.calculateAnimationFactor(orb, currentTime, config);

		// Skip rendering if fully invisible or invalid
		if (animationFactor <= 0 || !isFinite(animationFactor)) return;

		// Calculate depth factor (0 = closest, 1 = furthest)
		const depthFactor = this.calculateDepthFactor(z, totalLayers);

		// Calculate orb visual radius based on size
		const baseRadius = config.baseRadiusPx * Math.pow(size, config.sizeExponent);

		// Calculate blur width - scales with both size (via baseRadius) and depth
		// Far orbs get additional blur width for out-of-focus effect
		const blurWidth = baseRadius * (config.blurWidthBase + depthFactor * config.blurWidthDepthScale);

		// Total glow radius = core + blur region, scaled by glowSpread
		let glowRadius = (baseRadius * config.coreRatio + blurWidth) * config.glowSpread;

		// Apply animation scale factor
		const scaleFactor = this.lerp(config.animationMinScale, 1, animationFactor);
		glowRadius *= scaleFactor;

		// Skip if radius is too small or invalid
		if (glowRadius < 0.5 || !isFinite(glowRadius)) return;

		// Calculate depth-based opacity, modulated by animation
		const baseOpacity = this.lerp(config.maxOpacity, config.minOpacity, depthFactor);
		const opacity = baseOpacity * animationFactor;

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
	 * Calculates the animation factor for spawn/despawn effects.
	 * 
	 * Returns a value from 0 to 1:
	 * - During spawn: 0 -> 1 over orb's spawnAnimDurationMs
	 * - During active life: 1
	 * - During despawn: 1 -> 0 over orb's despawnAnimDurationMs
	 * 
	 * Uses ease-out for spawn and ease-in for despawn for natural feel.
	 *
	 * @param orb - The orb being rendered (contains animation durations).
	 * @param currentTime - Current timestamp.
	 * @param config - Visual configuration with animation settings.
	 * @returns Animation factor from 0 (invisible) to 1 (fully visible).
	 */
	private static calculateAnimationFactor(
		orb: Orb,
		currentTime: number,
		config: OrbVisualConfig
	): number {
		const { createdAt, lifetimeMs, spawnAnimDurationMs, despawnAnimDurationMs } = orb;
		const { animationEasePower } = config;
		const age = currentTime - createdAt;

		// Handle infinite lifetime orbs (manual spawns)
		if (!isFinite(lifetimeMs)) {
			// Only apply spawn animation
			if (age < spawnAnimDurationMs) {
				const t = age / spawnAnimDurationMs;
				// Ease-out: 1 - (1-t)^power
				return 1 - Math.pow(1 - t, animationEasePower);
			}
			return 1;
		}

		const timeRemaining = lifetimeMs - age;

		// Spawn phase: fade in and grow
		if (age < spawnAnimDurationMs) {
			const t = age / spawnAnimDurationMs;
			// Ease-out for spawn: starts fast, slows down
			return 1 - Math.pow(1 - t, animationEasePower);
		}

		// Despawn phase: fade out and shrink
		if (timeRemaining < despawnAnimDurationMs) {
			const t = timeRemaining / despawnAnimDurationMs;
			// Ease-in for despawn: starts slow, speeds up
			return Math.pow(t, animationEasePower);
		}

		// Active phase: fully visible
		return 1;
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
