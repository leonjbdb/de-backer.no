"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
	TOTAL_SECTIONS,
	RESTING_POINTS,
	MOBILE_BREAKPOINT,
} from "../constants";
import { calculateActiveSection, findNearestRestingPoint } from "../calculations";
import { transitionConfig } from "../config";
import { useScrollDelta } from "./useScrollDelta";
import { useUrlSync } from "./navigation/useUrlSync";
import { useSnapAnimation } from "./animation/useSnapAnimation";
import { useWheelNavigation } from "./navigation/useWheelNavigation";
import { useKeyboardNavigation } from "./navigation/useKeyboardNavigation";
import { useTouchNavigation } from "./navigation/useTouchNavigation";

export interface CardTransitionOptions {
	enabled: boolean;
	initialSection?: number;
	/** When true, skip the greeting and go directly to first card (used when animation was previously played) */
	skipGreeting?: boolean;
}

export interface CardTransitionState {
	scrollProgress: number;
	activeSection: number;
	hasPassedGreeting: boolean;
	isMobile: boolean;
	scrollDelta: number;
	transitionDirection: "forward" | "backward" | null;
	handleDotClick: (index: number) => void;
}

/**
 * Unified hook for all card transitions
 * Orchestrates specialized hooks for different input methods and behaviors
 * Reduced from 716 lines to ~200 lines by delegating to focused hooks
 */
export function useCardTransition({
	enabled,
	initialSection,
	skipGreeting = false,
}: CardTransitionOptions): CardTransitionState {
	// Calculate initial values based on initialSection
	const hasInitialSection = initialSection !== undefined && initialSection >= 0 && initialSection <= 2;
	const initialProgress = hasInitialSection ? RESTING_POINTS[initialSection] : 0;

	// Core state
	const [scrollProgress, setScrollProgress] = useState(initialProgress);
	const [hasPassedGreeting, setHasPassedGreeting] = useState(hasInitialSection);
	const [activeSection, setActiveSection] = useState(hasInitialSection ? initialSection : 0);
	const [isMobile, setIsMobile] = useState(false);
	const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward" | null>(null);
	const [mobileSection, setMobileSection] = useState(hasInitialSection ? initialSection : -1);

	// Track if we've already handled the skipGreeting transition
	const hasSkippedGreetingRef = useRef(false);

	// Refs for animation and state tracking
	const snapTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const isSnappingRef = useRef(false);
	const snapAnimationRef = useRef<number | undefined>(undefined);
	const lastUserScrollRef = useRef<number>(0);
	const isProgrammaticScrollRef = useRef(false);
	const hasInitializedRef = useRef(false);

	// Detect mobile on mount and resize
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Handle skipGreeting flag (when animation was previously played)
	// This immediately jumps to the first card without any animation
	// Uses queueMicrotask to avoid synchronous setState warning in effect
	useEffect(() => {
		if (skipGreeting && !hasSkippedGreetingRef.current && !hasPassedGreeting) {
			hasSkippedGreetingRef.current = true;

			// On desktop, also set the actual scroll position
			if (!isMobile && typeof window !== 'undefined') {
				const targetScroll = RESTING_POINTS[0] * window.innerHeight;
				window.scrollTo({
					top: targetScroll,
					behavior: "instant" as ScrollBehavior,
				});
				hasInitializedRef.current = true;
			}

			queueMicrotask(() => {
				// Immediately set state to first card position
				setScrollProgress(RESTING_POINTS[0]);
				setActiveSection(0);
				setMobileSection(0);
				setHasPassedGreeting(true);
			});
		}
	}, [skipGreeting, hasPassedGreeting, isMobile]);

	// Set initial scroll position when there's an initial section (desktop only)
	useEffect(() => {
		if (hasInitialSection && enabled && !isMobile) {
			const targetScroll = RESTING_POINTS[initialSection] * window.innerHeight;

			const ensureScrollPosition = () => {
				window.scrollTo({
					top: targetScroll,
					behavior: "instant" as ScrollBehavior,
				});

				requestAnimationFrame(() => {
					const currentScroll = window.scrollY;
					const tolerance = 50;
					if (Math.abs(currentScroll - targetScroll) < tolerance) {
						hasInitializedRef.current = true;
					} else {
						setTimeout(ensureScrollPosition, 50);
					}
				});
			};

			ensureScrollPosition();
		} else if (!hasInitialSection && enabled) {
			hasInitializedRef.current = true;
		}
	}, [hasInitialSection, initialSection, enabled, isMobile]);

	// Update active section based on progress
	const updateActiveSection = useCallback((progress: number) => {
		const newSection = calculateActiveSection(progress);
		setActiveSection((prev) => {
			if (prev !== newSection) {
				setTransitionDirection(newSection > prev ? "forward" : "backward");
			}
			return newSection;
		});
	}, []);

	// Use scroll delta hook for orb animations
	const { scrollDelta } = useScrollDelta({ enabled, scrollProgress });

	// Use snap animation hook
	const { animateToProgress, cancelSnap } = useSnapAnimation({
		isMobile,
		scrollProgress,
		updateActiveSection,
		setScrollProgress,
		setTransitionDirection,
		isSnappingRef,
		isProgrammaticScrollRef,
		snapAnimationRef,
	});

	// Use URL sync hook
	useUrlSync({ enabled, hasPassedGreeting, activeSection });

	// Use wheel navigation hook
	const { handleWheel } = useWheelNavigation({
		isMobile,
		hasPassedGreeting,
		cancelSnap,
		isProgrammaticScrollRef,
		isSnappingRef,
		snapTimeoutRef,
		lastUserScrollRef,
	});

	// Navigate to a specific section with animation
	const navigateToSection = useCallback(
		(targetSection: number, useEaseOut?: boolean) => {
			if (isSnappingRef.current) return;
			if (targetSection < 0 || targetSection > 2) return;

			const targetProgress = RESTING_POINTS[targetSection];

			if (isMobile) {
				setMobileSection(targetSection);
			}

			if (!hasPassedGreeting) {
				setHasPassedGreeting(true);
			}

			animateToProgress(targetProgress, undefined, undefined, useEaseOut);
		},
		[isMobile, hasPassedGreeting, animateToProgress]
	);

	// Use keyboard navigation hook
	const { handleKeyDown } = useKeyboardNavigation({
		enabled,
		hasPassedGreeting,
		activeSection,
		navigateToSection,
		cancelSnap,
		isSnappingRef,
		snapTimeoutRef,
	});

	// Use touch navigation hook
	const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchNavigation({
		isMobile,
		enabled,
		mobileSection,
		hasPassedGreeting,
		scrollProgress,
		setHasPassedGreeting,
		setScrollProgress,
		setActiveSection,
		setMobileSection,
		animateToProgress,
		isSnappingRef,
	});

	// Handle scroll for progress updates (desktop only)
	const handleScroll = useCallback(() => {
		if (isMobile) return;

		if (!hasInitializedRef.current) {
			return;
		}

		const now = performance.now();

		if (isProgrammaticScrollRef.current) {
			return;
		}

		lastUserScrollRef.current = now;

		if (isSnappingRef.current) {
			cancelSnap();
		}

		const scrollY = window.scrollY;
		const viewportHeight = window.innerHeight;
		let progress = scrollY / viewportHeight;

		if (progress >= 0.7 && !hasPassedGreeting) {
			setHasPassedGreeting(true);
		}

		// Clamp to valid range
		if (hasPassedGreeting && progress < RESTING_POINTS[0]) {
			window.scrollTo({
				top: RESTING_POINTS[0] * viewportHeight,
				behavior: "instant" as ScrollBehavior,
			});
			progress = RESTING_POINTS[0];
		}

		if (progress > RESTING_POINTS[2]) {
			window.scrollTo({
				top: RESTING_POINTS[2] * viewportHeight,
				behavior: "instant" as ScrollBehavior,
			});
			progress = RESTING_POINTS[2];
		}

		setScrollProgress(progress);
		updateActiveSection(progress);

		if (snapTimeoutRef.current) {
			clearTimeout(snapTimeoutRef.current);
		}

		snapTimeoutRef.current = setTimeout(() => {
			const timeSinceLastScroll = performance.now() - lastUserScrollRef.current;
			if (timeSinceLastScroll < transitionConfig.desktopSnapDelay - 10) {
				return;
			}

			let currentProgress = window.scrollY / window.innerHeight;

			// Clamp to valid range
			if (hasPassedGreeting && currentProgress < RESTING_POINTS[0]) {
				currentProgress = RESTING_POINTS[0];
			}
			if (currentProgress > RESTING_POINTS[2]) {
				currentProgress = RESTING_POINTS[2];
			}

			const nearestPoint = findNearestRestingPoint(currentProgress);

			if (Math.abs(currentProgress - nearestPoint) > transitionConfig.snapThreshold) {
				animateToProgress(nearestPoint, currentProgress);
			}
		}, transitionConfig.desktopSnapDelay);
	}, [hasPassedGreeting, isMobile, updateActiveSection, cancelSnap, animateToProgress]);

	// Handle dot click - animated transition that starts immediately with ease-out
	const handleDotClick = useCallback(
		(index: number) => {
			if (index === activeSection) return;

			// Cancel any ongoing animations so we can start fresh
			cancelSnap();
			if (snapTimeoutRef.current) {
				clearTimeout(snapTimeoutRef.current);
				snapTimeoutRef.current = undefined;
			}

			// Reset snapping ref so navigateToSection doesn't block
			isSnappingRef.current = false;

			// Use ease-out for immediate visual feedback
			navigateToSection(index, true);
		},
		[activeSection, navigateToSection, cancelSnap]
	);

	// Auto-snap to first card on mobile when greeting completes
	useEffect(() => {
		if (enabled && isMobile && !hasInitialSection && mobileSection === -1) {
			const timer = setTimeout(() => {
				setScrollProgress(RESTING_POINTS[0]);
				setMobileSection(0);
				setActiveSection(0);
				setHasPassedGreeting(true);
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [enabled, isMobile, hasInitialSection, mobileSection]);

	// Set up event listeners
	useEffect(() => {
		if (enabled) {
			window.addEventListener("keydown", handleKeyDown);

			if (isMobile) {
				document.body.style.overflow = "hidden";
				document.body.style.minHeight = "100vh";
				document.documentElement.style.overflow = "hidden";

				window.addEventListener("touchstart", handleTouchStart, { passive: true });
				window.addEventListener("touchmove", handleTouchMove, { passive: false });
				window.addEventListener("touchend", handleTouchEnd, { passive: true });
			} else {
				document.body.style.overflowY = "auto";
				document.body.style.overflowX = "hidden";
				document.body.style.minHeight = `${TOTAL_SECTIONS * 100}vh`;
				document.documentElement.style.overflowY = "auto";

				window.addEventListener("scroll", handleScroll);
				window.addEventListener("wheel", handleWheel, { passive: true });

				requestAnimationFrame(() => {
					handleScroll();
				});
			}

			return () => {
				window.removeEventListener("keydown", handleKeyDown);
				if (isMobile) {
					window.removeEventListener("touchstart", handleTouchStart);
					window.removeEventListener("touchmove", handleTouchMove);
					window.removeEventListener("touchend", handleTouchEnd);
				} else {
					window.removeEventListener("scroll", handleScroll);
					window.removeEventListener("wheel", handleWheel);
				}
				document.body.style.minHeight = "";
				document.body.style.overflow = "";
			};
		} else {
			document.body.style.overflow = "hidden";
			document.body.style.minHeight = "100vh";
			document.documentElement.style.overflow = "hidden";
		}
	}, [enabled, handleScroll, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, isMobile, handleKeyDown]);

	// Cleanup on unmount
	useEffect(() => {
		// Capture ref values at effect creation time
		const snapTimeout = snapTimeoutRef;
		const snapAnimation = snapAnimationRef;

		return () => {
			if (snapTimeout.current) clearTimeout(snapTimeout.current);
			if (snapAnimation.current) cancelAnimationFrame(snapAnimation.current);
		};
	}, []);

	return {
		scrollProgress,
		activeSection,
		hasPassedGreeting,
		isMobile,
		scrollDelta,
		transitionDirection,
		handleDotClick,
	};
}
