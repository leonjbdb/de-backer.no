/**
 * Transform builder utility
 * Builds CSS transform strings for entry/exit animations
 * Follows Single Responsibility Principle - only builds transform strings
 */

export interface AnimationTransform {
	scale: number;
	translateY: number;
	rotateX: number;
}

export interface TransformBuilderOptions {
	/** Horizontal offset in vw units */
	horizontalOffset?: number;
	/** Additional vertical shift (e.g., for mobile) */
	verticalShift?: string;
	/** Whether to center the element */
	centered?: boolean;
}

export interface WheelTransformOptions {
	/** Horizontal translation in px */
	translateX: number;
	/** Vertical offset in px (default: -40) */
	translateY?: number;
	/** Depth translation in px */
	translateZ: number;
	/** Rotation around Y axis in degrees */
	rotateY: number;
	/** Scale factor */
	scale: number;
}

export interface CssVarOptions {
	/** Mobile border radius override */
	mobileBorderRadius?: number;
	/** Fallback border radius */
	borderRadius: number;
	/** Mobile padding value */
	mobilePadding: string;
}

/**
 * Build a CSS transform string for entry/exit animation
 */
export function buildEntryExitTransform(
	animation: AnimationTransform,
	options: TransformBuilderOptions = {}
): string {
	const {
		horizontalOffset = 0,
		verticalShift = "",
		centered = true,
	} = options;

	const { scale, translateY, rotateX } = animation;

	if (centered) {
		const verticalPart = verticalShift
			? `calc(-50% + ${translateY}px ${verticalShift})`
			: `calc(-50% + ${translateY}px)`;

		return `
			translate3d(calc(-50% + ${horizontalOffset}vw), ${verticalPart}, 0)
			scale3d(${scale}, ${scale}, 1)
			rotateX(${rotateX}deg)
		`.replace(/\s+/g, ' ').trim();
	}

	return `
		translate3d(${horizontalOffset}vw, ${translateY}px, 0)
		scale3d(${scale}, ${scale}, 1)
		rotateX(${rotateX}deg)
	`.replace(/\s+/g, ' ').trim();
}

/**
 * Build a CSS transform string for 3D wheel carousel animation
 * Used for mobile card carousel with depth perspective
 */
export function buildWheelTransform(options: WheelTransformOptions): string {
	const {
		translateX,
		translateY = -40,
		translateZ,
		rotateY,
		scale,
	} = options;

	return `
		translate3d(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px), ${translateZ}px)
		rotateY(${rotateY}deg)
		scale3d(${scale}, ${scale}, 1)
	`.replace(/\s+/g, ' ').trim();
}

/**
 * Calculate mobile padding value with proper fallback
 * Converts number to px string or returns string as-is
 */
export function buildMobilePaddingValue(
	mobilePadding: string | number | undefined,
	padding: string | number,
	fallback: string | number
): string {
	if (mobilePadding !== undefined) {
		return typeof mobilePadding === "number" ? `${mobilePadding}px` : mobilePadding;
	}

	// No mobile override, use default padding
	const defaultPadding = typeof fallback === "number" ? `${fallback}px` : fallback;
	return defaultPadding;
}

/**
 * Build CSS custom properties for glass card mobile overrides
 * Returns empty object if no overrides needed
 */
export function buildGlassCardCssVars(options: CssVarOptions): React.CSSProperties {
	const { mobileBorderRadius, borderRadius, mobilePadding } = options;

	return {
		'--glass-card-mobile-radius': `${mobileBorderRadius ?? borderRadius}px`,
		'--glass-card-mobile-padding': mobilePadding,
	} as React.CSSProperties;
}
