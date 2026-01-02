/**
 * Homepage type definitions
 */

export interface MousePosition {
    x: number;
    y: number;
}

export interface ScrollState {
    progress: number;
    activeSection: number;
    hasPassedGreeting: boolean;
    isJumping: boolean;
}

export interface SectionVisibility {
    opacity: number;
    entryProgress: number;
    exitProgress: number;
    mobileOffset: number;
    mobileScale: number;
}

export interface GreetingVisibility {
    opacity: number;
    visible: boolean;
}

export interface AllSectionVisibility {
    greeting: GreetingVisibility;
    profile: SectionVisibility;
    links: SectionVisibility;
    contact: SectionVisibility;
}

export interface AnimationStagesState {
    stage: number;
    isReady: boolean;
}

export interface ScrollNavigationOptions {
    enabled: boolean;
}

export interface ScrollNavigationState {
    scrollProgress: number;
    activeSection: number;
    hasPassedGreeting: boolean;
    isJumping: boolean;
    isMobile: boolean;
    handleDotClick: (index: number) => void;
}

export interface TouchStartData {
    x: number;
    time: number;
    section: number;
    lastX: number;
    lastTime: number;
}

