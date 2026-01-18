"use client";

import { useRef, useId } from "react";
import { useDeviceOrientation, useTouchDevice } from "@/hooks";
import { useCardTilt } from "../../hooks/tilt";
import { useEntryExitAnimation, buildEntryExitTransform, buildWheelTransform, buildMobilePaddingValue, buildGlassCardCssVars } from "../../hooks/animation";
import { useOpacityVisibility } from "../../hooks/visibility";
import { borderRadiusDefaults, paddingDefaults, cardDefaults } from "../../styles";
import type { GlassCardProps } from "../../types";
import { GlassCardBackground } from "./GlassCardBackground";
import { GlassCardContent } from "./GlassCardContent";
import styles from "./GlassCard.module.css";

/**
 * GlassCard - A glassmorphic card component with 3D tilt effects
 * 
 * SOLID Refactoring:
 * - Single Responsibility: Only orchestrates card UI
 * - Open/Closed: Configuration via props and constants
 * - Extracted: Background, content, tilt logic, animations
 */
export function GlassCard({
	children,
	className,
	style,
	borderRadius = borderRadiusDefaults.card,
	padding = paddingDefaults.card,
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
	const cardId = useId();

	// Device detection
	const isTouchDevice = useTouchDevice();
	const { tiltX, tiltY, hasPermission } = useDeviceOrientation();

	// 3D tilt effect
	const { transform, transitionStyle } = useCardTilt({
		cardRef,
		cardId,
		isTouchDevice,
		tiltX,
		tiltY,
		hasPermission,
	});

	// Entry/exit animation
	const animation = useEntryExitAnimation({
		entryProgress,
		exitProgress,
		additionalScale: mobileScale,
	});

	// Visibility management
	const { isVisible } = useOpacityVisibility({ opacity });

	// Padding values
	const paddingValue = typeof padding === "number" ? `${padding}px` : padding;
	const mobilePaddingValue = buildMobilePaddingValue(mobilePadding, padding, paddingDefaults.cardMobile);

	// Destructure style to exclude transform (handled by animation)
	const { transform: _, ...styleWithoutTransform } = style || {};

	// Check if we have 3D wheel transforms (mobile mode)
	const hasWheelTransform = wheelRotateY !== 0 || wheelTranslateX !== 0 || wheelTranslateZ !== 0;

	// Build optimized 3D transform for GPU compositing
	let combinedTransform: string;

	if (hasWheelTransform) {
		// Mobile 3D wheel carousel transform
		combinedTransform = buildWheelTransform({
			translateX: wheelTranslateX,
			translateY: -cardDefaults.mobileVerticalShift,
			translateZ: wheelTranslateZ,
			rotateY: wheelRotateY,
			scale: mobileScale,
		});
	} else {
		// Desktop or legacy mobile: vertical scroll animations
		const verticalShift = isTouchDevice ? `- ${cardDefaults.mobileVerticalShift}px` : "";
		combinedTransform = buildEntryExitTransform(animation, {
			horizontalOffset: mobileOffset,
			verticalShift,
			centered: true,
		});
	}

	// Check if mobile overrides are provided
	const hasMobileOverrides = mobileBorderRadius !== undefined || mobilePadding !== undefined;

	// Build CSS custom properties for mobile overrides
	const cssVars = hasMobileOverrides
		? buildGlassCardCssVars({
			mobileBorderRadius,
			borderRadius,
			mobilePadding: mobilePaddingValue,
		})
		: {};

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
				transformStyle: "preserve-3d",
				willChange: "transform, opacity",
				backfaceVisibility: "hidden",
				WebkitBackfaceVisibility: "hidden",
				opacity: opacity,
				visibility: isVisible ? "visible" : "hidden",
				pointerEvents: opacity > 0.01 ? "auto" : "none",
				transform: combinedTransform,
				...cssVars,
				...styleWithoutTransform,
			}}
		>
			{/* Perspective container - separate from transformed element for proper 3D child rendering */}
			<div
				style={{
					perspective: cardDefaults.perspective,
					transformStyle: "preserve-3d",
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
					<GlassCardBackground borderRadius={borderRadius} />
					<GlassCardContent padding={paddingValue}>
						{children}
					</GlassCardContent>
				</div>
			</div>
		</div>
	);
}
