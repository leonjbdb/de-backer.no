"use client";

import { RefObject, useState, useRef, useCallback, useEffect } from "react";

export interface TiltTarget {
	rotateX: number;
	rotateY: number;
	scale: number;
}

export interface UseTiltAnimationOptions {
	/** Reference to the element to apply tilt to */
	elementRef: RefObject<HTMLElement | null>;
	/** Maximum tilt angle in degrees (default: 8) */
	maxTilt?: number;
	/** Maximum scale increase on hover (default: 0.02) */
	maxScaleIncrease?: number;
	/** Smoothing factor for interpolation (0-1, lower = smoother, default: 0.08) */
	smoothingFactor?: number;
	/** Whether tilt animation is enabled */
	enabled?: boolean;
}

export interface UseTiltAnimationResult {
	/** CSS transform string for current tilt state */
	transform: string;
	/** Set target tilt based on mouse position relative to element center */
	setTargetFromMouse: (clientX: number, clientY: number, influence?: number) => void;
	/** Reset tilt to neutral position */
	resetTilt: () => void;
	/** Start the animation loop */
	startAnimation: () => void;
}

/**
 * Hook for smooth tilt animation with mouse tracking
 * Follows Single Responsibility Principle - only handles tilt animation
 */
export function useTiltAnimation(options: UseTiltAnimationOptions): UseTiltAnimationResult {
	const {
		elementRef,
		maxTilt = 8,
		maxScaleIncrease = 0.02,
		smoothingFactor = 0.08,
		enabled = true,
	} = options;

	const [transform, setTransform] = useState("rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");

	// Animation state refs
	const currentRef = useRef<TiltTarget>({ rotateX: 0, rotateY: 0, scale: 1 });
	const targetRef = useRef<TiltTarget>({ rotateX: 0, rotateY: 0, scale: 1 });
	const rafIdRef = useRef<number | null>(null);
	const animationRunningRef = useRef(false);

	/**
	 * Apply current transform values to state
	 */
	const applyTransform = useCallback(() => {
		const { rotateX, rotateY, scale } = currentRef.current;
		setTransform(`rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(${scale}, ${scale}, ${scale})`);
	}, []);

	/**
	 * Animation loop for smooth interpolation
	 * Using a ref to store the function to avoid the "accessed before declared" issue
	 */
	const animateRef = useRef<(() => void) | undefined>(undefined);

	// Set up the animate function
	useEffect(() => {
		animateRef.current = () => {
			const current = currentRef.current;
			const target = targetRef.current;

			// Smoothly interpolate all values
			current.rotateX += (target.rotateX - current.rotateX) * smoothingFactor;
			current.rotateY += (target.rotateY - current.rotateY) * smoothingFactor;
			current.scale += (target.scale - current.scale) * smoothingFactor;

			applyTransform();

			// Keep animating until very close to all targets
			const deltaX = Math.abs(target.rotateX - current.rotateX);
			const deltaY = Math.abs(target.rotateY - current.rotateY);
			const deltaScale = Math.abs(target.scale - current.scale);

			if (deltaX > 0.001 || deltaY > 0.001 || deltaScale > 0.0001) {
				rafIdRef.current = requestAnimationFrame(() => animateRef.current?.());
			} else {
				// Snap to final values
				current.rotateX = target.rotateX;
				current.rotateY = target.rotateY;
				current.scale = target.scale;
				applyTransform();
				animationRunningRef.current = false;
			}
		};
	}, [smoothingFactor, applyTransform]);

	/**
	 * Start the animation loop if not already running
	 */
	const startAnimation = useCallback(() => {
		if (!animationRunningRef.current && enabled) {
			animationRunningRef.current = true;
			rafIdRef.current = requestAnimationFrame(() => animateRef.current?.());
		}
	}, [enabled]);

	/**
	 * Set target tilt based on mouse position
	 */
	const setTargetFromMouse = useCallback((clientX: number, clientY: number, influence: number = 1) => {
		const element = elementRef.current;
		if (!element || !enabled) return;

		const rect = element.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		const mouseX = clientX - centerX;
		const mouseY = clientY - centerY;

		// Scale tilt by influence - further away = less tilt
		targetRef.current.rotateX = (mouseY / (rect.height / 2)) * -maxTilt * influence;
		targetRef.current.rotateY = (mouseX / (rect.width / 2)) * maxTilt * influence;
		// Scale also responds to influence
		targetRef.current.scale = 1 + (maxScaleIncrease * influence);
	}, [elementRef, enabled, maxTilt, maxScaleIncrease]);

	/**
	 * Reset tilt to neutral position
	 */
	const resetTilt = useCallback(() => {
		targetRef.current = { rotateX: 0, rotateY: 0, scale: 1 };
		startAnimation();
	}, [startAnimation]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			animationRunningRef.current = false;
			if (rafIdRef.current) {
				cancelAnimationFrame(rafIdRef.current);
			}
		};
	}, []);

	return {
		transform,
		setTargetFromMouse,
		resetTilt,
		startAnimation,
	};
}
