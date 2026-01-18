import { useEffect, useState, useRef, useCallback } from "react";

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between current and target
 */
function lerp(current: number, target: number, factor: number): number {
	return current + (target - current) * factor;
}

interface DeviceOrientation {
	tiltX: number;       // Calibrated: 0.5 = initial position
	tiltY: number;       // Calibrated: 0.5 = initial position
	rawTiltX: number;    // Absolute: 0.5 = device flat
	rawTiltY: number;    // Absolute: 0.5 = device flat
	hasPermission: boolean;
	requestPermission: () => void; // Expose for manual permission request
}

// Smoothing factor for interpolation (lower = smoother but laggier)
const SMOOTHING_FACTOR = 0.12;

// Auto-centering factor: ~0.002 per frame at 60fps = ~10 seconds from edge to center
// Math: (1 - 0.002)^600 ≈ 0.3, so after 10s (600 frames) we're at ~30% of original offset
const AUTO_CENTER_FACTOR = 0.002;

export function useDeviceOrientation(): DeviceOrientation {
	// Current smoothed orientation (for rendering)
	const [orientation, setOrientation] = useState({ beta: 0, gamma: 0 });

	// Calibration point (drifts slowly toward current orientation)
	const [calibration, setCalibration] = useState<{ beta: number; gamma: number } | null>(null);

	const [hasPermission, setHasPermission] = useState(false);

	// Target values from device orientation events (raw, unsmoothed)
	const targetOrientationRef = useRef({ beta: 0, gamma: 0 });

	// Smoothed values for rendering (interpolated via RAF)
	const smoothedOrientationRef = useRef({ beta: 0, gamma: 0 });

	// Calibration point ref for RAF loop updates
	const calibrationRef = useRef<{ beta: number; gamma: number } | null>(null);

	// RAF loop ID for cleanup
	const rafIdRef = useRef<number | null>(null);

	// Track if permission has been requested (to avoid duplicate requests)
	const permissionRequestedRef = useRef(false);

	// Track if listeners are set up
	const listenersSetUpRef = useRef(false);

	// Track if loop is running
	const loopRunningRef = useRef(false);

	// Handle orientation event
	const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
		if (e.beta === null || e.gamma === null) return;

		const clampedBeta = clamp(e.beta, -90, 90);
		const clampedGamma = clamp(e.gamma, -45, 45);

		// Capture initial orientation on first valid reading
		if (calibrationRef.current === null) {
			calibrationRef.current = {
				beta: clampedBeta,
				gamma: clampedGamma,
			};

			// Initialize smoothed values to initial position
			smoothedOrientationRef.current = {
				beta: clampedBeta,
				gamma: clampedGamma,
			};
			targetOrientationRef.current = {
				beta: clampedBeta,
				gamma: clampedGamma,
			};

			// Also set state for render access
			setCalibration({ beta: clampedBeta, gamma: clampedGamma });
		}

		// Update target values (these will be smoothly interpolated to)
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

			// Interpolate toward target values (fast - responsive to phone movement)
			current.beta = lerp(current.beta, target.beta, SMOOTHING_FACTOR);
			current.gamma = lerp(current.gamma, target.gamma, SMOOTHING_FACTOR);

			// Auto-center: slowly drift the calibration point toward current orientation
			// This makes the "neutral" position slowly match how the user is holding the phone
			if (cal !== null) {
				cal.beta = lerp(cal.beta, target.beta, AUTO_CENTER_FACTOR);
				cal.gamma = lerp(cal.gamma, target.gamma, AUTO_CENTER_FACTOR);

				// Sync calibration to state for render access
				setCalibration({ beta: cal.beta, gamma: cal.gamma });
			}

			// Update state with smoothed values
			setOrientation({ beta: current.beta, gamma: current.gamma });

			// Continue loop
			rafIdRef.current = requestAnimationFrame(tick);
		};

		rafIdRef.current = requestAnimationFrame(tick);
	}, []);

	// Stop the animation loop
	const stopLoop = useCallback(() => {
		loopRunningRef.current = false;
		if (rafIdRef.current) {
			cancelAnimationFrame(rafIdRef.current);
			rafIdRef.current = null;
		}
	}, []);

	// Start the orientation listeners and RAF loop
	const startListening = useCallback(() => {
		if (listenersSetUpRef.current) return;
		listenersSetUpRef.current = true;

		window.addEventListener('deviceorientation', handleOrientation);
		startLoop();
	}, [handleOrientation, startLoop]);

	// Request permission - must be called from a user gesture on iOS
	const requestPermission = useCallback(async () => {
		if (permissionRequestedRef.current) return;
		permissionRequestedRef.current = true;

		// iOS 13+ requires permission for DeviceOrientationEvent
		const DOE = DeviceOrientationEvent as unknown as {
			new(): DeviceOrientationEvent;
			requestPermission?: () => Promise<'granted' | 'denied'>;
		};

		if (typeof DeviceOrientationEvent !== 'undefined' && DOE.requestPermission) {
			// iOS - must request permission from user gesture
			try {
				const permission = await DOE.requestPermission();
				if (permission === 'granted') {
					setHasPermission(true);
					startListening();
				} else {
					// Permission denied, allow retry
					permissionRequestedRef.current = false;
				}
			} catch {
				// Error requesting permission, allow retry
				permissionRequestedRef.current = false;
			}
		} else if (typeof DeviceOrientationEvent !== 'undefined') {
			// Non-iOS - no permission needed
			setHasPermission(true);
			startListening();
		}
	}, [startListening]);

	useEffect(() => {
		// Set up touch listener for iOS permission request
		// iOS requires the permission request to happen inside a user gesture handler
		const handleFirstTouch = () => {
			requestPermission();
			window.removeEventListener('touchstart', handleFirstTouch);
			window.removeEventListener('click', handleFirstTouch);
		};

		window.addEventListener('touchstart', handleFirstTouch, { passive: true });
		window.addEventListener('click', handleFirstTouch, { passive: true });

		// On non-iOS devices, try to start immediately
		// This will fail silently on iOS but work on Android/desktop
		const DOE = DeviceOrientationEvent as unknown as {
			requestPermission?: () => Promise<'granted' | 'denied'>;
		};

		if (typeof DeviceOrientationEvent !== 'undefined' && !DOE.requestPermission) {
			// Non-iOS device - can start without permission
			// Use microtask to avoid synchronous setState warning
			queueMicrotask(() => {
				setHasPermission(true);
			});
			startListening();
		}

		return () => {
			window.removeEventListener('deviceorientation', handleOrientation);
			window.removeEventListener('touchstart', handleFirstTouch);
			window.removeEventListener('click', handleFirstTouch);
			stopLoop();
			listenersSetUpRef.current = false;
		};
	}, [requestPermission, handleOrientation, startListening, stopLoop]);

	// Calculate raw tilt values (absolute, 0.5 = device flat)
	const rawTiltX = (orientation.gamma + 45) / 90;
	const rawTiltY = (orientation.beta + 90) / 180;

	// Calculate calibrated tilt values (relative to calibration point)
	let tiltX = rawTiltX;
	let tiltY = rawTiltY;

	if (calibration !== null) {
		// Calculate offset from calibration position
		const calX = (calibration.gamma + 45) / 90;
		const calY = (calibration.beta + 90) / 180;

		// Center around calibration position (calibration = 0.5)
		const offsetX = rawTiltX - calX;
		const offsetY = rawTiltY - calY;

		// Circular clamping: limit magnitude to max radius
		const MAX_RADIUS = 0.5; // Max distance from center (allows full 0-1 range)
		const magnitude = Math.sqrt(offsetX * offsetX + offsetY * offsetY);

		if (magnitude > MAX_RADIUS) {
			// Normalize to circle edge - smoothly slide along the boundary
			const scale = MAX_RADIUS / magnitude;
			tiltX = 0.5 + offsetX * scale;
			tiltY = 0.5 + offsetY * scale;
		} else {
			// Within circle - use values as-is
			tiltX = 0.5 + offsetX;
			tiltY = 0.5 + offsetY;
		}
	}

	return { tiltX, tiltY, rawTiltX, rawTiltY, hasPermission, requestPermission };
}
