"use client";

import { RefObject, useState, useRef, useCallback, useEffect } from "react";

export interface UseDragInteractionOptions {
	/** Reference to the track element that defines the draggable area */
	trackRef: RefObject<HTMLElement | null>;
	/** Width of the draggable handle in pixels */
	handleWidth?: number;
	/** Padding inside the track in pixels */
	trackPadding?: number;
	/** Called when drag starts */
	onDragStart?: () => void;
	/** Called during drag with normalized position (0-1) */
	onDragMove?: (position: number) => void;
	/** Called when drag ends with final position and velocity */
	onDragEnd?: (position: number, velocity: number) => void;
}

export interface UseDragInteractionResult {
	/** Whether currently dragging */
	isDragging: boolean;
	/** Ref to attach to the draggable handle element for touch events */
	handleRef: RefObject<HTMLElement | null>;
	/** Props to spread onto the draggable handle element */
	handleProps: {
		onMouseDown: (e: React.MouseEvent) => void;
	};
}

/**
 * Hook for mouse and touch drag interactions
 * Extracted from GlassSlider to follow Single Responsibility Principle
 * 
 * Handles:
 * - Mouse drag (mousedown, mousemove, mouseup)
 * - Touch drag (touchstart, touchmove, touchend)
 * - Position calculation relative to track
 * - Velocity tracking for momentum
 */
export function useDragInteraction(options: UseDragInteractionOptions): UseDragInteractionResult {
	const {
		trackRef,
		handleWidth = 64,
		trackPadding = 6,
		onDragStart,
		onDragMove,
		onDragEnd,
	} = options;

	const [isDragging, setIsDragging] = useState(false);
	const handleRef = useRef<HTMLElement | null>(null);

	// Track position and velocity for momentum calculation
	const lastPositionRef = useRef(0);
	const velocityRef = useRef(0);
	const dragStartRef = useRef<{ x: number } | null>(null);
	// Track last update time for accurate velocity calculation
	const lastTimeRef = useRef(0);
	// Use exponential moving average for smoother velocity
	const smoothedVelocityRef = useRef(0);

	/**
	 * Calculate normalized position (0-1) from pointer X coordinate
	 */
	const calculatePosition = useCallback((clientX: number): number => {
		if (!trackRef.current) return 0;

		const rect = trackRef.current.getBoundingClientRect();

		// Available track width for the handle to move
		const trackWidth = rect.width - handleWidth - (trackPadding * 2);

		// Calculate relative position from the left edge of the track
		const trackLeft = rect.left + trackPadding;
		const relativeX = clientX - trackLeft - (handleWidth / 2);

		return Math.max(0, Math.min(1, relativeX / trackWidth));
	}, [trackRef, handleWidth, trackPadding]);

	/**
	 * Handle drag start
	 */
	const handleDragStart = useCallback((clientX: number) => {
		setIsDragging(true);
		dragStartRef.current = { x: clientX };
		lastPositionRef.current = calculatePosition(clientX);
		// Reset all velocity tracking on new drag
		velocityRef.current = 0;
		smoothedVelocityRef.current = 0;
		lastTimeRef.current = performance.now();
		onDragStart?.();
	}, [calculatePosition, onDragStart]);

	/**
	 * Handle drag move
	 */
	const handleDragMove = useCallback((clientX: number) => {
		if (!isDragging || !dragStartRef.current) return;

		const newPosition = calculatePosition(clientX);
		const now = performance.now();
		const deltaTime = now - lastTimeRef.current;

		// Only calculate velocity if we have a reasonable time delta
		if (deltaTime > 0 && deltaTime < 100) {
			const deltaPosition = newPosition - lastPositionRef.current;
			// Calculate instantaneous velocity (position units per second)
			const instantVelocity = (deltaPosition / deltaTime) * 1000;

			// Use exponential moving average to smooth velocity
			// This prevents erratic velocity from rapid small movements
			const smoothingFactor = 0.3;
			smoothedVelocityRef.current = smoothingFactor * instantVelocity + (1 - smoothingFactor) * smoothedVelocityRef.current;
			velocityRef.current = smoothedVelocityRef.current;
		}

		lastPositionRef.current = newPosition;
		lastTimeRef.current = now;

		onDragMove?.(newPosition);
	}, [isDragging, calculatePosition, onDragMove]);

	/**
	 * Handle drag end
	 */
	const handleDragEnd = useCallback(() => {
		if (!isDragging) return;

		setIsDragging(false);
		dragStartRef.current = null;

		// Clamp final velocity to reasonable bounds
		const maxVelocity = 5;
		const clampedVelocity = Math.max(-maxVelocity, Math.min(maxVelocity, velocityRef.current));

		onDragEnd?.(lastPositionRef.current, clampedVelocity);

		// Reset velocity refs after drag ends
		velocityRef.current = 0;
		smoothedVelocityRef.current = 0;
	}, [isDragging, onDragEnd]);

	// Mouse event handlers (document-level for reliable tracking)
	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e: MouseEvent) => {
			e.preventDefault();
			handleDragMove(e.clientX);
		};

		const handleMouseUp = () => {
			handleDragEnd();
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging, handleDragMove, handleDragEnd]);

	// Touch event handlers (element-level with passive: false to allow preventDefault)
	useEffect(() => {
		const element = handleRef.current;
		if (!element) return;

		const handleTouchStart = (e: TouchEvent) => {
			e.stopPropagation();
			handleDragStart(e.touches[0].clientX);
		};

		const handleTouchMove = (e: TouchEvent) => {
			e.preventDefault();
			e.stopPropagation();
			handleDragMove(e.touches[0].clientX);
		};

		const handleTouchEnd = (e: TouchEvent) => {
			e.stopPropagation();
			handleDragEnd();
		};

		// Attach with passive: false to allow preventDefault
		element.addEventListener("touchstart", handleTouchStart, { passive: true });
		element.addEventListener("touchmove", handleTouchMove, { passive: false });
		element.addEventListener("touchend", handleTouchEnd, { passive: true });

		return () => {
			element.removeEventListener("touchstart", handleTouchStart);
			element.removeEventListener("touchmove", handleTouchMove);
			element.removeEventListener("touchend", handleTouchEnd);
		};
	}, [handleDragStart, handleDragMove, handleDragEnd]);

	// Handle props for the draggable element
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		handleDragStart(e.clientX);
	}, [handleDragStart]);

	return {
		isDragging,
		handleRef,
		handleProps: {
			onMouseDown: handleMouseDown,
		},
	};
}
