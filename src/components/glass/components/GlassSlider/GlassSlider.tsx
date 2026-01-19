"use client";

import { useRef, useEffect, useState } from "react";
import { useMobileViewport } from "@/hooks/device";
import { useInteraction3D, useDragInteraction } from "../../hooks/interaction";
import { useSpringAnimation } from "../../hooks/animation";
import { useDelayedVisibility, computeSliderVisibility } from "../../hooks/visibility";
import { useDebugMode } from "../../hooks/debug";
import { DEFAULT_SLIDER_CONFIG } from "../../types";
import { sliderPositionDefaults, visibilityDefaults, animationTimings } from "../../styles";
import type { SliderConfig } from "../../types";
import { SliderTrack } from "./SliderTrack";
import { SliderHandle } from "./SliderHandle";

interface GlassSliderProps {
	visible: boolean;
	opacity?: number;
	onSlideComplete?: (side: 'left' | 'right') => void;
	config?: Partial<SliderConfig>;
}

/**
 * GlassSlider - A glassmorphic slider for toggling debug mode
 * 
 * SOLID Refactoring:
 * - Single Responsibility: Only orchestrates slider UI
 * - Open/Closed: Configuration via props
 * - Dependency Inversion: Uses abstractions (hooks, storage)
 * - Extracted: Debug logic, drag handling, spring physics, sub-components
 */
export function GlassSlider({ opacity = 1, onSlideComplete, config: configOverride }: GlassSliderProps) {
	const trackRef = useRef<HTMLDivElement>(null);

	// Client-side only rendering to avoid hydration mismatch
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		queueMicrotask(() => setMounted(true));
	}, []);
	const isMobile = useMobileViewport(sliderPositionDefaults.mobileBreakpoint);

	// Merge configuration with defaults
	const config = { ...DEFAULT_SLIDER_CONFIG, ...configOverride };

	// Debug mode abstraction
	const { isEnabled: isDebugMode, wasActiveThisSession, setEnabled: setDebugMode } = useDebugMode();

	// Handle hover state
	const { isActive: isHovering, interactionProps: handleInteractionProps } = useInteraction3D({
		trigger: 'hover',
	});

	// Spring animation for smooth snap
	const { position, setPosition, setVelocity, snapTo, cancelAnimation, isAnimating } = useSpringAnimation({
		onSettle: (target: number) => {
			const newDebugMode = target > 0.5;
			setDebugMode(newDebugMode);
			onSlideComplete?.(target < 0.5 ? 'left' : 'right');
		},
	});

	// Drag interaction
	const { isDragging, handleRef, handleProps } = useDragInteraction({
		trackRef,
		handleWidth: config.handleWidth,
		trackPadding: config.padding,
		onDragStart: cancelAnimation,
		onDragMove: (pos) => {
			setVelocity((pos - position) * 60);
			setPosition(pos);
		},
		onDragEnd: (pos) => {
			const target = pos > 0.55 ? 1 : 0;
			snapTo(target);
		},
	});

	// Sync slider position when debug mode changes (e.g., from URL navigation)
	// Only sync when not dragging AND not animating to avoid fighting with user interaction
	useEffect(() => {
		if (isDragging || isAnimating) return;
		const targetPosition = isDebugMode ? 1 : 0;
		// Only update if position doesn't match debug mode state
		if ((isDebugMode && position < 0.5) || (!isDebugMode && position > 0.5)) {
			setPosition(targetPosition);
		}
	}, [isDebugMode, isDragging, isAnimating, position, setPosition]);

	// Delayed visibility
	const skipDelay = isDebugMode || wasActiveThisSession;
	const { finalOpacity, hasAppeared } = useDelayedVisibility({
		opacity,
		initialDelayMs: visibilityDefaults.initialDelay,
		skipDelay,
	});

	// Compute visibility state using utility
	const { keepVisible, computedOpacity, computedVisibility } = computeSliderVisibility({
		isDebugMode,
		wasActiveThisSession,
		opacity,
		hasAppeared,
		finalOpacity,
	});

	// Disable pointer events when slider is not visible
	// Use mounted check to ensure consistent SSR/client rendering
	const isInteractive = mounted && computedVisibility === "visible" && computedOpacity > 0;

	return (
		<div
			onTouchStart={(e) => e.stopPropagation()}
			onTouchMove={(e) => e.stopPropagation()}
			onTouchEnd={(e) => e.stopPropagation()}
			style={{
				position: "fixed",
				bottom: isMobile ? sliderPositionDefaults.bottomMobile : sliderPositionDefaults.bottomDesktop,
				left: "50%",
				transform: "translateX(-50%)",
				opacity: computedOpacity,
				visibility: computedVisibility,
				pointerEvents: isInteractive ? "auto" : "none",
				transition: keepVisible ? "none" : `opacity ${animationTimings.duration.normal} ease, visibility ${animationTimings.duration.normal}`,
				willChange: "opacity",
				zIndex: sliderPositionDefaults.zIndex,
			}}
		>
			<SliderTrack
				ref={trackRef}
				config={config}
				isDragging={isDragging}
				{...handleProps}
			>
				<SliderHandle
					ref={handleRef as React.RefObject<HTMLDivElement>}
					config={config}
					position={position}
					isDragging={isDragging}
					isHovering={isHovering}
					{...handleProps}
					{...handleInteractionProps}
				/>
			</SliderTrack>
		</div>
	);
}
