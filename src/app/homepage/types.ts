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
    // 3D wheel transform properties for mobile
    wheelRotateY: number;
    wheelTranslateX: number;
    wheelTranslateZ: number;
}

export interface WheelTransform {
    rotateY: number;
    translateX: number;
    translateZ: number;
    opacity: number;
}

export interface GreetingVisibility {
    opacity: number;
    visible: boolean;
}

export interface WelcomeVisibility {
    opacity: number;
    visible: boolean;
}

export interface AllSectionVisibility {
    greeting: GreetingVisibility;
    welcome: WelcomeVisibility;
    profile: SectionVisibility;
    links: SectionVisibility;
    contact: SectionVisibility;
}

export interface AnimationStagesState {
    stage: number;
    isReady: boolean;
}

export interface AnimationStagesOptions {
    skipAnimation?: boolean;
}

export interface ScrollNavigationOptions {
    enabled: boolean;
    initialSection?: number;
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

