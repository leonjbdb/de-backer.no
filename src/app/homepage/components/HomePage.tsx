"use client";

import { useTheme } from "@/components/providers";
import { OrbField } from "@/components/orb-field";
import { ScrollDotIndicator } from "@/components/ui/ScrollDotIndicator";
import {
    useAnimationStages,
    useMousePosition,
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

    // Animation stage management (intro sequence)
    const { stage, isReady } = useAnimationStages({ skipAnimation });

    // Mouse position for orb field interaction
    const mousePos = useMousePosition();

    // Unified card transition system - handles scroll, keyboard, dots, touch
    const {
        scrollProgress,
        activeSection,
        hasPassedGreeting,
        isMobile,
        scrollDelta,
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
    const homepageBackground = stage >= 2 ? (theme === "light" ? "#e8e4e0" : "#000000") : undefined;

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

            <main
                className={`${styles.homepage} ${stage >= 2 ? styles.homepagePopped : ""}`}
                style={{ background: homepageBackground }}
            >
                {/* Background orb field - reacts to scroll */}
                <OrbField visible={stage >= 2} mouseX={mousePos.x} mouseY={mousePos.y} scrollDelta={scrollDelta} />

                {/* Greeting section ("Hi!" and "Welcome...") - only show if not skipping */}
                {!skipAnimation && stage < 7 && (
                    <GreetingSection
                        stage={stage}
                        theme={theme}
                    />
                )}

                {/* Card carousel (Profile, Links, Contact) */}
                <CardCarousel visibility={visibility} isReady={isReady} />

                {/* Dot navigation indicator */}
                <ScrollDotIndicator
                    totalSections={3}
                    activeSection={activeSection}
                    onDotClick={handleDotClick}
                    visible={isReady}
                    theme={theme}
                />
            </main>
        </>
    );
}

