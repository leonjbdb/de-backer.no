"use client";

import { useEffect, useState, useRef } from "react";
import { clamp, lerp } from "./mathUtils";
import { calculateCalibratedTilt } from "./orientationCalibration";

interface DeviceOrientation {
	tiltX: number;       // Calibrated: 0.5 = initial position
	tiltY: number;       // Calibrated: 0.5 = initial position
	rawTiltX: number;    // Absolute: 0.5 = device flat
	rawTiltY: number;    // Absolute: 0.5 = device flat
	hasPermission: boolean;
}

// Smoothing factor for interpolation (lower = smoother but laggier)
const SMOOTHING_FACTOR = 0.12;

/**
 * Hook for device orientation with calibration and smoothing
 * Matches the exact logic from working commit 640792a
 */
export function useDeviceOrientation(): DeviceOrientation {
	const [orientation, setOrientation] = useState({ beta: 0, gamma: 0 });
	const [hasPermission, setHasPermission] = useState(false);

	// Target values from device orientation events (raw, unsmoothed)
	const targetOrientationRef = useRef({ beta: 0, gamma: 0 });

	// Smoothed values for rendering (interpolated via RAF)
	const smoothedOrientationRef = useRef({ beta: 0, gamma: 0 });

	// State to store initial orientation for calibration (null until first reading)
	const [initialOrientation, setInitialOrientation] = useState<{ beta: number; gamma: number } | null>(null);

	// RAF loop ID for cleanup
	const rafIdRef = useRef<number | null>(null);

	useEffect(() => {
		const handleOrientation = (e: DeviceOrientationEvent) => {
			if (e.beta === null || e.gamma === null) return;

			// Capture initial orientation on first valid reading
			if (initialOrientation === null) {
				const initialBeta = clamp(e.beta, -90, 90);
				const initialGamma = clamp(e.gamma, -45, 45);

				setInitialOrientation({
					beta: initialBeta,
					gamma: initialGamma,
				});

				// Initialize smoothed values to initial position
				smoothedOrientationRef.current = {
					beta: initialBeta,
					gamma: initialGamma,
				};
				targetOrientationRef.current = {
					beta: initialBeta,
					gamma: initialGamma,
				};
			}

			// Update target values (these will be smoothly interpolated to)
			targetOrientationRef.current = {
				beta: clamp(e.beta, -90, 90),
				gamma: clamp(e.gamma, -45, 45),
			};
		};

		// Smoothing loop using requestAnimationFrame
		const smoothingLoop = () => {
			const target = targetOrientationRef.current;
			const current = smoothedOrientationRef.current;

			// Interpolate toward target values
			current.beta = lerp(current.beta, target.beta, SMOOTHING_FACTOR);
			current.gamma = lerp(current.gamma, target.gamma, SMOOTHING_FACTOR);

			// Update state with smoothed values
			setOrientation({ beta: current.beta, gamma: current.gamma });

			// Continue loop
			rafIdRef.current = requestAnimationFrame(smoothingLoop);
		};

		const requestPermission = async () => {
			// iOS 13+ requires permission for DeviceOrientationEvent
			const DOE = DeviceOrientationEvent as unknown as {
				new(): DeviceOrientationEvent;
				requestPermission?: () => Promise<'granted' | 'denied'>;
			};

			if (typeof DeviceOrientationEvent !== 'undefined' && DOE.requestPermission) {
				try {
					const permission = await DOE.requestPermission();
					if (permission === 'granted') {
						setHasPermission(true);
						window.addEventListener('deviceorientation', handleOrientation);
						// Start smoothing loop
						rafIdRef.current = requestAnimationFrame(smoothingLoop);
					}
				} catch { }
			} else if (typeof DeviceOrientationEvent !== 'undefined') {
				setHasPermission(true);
				window.addEventListener('deviceorientation', handleOrientation);
				// Start smoothing loop
				rafIdRef.current = requestAnimationFrame(smoothingLoop);
			}
		};

		const handleFirstTouch = () => {
			requestPermission();
			window.removeEventListener('touchstart', handleFirstTouch);
		};

		// Always set up touch listener AND call requestPermission immediately
		// This matches the exact behavior from commit 640792a
		window.addEventListener('touchstart', handleFirstTouch);
		requestPermission();

		return () => {
			window.removeEventListener('deviceorientation', handleOrientation);
			window.removeEventListener('touchstart', handleFirstTouch);
			if (rafIdRef.current) {
				cancelAnimationFrame(rafIdRef.current);
			}
		};
	}, [initialOrientation]);

	const { tiltX, tiltY, rawTiltX, rawTiltY } = calculateCalibratedTilt(orientation, initialOrientation);

	return { tiltX, tiltY, rawTiltX, rawTiltY, hasPermission };
}
