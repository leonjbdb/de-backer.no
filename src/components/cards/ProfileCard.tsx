"use client";

import Image from "next/image";
import { useState, useRef, useCallback } from "react";
import { siteConfig } from "@/config/site.config";
import { CardTemplate } from "./CardTemplate";

/**
 * ProfileCard - Pure content component
 * Only handles the card's content, no animation/transition logic
 */
export function ProfileCard() {
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
		<>
			<style suppressHydrationWarning dangerouslySetInnerHTML={{
				__html: `
                /* Stable hover zone - doesn't change size when inner content scales */
                .profile-photo-hover-zone {
                    padding: 10px;
                    margin: -10px;
                }
                .profile-photo-wrapper {
                    position: relative;
                    width: 140px;
                    height: 140px;
                    transform-style: preserve-3d;
                    transform-origin: center center;
                    transform: scale(1);
                    will-change: transform;
                    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
                                box-shadow 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                    border-radius: 50%;
                }
                /* Separate clipping layer to fix Firefox border-radius + 3D transform bug */
                .profile-photo-clipper {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    overflow: hidden;
                    isolation: isolate;
                }
                .profile-photo {
                    border-radius: 50%;
                    object-fit: cover;
                    display: block;
                }
                .profile-name {
                    margin: 0;
                    font-size: clamp(24px, 6vw, 32px);
                    font-weight: 700;
                    color: var(--color-white, #ffffff);
                    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
                    letter-spacing: -0.5px;
                    line-height: 1.1;
                    max-width: 100%;
                }
                /* Prevent "De Backer" from breaking */
                .profile-name .no-break {
                    white-space: nowrap;
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

			<CardTemplate title="About">
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
						<div className="profile-photo-clipper">
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
				</div>

				<h3 className="profile-name">
					Leon Joachim Buverud <span className="no-break">De Backer</span>
				</h3>

				<div className="about-info">
					<p className="about-role">
						{siteConfig.identity.role} — {siteConfig.identity.division}
					</p>
					<p className="about-org">
						{siteConfig.identity.organization}
					</p>
				</div>
			</CardTemplate>
		</>
	);
}
