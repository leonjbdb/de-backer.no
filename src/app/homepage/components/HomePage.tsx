"use client";

import { useState, useCallback } from "react";
import { useTheme } from "@/components/providers";
import { ScrollDotIndicator } from "@/components/ui/ScrollDotIndicator";
import { Attribution } from "@/components/ui/Attribution";
import { GridView } from "@/components/orb-field";
import { GlassSlider } from "@/components/glass";
import { useDeviceOrientation } from "@/hooks";
import { cardsConfig } from "@/config/cards.config";
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
	 * Initial section to display (0 = about, 1 = links, 2 = contact)
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

	// Skip animation when starting from a specific section (set before useAnimationStages)
	const skipAnimation = initialSection !== undefined;

	// Track when grid animation completes (for skipAnimation case)
	const [gridAnimationComplete, setGridAnimationComplete] = useState(false);
	const handleGridAnimationComplete = useCallback(() => {
		setGridAnimationComplete(true);
	}, []);

	// Device orientation for grid parallax offset
	const { rawTiltX, rawTiltY } = useDeviceOrientation();

	// Animation stage management (intro sequence)
	const { stage, isReady, wasSkippedFromStorage, hasCheckedStorage } = useAnimationStages({ skipAnimation });

	// Unified card transition system - handles scroll, keyboard, dots, touch
	// When animation was skipped from storage (cookie), skip the greeting and go to first card
	const {
		scrollProgress,
		activeSection,
		hasPassedGreeting,
		isMobile,
		handleDotClick,
	} = useCardTransition({
		enabled: isReady,
		initialSection,
		skipGreeting: wasSkippedFromStorage,
	});

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
				deviceTiltX={rawTiltX}
				deviceTiltY={rawTiltY}
			/>

			<main
				className={`${styles.homepage} ${stage >= 2 ? styles.homepagePopped : ""}`}
				style={{ background: homepageBackground }}
			>
				{/* Greeting section ("Hi!" and "Welcome...") - only show if not skipping */}
				{/* Wait for storage check to prevent flash when cookie is set */}
				{!skipAnimation && hasCheckedStorage && !wasSkippedFromStorage && stage < 7 && (
					<GreetingSection
						stage={stage}
						theme={theme}
					/>
				)}

				{/* Card carousel (About, Links, Contact) */}
				{/* When skipping animation, wait for grid animation to complete before showing cards */}
				<CardCarousel
					visibility={visibility}
					isReady={skipAnimation ? gridAnimationComplete : isReady}
					activeSection={activeSection}
				/>

				{/* Dot navigation indicator */}
				<ScrollDotIndicator
					totalSections={3}
					activeSection={activeSection}
					onDotClick={handleDotClick}
					visible={skipAnimation ? gridAnimationComplete : isReady}
					theme={theme}
					sectionLabels={cardsConfig.map(card => card.label)}
				/>
			</main>

			{/* Glass slider - OUTSIDE main to avoid stacking context issues */}
			<GlassSlider
				visible={visibility.contact.entryProgress > 0}
				opacity={
					visibility.contact.entryProgress === 1
						? 1  // Always full opacity when fully entered
						: visibility.contact.entryProgress > 0
							? visibility.contact.entryProgress  // Fade in with entry progress
							: 0
				}
			/>

			{/* Attribution - Only visible on last card (contact) */}
			<Attribution visible={activeSection === cardsConfig.length - 1} />
		</>
	);
}
