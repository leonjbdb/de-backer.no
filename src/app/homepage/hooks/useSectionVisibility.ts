"use client";

import { useMemo } from "react";
import { calculateAllVisibility } from "../calculations";
import type { AllSectionVisibility } from "../types";

interface UseSectionVisibilityOptions {
    scrollProgress: number;
    hasPassedGreeting: boolean;
    isJumping: boolean;
    isMobile: boolean;
}

/**
 * Hook to calculate all section visibilities based on scroll state
 * Returns memoized visibility values for greeting and all cards
 */
export function useSectionVisibility({
    scrollProgress,
    hasPassedGreeting,
    isJumping,
    isMobile,
}: UseSectionVisibilityOptions): AllSectionVisibility {
    return useMemo(
        () => calculateAllVisibility(scrollProgress, hasPassedGreeting, isJumping, isMobile),
        [scrollProgress, hasPassedGreeting, isJumping, isMobile]
    );
}

