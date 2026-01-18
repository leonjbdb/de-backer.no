"use client";

import { useRef, ReactNode, useState, useEffect, useId } from "react";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";

interface GlassCardProps {
	children?: ReactNode;
	className?: string;
	style?: React.CSSProperties;
	borderRadius?: number;
	padding?: string | number;
	opacity?: number;
	/** Entry animation progress (0-1), controls scale and translateY */
	entryProgress?: number;
	/** Exit animation progress (0-1), controls scale and translateY for exit */
	exitProgress?: number;
	/** Mobile horizontal offset in vw units for swipe animation (legacy, used as fallback) */
	mobileOffset?: number;
	/** Mobile scale for carousel effect (0.85-1.0) */
	mobileScale?: number;
	/** Mobile-specific border radius (applied at max-width: 480px) */
	mobileBorderRadius?: number;
	/** Mobile-specific padding (applied at max-width: 480px) */
	mobilePadding?: string | number;
	/** 3D wheel rotation around Y axis (degrees) for mobile carousel */
	wheelRotateY?: number;
	/** 3D wheel horizontal translation (px) for mobile carousel */
	wheelTranslateX?: number;
	/** 3D wheel depth translation (px) for mobile carousel */
	wheelTranslateZ?: number;
}

// Global styles for mobile overrides using CSS custom properties
const globalMobileStyles = `
    @media (max-width: 480px) {
        .glass-card-mobile .glass-card-container,
        .glass-card-mobile .glass-card-bg {
            border-radius: var(--glass-card-mobile-radius) !important;
        }
        .glass-card-mobile .glass-card-content {
            padding: var(--glass-card-mobile-padding) !important;
        }
    }
`;

export function GlassCard({
	children,
	className,
	style,
	borderRadius = 60,
	padding = 40,
	opacity = 1,
	entryProgress = 1,
	exitProgress = 0,
	mobileOffset = 0,
	mobileScale = 1,
	mobileBorderRadius,
	mobilePadding,
	wheelRotateY = 0,
	wheelTranslateX = 0,
	wheelTranslateZ = 0,
}: GlassCardProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	// useId generates stable IDs that match between server and client
	const cardId = useId();
	const [transform, setTransform] = useState("rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");

	// Device orientation for mobile tilt (uses proven hook that works for orbs)
	const { tiltX, tiltY, hasPermission } = useDeviceOrientation();

	// Detect touch device - start false for SSR, then detect on mount
	const [isTouchDevice, setIsTouchDevice] = useState(false);

	useEffect(() => {
		// Check for touch device on mount to avoid SSR/hydration mismatch
		// Use microtask to avoid synchronous setState warning
		queueMicrotask(() => {
			const isTouch =
				window.matchMedia('(hover: none)').matches ||
				window.matchMedia('(pointer: coarse)').matches ||
				'ontouchstart' in window;
			setIsTouchDevice(isTouch);
		});
	}, []);

	// Compute mobile tilt directly from device orientation
	// tiltX/tiltY are 0-1 where 0.5 = neutral (device flat)
	// Use hasPermission OR check if we're getting real orientation data (tilt != 0.5)
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

	// Track hover state with ref to avoid closure issues in event handlers
	const isHoveringRef = useRef(false);
	const [isHovering, setIsHovering] = useState(false);

	// Desktop: Mouse-based tilt on hover
	useEffect(() => {
		// Skip mouse handling on touch devices
		if (isTouchDevice) return;

		const card = cardRef.current;
		if (!card) return;

		let currentRotateX = 0;
		let currentRotateY = 0;
		let targetRotateX = 0;
		let targetRotateY = 0;
		const smoothingFactor = 0.12;
		let rafId: number | null = null;
		let animationRunning = false;

		const applyTransform = () => {
			setTransform(`rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg) scale3d(1.01, 1.01, 1.01)`);
		};

		const calculateTarget = (clientX: number, clientY: number) => {
			const rect = card.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;

			const mouseX = clientX - centerX;
			const mouseY = clientY - centerY;

			const maxTilt = 3;
			targetRotateX = (mouseY / (rect.height / 2)) * -maxTilt;
			targetRotateY = (mouseX / (rect.width / 2)) * maxTilt;
		};

		// Continuous animation loop for smooth tilt
		const animateTilt = () => {
			if (!isHoveringRef.current) {
				animationRunning = false;
				return;
			}

			currentRotateX += (targetRotateX - currentRotateX) * smoothingFactor;
			currentRotateY += (targetRotateY - currentRotateY) * smoothingFactor;

			applyTransform();

			// Keep animating until we're very close to target
			const deltaX = Math.abs(targetRotateX - currentRotateX);
			const deltaY = Math.abs(targetRotateY - currentRotateY);

			if (deltaX > 0.01 || deltaY > 0.01) {
				rafId = requestAnimationFrame(animateTilt);
			} else {
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
			targetRotateX = 0;
			targetRotateY = 0;
			currentRotateX = 0;
			currentRotateY = 0;
			setTransform("rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
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

		// Check if mouse is over this card (handles overlapping cards)
		const isMouseOverThisCard = (clientX: number, clientY: number): boolean => {
			// First check visibility - skip hidden cards
			const computedStyle = window.getComputedStyle(card);
			const cardOpacity = parseFloat(computedStyle.opacity);
			if (cardOpacity < 0.1 || computedStyle.visibility === 'hidden') {
				return false;
			}

			// Check bounds first (quick rejection)
			const rect = card.getBoundingClientRect();
			if (clientX < rect.left || clientX > rect.right ||
				clientY < rect.top || clientY > rect.bottom) {
				return false;
			}

			// Check if an element at this point is inside this card
			const elementAtPoint = document.elementFromPoint(clientX, clientY);
			if (elementAtPoint && isElementInsideCard(elementAtPoint)) {
				return true;
			}

			// Fallback: if element check failed but bounds match, still consider it a hit
			// This handles edge cases during animations or when pointer-events are disabled
			return cardOpacity >= 0.5;
		};

		// Use document-level mousemove for reliable detection across all child elements
		const handleDocumentMouseMove = (e: MouseEvent) => {
			const isOver = isMouseOverThisCard(e.clientX, e.clientY);

			if (isOver && !isHoveringRef.current) {
				// Mouse just entered
				isHoveringRef.current = true;
				setIsHovering(true);
				calculateTarget(e.clientX, e.clientY);
				startAnimation();
			} else if (isOver && isHoveringRef.current) {
				// Mouse moving within card
				calculateTarget(e.clientX, e.clientY);
				startAnimation();
			} else if (!isOver && isHoveringRef.current) {
				// Mouse just left
				isHoveringRef.current = false;
				setIsHovering(false);
				animationRunning = false;
				if (rafId) cancelAnimationFrame(rafId);
				resetTilt();
			}
		};

		// Use document level for reliable event capture across all child elements
		document.addEventListener("mousemove", handleDocumentMouseMove);

		return () => {
			document.removeEventListener("mousemove", handleDocumentMouseMove);
			animationRunning = false;
			if (rafId) cancelAnimationFrame(rafId);
		};
	}, [isTouchDevice, cardId]);

	const paddingValue = typeof padding === "number" ? `${padding}px` : padding;
	const mobilePaddingValue = mobilePadding
		? (typeof mobilePadding === "number" ? `${mobilePadding}px` : mobilePadding)
		: paddingValue;

	// Track visibility - hide element shortly after opacity reaches 0
	// Use ref to track delayed visibility state without triggering re-renders
	const [isVisible, setIsVisible] = useState(opacity > 0.01);
	const visibilityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		// Clear any pending timer
		if (visibilityTimerRef.current) {
			clearTimeout(visibilityTimerRef.current);
			visibilityTimerRef.current = null;
		}

		if (opacity > 0.01) {
			// Immediately show when opacity increases - use timer with 0ms to avoid sync setState
			visibilityTimerRef.current = setTimeout(() => setIsVisible(true), 0);
		} else {
			// Brief delay to ensure smooth transition completion
			visibilityTimerRef.current = setTimeout(() => setIsVisible(false), 100);
		}

		return () => {
			if (visibilityTimerRef.current) {
				clearTimeout(visibilityTimerRef.current);
			}
		};
	}, [opacity]);

	// Custom easing function: cubic ease-out for natural motion
	const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
	const easeInCubic = (t: number) => t * t * t;

	// Entry animation: scale from 0.8 to 1, translateY from 150px to 0, rotateX from -12deg to 0
	// Made more pronounced for visible slide-in effect
	const easedEntry = easeOutCubic(entryProgress);
	const entryScale = 0.8 + (0.2 * easedEntry);
	const entryTranslateY = 150 * (1 - easedEntry);
	const entryRotateX = -12 * (1 - easedEntry);

	// Exit animation: scale from 1 to 0.88, translateY from 0 to -100px, rotateX from 0 to 10deg
	// Made more pronounced to match entry
	const easedExit = easeInCubic(exitProgress);
	const exitScale = 1 - (0.12 * easedExit);
	const exitTranslateY = -100 * easedExit;
	const exitRotateX = 10 * easedExit;

	// Combine entry and exit animations with mobile scale
	const baseScale = entryScale * exitScale;
	const finalScale = baseScale * mobileScale; // Apply mobile carousel scale
	const finalTranslateY = entryTranslateY + exitTranslateY;
	const finalRotateX = entryRotateX + exitRotateX;

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const { transform: _, ...styleWithoutTransform } = style || {};

	// Check if we have 3D wheel transforms (mobile mode)
	const hasWheelTransform = wheelRotateY !== 0 || wheelTranslateX !== 0 || wheelTranslateZ !== 0;

	// Build optimized 3D transform for GPU compositing
	// translate3d triggers GPU layer promotion for smoother animations
	let combinedTransform: string;

	if (hasWheelTransform) {
		// Mobile 3D wheel carousel transform
		// Cards rotate on a horizontal cylinder, creating a Ferris wheel effect
		// Order: centering -> wheel position -> wheel rotation -> scale
		// Shifted up by 40px (-50% -> -50% - 40px) to make room for bottom UI
		combinedTransform = `
            translate3d(calc(-50% + ${wheelTranslateX}px), calc(-50% - 40px), ${wheelTranslateZ}px)
            rotateY(${wheelRotateY}deg)
            scale3d(${mobileScale}, ${mobileScale}, 1)
        `.replace(/\s+/g, ' ').trim();
	} else {
		// Desktop or legacy mobile: vertical scroll animations
		// Order: centering -> mobile offset -> vertical animation -> scale -> rotation
		// On mobile, shift up by 40px to make room for bottom UI
		const verticalShift = isTouchDevice ? "- 40px" : "";
		combinedTransform = `
            translate3d(calc(-50% + ${mobileOffset}vw), calc(-50% + ${finalTranslateY}px ${verticalShift}), 0)
            scale3d(${finalScale}, ${finalScale}, 1)
            rotateX(${finalRotateX}deg)
        `.replace(/\s+/g, ' ').trim();
	}

	// Check if mobile overrides are provided
	const hasMobileOverrides = mobileBorderRadius !== undefined || mobilePadding !== undefined;

	// Build CSS custom properties for mobile overrides
	const cssVars = hasMobileOverrides ? {
		'--glass-card-mobile-radius': `${mobileBorderRadius ?? borderRadius}px`,
		'--glass-card-mobile-padding': mobilePaddingValue,
	} as React.CSSProperties : {};

	return (
		<div
			ref={cardRef}
			data-glass-card-id={cardId}
			className={`${hasMobileOverrides ? 'glass-card-mobile' : ''} ${className || ''}`.trim() || undefined}
			style={{
				position: "relative",
				perspective: "1200px",
				transformStyle: "preserve-3d",
				willChange: "transform, opacity",
				backfaceVisibility: "hidden",
				WebkitBackfaceVisibility: "hidden",
				opacity: opacity,
				visibility: isVisible ? "visible" : "hidden",
				pointerEvents: opacity > 0.01 ? "auto" : "none",
				// No CSS transition - JS handles smooth animation via requestAnimationFrame
				transform: combinedTransform,
				...cssVars,
				...styleWithoutTransform,
			}}
		>
			{hasMobileOverrides && (
				<style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: globalMobileStyles }} />
			)}
			{/* Glass container with 3D tilt */}
			<div
				className="glass-card-container"
				style={{
					position: "relative",
					borderRadius,
					transform: mobileTiltTransform ?? transform,
					transition: isTouchDevice
						? "transform 0.1s ease-out"  // Slightly longer for smooth device orientation
						: isHovering
							? "transform 0.05s ease-out"
							: "transform 0.5s ease-out",
					transformStyle: "preserve-3d",
				}}
			>
				{/* Glass background with backdrop-filter */}
				<div
					className="glass-card-bg"
					style={{
						position: "absolute",
						inset: 0,
						borderRadius,
						background: "rgba(255, 255, 255, 0.08)",
						backdropFilter: "blur(24px) saturate(120%)",
						WebkitBackdropFilter: "blur(24px) saturate(120%)",
						boxShadow: `
                            0 25px 50px rgba(0, 0, 0, 0.25),
                            0 10px 20px rgba(0, 0, 0, 0.15),
                            inset 0 1px 0 rgba(255, 255, 255, 0.2),
                            inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                        `,
						border: "1px solid rgba(255, 255, 255, 0.15)",
						zIndex: 0,
						pointerEvents: "none",
					}}
				/>

				{/* Top edge highlight - positioned inside the border radius */}
				<div
					style={{
						position: "absolute",
						top: 1,
						// Use fixed pixel values that stay inside the border radius on mobile
						// borderRadius of 60px on desktop, 40px on mobile - stay inside the curve
						left: Math.max(borderRadius * 0.4, 24),
						right: Math.max(borderRadius * 0.4, 24),
						height: 1,
						background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 20%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.5) 80%, transparent 100%)",
						borderRadius: borderRadius / 2,
						zIndex: 2,
						pointerEvents: "none",
					}}
				/>

				{/* Content layer */}
				<div
					className="glass-card-content"
					style={{
						position: "relative",
						zIndex: 1,
						padding: paddingValue,
						transform: "translateZ(10px)",
						transformStyle: "preserve-3d",
					}}
				>
					{children}
				</div>
			</div>
		</div>
	);
}

