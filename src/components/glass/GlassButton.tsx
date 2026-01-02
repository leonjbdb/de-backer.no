"use client";

import { ReactNode, useState, useCallback, useRef } from "react";

interface GlassButtonProps {
    icon: ReactNode;
    label: string;
    href: string;
    target?: string;
    rel?: string;
}

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768;

export function GlassButton({ icon, label, href, target, rel }: GlassButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isPressed, setIsPressed] = useState(false);
    const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const isActive = isHovered || isFocused || isPressed;

    // Debounced hover handlers to prevent flickering at edges
    const handleMouseEnter = useCallback(() => {
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
        }
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        // Small delay before removing hover state to prevent edge flickering
        hoverTimeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 50);
    }, []);

    // Handle click with animation delay on mobile
    const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        // Check if mobile
        if (window.innerWidth < MOBILE_BREAKPOINT) {
            e.preventDefault();
            
            // Trigger pressed state to show animation
            setIsPressed(true);
            
            // Navigate after animation plays
            setTimeout(() => {
                if (target === '_blank') {
                    window.open(href, target, rel ? `noopener,noreferrer` : undefined);
                } else {
                    window.location.href = href;
                }
                // Reset pressed state after navigation starts
                setTimeout(() => setIsPressed(false), 100);
            }, 250); // Animation duration
        }
    }, [href, target, rel]);

    return (
        <>
            <style suppressHydrationWarning dangerouslySetInnerHTML={{
                __html: `
                    .glass-button-arrow {
                        opacity: 0.8;
                        display: flex;
                        align-items: center;
                        flex-shrink: 0;
                    }
                    .glass-button-icon {
                        width: 64px;
                        height: 64px;
                    }
                    .glass-button-icon svg {
                        width: 56px;
                        height: 56px;
                    }
                    .glass-button-content {
                        gap: 16px;
                        padding: 10px 24px 10px 12px;
                    }
                    .glass-button-label {
                        font-size: 15px;
                    }
                    @media (max-width: 480px) {
                        .glass-button-arrow {
                            display: none;
                        }
                        .glass-button-icon {
                            width: 44px;
                            height: 44px;
                        }
                        .glass-button-icon svg {
                            width: 36px;
                            height: 36px;
                        }
                        .glass-button-content {
                            gap: 10px;
                            padding: 8px 16px 8px 8px;
                        }
                        .glass-button-label {
                            font-size: 13px;
                        }
                        .glass-button-link {
                            min-height: 60px;
                        }
                    }
                `
            }} />
            {/* Outer wrapper handles hover detection - its bounds stay stable even when inner content scales */}
            <div
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '420px',
                    // Generous padding buffer to accommodate scale growth and prevent edge flickering
                    // Using 8px provides extra safety margin beyond the ~4px scale growth
                    padding: '8px',
                    margin: '-8px',
                    // Ensure the padding area catches pointer events
                    pointerEvents: 'auto',
                }}
            >
                <a 
                    href={href}
                    target={target}
                    rel={rel}
                    className="glass-button-link"
                    onClick={handleClick}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={{
                        outline: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        minHeight: '80px',
                        borderRadius: '40px',
                        background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        border: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                        textDecoration: 'none',
                        cursor: 'pointer',
                        transformStyle: 'preserve-3d',
                        // Transform origin ensures scaling is centered
                        transformOrigin: 'center center',
                        transform: isActive ? 'translateZ(50px) scale(1.05)' : 'scale(1)',
                        // Use will-change for smoother animations and to prevent reflow
                        willChange: 'transform',
                        transition: 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
                        boxShadow: isActive 
                            ? '0 12px 32px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)'
                            : '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                    }}
                >
                    {/* Focus ring */}
                    <div style={{
                        position: 'absolute',
                        inset: '-3px',
                        borderRadius: '43px',
                        border: '2px solid var(--color-maroon, #4E0506)',
                        opacity: isFocused ? 1 : 0,
                        pointerEvents: 'none',
                        transition: 'opacity 0.2s ease',
                    }} />
                    
                    {/* Content */}
                    <div 
                        className="glass-button-content"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            width: '100%',
                            color: isActive ? 'var(--color-maroon, #4E0506)' : 'var(--color-white, #ffffff)',
                            transition: 'color 0.25s ease',
                        }}
                    >
                        {/* Icon */}
                        <span 
                            className="glass-button-icon"
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            {icon}
                        </span>
                        
                        {/* Label */}
                        <span 
                            className="glass-button-label"
                            style={{ 
                                flex: 1,
                                minWidth: 0,
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                wordBreak: 'keep-all',
                                overflowWrap: 'normal',
                            }}
                        >
                            {label}
                        </span>
                        
                        {/* Arrow - hidden on mobile via CSS */}
                        <span 
                            className="glass-button-arrow"
                            style={{
                                transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isActive ? 'translateX(4px)' : 'translateX(-4px)',
                            }}
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14M12 5l7 7-7 7"/>
                            </svg>
                        </span>
                    </div>
                </a>
            </div>
        </>
    );
}

