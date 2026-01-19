"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect if the current device is a touch device
 */
export function useTouchDevice(): boolean {
	const [isTouchDevice, setIsTouchDevice] = useState(false);

	useEffect(() => {
		const isTouch =
			window.matchMedia('(hover: none)').matches ||
			window.matchMedia('(pointer: coarse)').matches ||
			'ontouchstart' in window;
		// eslint-disable-next-line react-hooks/set-state-in-effect
		setIsTouchDevice(isTouch);
	}, []);

	return isTouchDevice;
}
