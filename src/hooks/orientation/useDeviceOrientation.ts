"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { clamp, lerp } from "./mathUtils";
import { calculateCalibratedTilt, type OrientationData } from "./orientationCalibration";

interface DeviceOrientation {
	tiltX: number;       // Calibrated: 0.5 = initial position
	tiltY: number;       // Calibrated: 0.5 = initial position
	rawTiltX: number;    // Absolute: 0.5 = device flat
	rawTiltY: number;    // Absolute: 0.5 = device flat
	hasPermission: boolean;
	requestPermission: () => void;
}

// Smoothing factor for interpolation (lower = smoother but laggier)
const SMOOTHING_FACTOR = 0.12;

// Auto-centering factor: ~0.002 per frame at 60fps = ~10 seconds from edge to center
const AUTO_CENTER_FACTOR = 0.002;

/**
 * Hook for device orientation with calibration and smoothing
 * Refactored to follow SOLID principles by extracting utilities
 */
export function useDeviceOrientation(): DeviceOrientation {
	const [orientation, setOrientation] = useState<OrientationData>({ beta: 0, gamma: 0 });
	const [calibration, setCalibration] = useState<OrientationData | null>(null);
	const [hasPermission, setHasPermission] = useState(false);

	const targetOrientationRef = useRef<OrientationData>({ beta: 0, gamma: 0 });
	const smoothedOrientationRef = useRef<OrientationData>({ beta: 0, gamma: 0 });
	const calibrationRef = useRef<OrientationData | null>(null);
	const rafIdRef = useRef<number | null>(null);
	const permissionRequestedRef = useRef(false);
	const listenersSetUpRef = useRef(false);
	const loopRunningRef = useRef(false);

	// Handle orientation event
	const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
		if (e.beta === null || e.gamma === null) return;

		const clampedBeta = clamp(e.beta, -90, 90);
		const clampedGamma = clamp(e.gamma, -45, 45);

		// Capture initial orientation on first valid reading
		if (calibrationRef.current === null) {
			const initial = { beta: clampedBeta, gamma: clampedGamma };
			calibrationRef.current = initial;
			smoothedOrientationRef.current = initial;
			targetOrientationRef.current = initial;
			setCalibration(initial);
		}

		// Update target values
		targetOrientationRef.current = {
			beta: clampedBeta,
			gamma: clampedGamma,
		};
	}, []);

	// Start the animation loop
	const startLoop = useCallback(() => {
		if (loopRunningRef.current) return;
		loopRunningRef.current = true;

		const tick = () => {
			if (!loopRunningRef.current) return;

			const target = targetOrientationRef.current;
			const current = smoothedOrientationRef.current;
			const cal = calibrationRef.current;

			// Interpolate toward target values
			current.beta = lerp(current.beta, target.beta, SMOOTHING_FACTOR);
			current.gamma = lerp(current.gamma, target.gamma, SMOOTHING_FACTOR);

			// Auto-center calibration
			if (cal !== null) {
				cal.beta = lerp(cal.beta, target.beta, AUTO_CENTER_FACTOR);
				cal.gamma = lerp(cal.gamma, target.gamma, AUTO_CENTER_FACTOR);
				setCalibration({ beta: cal.beta, gamma: cal.gamma });
			}

			setOrientation({ beta: current.beta, gamma: current.gamma });
			rafIdRef.current = requestAnimationFrame(tick);
		};

		rafIdRef.current = requestAnimationFrame(tick);
	}, []);

	const stopLoop = useCallback(() => {
		loopRunningRef.current = false;
		if (rafIdRef.current) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
	}, []);

	const startListening = useCallback(() => {
		if (listenersSetUpRef.current) return;
		listenersSetUpRef.current = true;

		window.addEventListener('deviceorientation', handleOrientation);
		startLoop();
	}, [handleOrientation, startLoop]);

	const requestPermission = useCallback(() => {
		if (permissionRequestedRef.current) return;
		permissionRequestedRef.current = true;

		const DOE = DeviceOrientationEvent as unknown as {
			new(): DeviceOrientationEvent;
			requestPermission?: () => Promise<'granted' | 'denied'>;
		};

		if (typeof DeviceOrientationEvent !== 'undefined' && DOE.requestPermission) {
			// iOS 13+: Must call requestPermission synchronously within user gesture
			// The Promise resolution can be async, but the call must be sync
			DOE.requestPermission()
				.then((permission) => {
					if (permission === 'granted') {
						setHasPermission(true);
						startListening();
					} else {
						// Permission denied - allow retry on next interaction
						permissionRequestedRef.current = false;
					}
				})
				.catch(() => {
					// Error occurred - allow retry on next interaction
					permissionRequestedRef.current = false;
				});
		} else if (typeof DeviceOrientationEvent !== 'undefined') {
			// Non-iOS: No permission needed
			setHasPermission(true);
			startListening();
		}
	}, [startListening]);

	useEffect(() => {
		// Track if we've set up touch listeners
		let touchListenersActive = false;

		const handleFirstTouch = () => {
			requestPermission();
			// Remove listeners after first interaction
			if (touchListenersActive) {
				window.removeEventListener('touchstart', handleFirstTouch);
				window.removeEventListener('click', handleFirstTouch);
				touchListenersActive = false;
			}
		};

		const DOE = DeviceOrientationEvent as unknown as {
			requestPermission?: () => Promise<'granted' | 'denied'>;
		};

		// Check if we need permission (iOS) or can start immediately (Android/desktop)
		if (typeof DeviceOrientationEvent !== 'undefined') {
			if (DOE.requestPermission) {
				// iOS 13+: Need to request permission on user interaction
				window.addEventListener('touchstart', handleFirstTouch, { passive: true });
				window.addEventListener('click', handleFirstTouch, { passive: true });
				touchListenersActive = true;
			} else {
				// Non-iOS: No permission needed, start listening immediately
				queueMicrotask(() => {
					setHasPermission(true);
				});
				startListening();
			}
		}

		return () => {
			window.removeEventListener('deviceorientation', handleOrientation);
			if (touchListenersActive) {
				window.removeEventListener('touchstart', handleFirstTouch);
				window.removeEventListener('click', handleFirstTouch);
			}
			stopLoop();
			listenersSetUpRef.current = false;
		};
	}, [requestPermission, handleOrientation, startListening, stopLoop]);

	const { tiltX, tiltY, rawTiltX, rawTiltY } = calculateCalibratedTilt(orientation, calibration);

	return { tiltX, tiltY, rawTiltX, rawTiltY, hasPermission, requestPermission };
}
