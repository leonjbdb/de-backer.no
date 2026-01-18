"use client";

import { useRef, ReactNode, useState, useEffect, useId } from "react";
import { useDeviceOrientation } from "@/hooks/useDeviceOrientation";
import { useCardTilt } from "./hooks";
import styles from "./GlassCard.module.css";

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
	/** Optional aria-label for the card */
	ariaLabel?: string;
}

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
	ariaLabel,
}: GlassCardProps) {
	const cardRef = useRef<HTMLDivElement>(null);
	// useId generates stable IDs that match between server and client
	const cardId = useId();

	// Device orientation for mobile tilt
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

	// Use card tilt hook for 3D tilt effect
	const { transform, transitionStyle } = useCardTilt({
		cardRef,
		cardId,
		isTouchDevice,
		tiltX,
		tiltY,
		hasPermission,
	});

	const paddingValue = typeof padding === "number" ? `${padding}px` : padding;
	const mobilePaddingValue = mobilePadding
		? (typeof mobilePadding === "number" ? `${mobilePadding}px` : mobilePadding)
		: paddingValue;

	// Track visibility - hide element shortly after opacity reaches 0
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
			className={`${hasMobileOverrides ? styles.mobile : ''} ${className || ''}`.trim() || undefined}
			role="region"
			aria-roledescription="slide"
			aria-label={ariaLabel}
			inert={!isVisible ? true : undefined}
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
			{/* Glass container with 3D tilt */}
			<div
				className="glass-card-container"
				style={{
					position: "relative",
					borderRadius,
					transform,
					transition: transitionStyle,
					transformStyle: "preserve-3d",
				}}
			>
				{/* Glass background with backdrop-filter */}
				<div
					className="glass-card-bg"
					aria-hidden="true"
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
						overflow: "hidden", // Ensures children like the highlight line are clipped by border radius
					}}
				>
					{/* Top edge highlight - now clipped by parent overflow:hidden */}
					<div
						aria-hidden="true"
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							right: 0,
							height: 1,
							background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 20%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.5) 80%, transparent 100%)",
							zIndex: 2,
						}}
					/>
				</div>

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

