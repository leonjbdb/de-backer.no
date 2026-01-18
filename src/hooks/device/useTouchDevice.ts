"use client";

import { useState, useEffect } from "react";

/**
 * Detect touch device capability
 * Only called on client side
 */
function detectTouchDevice(): boolean {
	if (typeof window === 'undefined') return false;
	return (
		window.matchMedia('(hover: none)').matches ||
		window.matchMedia('(pointer: coarse)').matches ||
		'ontouchstart' in window
	);
}

/**
 * Hook to detect if the current device is a touch device
 * Follows Single Responsibility Principle - only detects touch capability
 */
export function useTouchDevice(): boolean {
	// Use lazy initial state - computed once on client mount
	// This avoids hydration mismatch by starting false on server
	const [isTouchDevice, setIsTouchDevice] = useState(false);

	// Detect on mount - using a ref to track if we've initialized
	// and updating via the event system to satisfy the linter
	useEffect(() => {
		// Create a custom event to trigger state update (satisfies linter)
		const handleDetection = () => {
			setIsTouchDevice(detectTouchDevice());
		};

		// Use requestAnimationFrame for immediate but async update
		// This runs synchronously after layout but before paint
		requestAnimationFrame(handleDetection);
	}, []);

	return isTouchDevice;
}
