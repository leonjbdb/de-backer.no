"use client";

import { ThemeToggle } from "@/components";
import { useTheme } from "@/components/providers";
import { OrbField } from "@/components/orb-field";
import { ScrollDotIndicator } from "@/components/ui/ScrollDotIndicator";
import {
    useAnimationStages,
    useMousePosition,
    useScrollNavigation,
    useSectionVisibility,
} from "./homepage/hooks";
import { GreetingSection, CardCarousel } from "./homepage/components";
import styles from "./homepage/styles.module.css";

export default function HomePage() {
    const { theme } = useTheme();

    // Animation stage management (intro sequence)
    const { stage, isReady } = useAnimationStages();

    // Mouse position for orb field interaction
    const mousePos = useMousePosition();

    // Scroll/touch navigation with snapping
    const {
        scrollProgress,
        activeSection,
        hasPassedGreeting,
        isJumping,
        isMobile,
        handleDotClick,
    } = useScrollNavigation({ enabled: isReady });

    // Calculate all section visibilities
    const visibility = useSectionVisibility({
        scrollProgress,
        hasPassedGreeting,
        isJumping,
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
                {/* Background orb field */}
                <OrbField visible={stage >= 2} mouseX={mousePos.x} mouseY={mousePos.y} />

                {/* Theme toggle button */}
                <div
                    className={`${styles.themeToggleWrapper} ${isReady ? styles.themeToggleWrapperVisible : ""}`}
                >
                    <ThemeToggle />
                </div>

                {/* Greeting section ("Hi!") */}
                {!hasPassedGreeting && (
                    <GreetingSection stage={stage} visibility={visibility.greeting} theme={theme} />
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
