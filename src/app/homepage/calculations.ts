/**
 * Pure calculation functions for homepage visibility and animations
 */

import { SCROLL_ZONES, RESTING_POINTS, SECTION_THRESHOLDS } from './constants';
import type { SectionVisibility, GreetingVisibility, AllSectionVisibility } from './types';

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate linear interpolation progress between start and end
 */
function calculateProgress(value: number, start: number, end: number): number {
    return clamp((value - start) / (end - start), 0, 1);
}

/**
 * Calculate greeting visibility based on scroll progress
 */
export function calculateGreetingVisibility(
    scrollProgress: number,
    hasPassedGreeting: boolean
): GreetingVisibility {
    if (hasPassedGreeting) {
        return { opacity: 0, visible: false };
    }

    const { fadeStart, fadeEnd } = SCROLL_ZONES.greeting;
    const opacity = clamp(1 - (scrollProgress - fadeStart) / (fadeEnd - fadeStart), 0, 1);

    return {
        opacity,
        visible: opacity > 0,
    };
}

/**
 * Calculate section visibility with entry/exit animations
 * On desktop, opacity ramps up faster so the slide-in animation is visible
 */
function calculateSectionVisibility(
    scrollProgress: number,
    entryStart: number,
    entryEnd: number,
    exitStart?: number,
    exitEnd?: number,
    isMobile?: boolean
): { opacity: number; entryProgress: number; exitProgress: number } {
    const entryProgress = calculateProgress(scrollProgress, entryStart, entryEnd);

    let exitProgress = 0;
    if (exitStart !== undefined && exitEnd !== undefined) {
        exitProgress = calculateProgress(scrollProgress, exitStart, exitEnd);
    }

    // Desktop: Opacity ramps up faster so the slide animation is visible
    // Opacity reaches ~60% when entry is only 20% complete, then continues to 100%
    // This allows users to see the card sliding in from below
    const entryOpacity = isMobile
        ? entryProgress
        : Math.min(1, entryProgress * 3);

    const exitOpacity = 1 - exitProgress;
    const opacity = Math.min(entryOpacity, exitOpacity);

    return { opacity, entryProgress, exitProgress };
}

/**
 * Calculate mobile offset for horizontal carousel effect
 */
export function calculateMobileOffset(
    scrollProgress: number,
    restingPoint: number,
    isMobile: boolean
): number {
    if (!isMobile) return 0;
    const offsetMultiplier = 100; // 100% = 1vw per 0.01 progress
    return (scrollProgress - restingPoint) * -offsetMultiplier;
}

/**
 * Calculate mobile scale for carousel depth effect
 * Cards are larger when centered (1.0) and smaller off-center (0.85)
 */
export function calculateMobileScale(offset: number, isMobile: boolean): number {
    if (!isMobile) return 1;
    const distance = Math.abs(offset) / 100; // Normalize to 0-1 range
    const scale = 1 - distance * 0.15; // Scale down by 15% max
    return clamp(scale, 0.85, 1);
}

/**
 * Calculate profile card visibility
 */
export function calculateProfileVisibility(
    scrollProgress: number,
    isMobile: boolean
): SectionVisibility {
    const { entryStart, entryEnd, exitStart, exitEnd } = SCROLL_ZONES.profile;
    const { opacity, entryProgress, exitProgress } = calculateSectionVisibility(
        scrollProgress,
        entryStart,
        entryEnd,
        exitStart,
        exitEnd,
        isMobile
    );

    const mobileOffset = calculateMobileOffset(scrollProgress, RESTING_POINTS[0], isMobile);
    const mobileScale = calculateMobileScale(mobileOffset, isMobile);

    return { opacity, entryProgress, exitProgress, mobileOffset, mobileScale };
}

/**
 * Calculate links card visibility
 */
export function calculateLinksVisibility(
    scrollProgress: number,
    isMobile: boolean
): SectionVisibility {
    const { entryStart, entryEnd, exitStart, exitEnd } = SCROLL_ZONES.links;
    const { opacity, entryProgress, exitProgress } = calculateSectionVisibility(
        scrollProgress,
        entryStart,
        entryEnd,
        exitStart,
        exitEnd,
        isMobile
    );

    const mobileOffset = calculateMobileOffset(scrollProgress, RESTING_POINTS[1], isMobile);
    const mobileScale = calculateMobileScale(mobileOffset, isMobile);

    return { opacity, entryProgress, exitProgress, mobileOffset, mobileScale };
}

/**
 * Calculate contact card visibility
 */
export function calculateContactVisibility(
    scrollProgress: number,
    isMobile: boolean
): SectionVisibility {
    const { entryStart, entryEnd } = SCROLL_ZONES.contact;
    const { opacity, entryProgress, exitProgress } = calculateSectionVisibility(
        scrollProgress,
        entryStart,
        entryEnd,
        undefined,
        undefined,
        isMobile
    );

    const mobileOffset = calculateMobileOffset(scrollProgress, RESTING_POINTS[2], isMobile);
    const mobileScale = calculateMobileScale(mobileOffset, isMobile);

    return { opacity, entryProgress, exitProgress, mobileOffset, mobileScale };
}

/**
 * Calculate all section visibilities at once
 */
export function calculateAllVisibility(
    scrollProgress: number,
    hasPassedGreeting: boolean,
    isJumping: boolean,
    isMobile: boolean
): AllSectionVisibility {
    const greeting = calculateGreetingVisibility(scrollProgress, hasPassedGreeting);

    const profileBase = calculateProfileVisibility(scrollProgress, isMobile);
    const linksBase = calculateLinksVisibility(scrollProgress, isMobile);
    const contactBase = calculateContactVisibility(scrollProgress, isMobile);

    // Apply jumping fade out
    const jumpMultiplier = isJumping ? 0 : 1;

    return {
        greeting,
        profile: { ...profileBase, opacity: profileBase.opacity * jumpMultiplier },
        links: { ...linksBase, opacity: linksBase.opacity * jumpMultiplier },
        contact: { ...contactBase, opacity: contactBase.opacity * jumpMultiplier },
    };
}

/**
 * Determine active section based on scroll progress
 */
export function calculateActiveSection(progress: number): number {
    if (progress < SECTION_THRESHOLDS.profileToLinks) {
        return 0; // Profile
    } else if (progress < SECTION_THRESHOLDS.linksToContact) {
        return 1; // Links
    } else {
        return 2; // Contact
    }
}

/**
 * Find nearest resting point for snap behavior
 */
export function findNearestRestingPoint(progress: number): number {
    let nearest: number = RESTING_POINTS[0];
    let minDistance = Math.abs(progress - nearest);

    for (const point of RESTING_POINTS) {
        const distance = Math.abs(progress - point);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = point;
        }
    }

    return nearest;
}

