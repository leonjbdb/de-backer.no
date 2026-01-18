/**
 * Visibility utility functions
 * Follows Single Responsibility Principle - only handles visibility calculations
 */

export interface SliderVisibilityOptions {
	/** Whether debug mode is currently enabled */
	isDebugMode: boolean;
	/** Whether debug was active this session */
	wasActiveThisSession: boolean;
	/** Current opacity value */
	opacity: number;
	/** Whether element has appeared */
	hasAppeared: boolean;
	/** Final computed opacity from delayed visibility */
	finalOpacity: number;
}

export interface SliderVisibilityResult {
	/** Whether slider should remain visible */
	keepVisible: boolean;
	/** Computed opacity to use */
	computedOpacity: number;
	/** CSS visibility value */
	computedVisibility: "visible" | "hidden";
}

/**
 * Compute slider visibility state based on debug mode and opacity
 * Extracted from GlassSlider to follow Single Responsibility Principle
 */
export function computeSliderVisibility(options: SliderVisibilityOptions): SliderVisibilityResult {
	const {
		isDebugMode,
		wasActiveThisSession,
		opacity,
		hasAppeared,
		finalOpacity,
	} = options;

	// Keep slider visible if debug mode is/was active
	const keepVisible = isDebugMode || wasActiveThisSession;
	const computedOpacity = keepVisible ? 1 : finalOpacity;
	const computedVisibility = keepVisible
		? "visible"
		: ((hasAppeared && opacity > 0.01) || opacity > 0.5 ? "visible" : "hidden");

	return {
		keepVisible,
		computedOpacity,
		computedVisibility,
	};
}
