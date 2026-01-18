"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
	TOTAL_SECTIONS,
	RESTING_POINTS,
	MOBILE_BREAKPOINT,
	SWIPE_THRESHOLDS,
} from "../constants";
import { calculateActiveSection, findNearestRestingPoint } from "../calculations";
import type { TouchStartData } from "../types";

// Configuration
const DESKTOP_SNAP_DELAY = 1000;
const SNAP_THRESHOLD = 0.05;
const SCROLL_SENSITIVITY = 3; // 3x scroll sensitivity
const SCROLL_DELTA_DECAY = 0.92; // How fast scroll delta decays for orbs

// URL paths for each section (normal mode)
const SECTION_PATHS = ["/about", "/links", "/contact"] as const;

// URL paths for each section (debug mode)
const DEBUG_SECTION_PATHS = ["/debug/about", "/debug/links", "/debug/contact"] as const;

// Debug mode storage key
const DEBUG_MODE_KEY = "debug-mode-enabled";

/**
 * Check if debug mode is currently active.
 * Checks both URL and localStorage.
 */
function isDebugModeActive(): boolean {
	if (typeof window === "undefined") return false;

	// Check URL first
	if (window.location.pathname.startsWith("/debug")) {
		return true;
	}

	// Check localStorage
	const stored = localStorage.getItem(DEBUG_MODE_KEY);
	return stored === "true";
}

export interface CardTransitionOptions {
	enabled: boolean;
	initialSection?: number;
}

export interface CardTransitionState {
	scrollProgress: number;
	activeSection: number;
	hasPassedGreeting: boolean;
	isMobile: boolean;
	scrollDelta: number; // Normalized scroll velocity for orb reaction (-1 to 1)
	transitionDirection: "forward" | "backward" | null;
	handleDotClick: (index: number) => void;
}

/**
 * Unified hook for all card transitions
 * Handles desktop scrolling, mobile swiping, keyboard navigation, and dot clicks
 * with consistent animations across all input methods
 */
export function useCardTransition({
	enabled,
	initialSection,
}: CardTransitionOptions): CardTransitionState {
	// Calculate initial values based on initialSection
	const hasInitialSection = initialSection !== undefined && initialSection >= 0 && initialSection <= 2;
	const initialProgress = hasInitialSection ? RESTING_POINTS[initialSection] : 0;

	const [scrollProgress, setScrollProgress] = useState(initialProgress);
	const [hasPassedGreeting, setHasPassedGreeting] = useState(hasInitialSection);
	const [activeSection, setActiveSection] = useState(hasInitialSection ? initialSection : 0);
	const [isMobile, setIsMobile] = useState(false);
	const [scrollDelta, setScrollDelta] = useState(0);
	const [transitionDirection, setTransitionDirection] = useState<"forward" | "backward" | null>(null);
	const [mobileSection, setMobileSection] = useState(hasInitialSection ? initialSection : -1);

	// Refs for animation and state tracking
	const snapTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const isSnappingRef = useRef(false);
	const snapAnimationRef = useRef<number | undefined>(undefined);
	const touchStartRef = useRef<TouchStartData | null>(null);
	const lastUserScrollRef = useRef<number>(0);
	const isProgrammaticScrollRef = useRef(false);
	const hasInitializedRef = useRef(false);
	const scrollDeltaRef = useRef(0);
	const scrollDeltaDecayRef = useRef<number | undefined>(undefined);
	const accumulatedDeltaRef = useRef(0);
	const previousScrollProgressRef = useRef(initialProgress);

	// Detect mobile on mount and resize
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

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

	// Track debug mode state
	const [isDebugMode, setIsDebugMode] = useState(() => {
		if (typeof window === "undefined") return false;
		return isDebugModeActive();
	});

	// Listen for debug mode changes
	useEffect(() => {
		const handleDebugModeChange = (e: CustomEvent<{ enabled: boolean }>) => {
			setIsDebugMode(e.detail.enabled);
		};

		window.addEventListener("debugModeChanged", handleDebugModeChange as EventListener);

		// Also check initial state on mount (use microtask to avoid synchronous setState warning)
		queueMicrotask(() => {
			setIsDebugMode(isDebugModeActive());
		});

		return () => {
			window.removeEventListener("debugModeChanged", handleDebugModeChange as EventListener);
		};
	}, []);

	// Update URL when active section changes or debug mode changes
	useEffect(() => {
		if (!enabled || !hasPassedGreeting) return;

		// Choose the appropriate path based on debug mode
		const paths = isDebugMode ? DEBUG_SECTION_PATHS : SECTION_PATHS;
		const targetPath = paths[activeSection];
		const currentPath = window.location.pathname;

		// Don't update if we're already at the correct path
		if (currentPath !== targetPath) {
			// If switching between debug/non-debug modes, update URL
			window.history.replaceState(null, "", targetPath);
		}
	}, [activeSection, enabled, hasPassedGreeting, isDebugMode]);

	// Decay scroll delta over time for smooth orb reaction
	// Also track scrollProgress changes to drive orb movement
	useEffect(() => {
		const decayScrollDelta = () => {
			// Calculate progress delta for orb movement
			const progressDelta = scrollProgress - previousScrollProgressRef.current;
			previousScrollProgressRef.current = scrollProgress;

			// Update scroll delta based on progress change (reduced sensitivity)
			// Positive progressDelta = moving forward/down, negative = moving backward/up
			// Reduced from 50 to 15 for less aggressive orb movement
			if (Math.abs(progressDelta) > 0.0001) {
				scrollDeltaRef.current = Math.max(-1, Math.min(1, progressDelta * 15));
			}

			// Decay existing delta
			scrollDeltaRef.current *= SCROLL_DELTA_DECAY;
			if (Math.abs(scrollDeltaRef.current) < 0.001) {
				scrollDeltaRef.current = 0;
			}
			setScrollDelta(scrollDeltaRef.current);
			scrollDeltaDecayRef.current = requestAnimationFrame(decayScrollDelta);
		};

		if (enabled) {
			scrollDeltaDecayRef.current = requestAnimationFrame(decayScrollDelta);
		}

		return () => {
			if (scrollDeltaDecayRef.current) {
				cancelAnimationFrame(scrollDeltaDecayRef.current);
			}
		};
	}, [enabled, scrollProgress]);

	// Cancel any ongoing snap animation
	const cancelSnap = useCallback(() => {
		if (snapAnimationRef.current) {
			cancelAnimationFrame(snapAnimationRef.current);
			snapAnimationRef.current = undefined;
		}
		isSnappingRef.current = false;
		isProgrammaticScrollRef.current = false;
	}, []);

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

	// Parabolic ball-rolling easing for desktop
	const parabolicBallEase = useCallback((t: number): number => {
		if (t < 0.4) {
			const nt = t / 0.4;
			return 0.3 * nt * nt * nt * nt;
		} else {
			const nt = (t - 0.4) / 0.6;
			return 0.3 + 0.7 * (1 - Math.pow(1 - nt, 3));
		}
	}, []);

	// Smooth animated transition to a target progress
	const animateToProgress = useCallback(
		(targetProgress: number, startProgress?: number, duration?: number, useEaseOut?: boolean) => {
			const currentProgress =
				startProgress ?? (isMobile ? scrollProgress : window.scrollY / window.innerHeight);
			const distance = targetProgress - currentProgress;

			if (Math.abs(distance) < 0.01) {
				setScrollProgress(targetProgress);
				updateActiveSection(targetProgress);
				isSnappingRef.current = false;
				isProgrammaticScrollRef.current = false;
				return;
			}

			cancelSnap();
			isSnappingRef.current = true;
			isProgrammaticScrollRef.current = true;

			// Set transition direction
			setTransitionDirection(distance > 0 ? "forward" : "backward");

			// Use shorter duration for ease-out (dot clicks)
			const baseDuration = duration ?? (useEaseOut ? 400 : (isMobile ? 350 : 600));
			const animDuration = Math.min(800, Math.max(baseDuration, Math.abs(distance) * 500));
			const startTime = performance.now();

			const animate = (currentTime: number) => {
				if (!isSnappingRef.current) {
					isProgrammaticScrollRef.current = false;
					return;
				}

				const elapsed = currentTime - startTime;
				const progress = Math.min(elapsed / animDuration, 1);

				let eased: number;
				if (isMobile || useEaseOut) {
					// Ease-out cubic - starts fast, slows at end
					eased = 1 - Math.pow(1 - progress, 3);
				} else {
					// Parabolic ball-rolling for desktop scroll snapping
					eased = parabolicBallEase(progress);
				}

				const newProgress = currentProgress + distance * eased;

				if (!isMobile) {
					window.scrollTo({
						top: newProgress * window.innerHeight,
						behavior: "instant" as ScrollBehavior,
					});
				}

				setScrollProgress(newProgress);
				updateActiveSection(newProgress);

				if (progress < 1) {
					snapAnimationRef.current = requestAnimationFrame(animate);
				} else {
					if (!isMobile) {
						window.scrollTo({
							top: targetProgress * window.innerHeight,
							behavior: "instant" as ScrollBehavior,
						});
					}
					setScrollProgress(targetProgress);
					updateActiveSection(targetProgress);
					isSnappingRef.current = false;
					isProgrammaticScrollRef.current = false;
					snapAnimationRef.current = undefined;
					setTransitionDirection(null);
				}
			};

			snapAnimationRef.current = requestAnimationFrame(animate);
		},
		[isMobile, scrollProgress, cancelSnap, updateActiveSection, parabolicBallEase]
	);

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

	// Handle wheel events with 3x sensitivity
	const handleWheel = useCallback(
		(e: WheelEvent) => {
			if (isMobile) return;

			// Don't interfere with programmatic animations (dot clicks, keyboard nav)
			if (isProgrammaticScrollRef.current) return;

			// Cancel any ongoing snap (user wheel takes priority)
			if (isSnappingRef.current) {
				cancelSnap();
			}

			if (snapTimeoutRef.current) {
				clearTimeout(snapTimeoutRef.current);
				snapTimeoutRef.current = undefined;
			}

			lastUserScrollRef.current = performance.now();

			// Accumulate delta for programmatic scroll with 3x sensitivity
			accumulatedDeltaRef.current += e.deltaY * SCROLL_SENSITIVITY;

			// Apply accumulated scroll in next frame
			requestAnimationFrame(() => {
				if (accumulatedDeltaRef.current !== 0) {
					const currentScroll = window.scrollY;
					let newScroll = currentScroll + accumulatedDeltaRef.current;

					// Clamp to valid range - min is first resting point, max is last resting point
					const minScroll = hasPassedGreeting ? RESTING_POINTS[0] * window.innerHeight : 0;
					const maxScroll = RESTING_POINTS[2] * window.innerHeight;
					newScroll = Math.max(minScroll, Math.min(maxScroll, newScroll));

					window.scrollTo({
						top: newScroll,
						behavior: "instant" as ScrollBehavior,
					});

					accumulatedDeltaRef.current = 0;
				}
			});
		},
		[isMobile, cancelSnap, hasPassedGreeting]
	);

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

		// Clamp to valid range - min is first resting point, max is last resting point
		if (hasPassedGreeting && progress < RESTING_POINTS[0]) {
			window.scrollTo({
				top: RESTING_POINTS[0] * viewportHeight,
				behavior: "instant" as ScrollBehavior,
			});
			progress = RESTING_POINTS[0];
		}

		// Prevent scrolling past the last resting point (bottom of parabola)
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
			if (timeSinceLastScroll < DESKTOP_SNAP_DELAY - 10) {
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

			if (Math.abs(currentProgress - nearestPoint) > SNAP_THRESHOLD) {
				animateToProgress(nearestPoint, currentProgress);
			}
		}, DESKTOP_SNAP_DELAY);
	}, [hasPassedGreeting, isMobile, updateActiveSection, cancelSnap, animateToProgress]);

	// Mobile touch handlers for 3D wheel animation
	const handleTouchStart = useCallback(
		(e: TouchEvent) => {
			if (!isMobile || !enabled || isSnappingRef.current) return;
			const now = performance.now();
			touchStartRef.current = {
				x: e.touches[0].clientX,
				time: now,
				section: mobileSection,
				lastX: e.touches[0].clientX,
				lastTime: now,
			};
		},
		[isMobile, enabled, mobileSection]
	);

	const handleTouchMove = useCallback(
		(e: TouchEvent) => {
			if (!isMobile || !touchStartRef.current || !enabled || isSnappingRef.current) return;

			const currentX = e.touches[0].clientX;
			const now = performance.now();
			const deltaX = touchStartRef.current.x - currentX;
			const viewportWidth = window.innerWidth;

			// Update lastX and lastTime for velocity tracking
			touchStartRef.current.lastX = currentX;
			touchStartRef.current.lastTime = now;

			const progressDelta = (deltaX / viewportWidth) * 1;

			const startSection = touchStartRef.current.section;
			let baseProgress: number;
			if (startSection === -1) {
				baseProgress = 0;
			} else {
				baseProgress = RESTING_POINTS[startSection];
			}

			let newProgress = baseProgress + progressDelta;

			const minProgress = hasPassedGreeting ? RESTING_POINTS[0] : 0;
			const maxProgress = RESTING_POINTS[2];
			newProgress = Math.max(minProgress, Math.min(maxProgress, newProgress));

			if (newProgress >= 0.5 && !hasPassedGreeting) {
				setHasPassedGreeting(true);
			}

			setScrollProgress(newProgress);

			if (newProgress < RESTING_POINTS[0] + 0.5) {
				setActiveSection(0);
			} else if (newProgress < RESTING_POINTS[1] + 0.5) {
				setActiveSection(1);
			} else {
				setActiveSection(2);
			}

			e.preventDefault();
		},
		[isMobile, enabled, hasPassedGreeting]
	);

	const handleTouchEnd = useCallback(
		(e: TouchEvent) => {
			if (!isMobile || !touchStartRef.current || !enabled) return;

			const endX = e.changedTouches[0].clientX;
			const endTime = performance.now();
			const startSection = touchStartRef.current.section;

			const recentDeltaX = touchStartRef.current.lastX - endX;
			const recentDeltaTime = endTime - touchStartRef.current.lastTime;
			const velocity = recentDeltaTime > 0 ? recentDeltaX / recentDeltaTime : 0;

			const totalDeltaX = touchStartRef.current.x - endX;

			touchStartRef.current = null;

			const currentProgress = scrollProgress;
			const viewportWidth = window.innerWidth;
			const distanceFraction = Math.abs(totalDeltaX) / viewportWidth;

			let targetSection: number;

			if (startSection === -1) {
				targetSection = 0;
				setHasPassedGreeting(true);
			} else {
				if (
					velocity > SWIPE_THRESHOLDS.velocity ||
					(totalDeltaX > 0 && distanceFraction > SWIPE_THRESHOLDS.distance)
				) {
					targetSection = Math.min(2, startSection + 1);
				} else if (
					velocity < -SWIPE_THRESHOLDS.velocity ||
					(totalDeltaX < 0 && distanceFraction > SWIPE_THRESHOLDS.distance)
				) {
					targetSection = Math.max(0, startSection - 1);
				} else {
					targetSection = startSection;
				}
			}

			const targetProgress = RESTING_POINTS[targetSection];
			setMobileSection(targetSection);
			animateToProgress(targetProgress, currentProgress, 350);
		},
		[isMobile, enabled, scrollProgress, animateToProgress]
	);

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

	// Handle keyboard navigation
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (!enabled || isSnappingRef.current) return;

			if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
				return;
			}

			if (e.key === "ArrowDown" || e.key === "ArrowRight") {
				if (!hasPassedGreeting) {
					navigateToSection(0);
				} else if (activeSection < 2) {
					navigateToSection(activeSection + 1);
				}
			} else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
				if (hasPassedGreeting && activeSection > 0) {
					navigateToSection(activeSection - 1);
				}
			}
		},
		[enabled, hasPassedGreeting, activeSection, navigateToSection]
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
		return () => {
			if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
			if (snapAnimationRef.current) cancelAnimationFrame(snapAnimationRef.current);
			if (scrollDeltaDecayRef.current) cancelAnimationFrame(scrollDeltaDecayRef.current);
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

