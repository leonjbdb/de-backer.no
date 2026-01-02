"use client";

import Image from "next/image";
import { LiveGlassCard } from "./LiveGlassCard";
import { siteConfig } from "@/config/site.config";
import { useGitHubAvatar } from "@/hooks";

interface ProfileCardLiveProps {
    opacity?: number;
    entryProgress?: number;
    exitProgress?: number;
    style?: React.CSSProperties;
}

export function ProfileCardLive({ opacity = 1, entryProgress = 1, exitProgress = 0, style }: ProfileCardLiveProps) {
    const { data: avatarUrl } = useGitHubAvatar(siteConfig.identity.githubUserId, 260);

    return (
        <LiveGlassCard
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 10,
                maxWidth: "480px",
                width: "calc(100% - 48px)",
                ...style,
            }}
            padding={40}
            borderRadius={60}
            opacity={opacity}
            entryProgress={entryProgress}
            exitProgress={exitProgress}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                .profile-content-live {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 24px;
                    text-align: center;
                }
                .profile-photo-wrapper-live {
                    position: relative;
                    width: 140px;
                    height: 140px;
                    border-radius: 50%;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }
                .profile-photo-wrapper-live:hover {
                    transform: scale(1.05);
                }
                .profile-photo-live {
                    border-radius: 50%;
                    object-fit: cover;
                }
                .profile-title-live {
                    margin: 0;
                    font-size: 32px;
                    font-weight: 700;
                    color: var(--color-white, #ffffff);
                    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
                    letter-spacing: -0.5px;
                    line-height: 1.1;
                }
                .profile-welcome-live {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 500;
                    color: var(--color-white, #ffffff);
                    opacity: 0.8;
                    font-style: italic;
                }
            `}} />

            <div className="profile-content-live">
                {avatarUrl && (
                    <div className="profile-photo-wrapper-live">
                        <Image
                            src={avatarUrl}
                            alt={siteConfig.identity.name}
                            width={140}
                            height={140}
                            className="profile-photo-live"
                            unoptimized
                            priority
                        />
                    </div>
                )}

                <h2 className="profile-title-live">
                    {siteConfig.identity.name}
                </h2>

                <p className="profile-welcome-live">
                    Welcome to my little corner of the internet
                </p>
            </div>
        </LiveGlassCard>
    );
}

