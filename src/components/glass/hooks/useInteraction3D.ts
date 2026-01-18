"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export interface UseInteraction3DOptions {
	/** What triggers the 3D effect */
	trigger: 'hover' | 'press';
	/** Debounce delay in milliseconds. Default: 100 for hover, 0 for press */
	debounceMs?: number;
	/** Show effect on keyboard focus (for interactive elements like buttons) */
	enableFocus?: boolean;
}

export interface UseInteraction3DResult {
	/** Whether 3D effect should be shown */
	isActive: boolean;
	/** Whether element is hovered (for additional styling) */
	isHovered: boolean;
	/** Props to spread onto the element */
	interactionProps: {
		onMouseEnter?: () => void;
		onMouseLeave?: () => void;
		onMouseDown?: () => void;
		onMouseUp?: () => void;
		onFocus?: () => void;
		onBlur?: () => void;
	};
}

/**
 * Unified hook for 3D interaction effects (hover or press-based)
 * Used by GlassButton, HoverablePhoto, and GlassSlider
 */
export function useInteraction3D(options: UseInteraction3DOptions): UseInteraction3DResult {
	const { trigger, debounceMs, enableFocus = false } = options;

	// Default debounce: 100ms for hover (prevents edge flickering), 0ms for press
	const actualDebounce = debounceMs ?? (trigger === 'hover' ? 100 : 0);

	const [isActive, setIsActive] = useState(false);
	const [isHovered, setIsHovered] = useState(false);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const supportsHoverRef = useRef<boolean | null>(null);

	// Lazily check hover support on first access (avoids hydration mismatch)
	const getSupportsHover = useCallback(() => {
		if (supportsHoverRef.current === null) {
			supportsHoverRef.current = typeof window !== 'undefined'
				&& window.matchMedia('(hover: hover)').matches;
		}
		return supportsHoverRef.current;
	}, []);

	const clearDebounce = useCallback(() => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
	}, []);

	// Hover trigger mode
	// Activate immediately on enter, debounce only on leave (prevents edge flickering)
	const handleMouseEnter = useCallback(() => {
		if (trigger !== 'hover') return;
		if (!getSupportsHover()) return; // Skip on touch-only devices

		clearDebounce();
		setIsHovered(true);
		setIsActive(true);
	}, [trigger, clearDebounce, getSupportsHover]);

	const handleMouseLeave = useCallback(() => {
		if (trigger !== 'hover') return;
		if (!getSupportsHover()) return; // Skip on touch-only devices

		clearDebounce();
		setIsHovered(false);

		// Small delay before removing active state to prevent edge flickering
		if (actualDebounce > 0) {
			timeoutRef.current = setTimeout(() => {
				setIsActive(false);
			}, actualDebounce);
		} else {
			setIsActive(false);
		}
	}, [trigger, actualDebounce, clearDebounce, getSupportsHover]);

	// Press trigger mode
	const handleMouseDown = useCallback(() => {
		if (trigger !== 'press') return;

		setIsActive(true);
	}, [trigger]);

	const handleMouseUp = useCallback(() => {
		if (trigger !== 'press') return;

		setIsActive(false);
	}, [trigger]);

	// Focus handlers (optional, for keyboard accessibility)
	const handleFocus = useCallback(() => {
		if (!enableFocus) return;

		clearDebounce();
		setIsActive(true);
	}, [enableFocus, clearDebounce]);

	const handleBlur = useCallback(() => {
		if (!enableFocus) return;

		setIsActive(false);
	}, [enableFocus]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			clearDebounce();
		};
	}, [clearDebounce]);

	// Build interaction props based on trigger mode
	const interactionProps: UseInteraction3DResult['interactionProps'] = {};

	if (trigger === 'hover') {
		// Handlers check supportsHover internally to avoid hydration mismatch
		interactionProps.onMouseEnter = handleMouseEnter;
		interactionProps.onMouseLeave = handleMouseLeave;
	} else if (trigger === 'press') {
		interactionProps.onMouseDown = handleMouseDown;
		interactionProps.onMouseUp = handleMouseUp;
		// Also track hover for press mode (for styling)
		interactionProps.onMouseEnter = () => setIsHovered(true);
		interactionProps.onMouseLeave = () => setIsHovered(false);
	}

	if (enableFocus) {
		interactionProps.onFocus = handleFocus;
		interactionProps.onBlur = handleBlur;
	}

	return {
		isActive,
		isHovered,
		interactionProps,
	};
}
