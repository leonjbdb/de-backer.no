"use client";

import { RefObject, useState, useEffect } from "react";
import { useMouseProximity } from "../interaction/useMouseProximity";
import { useTiltAnimation } from "../animation/useTiltAnimation";
import { calculateOrientationTilt } from "./orientationTilt";
import { animationTimings, tiltDefaults } from "../../styles";

export interface UseCardTiltOptions {
	/** Reference to the card element */
	cardRef: RefObject<HTMLElement | null>;
	/** Unique card ID for element detection */
	cardId: string;
	/** Whether device is touch-based */
	isTouchDevice: boolean;
	/** Device tilt X (0-1, 0.5 = neutral) from useDeviceOrientation */
	tiltX: number;
	/** Device tilt Y (0-1, 0.5 = neutral) from useDeviceOrientation */
	tiltY: number;
	/** Whether device orientation permission is granted */
	hasPermission: boolean;
}

export interface UseCardTiltResult {
	/** CSS transform string for tilt effect */
	transform: string;
	/** Whether card is being hovered */
	isHovering: boolean;
	/** Transition timing for smooth animations */
	transitionStyle: string;
}

/**
 * Hook for card 3D tilt effect based on mouse position or device orientation
 * 
 * Composes:
 * - useMouseProximity: For detecting mouse distance and overlap
 * - useTiltAnimation: For smooth interpolated tilt animation
 * 
 * Follows Single Responsibility Principle by delegating to focused sub-hooks
 */
export function useCardTilt(options: UseCardTiltOptions): UseCardTiltResult {
	const { cardRef, cardId, isTouchDevice, tiltX, tiltY, hasPermission } = options;

	const [isHovering, setIsHovering] = useState(false);

	// Use proximity detection for mouse influence
	const { getMouseInfluence, isElementInside } = useMouseProximity({
		elementRef: cardRef,
		elementId: cardId,
	});

	// Use tilt animation for smooth transforms
	const { transform, setTargetFromMouse, resetTilt, startAnimation } = useTiltAnimation({
		elementRef: cardRef,
		enabled: !isTouchDevice,
	});

	// Mobile: Device orientation tilt
	const hasOrientationData = hasPermission || (tiltX !== 0.5 || tiltY !== 0.5);
	let mobileTiltTransform: string | null = null;

	if (isTouchDevice && hasOrientationData) {
		mobileTiltTransform = calculateOrientationTilt(tiltX, tiltY, tiltDefaults.mobileTiltMaxAngle);
	}

	// Desktop: Mouse-based tilt on hover
	useEffect(() => {
		// Skip mouse handling on touch devices
		if (isTouchDevice) return;

		const card = cardRef.current;
		if (!card) return;

		const handleDocumentMouseMove = (e: MouseEvent) => {
			const { influence, isDirectlyOver } = getMouseInfluence(e.clientX, e.clientY);

			if (influence > 0) {
				// Mouse is within proximity zone or directly over
				if (isDirectlyOver && !isHovering) {
					setIsHovering(true);
				} else if (!isDirectlyOver && isHovering) {
					// Only stop "hovering" if we don't have focus
					const hasFocus = card.contains(document.activeElement);
					if (!hasFocus) {
						setIsHovering(false);
					}
				}

				// Calculate tilt based on mouse position, scaled by influence
				setTargetFromMouse(e.clientX, e.clientY, influence);
				startAnimation();
			} else if (isHovering) {
				// Mouse left the proximity zone - check if we still have focus
				const hasFocus = card.contains(document.activeElement);
				if (!hasFocus) {
					setIsHovering(false);
					resetTilt();
				}
			}
		};

		const handleFocusIn = (e: FocusEvent) => {
			const target = e.target as HTMLElement;
			if (isElementInside(target)) {
				setIsHovering(true);

				// Calculate target based on the center of the focused element
				const rect = target.getBoundingClientRect();
				const centerX = rect.left + rect.width / 2;
				const centerY = rect.top + rect.height / 2;

				setTargetFromMouse(centerX, centerY, 1);
				startAnimation();
			}
		};

		const handleFocusOut = (e: FocusEvent) => {
			const relatedTarget = e.relatedTarget as HTMLElement;
			// If we're moving focus outside the card completely
			if (!isElementInside(relatedTarget)) {
				setIsHovering(false);
				resetTilt();
			}
		};

		// Use document level for reliable event capture across all child elements
		document.addEventListener("mousemove", handleDocumentMouseMove);
		document.addEventListener("focusin", handleFocusIn);
		document.addEventListener("focusout", handleFocusOut);

		return () => {
			document.removeEventListener("mousemove", handleDocumentMouseMove);
			document.removeEventListener("focusin", handleFocusIn);
			document.removeEventListener("focusout", handleFocusOut);
		};
	}, [isTouchDevice, cardRef, isHovering, getMouseInfluence, isElementInside, setTargetFromMouse, resetTilt, startAnimation]);

	// Determine transition timing
	const transitionStyle = isTouchDevice
		? `transform 0.1s ${animationTimings.easing.easeOut}`
		: isHovering
			? `transform ${animationTimings.duration.fast} ${animationTimings.easing.smooth}`
			: `transform ${animationTimings.duration.slow} ${animationTimings.easing.smooth}`;

	return {
		transform: mobileTiltTransform ?? transform,
		isHovering,
		transitionStyle,
	};
}
