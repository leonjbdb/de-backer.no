/**
 * Pure calculation functions for homepage visibility and animations
 */

import { SCROLL_ZONES, RESTING_POINTS, SECTION_THRESHOLDS } from './constants';
import type { SectionVisibility, GreetingVisibility, WelcomeVisibility, AllSectionVisibility, WheelTransform } from './types';

// 3D Wheel configuration for mobile
const WHEEL_RADIUS = 600; // px - larger = flatter curve
const ANGLE_PER_SECTION = 55; // degrees between cards

/**
 * Clamp a value between min and max
 */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Calculate linear interpolation progress between start and end
 * Returns 1 if start === end (instant transition, already complete)
 */
function calculateProgress(value: number, start: number, end: number): number {
    if (start === end) {
        // Avoid division by zero - if start equals end, we're already past it
        return value >= start ? 1 : 0;
    }
    return clamp((value - start) / (end - start), 0, 1);
}

/**
 * Calculate greeting ("Hi!") visibility based on scroll progress
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
 * Calculate welcome text visibility based on scroll progress
 * Fades in after "Hi!" starts fading, then fades out before profile card
 */
export function calculateWelcomeVisibility(
    scrollProgress: number,
    hasPassedGreeting: boolean
): WelcomeVisibility {
    if (hasPassedGreeting) {
        return { opacity: 0, visible: false };
    }

    const { fadeInStart, fadeInEnd, fadeOutStart, fadeOutEnd } = SCROLL_ZONES.welcome;
    
    // Calculate fade in (0 to 1)
    const fadeInProgress = clamp((scrollProgress - fadeInStart) / (fadeInEnd - fadeInStart), 0, 1);
    
    // Calculate fade out (1 to 0)
    const fadeOutProgress = clamp(1 - (scrollProgress - fadeOutStart) / (fadeOutEnd - fadeOutStart), 0, 1);
    
    // Opacity is the minimum of fade in and fade out
    const opacity = Math.min(fadeInProgress, fadeOutProgress);

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
 * Calculate 3D wheel transform for mobile carousel
 * Cards are positioned on a horizontal cylinder that rotates as user swipes
 * 
 * @param sectionIndex - The index of this card (0, 1, or 2)
 * @param scrollProgress - Current scroll/swipe progress
 * @param isMobile - Whether we're on mobile
 * @returns WheelTransform with rotateY, translateX, translateZ, and opacity
 */
export function calculateWheelTransform(
    sectionIndex: number,
    scrollProgress: number,
    isMobile: boolean
): WheelTransform {
    if (!isMobile) {
        return { rotateY: 0, translateX: 0, translateZ: 0, opacity: 1 };
    }

    // Convert scroll progress to a 0-2 range (matching our 3 sections)
    // RESTING_POINTS are [0.75, 1.75, 2.75], so we normalize
    const normalizedProgress = (scrollProgress - RESTING_POINTS[0]) / (RESTING_POINTS[2] - RESTING_POINTS[0]) * 2;
    
    // Calculate angle relative to current view position
    // When normalizedProgress = 0, section 0 is centered (angle = 0)
    // When normalizedProgress = 1, section 1 is centered
    // When normalizedProgress = 2, section 2 is centered
    const angle = (sectionIndex - normalizedProgress) * ANGLE_PER_SECTION;
    const radians = (angle * Math.PI) / 180;
    
    // Calculate 3D position on the wheel
    // translateX: horizontal position (sin gives left/right offset)
    // translateZ: depth position (1 - cos gives forward/backward depth)
    const translateX = WHEEL_RADIUS * Math.sin(radians);
    const translateZ = WHEEL_RADIUS * (1 - Math.cos(radians));
    
    // Opacity fades as cards rotate away from center
    // cos(0) = 1 (facing camera), cos(±90°) = 0 (perpendicular)
    const cosAngle = Math.cos(radians);
    const opacity = clamp(cosAngle, 0, 1);
    
    return {
        rotateY: angle,
        translateX,
        translateZ: -translateZ, // Negative because CSS translateZ positive = toward viewer
        opacity,
    };
}

/**
 * Calculate profile card visibility
 */
export function calculateProfileVisibility(
    scrollProgress: number,
    isMobile: boolean
): SectionVisibility {
    const { entryStart, entryEnd, exitStart, exitEnd } = SCROLL_ZONES.profile;
    const { opacity: baseOpacity, entryProgress, exitProgress } = calculateSectionVisibility(
        scrollProgress,
        entryStart,
        entryEnd,
        exitStart,
        exitEnd,
        isMobile
    );

    const mobileOffset = calculateMobileOffset(scrollProgress, RESTING_POINTS[0], isMobile);
    const mobileScale = calculateMobileScale(mobileOffset, isMobile);
    
    // Calculate 3D wheel transform for mobile
    const wheelTransform = calculateWheelTransform(0, scrollProgress, isMobile);
    
    // On mobile, use wheel opacity instead of traditional opacity
    const opacity = isMobile ? wheelTransform.opacity : baseOpacity;

    return { 
        opacity, 
        entryProgress, 
        exitProgress, 
        mobileOffset, 
        mobileScale,
        wheelRotateY: wheelTransform.rotateY,
        wheelTranslateX: wheelTransform.translateX,
        wheelTranslateZ: wheelTransform.translateZ,
    };
}

/**
 * Calculate links card visibility
 */
export function calculateLinksVisibility(
    scrollProgress: number,
    isMobile: boolean
): SectionVisibility {
    const { entryStart, entryEnd, exitStart, exitEnd } = SCROLL_ZONES.links;
    const { opacity: baseOpacity, entryProgress, exitProgress } = calculateSectionVisibility(
        scrollProgress,
        entryStart,
        entryEnd,
        exitStart,
        exitEnd,
        isMobile
    );

    const mobileOffset = calculateMobileOffset(scrollProgress, RESTING_POINTS[1], isMobile);
    const mobileScale = calculateMobileScale(mobileOffset, isMobile);
    
    // Calculate 3D wheel transform for mobile
    const wheelTransform = calculateWheelTransform(1, scrollProgress, isMobile);
    
    // On mobile, use wheel opacity instead of traditional opacity
    const opacity = isMobile ? wheelTransform.opacity : baseOpacity;

    return { 
        opacity, 
        entryProgress, 
        exitProgress, 
        mobileOffset, 
        mobileScale,
        wheelRotateY: wheelTransform.rotateY,
        wheelTranslateX: wheelTransform.translateX,
        wheelTranslateZ: wheelTransform.translateZ,
    };
}

/**
 * Calculate contact card visibility
 */
export function calculateContactVisibility(
    scrollProgress: number,
    isMobile: boolean
): SectionVisibility {
    const { entryStart, entryEnd } = SCROLL_ZONES.contact;
    const { opacity: baseOpacity, entryProgress, exitProgress } = calculateSectionVisibility(
        scrollProgress,
        entryStart,
        entryEnd,
        undefined,
        undefined,
        isMobile
    );

    const mobileOffset = calculateMobileOffset(scrollProgress, RESTING_POINTS[2], isMobile);
    const mobileScale = calculateMobileScale(mobileOffset, isMobile);
    
    // Calculate 3D wheel transform for mobile
    const wheelTransform = calculateWheelTransform(2, scrollProgress, isMobile);
    
    // On mobile, use wheel opacity instead of traditional opacity
    const opacity = isMobile ? wheelTransform.opacity : baseOpacity;

    return { 
        opacity, 
        entryProgress, 
        exitProgress, 
        mobileOffset, 
        mobileScale,
        wheelRotateY: wheelTransform.rotateY,
        wheelTranslateX: wheelTransform.translateX,
        wheelTranslateZ: wheelTransform.translateZ,
    };
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
    const welcome = calculateWelcomeVisibility(scrollProgress, hasPassedGreeting);

    const profileBase = calculateProfileVisibility(scrollProgress, isMobile);
    const linksBase = calculateLinksVisibility(scrollProgress, isMobile);
    const contactBase = calculateContactVisibility(scrollProgress, isMobile);

    // Apply jumping fade out
    const jumpMultiplier = isJumping ? 0 : 1;

    return {
        greeting,
        welcome,
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

