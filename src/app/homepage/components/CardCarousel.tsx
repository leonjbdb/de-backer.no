"use client";

import { ProfileCardLive } from "@/components/liquid-glass/ProfileCardLive";
import { LinksCardLive } from "@/components/liquid-glass/LinksCardLive";
import { ContactCardLive } from "@/components/liquid-glass/ContactCardLive";
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
    if (!isReady) {
        return null;
    }

    const { profile, links, contact } = visibility;

    return (
        <>
            {/* Profile card with scroll-based fade in/out */}
            <ProfileCardLive
                opacity={profile.opacity}
                entryProgress={profile.entryProgress}
                exitProgress={profile.exitProgress}
                mobileOffset={profile.mobileOffset}
                mobileScale={profile.mobileScale}
            />

            {/* Links card with scroll-based fade in/out */}
            <LinksCardLive
                opacity={links.opacity}
                entryProgress={links.entryProgress}
                exitProgress={links.exitProgress}
                mobileOffset={links.mobileOffset}
                mobileScale={links.mobileScale}
            />

            {/* Contact card with scroll-based fade in */}
            <ContactCardLive
                opacity={contact.opacity}
                entryProgress={contact.entryProgress}
                mobileOffset={contact.mobileOffset}
                mobileScale={contact.mobileScale}
            />
        </>
    );
}

