"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useDebugSafe } from "@/components/debug/DebugContext";
import { useInteraction3D } from "./hooks";

interface GlassSliderProps {
	visible: boolean;
	opacity?: number; // 0-1 for fade in/out
	onSlideComplete?: (side: 'left' | 'right') => void;
}

// Debug mode storage key
const DEBUG_MODE_KEY = 'debug-mode-enabled';

// Spring physics configuration for smooth snap animation
const SPRING_CONFIG = {
	stiffness: 300,
	damping: 25,
	mass: 1,
};

export function GlassSlider({ opacity = 1, onSlideComplete }: GlassSliderProps) {
	const debugContext = useDebugSafe();
	const trackRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState(0); // 0 = left, 1 = right
	const [isDragging, setIsDragging] = useState(false);
	const [hasAppeared, setHasAppeared] = useState(false);
	const [hasEverShown, setHasEverShown] = useState(false);
	const [canShowFirstTime, setCanShowFirstTime] = useState(false);
	const [isDebugMode, setIsDebugMode] = useState(false);
	const [debugModeWasActiveThisSession, setDebugModeWasActiveThisSession] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	// Use unified interaction hook for handle hover state
	const { isActive: isHovering, interactionProps: handleInteractionProps } = useInteraction3D({
		trigger: 'hover',
	});

	// Refs for animation
	const animationRef = useRef<number | null>(null);
	const velocityRef = useRef(0);
	const dragStartRef = useRef<{ x: number; startPosition: number } | null>(null);

	// Sync with debug context if available
	useEffect(() => {
		if (debugContext) {
			const enabled = debugContext.state.enabled;
			queueMicrotask(() => {
				setIsDebugMode(enabled);
				if (enabled) {
					setDebugModeWasActiveThisSession(true);
					setPosition(1);
				}
			});
		}
	}, [debugContext]);

	// Initialize debug mode from localStorage on mount (as fallback)
	useEffect(() => {
		if (!debugContext) {
			const stored = localStorage.getItem(DEBUG_MODE_KEY);
			const debugEnabled = stored === 'true';
			queueMicrotask(() => {
				setIsDebugMode(debugEnabled);
				// Set initial position based on debug mode
				setPosition(debugEnabled ? 1 : 0);
				// If debug mode is enabled on mount, mark it as active this session
				if (debugEnabled) {
					setDebugModeWasActiveThisSession(true);
				}
			});
		}
	}, [debugContext]);

	// Detect mobile on mount and resize
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < 768);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Handle first-time delay (10 seconds)
	useEffect(() => {
		if (opacity > 0.01 && !hasEverShown) {
			// First time seeing the slider - wait 10 seconds
			const delayTimer = setTimeout(() => {
				setCanShowFirstTime(true);
				setHasEverShown(true);
			}, 10000);
			return () => clearTimeout(delayTimer);
		}
	}, [opacity, hasEverShown]);

	// Handle visibility fade-in based on opacity
	useEffect(() => {
		// If we've shown before, OR if it's first time and delay is complete, OR debug mode is/was on
		const shouldShow = hasEverShown || canShowFirstTime || isDebugMode || debugModeWasActiveThisSession;

		if ((opacity > 0.01 || debugModeWasActiveThisSession) && !hasAppeared && shouldShow) {
			// Small delay to ensure smooth fade-in (skip delay if debug mode was ever active)
			const timer = setTimeout(() => setHasAppeared(true), debugModeWasActiveThisSession ? 0 : 50);
			return () => clearTimeout(timer);
		}
		// Keep hasAppeared true even when fading out to allow smooth transition
		// Also keep it true if debug mode was ever enabled this session
	}, [opacity, hasAppeared, hasEverShown, canShowFirstTime, isDebugMode, debugModeWasActiveThisSession]);

	// Cancel any ongoing animation
	const cancelAnimation = useCallback(() => {
		if (animationRef.current) {
			cancelAnimationFrame(animationRef.current);
			animationRef.current = null;
		}
	}, []);

	// Spring animation to snap to target
	const snapToPosition = useCallback((target: number) => {
		cancelAnimation();

		let currentPosition = position;
		let velocity = velocityRef.current;

		const animate = () => {
			const { stiffness, damping, mass } = SPRING_CONFIG;

			// Spring force: F = -k * x (where x is displacement from target)
			const displacement = currentPosition - target;
			const springForce = -stiffness * displacement;

			// Damping force: F = -c * v
			const dampingForce = -damping * velocity;

			// Acceleration: a = F / m
			const acceleration = (springForce + dampingForce) / mass;

			// Update velocity and position (using small time step)
			const dt = 1 / 60; // Assume 60fps
			velocity += acceleration * dt;
			currentPosition += velocity * dt;

			setPosition(currentPosition);

			// Check if we've settled (very close to target with low velocity)
			const isSettled = Math.abs(displacement) < 0.001 && Math.abs(velocity) < 0.01;

			if (isSettled) {
				setPosition(target);
				velocityRef.current = 0;
				animationRef.current = null;

				// Toggle debug mode when snapped
				const newDebugMode = target > 0.5;
				if (newDebugMode !== isDebugMode) {
					setIsDebugMode(newDebugMode);
					localStorage.setItem(DEBUG_MODE_KEY, String(newDebugMode));

					// Update debug context if available
					if (debugContext) {
						debugContext.setEnabled(newDebugMode);
					}

					// Mark that debug mode was active this session
					if (newDebugMode) {
						setDebugModeWasActiveThisSession(true);
					}

					// Dispatch custom event to notify OrbField
					window.dispatchEvent(new CustomEvent('debugModeChanged', {
						detail: { enabled: newDebugMode }
					}));
				}

				// Notify completion
				if (onSlideComplete) {
					onSlideComplete(target < 0.5 ? 'left' : 'right');
				}
			} else {
				velocityRef.current = velocity;
				animationRef.current = requestAnimationFrame(animate);
			}
		};

		animationRef.current = requestAnimationFrame(animate);
	}, [position, cancelAnimation, onSlideComplete, isDebugMode, debugContext]);

	// Calculate position from pointer X coordinate
	const calculatePosition = useCallback((clientX: number): number => {
		if (!trackRef.current) return position;

		const rect = trackRef.current.getBoundingClientRect();
		const handleWidth = 64;
		const padding = 6;

		// Available track width for the handle to move
		const trackWidth = rect.width - handleWidth - (padding * 2);

		// Calculate relative position from the left edge of the track
		const trackLeft = rect.left + padding;
		const relativeX = clientX - trackLeft - (handleWidth / 2);

		return Math.max(0, Math.min(1, relativeX / trackWidth));
	}, [position]);

	// Handle drag start
	const handleDragStart = useCallback((clientX: number) => {
		cancelAnimation();
		setIsDragging(true);
		dragStartRef.current = { x: clientX, startPosition: position };
	}, [cancelAnimation, position]);

	// Handle drag move
	const handleDragMove = useCallback((clientX: number) => {
		if (!isDragging || !dragStartRef.current) return;

		const newPosition = calculatePosition(clientX);

		// Calculate velocity for momentum
		velocityRef.current = (newPosition - position) * 60; // Scale to per-second

		setPosition(newPosition);
	}, [isDragging, calculatePosition, position]);

	// Handle drag end
	const handleDragEnd = useCallback(() => {
		if (!isDragging) return;

		setIsDragging(false);
		dragStartRef.current = null;

		// Snap to nearest side, preferring left if close to center
		const target = position > 0.55 ? 1 : 0;
		snapToPosition(target);
	}, [isDragging, position, snapToPosition]);

	// Mouse event handlers
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

	// Touch event handlers on handle
	const handleTouchStart = useCallback((e: React.TouchEvent) => {
		e.stopPropagation();
		handleDragStart(e.touches[0].clientX);
	}, [handleDragStart]);

	const handleTouchMove = useCallback((e: React.TouchEvent) => {
		e.preventDefault();
		e.stopPropagation();
		handleDragMove(e.touches[0].clientX);
	}, [handleDragMove]);

	const handleTouchEnd = useCallback((e: React.TouchEvent) => {
		e.stopPropagation();
		handleDragEnd();
	}, [handleDragEnd]);

	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		handleDragStart(e.clientX);
	}, [handleDragStart]);

	// Cleanup animation on unmount
	useEffect(() => {
		return () => cancelAnimation();
	}, [cancelAnimation]);

	// Calculate handle position - pill shape dimensions
	const handleWidth = 64;
	const handleHeight = 44;
	const padding = 6;
	const handleLeft = `calc(${padding}px + ${position} * (100% - ${handleWidth}px - ${padding * 2}px))`;

	// Arrow rotation based on position
	// At position 0 (left): points right (0deg)
	// At position 1 (right): points left (-180deg, rotating upwards)
	const arrowRotation = -(position * 180);

	// Keep slider visible if debug mode is currently on OR was ever active this session
	// Only hide after page reload when debug mode is off
	const keepVisible = isDebugMode || debugModeWasActiveThisSession;
	const finalOpacity = keepVisible ? 1 : (hasAppeared ? opacity : 0);
	const finalVisibility = keepVisible ? "visible" : ((hasAppeared && opacity > 0.01) || opacity > 0.5 ? "visible" : "hidden");

	return (
		<div
			onTouchStart={(e) => e.stopPropagation()}
			onTouchMove={(e) => e.stopPropagation()}
			onTouchEnd={(e) => e.stopPropagation()}
			style={{
				position: "fixed",
				// Mobile: Shifted up to avoid safe area and overlap
				bottom: isMobile ? "72px" : "clamp(24px, 5vh, 40px)",
				left: "50%",
				transform: "translateX(-50%)",
				zIndex: 9999,
				opacity: finalOpacity,
				transition: "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
				willChange: "opacity",
				pointerEvents: "auto",  // Always allow interaction when rendered
				visibility: finalVisibility,
			}}
		>
			{/* Glass track container */}
			<div
				ref={trackRef}
				onTouchStart={(e) => e.stopPropagation()}
				onTouchMove={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
				onTouchEnd={(e) => e.stopPropagation()}
				style={{
					position: "relative",
					width: "280px",
					height: "56px",
					borderRadius: "28px",
					background: "rgba(255, 255, 255, 0.08)",
					backdropFilter: "blur(24px) saturate(120%)",
					WebkitBackdropFilter: "blur(24px) saturate(120%)",
					border: "1px solid rgba(255, 255, 255, 0.15)",
					boxShadow: `
                        0 25px 50px rgba(0, 0, 0, 0.25),
                        0 10px 20px rgba(0, 0, 0, 0.15),
                        inset 0 1px 0 rgba(255, 255, 255, 0.2),
                        inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                    `,
					cursor: isDragging ? "grabbing" : "default",
					userSelect: "none",
					WebkitUserSelect: "none",
					touchAction: "none",
					perspective: "1200px",
					transformStyle: "preserve-3d",
				}}
			>
				{/* Top edge highlight */}
				<div
					style={{
						position: "absolute",
						top: 0,
						left: "8%",
						right: "8%",
						height: 1,
						background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 20%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.5) 80%, transparent 100%)",
						borderRadius: 14,
						pointerEvents: "none",
					}}
				/>

				{/* Draggable handle - pill shape */}
				<div
					onMouseDown={handleMouseDown}
					onTouchStart={handleTouchStart}
					onTouchMove={handleTouchMove}
					onTouchEnd={handleTouchEnd}
					{...handleInteractionProps}
					style={{
						position: "absolute",
						top: "50%",
						left: handleLeft,
						transform: isDragging
							? "translateY(-50%) translateZ(50px) scale(1.05)"
							: "translateY(-50%) scale(1)",
						width: handleWidth,
						height: handleHeight,
						borderRadius: handleHeight / 2,
						background: isHovering || isDragging ? "rgba(255, 255, 255, 0.2)" : "rgba(255, 255, 255, 0.04)",
						backdropFilter: "blur(12px)",
						WebkitBackdropFilter: "blur(12px)",
						border: isHovering || isDragging ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(255, 255, 255, 0.08)",
						boxShadow: isDragging
							? "0 12px 32px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)"
							: "0 4px 12px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
						cursor: isDragging ? "grabbing" : "grab",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						transition: "transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease",
						willChange: "left, transform",
						transformStyle: "preserve-3d",
					}}
				>
					{/* Arrow icon */}
					<svg
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke={isHovering || isDragging ? "var(--color-maroon, #4E0506)" : "var(--color-white, #ffffff)"}
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						style={{
							transform: `rotate(${arrowRotation}deg)`,
							transition: isDragging
								? "none"
								: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.25s ease",
						}}
					>
						<path d="M9 18l6-6-6-6" />
					</svg>
				</div>
			</div>
		</div>
	);
}
