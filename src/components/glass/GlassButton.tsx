"use client";

import { ReactNode } from "react";

interface GlassButtonProps {
    icon: ReactNode;
    label: string;
    href: string;
    target?: string;
    rel?: string;
}

export function GlassButton({ icon, label, href, target, rel }: GlassButtonProps) {
    return (
        <>
            <style suppressHydrationWarning dangerouslySetInnerHTML={{
                __html: `
                    .glass-button-link {
                        outline: none;
                        -webkit-tap-highlight-color: transparent;
                        user-select: none;
                        -webkit-user-select: none;
                        position: relative;
                        display: flex;
                        align-items: center;
                        width: 100%;
                        min-height: 80px;
                        border-radius: 40px;
                        background: rgba(255, 255, 255, 0.04);
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        text-decoration: none;
                        cursor: pointer;
                        transform-style: preserve-3d;
                        transform-origin: center center;
                        transform: scale(1);
                        will-change: transform;
                        transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05);
                    }
                    .glass-button-content {
                        display: flex;
                        align-items: center;
                        width: 100%;
                        gap: 16px;
                        padding: 10px 24px 10px 12px;
                        color: var(--color-white, #ffffff);
                        transition: color 0.25s ease;
                    }
                    .glass-button-arrow {
                        opacity: 0.8;
                        display: flex;
                        align-items: center;
                        flex-shrink: 0;
                        transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                        transform: translateX(-4px);
                    }
                    .glass-button-icon {
                        width: 64px;
                        height: 64px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }
                    .glass-button-icon svg {
                        width: 56px;
                        height: 56px;
                    }
                    .glass-button-label {
                        font-size: 15px;
                        flex: 1;
                        min-width: 0;
                        font-weight: 500;
                        white-space: nowrap;
                        word-break: keep-all;
                        overflow-wrap: normal;
                    }
                    
                    /* Hover styles - only on devices that support hover */
                    @media (hover: hover) {
                        .glass-button-link:hover {
                            background: rgba(255, 255, 255, 0.2);
                            border: 1px solid rgba(255, 255, 255, 0.3);
                            transform: translateZ(50px) scale(1.05);
                            box-shadow: 0 12px 32px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3);
                        }
                        .glass-button-link:hover .glass-button-content {
                            color: var(--color-maroon, #4E0506);
                        }
                        .glass-button-link:hover .glass-button-arrow {
                            transform: translateX(4px);
                        }
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
            <a 
                href={href}
                target={target}
                rel={rel}
                className="glass-button-link"
            >
                <div className="glass-button-content">
                    <span className="glass-button-icon">
                        {icon}
                    </span>
                    <span className="glass-button-label">
                        {label}
                    </span>
                    <span className="glass-button-arrow">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </span>
                </div>
            </a>
        </>
    );
}
