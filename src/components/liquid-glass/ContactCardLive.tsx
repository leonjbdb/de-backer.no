"use client";

import { LiveGlassCard } from "./LiveGlassCard";
import { GlassButtonLive } from "./GlassButtonLive";
import { siteConfig } from "@/config/site.config";

function EmailIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/>
            <path d="M22 7l-10 7L2 7"/>
        </svg>
    );
}

interface ContactCardLiveProps {
    opacity?: number;
    entryProgress?: number;
    style?: React.CSSProperties;
}

export function ContactCardLive({ opacity = 1, entryProgress = 1, style }: ContactCardLiveProps) {
    return (
        <LiveGlassCard
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 10,
                maxWidth: "480px",
                width: "calc(100% - 32px)",
                ...style,
            }}
            padding="clamp(16px, 4vw, 30px)"
            borderRadius={60}
            opacity={opacity}
            entryProgress={entryProgress}
        >
            <h2 style={{
                margin: '0 0 8px 0',
                fontSize: '24px',
                fontWeight: '600',
                color: 'var(--color-white, #ffffff)',
                textAlign: 'center',
                textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)'
            }}>
                Contact
            </h2>

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                transformStyle: 'preserve-3d'
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transformStyle: 'preserve-3d' }}>
                    <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'var(--color-white, #ffffff)',
                        opacity: 0.7,
                        textAlign: 'center'
                    }}>
                        for private or other inquiries:
                    </p>
                    <GlassButtonLive 
                        href={`mailto:${siteConfig.contact.email}`}
                        icon={<EmailIcon />}
                        label={siteConfig.contact.email}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transformStyle: 'preserve-3d' }}>
                    <p style={{
                        margin: '0 0 8px 0',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: 'var(--color-white, #ffffff)',
                        opacity: 0.7,
                        textAlign: 'center'
                    }}>
                        for UiO related inquiries:
                    </p>
                    <GlassButtonLive 
                        href="mailto:l.j.b.de.backer@usit.uio.no"
                        icon={<EmailIcon />}
                        label="l.j.b.de.backer@usit.uio.no"
                    />
                </div>
            </div>
        </LiveGlassCard>
    );
}
