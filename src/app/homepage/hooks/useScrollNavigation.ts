"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
    TOTAL_SECTIONS,
    RESTING_POINTS,
    MIN_SCROLL_AFTER_GREETING,
    MOBILE_BREAKPOINT,
    SWIPE_THRESHOLDS,
} from "../constants";
import { calculateActiveSection, findNearestRestingPoint } from "../calculations";
import type { ScrollNavigationOptions, ScrollNavigationState, TouchStartData } from "../types";

// Wait 1 second after user stops scrolling before snapping to resting point
const DESKTOP_SNAP_DELAY = 1000;

// Threshold distance from resting point to trigger snap (in viewport units)
const SNAP_THRESHOLD = 0.05;

/**
 * Hook to manage all scroll and touch navigation behavior
 * Handles desktop vertical scrolling and mobile horizontal swiping
 * Includes snap behavior and dot navigation
 */
export function useScrollNavigation({
    enabled,
}: ScrollNavigationOptions): ScrollNavigationState {
    const [scrollProgress, setScrollProgress] = useState(0);
    const [hasPassedGreeting, setHasPassedGreeting] = useState(false);
    const [activeSection, setActiveSection] = useState(0);
    const [isJumping, setIsJumping] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mobileSection, setMobileSection] = useState(-1);

    const snapTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const isSnappingRef = useRef(false);
    const snapAnimationRef = useRef<number | undefined>(undefined);
    const touchStartRef = useRef<TouchStartData | null>(null);
    // Track last user scroll time to differentiate user scroll from programmatic scroll
    const lastUserScrollRef = useRef<number>(0);
    // Track if we're currently in a programmatic scroll
    const isProgrammaticScrollRef = useRef(false);

    // Detect mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

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
        setActiveSection(calculateActiveSection(progress));
    }, []);

    // Smooth scroll/animate to a resting point with responsive animation
    const scrollToRestingPoint = useCallback(
        (targetProgress: number, startProgress?: number) => {
            const currentProgress =
                startProgress ?? (isMobile ? scrollProgress : window.scrollY / window.innerHeight);
            const distance = targetProgress - currentProgress;

            // Don't animate if already very close
            if (Math.abs(distance) < 0.01) {
                isSnappingRef.current = false;
                isProgrammaticScrollRef.current = false;
                return;
            }

            // Cancel any existing snap animation
            cancelSnap();
            isSnappingRef.current = true;
            isProgrammaticScrollRef.current = true;

            // Duration: mobile stays quick, desktop uses longer duration for parabolic feel
            const baseDuration = isMobile ? 250 : 500;
            const duration = isMobile
                ? Math.min(500, Math.max(baseDuration, Math.abs(distance) * 400))
                : Math.min(800, Math.max(baseDuration, Math.abs(distance) * 600));
            const startTime = performance.now();

            // Parabolic ball-rolling easing for desktop
            // Simulates a ball rolling down a parabola: slow start, accelerate, soft landing
            const parabolicBallEase = (t: number): number => {
                if (t < 0.4) {
                    // Slow ease-in: ball gaining momentum (quartic)
                    const nt = t / 0.4;
                    return 0.3 * nt * nt * nt * nt;
                } else {
                    // Smooth ease-out: soft landing (cubic)
                    const nt = (t - 0.4) / 0.6;
                    return 0.3 + 0.7 * (1 - Math.pow(1 - nt, 3));
                }
            };

            const animateScroll = (currentTime: number) => {
                // Check if cancelled (user started scrolling)
                if (!isSnappingRef.current) {
                    isProgrammaticScrollRef.current = false;
                    return;
                }

                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Use different easing for mobile vs desktop
                let eased: number;
                if (isMobile) {
                    // Ease-out cubic for mobile (quick response)
                    eased = 1 - Math.pow(1 - progress, 3);
                } else {
                    // Parabolic ball-rolling for desktop (slow start, accelerate, soft landing)
                    eased = parabolicBallEase(progress);
                }

                const newProgress = currentProgress + distance * eased;

                if (isMobile) {
                    // On mobile, update scroll progress state directly
                    setScrollProgress(newProgress);
                } else {
                    // On desktop, use window scroll
                    window.scrollTo({
                        top: newProgress * window.innerHeight,
                        behavior: "instant" as ScrollBehavior,
                    });
                }

                // Update state for visual feedback
                setScrollProgress(newProgress);
                updateActiveSection(newProgress);

                if (progress < 1) {
                    snapAnimationRef.current = requestAnimationFrame(animateScroll);
                } else {
                    // Ensure we end exactly at target
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
                }
            };

            snapAnimationRef.current = requestAnimationFrame(animateScroll);
        },
        [isMobile, scrollProgress, cancelSnap, updateActiveSection]
    );

    // Handle wheel events for instant snap cancellation (desktop only)
    const handleWheel = useCallback(() => {
        if (isMobile) return;

        // Immediately cancel any ongoing snap animation - wheel takes priority
        if (isSnappingRef.current) {
            cancelSnap();
        }

        // Clear any pending snap timeout
        if (snapTimeoutRef.current) {
            clearTimeout(snapTimeoutRef.current);
            snapTimeoutRef.current = undefined;
        }

        lastUserScrollRef.current = performance.now();
    }, [isMobile, cancelSnap]);

    // Handle scroll for fade transitions (desktop only)
    const handleScroll = useCallback(() => {
        if (isMobile) return;

        const now = performance.now();

        // If we're in a programmatic scroll (snap animation), don't interfere
        if (isProgrammaticScrollRef.current) {
            return;
        }

        // Record this as a user scroll
        lastUserScrollRef.current = now;

        // Cancel any ongoing snap animation - user scroll takes priority
        if (isSnappingRef.current) {
            cancelSnap();
        }

        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        let progress = scrollY / viewportHeight;

        // Mark greeting as passed once user reaches the profile card's fully visible position
        if (progress >= 0.7 && !hasPassedGreeting) {
            setHasPassedGreeting(true);
        }

        // Prevent scrolling above the minimum position when greeting is passed
        if (hasPassedGreeting && progress < MIN_SCROLL_AFTER_GREETING) {
            window.scrollTo({
                top: MIN_SCROLL_AFTER_GREETING * viewportHeight,
                behavior: "instant" as ScrollBehavior,
            });
            progress = MIN_SCROLL_AFTER_GREETING;
        }

        setScrollProgress(progress);
        updateActiveSection(progress);

        // Clear any existing snap timeout
        if (snapTimeoutRef.current) {
            clearTimeout(snapTimeoutRef.current);
        }

        // Set up snap timeout - will trigger after user stops scrolling
        snapTimeoutRef.current = setTimeout(() => {
            // Double-check we haven't scrolled recently (debounce)
            const timeSinceLastScroll = performance.now() - lastUserScrollRef.current;
            if (timeSinceLastScroll < DESKTOP_SNAP_DELAY - 10) {
                return; // User is still scrolling, wait for next timeout
            }

            let currentProgress = window.scrollY / window.innerHeight;

            // Enforce minimum scroll position
            if (hasPassedGreeting && currentProgress < MIN_SCROLL_AFTER_GREETING) {
                currentProgress = MIN_SCROLL_AFTER_GREETING;
            }

            const nearestPoint = findNearestRestingPoint(currentProgress);

            // Only snap if we're not already at the resting point
            if (Math.abs(currentProgress - nearestPoint) > SNAP_THRESHOLD) {
                scrollToRestingPoint(nearestPoint, currentProgress);
            }
        }, DESKTOP_SNAP_DELAY);
    }, [hasPassedGreeting, scrollToRestingPoint, isMobile, updateActiveSection, cancelSnap]);

    // Animate to a mobile section with smooth parabolic snap
    const snapToMobileSection = useCallback(
        (targetSection: number, fromProgress?: number) => {
            if (isSnappingRef.current) return;

            const clampedSection = Math.max(0, Math.min(2, targetSection));
            const targetProgress = RESTING_POINTS[clampedSection];
            const startProgress = fromProgress ?? scrollProgress;
            const distance = targetProgress - startProgress;

            if (Math.abs(distance) < 0.02) {
                setScrollProgress(targetProgress);
                setMobileSection(clampedSection);
                setActiveSection(clampedSection);
                return;
            }

            isSnappingRef.current = true;
            const startTime = performance.now();

            // Duration based on distance - smooth but responsive
            const duration = Math.min(350, Math.max(180, Math.abs(distance) * 350));

            // Use local variable to track progress without causing re-renders every frame
            let lastRenderedProgress = startProgress;

            const animate = (currentTime: number) => {
                const elapsed = currentTime - startTime;
                const t = Math.min(elapsed / duration, 1);

                // Smooth ease-out cubic for natural deceleration
                const eased = 1 - Math.pow(1 - t, 3);

                const newProgress = startProgress + distance * eased;

                // Only update state if the change is significant enough to be visible
                if (Math.abs(newProgress - lastRenderedProgress) > 0.005 || t >= 1) {
                    lastRenderedProgress = newProgress;
                    setScrollProgress(t >= 1 ? targetProgress : newProgress);
                }

                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setScrollProgress(targetProgress);
                    setMobileSection(clampedSection);
                    setActiveSection(clampedSection);
                    isSnappingRef.current = false;
                }
            };

            requestAnimationFrame(animate);
        },
        [scrollProgress]
    );

    // Handle touch events for mobile horizontal swiping
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

            // Update last position for velocity calculation
            touchStartRef.current.lastX = currentX;
            touchStartRef.current.lastTime = now;

            // Calculate progress delta based on swipe distance
            const viewportWidth = window.innerWidth;
            const sectionWidth = 1;
            const progressDelta = (deltaX / viewportWidth) * sectionWidth;

            // Calculate new progress from the section's resting point
            const startSection = touchStartRef.current.section;
            let baseProgress: number;
            if (startSection === -1) {
                baseProgress = 0;
            } else {
                baseProgress = RESTING_POINTS[startSection];
            }

            let newProgress = baseProgress + progressDelta;

            // Clamp progress
            const minProgress = hasPassedGreeting ? RESTING_POINTS[0] : 0;
            const maxProgress = RESTING_POINTS[2];
            newProgress = Math.max(minProgress, Math.min(maxProgress, newProgress));

            // Mark greeting as passed if we've moved past it
            if (newProgress >= 0.5 && !hasPassedGreeting) {
                setHasPassedGreeting(true);
            }

            setScrollProgress(newProgress);

            // Update active section based on current progress
            if (newProgress < RESTING_POINTS[0] + 0.5) {
                setActiveSection(0);
            } else if (newProgress < RESTING_POINTS[1] + 0.5) {
                setActiveSection(1);
            } else {
                setActiveSection(2);
            }

            // Prevent default to stop page scroll
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

            // Calculate velocity from recent movement
            const recentDeltaX = touchStartRef.current.lastX - endX;
            const recentDeltaTime = endTime - touchStartRef.current.lastTime;
            const velocity = recentDeltaTime > 0 ? recentDeltaX / recentDeltaTime : 0;

            // Total distance swiped
            const totalDeltaX = touchStartRef.current.x - endX;

            touchStartRef.current = null;

            // Current progress
            const currentProgress = scrollProgress;

            const viewportWidth = window.innerWidth;
            const distanceFraction = Math.abs(totalDeltaX) / viewportWidth;

            // Determine target section based on velocity and distance
            let targetSection: number;

            if (startSection === -1) {
                // From greeting - only allow going to section 0
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

            snapToMobileSection(targetSection, currentProgress);
        },
        [isMobile, enabled, scrollProgress, snapToMobileSection]
    );

    // Handle dot click navigation
    const handleDotClick = useCallback(
        (index: number) => {
            if (isJumping || isSnappingRef.current || index === activeSection) return;

            if (snapTimeoutRef.current) {
                clearTimeout(snapTimeoutRef.current);
            }

            if (isMobile) {
                snapToMobileSection(index);
            } else {
                setIsJumping(true);

                setTimeout(() => {
                    const targetProgress = RESTING_POINTS[index];
                    window.scrollTo({
                        top: targetProgress * window.innerHeight,
                        behavior: "instant" as ScrollBehavior,
                    });

                    updateActiveSection(targetProgress);

                    setTimeout(() => {
                        setIsJumping(false);
                    }, 100);
                }, 400);
            }
        },
        [activeSection, isJumping, isMobile, updateActiveSection, snapToMobileSection]
    );

    // Add scroll/touch listener and enable scrolling after ready
    useEffect(() => {
        if (enabled) {
            if (isMobile) {
                // Mobile: use touch events for horizontal swiping
                document.body.style.overflow = "hidden";
                document.body.style.minHeight = "100vh";
                document.documentElement.style.overflow = "hidden";

                window.addEventListener("touchstart", handleTouchStart, { passive: true });
                window.addEventListener("touchmove", handleTouchMove, { passive: false });
                window.addEventListener("touchend", handleTouchEnd, { passive: true });
            } else {
                // Desktop: vertical scrolling on body
                document.body.style.overflowY = "auto";
                document.body.style.overflowX = "hidden";
                document.body.style.minHeight = `${TOTAL_SECTIONS * 100}vh`;
                document.documentElement.style.overflowY = "auto";

                window.addEventListener("scroll", handleScroll);
                // Wheel listener for instant snap cancellation
                window.addEventListener("wheel", handleWheel, { passive: true });

                // Initialize scroll progress from current position
                requestAnimationFrame(() => {
                    handleScroll();
                });
            }

            return () => {
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
            // Disable scrolling before ready
            document.body.style.overflow = "hidden";
            document.body.style.minHeight = "100vh";
            document.documentElement.style.overflow = "hidden";
        }
    }, [enabled, handleScroll, handleWheel, handleTouchStart, handleTouchMove, handleTouchEnd, isMobile]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
            if (snapAnimationRef.current) cancelAnimationFrame(snapAnimationRef.current);
        };
    }, []);

    return {
        scrollProgress,
        activeSection,
        hasPassedGreeting,
        isJumping,
        isMobile,
        handleDotClick,
    };
}

