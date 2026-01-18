"use client";

import { RefObject, useState, useRef, useEffect } from "react";

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
 * Extracted from GlassCard to follow Single Responsibility Principle
 */
export function useCardTilt(options: UseCardTiltOptions): UseCardTiltResult {
	const { cardRef, cardId, isTouchDevice, tiltX, tiltY, hasPermission } = options;

	const [transform, setTransform] = useState("rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
	const [isHovering, setIsHovering] = useState(false);
	const isHoveringRef = useRef(false);

	// Mobile: Device orientation tilt
	const hasOrientationData = hasPermission || (tiltX !== 0.5 || tiltY !== 0.5);
	let mobileTiltTransform: string | null = null;

	if (isTouchDevice && hasOrientationData) {
		const maxTilt = 18; // 3x more extreme than before (was 6)
		// Center the values: 0.5 becomes 0, range becomes -0.5 to 0.5
		// Then scale to max rotation (0.5 * 2 * maxTilt = maxTilt at full tilt)
		const rotateY = -(tiltX - 0.5) * 2 * maxTilt;  // left-right (inverted so card faces user)
		const rotateX = (tiltY - 0.5) * 2 * maxTilt;   // front-back (positive so card faces user)

		mobileTiltTransform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1, 1, 1)`;
	}

	// Desktop: Mouse-based tilt on hover
	useEffect(() => {
		// Skip mouse handling on touch devices
		if (isTouchDevice) return;

		const card = cardRef.current;
		if (!card) return;

		let currentRotateX = 0;
		let currentRotateY = 0;
		let currentScale = 1;
		let targetRotateX = 0;
		let targetRotateY = 0;
		let targetScale = 1;
		const smoothingFactor = 0.08; // Slower smoothing for smoother entry
		let rafId: number | null = null;
		let animationRunning = false;

		const applyTransform = () => {
			setTransform(`rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg) scale3d(${currentScale}, ${currentScale}, ${currentScale})`);
		};

		const calculateTarget = (clientX: number, clientY: number, influence: number = 1) => {
			const rect = card.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const mouseX = clientX - centerX;
			const mouseY = clientY - centerY;

			const maxTilt = 8;
			// Scale tilt by influence - further away = less tilt
			targetRotateX = (mouseY / (rect.height / 2)) * -maxTilt * influence;
			targetRotateY = (mouseX / (rect.width / 2)) * maxTilt * influence;
			// Scale also responds to influence - slightly more pronounced
			targetScale = 1 + (0.02 * influence);
		};

		// Continuous animation loop for smooth tilt
		const animateTilt = () => {
			// Smoothly interpolate all values
			currentRotateX += (targetRotateX - currentRotateX) * smoothingFactor;
			currentRotateY += (targetRotateY - currentRotateY) * smoothingFactor;
			currentScale += (targetScale - currentScale) * smoothingFactor;

			applyTransform();

			// Keep animating until we're very close to all targets
			const deltaX = Math.abs(targetRotateX - currentRotateX);
			const deltaY = Math.abs(targetRotateY - currentRotateY);
			const deltaScale = Math.abs(targetScale - currentScale);

			if (deltaX > 0.001 || deltaY > 0.001 || deltaScale > 0.0001) {
				rafId = requestAnimationFrame(animateTilt);
			} else {
				// Snap to final values
				currentRotateX = targetRotateX;
				currentRotateY = targetRotateY;
				currentScale = targetScale;
				applyTransform();
				animationRunning = false;
			}
		};

		const startAnimation = () => {
			if (!animationRunning) {
				animationRunning = true;
				rafId = requestAnimationFrame(animateTilt);
			}
		};

		const resetTilt = () => {
			// Set targets to resting state, animation will smoothly transition
			targetRotateX = 0;
			targetRotateY = 0;
			targetScale = 1;
			// Keep animation running to smoothly return to rest
			startAnimation();
		};

		// Check if an element is inside this card using data attribute
		const isElementInsideCard = (element: Element | null): boolean => {
			let current: Element | null = element;
			while (current) {
				if (current.getAttribute('data-glass-card-id') === cardId) {
					return true;
				}
				current = current.parentElement;
			}
			return false;
		};

		// Proximity zone extends this many pixels beyond the card bounds
		const proximityZone = 150;

		// Check mouse proximity to card and return influence (0 = far away, 1 = directly over)
		const getMouseInfluence = (clientX: number, clientY: number): { influence: number; isDirectlyOver: boolean } => {
			// First check visibility - skip hidden cards
			const computedStyle = window.getComputedStyle(card);
			const cardOpacity = parseFloat(computedStyle.opacity);
			if (cardOpacity < 0.1 || computedStyle.visibility === 'hidden') {
				return { influence: 0, isDirectlyOver: false };
			}

			const rect = card.getBoundingClientRect();

			// Check if directly over the card
			const isDirectlyOver = clientX >= rect.left && clientX <= rect.right &&
				clientY >= rect.top && clientY <= rect.bottom;

			if (isDirectlyOver) {
				// Verify with element check for overlapping cards
				const elementAtPoint = document.elementFromPoint(clientX, clientY);
				if (elementAtPoint && isElementInsideCard(elementAtPoint)) {
					return { influence: 1, isDirectlyOver: true };
				}
				// Fallback for edge cases
				if (cardOpacity >= 0.5) {
					return { influence: 1, isDirectlyOver: true };
				}
			}

			// Calculate distance to card edge
			const distanceX = clientX < rect.left ? rect.left - clientX :
				clientX > rect.right ? clientX - rect.right : 0;
			const distanceY = clientY < rect.top ? rect.top - clientY :
				clientY > rect.bottom ? clientY - rect.bottom : 0;
			const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

			// If within proximity zone, return scaled influence (1 at edge, 0 at zone boundary)
			if (distance < proximityZone) {
				const influence = 1 - (distance / proximityZone);
				// Apply easing for more natural falloff
				return { influence: influence * influence, isDirectlyOver: false };
			}

			return { influence: 0, isDirectlyOver: false };
		};

		// Use document-level mousemove for reliable detection across all child elements
		const handleDocumentMouseMove = (e: MouseEvent) => {
			const { influence, isDirectlyOver } = getMouseInfluence(e.clientX, e.clientY);

			if (influence > 0) {
				// Mouse is within proximity zone or directly over
				if (isDirectlyOver && !isHoveringRef.current) {
					isHoveringRef.current = true;
					setIsHovering(true);
				} else if (!isDirectlyOver && isHoveringRef.current) {
					// Only stop "hovering" if we don't have focus
					const hasFocus = card.contains(document.activeElement);
					if (!hasFocus) {
						isHoveringRef.current = false;
						setIsHovering(false);
					}
				}

				// Calculate tilt based on mouse position, scaled by influence
				calculateTarget(e.clientX, e.clientY, influence);
				startAnimation();
			} else if (isHoveringRef.current || targetScale !== 1 || targetRotateX !== 0 || targetRotateY !== 0) {
				// Mouse left the proximity zone - check if we still have focus
				const hasFocus = card.contains(document.activeElement);
				if (!hasFocus) {
					isHoveringRef.current = false;
					setIsHovering(false);
					resetTilt();
				}
			}
		};

		const handleFocusIn = (e: FocusEvent) => {
			const target = e.target as HTMLElement;
			if (isElementInsideCard(target)) {
				isHoveringRef.current = true;
				setIsHovering(true);

				// Calculate target based on the center of the focused element
				const rect = target.getBoundingClientRect();
				const centerX = rect.left + rect.width / 2;
				const centerY = rect.top + rect.height / 2;

				calculateTarget(centerX, centerY, 1);
				startAnimation();
			}
		};

		const handleFocusOut = (e: FocusEvent) => {
			const relatedTarget = e.relatedTarget as HTMLElement;
			// If we're moving focus outside the card completely
			if (!isElementInsideCard(relatedTarget)) {
				isHoveringRef.current = false;
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
			animationRunning = false;
			if (rafId) cancelAnimationFrame(rafId);
		};
	}, [isTouchDevice, cardId, cardRef]);

	// Determine transition timing
	const transitionStyle = isTouchDevice
		? "transform 0.1s ease-out"  // Slightly longer for smooth device orientation
		: isHovering
			? "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)"
			: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)";

	return {
		transform: mobileTiltTransform ?? transform,
		isHovering,
		transitionStyle,
	};
}
