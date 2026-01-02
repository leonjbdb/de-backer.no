"use client";

import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { GlassCard } from "@/components/glass";
import { siteConfig } from "@/config/site.config";

interface ProfileCardProps {
    opacity?: number;
    entryProgress?: number;
    exitProgress?: number;
    mobileOffset?: number;
    mobileScale?: number;
    style?: React.CSSProperties;
}

export function ProfileCard({ opacity = 1, entryProgress = 1, exitProgress = 0, mobileOffset = 0, mobileScale = 1, style }: ProfileCardProps) {
    const [isPhotoHovered, setIsPhotoHovered] = useState(false);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced hover handlers to prevent flickering at edges
    const handleMouseEnter = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setIsPhotoHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        // Small delay before removing hover state to prevent edge flickering
        hoverTimeoutRef.current = setTimeout(() => {
            setIsPhotoHovered(false);
        }, 50);
    }, []);

    return (
        <GlassCard
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                zIndex: 10,
                maxWidth: "480px",
                width: "calc(100% - 32px)",
                ...style,
            }}
            padding="clamp(24px, 5vw, 40px)"
            borderRadius={60}
            opacity={opacity}
            entryProgress={entryProgress}
            exitProgress={exitProgress}
            mobileOffset={mobileOffset}
            mobileScale={mobileScale}
        >
            <style suppressHydrationWarning dangerouslySetInnerHTML={{
                __html: `
                .profile-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                    text-align: center;
                    transform-style: preserve-3d;
                }
                .about-header {
                    margin: 0;
                    font-size: 24px;
                    font-weight: 600;
                    color: var(--color-white, #ffffff);
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
                    text-align: center;
                }
                /* Stable hover zone - doesn't change size when inner content scales */
                .profile-photo-hover-zone {
                    padding: 10px;
                    margin: -10px;
                }
                .profile-photo-wrapper {
                    position: relative;
                    width: 140px;
                    height: 140px;
                    border-radius: 50%;
                    overflow: hidden;
                    transform-style: preserve-3d;
                    transform-origin: center center;
                    transform: scale(1);
                    will-change: transform;
                    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                                box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }
                .profile-photo {
                    border-radius: 50%;
                    object-fit: cover;
                }
                .profile-name {
                    margin: 0;
                    font-size: 32px;
                    font-weight: 700;
                    color: var(--color-white, #ffffff);
                    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
                    letter-spacing: -0.5px;
                    line-height: 1.1;
                }
                .about-info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .about-role {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 500;
                    color: var(--color-white, #ffffff);
                    opacity: 0.9;
                }
                .about-org {
                    margin: 0;
                    font-size: 15px;
                    font-weight: 400;
                    color: var(--color-white, #ffffff);
                    opacity: 0.75;
                }
            `}} />

            <div className="profile-content">
                <h2 className="about-header">
                    About
                </h2>

                {/* Hover zone wrapper - stable bounds that don't change with scale */}
                <div 
                    className="profile-photo-hover-zone"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div 
                        className="profile-photo-wrapper"
                        style={{
                            transform: isPhotoHovered ? 'translateZ(50px) scale(1.08)' : 'scale(1)',
                            boxShadow: isPhotoHovered 
                                ? '0 16px 48px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3)'
                                : '0 8px 32px rgba(0, 0, 0, 0.3)',
                        }}
                    >
                        <Image
                            src="/leon.jpeg"
                            alt={siteConfig.identity.name}
                            width={140}
                            height={140}
                            className="profile-photo"
                            priority
                        />
                    </div>
                </div>

                <h3 className="profile-name">
                    {siteConfig.identity.name}
                </h3>

                <div className="about-info">
                    <p className="about-role">
                        Head Engineer — AV and IoT
                    </p>
                    <p className="about-org">
                        University of Oslo
                    </p>
                </div>
            </div>
        </GlassCard>
    );
}

