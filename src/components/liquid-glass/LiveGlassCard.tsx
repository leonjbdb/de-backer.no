"use client";

import { useRef, ReactNode, useState, useEffect } from "react";

interface LiveGlassCardProps {
    children?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    borderRadius?: number;
    padding?: string | number;
    opacity?: number;
    /** Entry animation progress (0-1), controls scale and translateY */
    entryProgress?: number;
    /** Exit animation progress (0-1), controls scale and translateY for exit */
    exitProgress?: number;
}

export function LiveGlassCard({
    children,
    className,
    style,
    borderRadius = 60,
    padding = 40,
    opacity = 1,
    entryProgress = 1,
    exitProgress = 0,
}: LiveGlassCardProps) {
    const cardRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState("rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const card = cardRef.current;
        if (!card) return;

        let currentRotateX = 0;
        let currentRotateY = 0;
        const smoothingFactor = 0.15;
        const animationId: number | null = null;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isHovering) return;

            const rect = card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const mouseX = e.clientX - centerX;
            const mouseY = e.clientY - centerY;

            const maxTilt = 3;
            const targetRotateX = (mouseY / (rect.height / 2)) * -maxTilt;
            const targetRotateY = (mouseX / (rect.width / 2)) * maxTilt;

            currentRotateX += (targetRotateX - currentRotateX) * smoothingFactor;
            currentRotateY += (targetRotateY - currentRotateY) * smoothingFactor;

            setTransform(`rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg) scale3d(1.01, 1.01, 1.01)`);
        };

        const handleMouseEnter = () => {
            setIsHovering(true);
        };

        const handleMouseLeave = () => {
            setIsHovering(false);
            currentRotateX = 0;
            currentRotateY = 0;
            setTransform("rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)");
        };

        card.addEventListener("mousemove", handleMouseMove);
        card.addEventListener("mouseenter", handleMouseEnter);
        card.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            card.removeEventListener("mousemove", handleMouseMove);
            card.removeEventListener("mouseenter", handleMouseEnter);
            card.removeEventListener("mouseleave", handleMouseLeave);
            if (animationId) cancelAnimationFrame(animationId);
        };
    }, [isHovering]);

    const paddingValue = typeof padding === "number" ? `${padding}px` : padding;

    // Track visibility with a delay to allow fade out transition
    const [isVisible, setIsVisible] = useState(opacity > 0.01);
    
    useEffect(() => {
        if (opacity > 0.01) {
            // Immediately show when opacity increases
            setIsVisible(true);
        } else {
            // Delay hiding to allow fade out transition
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 450); // Slightly longer than the opacity transition
            return () => clearTimeout(timer);
        }
    }, [opacity]);

    // Custom easing function: cubic ease-out for natural motion
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
    const easeInCubic = (t: number) => t * t * t;

    // Entry animation: scale from 0.85 to 1, translateY from 60px to 0, rotateX from -8deg to 0
    const easedEntry = easeOutCubic(entryProgress);
    const entryScale = 0.85 + (0.15 * easedEntry);
    const entryTranslateY = 60 * (1 - easedEntry);
    const entryRotateX = -8 * (1 - easedEntry);

    // Exit animation: scale from 1 to 0.92, translateY from 0 to -40px, rotateX from 0 to 6deg
    const easedExit = easeInCubic(exitProgress);
    const exitScale = 1 - (0.08 * easedExit);
    const exitTranslateY = -40 * easedExit;
    const exitRotateX = 6 * easedExit;

    // Combine entry and exit animations
    const finalScale = entryScale * exitScale;
    const finalTranslateY = entryTranslateY + exitTranslateY;
    const finalRotateX = entryRotateX + exitRotateX;

    return (
        <div
            ref={cardRef}
            className={className}
            style={{
                position: "relative",
                perspective: "1200px",
                transformStyle: "preserve-3d",
                willChange: "transform, opacity",
                opacity: opacity,
                visibility: isVisible ? "visible" : "hidden",
                pointerEvents: opacity > 0.01 ? "auto" : "none",
                transition: "opacity 0.4s ease-in-out",
                transform: `translateY(${finalTranslateY}px) scale(${finalScale}) rotateX(${finalRotateX}deg)`,
                ...style,
            }}
        >
            {/* Glass container with 3D tilt */}
            <div
                style={{
                    position: "relative",
                    borderRadius,
                    transform,
                    transition: isHovering
                        ? "transform 0.05s ease-out"
                        : "transform 0.5s ease-out",
                    transformStyle: "preserve-3d",
                }}
            >
                {/* Glass background with backdrop-filter */}
                <div
                    style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius,
                        background: "rgba(255, 255, 255, 0.08)",
                        backdropFilter: "blur(24px) saturate(120%)",
                        WebkitBackdropFilter: "blur(24px) saturate(120%)",
                        boxShadow: `
                            0 25px 50px rgba(0, 0, 0, 0.25),
                            0 10px 20px rgba(0, 0, 0, 0.15),
                            inset 0 1px 0 rgba(255, 255, 255, 0.2),
                            inset 0 -1px 0 rgba(0, 0, 0, 0.1)
                        `,
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        zIndex: 0,
                        pointerEvents: "none",
                    }}
                />

                {/* Top edge highlight */}
                <div
                    style={{
                        position: "absolute",
                        top: 1,
                        left: "8%",
                        right: "8%",
                        height: 1,
                        background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.5) 20%, rgba(255, 255, 255, 0.6) 50%, rgba(255, 255, 255, 0.5) 80%, transparent 100%)",
                        borderRadius: borderRadius / 2,
                        zIndex: 2,
                        pointerEvents: "none",
                    }}
                />

                {/* Content layer */}
                <div
                    style={{
                        position: "relative",
                        zIndex: 1,
                        padding: paddingValue,
                        transform: "translateZ(10px)",
                        transformStyle: "preserve-3d",
                    }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
