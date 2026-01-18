"use client";

import { useEffect, useState } from "react";
import { ProfileCard, LinksCard, ContactCard } from "@/components/cards";
import { GlassCard } from "@/components/glass";
import { useDebugSafe } from "@/components/debug";
import { cardsConfig } from "@/config/cards.config";
import type { AllSectionVisibility, SectionVisibility } from "../types";

interface CardCarouselProps {
	visibility: AllSectionVisibility;
	isReady: boolean;
	activeSection: number;
}

// Shared card wrapper styles
const cardWrapperStyle: React.CSSProperties = {
	position: "fixed",
	top: "50%",
	left: "50%",
	zIndex: 10,
	maxWidth: "480px",
	width: "calc(100% - 32px)",
};

/**
 * Wrapper component that applies GlassCard with animation props
 * Cards only handle content, this handles all animation/transition logic
 */
function AnimatedCard({
	children,
	visibility,
	padding = "clamp(24px, 5vw, 40px)",
	mobilePadding,
	mobileBorderRadius,
	ariaLabel,
}: {
	children: React.ReactNode;
	visibility: SectionVisibility;
	padding?: string;
	mobilePadding?: string;
	mobileBorderRadius?: number;
	ariaLabel?: string;
}) {
	return (
		<GlassCard
			style={cardWrapperStyle}
			padding={padding}
			borderRadius={60}
			mobileBorderRadius={mobileBorderRadius}
			mobilePadding={mobilePadding}
			opacity={visibility.opacity}
			entryProgress={visibility.entryProgress}
			exitProgress={visibility.exitProgress}
			mobileOffset={visibility.mobileOffset}
			mobileScale={visibility.mobileScale}
			wheelRotateY={visibility.wheelRotateY}
			wheelTranslateX={visibility.wheelTranslateX}
			wheelTranslateZ={visibility.wheelTranslateZ}
			ariaLabel={ariaLabel}
		>
			{children}
		</GlassCard>
	);
}

/**
 * Renders all three cards with their visibility states
 * Profile, Links, and Contact cards with scroll-based animations
 * 
 * Animation/transition logic is handled here via GlassCard wrapper,
 * card components only handle their content
 */
export function CardCarousel({ visibility, isReady, activeSection }: CardCarouselProps) {
	// Track if cards have faded in (for initial appearance animation)
	const [hasFadedIn, setHasFadedIn] = useState(false);

	// Check debug context for showCards flag
	const debugContext = useDebugSafe();
	const [localShowCards, setLocalShowCards] = useState(true);

	// Use context value if available, otherwise use local state
	const showCards = debugContext?.state.showCards ?? localShowCards;

	useEffect(() => {
		if (isReady && !hasFadedIn) {
			// Double RAF + small timeout ensures browser has painted initial state
			const timer = requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					setTimeout(() => {
						setHasFadedIn(true);
					}, 50);
				});
			});
			return () => cancelAnimationFrame(timer);
		}
	}, [isReady, hasFadedIn]);

	// Listen for debug option changes when context is not available
	useEffect(() => {
		const handleDebugOptionChange = (e: CustomEvent<{ key: string; value: boolean }>) => {
			if (e.detail.key === "showCards") {
				setLocalShowCards(e.detail.value);
			}
		};

		window.addEventListener("debugOptionChanged", handleDebugOptionChange as EventListener);
		return () => {
			window.removeEventListener("debugOptionChanged", handleDebugOptionChange as EventListener);
		};
	}, []);

	// Don't render if not ready or showCards is disabled
	if (!isReady || !showCards) {
		return null;
	}

	const { profile, links, contact } = visibility;

	// Wrapper style for initial fade-in animation
	const wrapperStyle: React.CSSProperties = {
		position: 'relative',
		zIndex: 10,
		opacity: hasFadedIn ? 1 : 0,
		transition: 'opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
		willChange: 'opacity',
	};

	return (
		<div
			style={wrapperStyle}
			role="region"
			aria-roledescription="carousel"
			aria-label="Leon's Profile"
		>
			{/* Screen reader announcement for section changes */}
			<div className="sr-only" aria-live="polite" aria-atomic="true" style={{
				position: 'absolute',
				width: '1px',
				height: '1px',
				padding: '0',
				margin: '-1px',
				overflow: 'hidden',
				clip: 'rect(0, 0, 0, 0)',
				whiteSpace: 'nowrap',
				borderWidth: '0'
			}}>
				{`Now showing: ${cardsConfig[activeSection]?.label || 'Section'} section`}
			</div>

			{/* Profile card with scroll-based fade in/out */}
			<AnimatedCard
				visibility={profile}
				padding="clamp(16px, 4vw, 30px)"
				mobilePadding="20px"
				mobileBorderRadius={40}
				ariaLabel="About section"
			>
				<ProfileCard />
			</AnimatedCard>

			{/* Links card with scroll-based fade in/out */}
			<AnimatedCard
				visibility={links}
				padding="clamp(16px, 4vw, 30px)"
				mobilePadding="20px"
				mobileBorderRadius={40}
				ariaLabel="Links section"
			>
				<LinksCard />
			</AnimatedCard>

			{/* Contact card with scroll-based fade in */}
			<AnimatedCard
				visibility={contact}
				padding="clamp(16px, 4vw, 30px)"
				mobilePadding="20px"
				mobileBorderRadius={40}
				ariaLabel="Contact section"
			>
				<ContactCard />
			</AnimatedCard>
		</div>
	);
}
