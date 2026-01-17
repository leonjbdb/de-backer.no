"use client";

import { useState, useCallback } from "react";
import { useTheme } from "@/components/providers";
import { ScrollDotIndicator } from "@/components/ui/ScrollDotIndicator";
import { GridView } from "@/components/orb-field";
import {
    useAnimationStages,
    useCardTransition,
    useSectionVisibility,
} from "../hooks";
import { GreetingSection } from "./GreetingSection";
import { CardCarousel } from "./CardCarousel";
import styles from "../styles.module.css";

interface HomePageProps {
    /**
     * Initial section to display (0 = about/profile, 1 = links, 2 = contact)
     * When set, skips the greeting animation and starts directly at the specified section
     */
    initialSection?: number;
}

/**
 * Main homepage component that can be rendered at different initial sections
 * Used by /, /about, /links, and /contact routes
 */
export function HomePage({ initialSection }: HomePageProps) {
    const { theme } = useTheme();

    // Skip animation when starting from a specific section
    const skipAnimation = initialSection !== undefined;

    // Track when grid animation completes (for skipAnimation case)
    const [gridAnimationComplete, setGridAnimationComplete] = useState(false);
    const handleGridAnimationComplete = useCallback(() => {
        setGridAnimationComplete(true);
    }, []);

    // Animation stage management (intro sequence)
    const { stage, isReady } = useAnimationStages({ skipAnimation });

    // Unified card transition system - handles scroll, keyboard, dots, touch
    const {
        scrollProgress,
        activeSection,
        hasPassedGreeting,
        isMobile,
        handleDotClick,
    } = useCardTransition({ enabled: isReady, initialSection });

    // Calculate all section visibilities (isJumping no longer used - animations are unified)
    const visibility = useSectionVisibility({
        scrollProgress,
        hasPassedGreeting,
        isJumping: false, // No longer used - unified animations handle transitions
        isMobile,
    });

    // Dynamic background based on theme
    // When stage >= 2, background is transparent (via CSS) to show orbs through
    const homepageBackground = stage >= 2 ? "transparent" : "#000000";

    return (
        <>
            {/* Global styles for html/body */}
            <style jsx global>{`
                html,
                body {
                    background: #000000 !important;
                    overflow-x: hidden;
                }

                @media (max-width: 767px) {
                    html,
                    body {
                        overflow: hidden !important;
                    }
                }
            `}</style>

            {/* 3D Spatial Grid - Show from the beginning to play roll animation */}
            {/* Burst triggers at stage 2 (when Hi! bursts) OR when grid animation completes (skip case) */}
            <GridView 
                visible={true} 
                triggerBurst={stage >= 2 || (skipAnimation && gridAnimationComplete)}
                onAnimationComplete={handleGridAnimationComplete}
                scrollProgress={scrollProgress}
                isMobile={isMobile}
            />

            <main
                className={`${styles.homepage} ${stage >= 2 ? styles.homepagePopped : ""}`}
                style={{ background: homepageBackground }}
            >
                {/* Greeting section ("Hi!" and "Welcome...") - only show if not skipping */}
                {!skipAnimation && stage < 7 && (
                    <GreetingSection
                        stage={stage}
                        theme={theme}
                    />
                )}

                {/* Card carousel (Profile, Links, Contact) */}
                {/* When skipping animation, wait for grid animation to complete before showing cards */}
                <CardCarousel 
                    visibility={visibility} 
                    isReady={skipAnimation ? gridAnimationComplete : isReady} 
                />

                {/* Dot navigation indicator */}
                <ScrollDotIndicator
                    totalSections={3}
                    activeSection={activeSection}
                    onDotClick={handleDotClick}
                    visible={skipAnimation ? gridAnimationComplete : isReady}
                    theme={theme}
                />
            </main>
        </>
    );
}

