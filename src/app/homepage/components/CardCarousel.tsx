"use client";

import { useEffect, useState } from "react";
import { ProfileCard, LinksCard, ContactCard } from "@/components/cards";
import type { AllSectionVisibility } from "../types";

interface CardCarouselProps {
    visibility: AllSectionVisibility;
    isReady: boolean;
}

/**
 * Renders all three cards with their visibility states
 * Profile, Links, and Contact cards with scroll-based animations
 */
export function CardCarousel({ visibility, isReady }: CardCarouselProps) {
    // Track if cards have faded in (for initial appearance animation)
    const [hasFadedIn, setHasFadedIn] = useState(false);

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

    if (!isReady) {
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
        <div style={wrapperStyle}>
            {/* Profile card with scroll-based fade in/out */}
            <ProfileCard
                opacity={profile.opacity}
                entryProgress={profile.entryProgress}
                exitProgress={profile.exitProgress}
                mobileOffset={profile.mobileOffset}
                mobileScale={profile.mobileScale}
                wheelRotateY={profile.wheelRotateY}
                wheelTranslateX={profile.wheelTranslateX}
                wheelTranslateZ={profile.wheelTranslateZ}
            />

            {/* Links card with scroll-based fade in/out */}
            <LinksCard
                opacity={links.opacity}
                entryProgress={links.entryProgress}
                exitProgress={links.exitProgress}
                mobileOffset={links.mobileOffset}
                mobileScale={links.mobileScale}
                wheelRotateY={links.wheelRotateY}
                wheelTranslateX={links.wheelTranslateX}
                wheelTranslateZ={links.wheelTranslateZ}
            />

            {/* Contact card with scroll-based fade in */}
            <ContactCard
                opacity={contact.opacity}
                entryProgress={contact.entryProgress}
                mobileOffset={contact.mobileOffset}
                mobileScale={contact.mobileScale}
                wheelRotateY={contact.wheelRotateY}
                wheelTranslateX={contact.wheelTranslateX}
                wheelTranslateZ={contact.wheelTranslateZ}
            />
        </div>
    );
}
