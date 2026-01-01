"use client";

import { GlassCard, GlassButton } from "./";
import { siteConfig } from "@/config/site.config";

export function ContactCard() {
    return (
        <GlassCard
            style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
            }}
            padding={40}
            borderRadius={60}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                .contact-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                    text-align: center;
                }
                .contact-title {
                    margin: 0;
                    font-size: 28px;
                    font-weight: 600;
                    color: var(--color-white);
                    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
                }
                .contact-email-label {
                    margin: 0 0 8px 0;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--color-white);
                    opacity: 0.7;
                }
                .contact-email-content {
                    color: var(--color-white);
                    transition: color 0.2s ease;
                }
                .glass-button-context {
                    outline: none;
                    position: relative;
                    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), z-index 0s linear 0.1s;
                }
                .glass-button-context .glass-focus-ring {
                    border: 2px solid var(--color-maroon);
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                .glass-button-context:focus-visible .glass-focus-ring {
                    opacity: 1;
                }
                .glass-button-context:hover,
                .glass-button-context:focus-within {
                    transform: translateZ(50px) scale(1.05);
                    z-index: 50;
                    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), z-index 0s linear 0s;
                }
                .glass-button:hover .contact-email-content,
                .glass-button-context:focus-visible .contact-email-content {
                    color: var(--color-maroon);
                }
                .contact-arrow {
                    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    transform: translateX(-4px);
                }
                .glass-button:hover .contact-arrow,
                .glass-button-context:focus-visible .contact-arrow {
                    transform: translateX(4px);
                }
            `}} />

            <div className="contact-content">
                <h2 className="contact-title">Contact</h2>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p className="contact-email-label">for private or other inquiries:</p>
                    <GlassButton
                        type="pill"
                        size={18}
                        href={`mailto:${siteConfig.contact.email}`}
                        style={{ width: '420px', minHeight: '80px' }}
                    >
                        <div
                            className="contact-email-content"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '10px 24px 10px 12px',
                                width: '100%'
                            }}
                        >
                            <span style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <path d="M22 7l-10 7L2 7" />
                                </svg>
                            </span>
                            <span style={{ flex: 1, fontSize: '15px', fontWeight: '500' }}>
                                {siteConfig.contact.email}
                            </span>
                            <span className="contact-arrow" style={{ opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </span>
                        </div>
                    </GlassButton>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <p className="contact-email-label">for UiO related inquiries:</p>
                    <GlassButton
                        type="pill"
                        size={18}
                        href="mailto:l.j.b.de.backer@usit.uio.no"
                        style={{ width: '420px', minHeight: '80px' }}
                    >
                        <div
                            className="contact-email-content"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '10px 24px 10px 12px',
                                width: '100%'
                            }}
                        >
                            <span style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="2" y="4" width="20" height="16" rx="2" />
                                    <path d="M22 7l-10 7L2 7" />
                                </svg>
                            </span>
                            <span style={{ flex: 1, fontSize: '15px', fontWeight: '500' }}>
                                l.j.b.de.backer@usit.uio.no
                            </span>
                            <span className="contact-arrow" style={{ opacity: 0.8, display: 'flex', alignItems: 'center' }}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </span>
                        </div>
                    </GlassButton>
                </div>
            </div>
        </GlassCard>
    );
}
