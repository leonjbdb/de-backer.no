"use client";

import { ReactNode, useState } from "react";

interface GlassButtonLiveProps {
    icon: ReactNode;
    label: string;
    href: string;
    target?: string;
    rel?: string;
}

export function GlassButtonLive({ icon, label, href, target, rel }: GlassButtonLiveProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const isActive = isHovered || isFocused;

    return (
        <a 
            href={href}
            target={target}
            rel={rel}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            style={{
                outline: 'none',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                width: '420px',
                minHeight: '80px',
                borderRadius: '40px',
                background: isActive ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: isActive ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                textDecoration: 'none',
                cursor: 'pointer',
                transformStyle: 'preserve-3d',
                transform: isActive ? 'translateZ(50px) scale(1.05)' : 'none',
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
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '10px 24px 10px 12px',
                width: '100%',
                color: isActive ? 'var(--color-maroon, #4E0506)' : 'var(--color-white, #ffffff)',
                transition: 'color 0.25s ease',
            }}>
                {/* Icon */}
                <span style={{ 
                    width: 64, 
                    height: 64, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0
                }}>
                    {icon}
                </span>
                
                {/* Label */}
                <span style={{ flex: 1, fontSize: '15px', fontWeight: '500' }}>
                    {label}
                </span>
                
                {/* Arrow */}
                <span style={{
                    opacity: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isActive ? 'translateX(4px)' : 'translateX(-4px)',
                }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                </span>
            </div>
        </a>
    );
}
