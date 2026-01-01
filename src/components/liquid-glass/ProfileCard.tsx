"use client";

import Image from "next/image";
import { GlassCard } from "./GlassCard";
import { siteConfig } from "@/config/site.config";
import { useGitHubAvatar } from "@/hooks";

export function ProfileCard() {
    const { data: avatarUrl } = useGitHubAvatar(siteConfig.identity.githubUserId, 260);

    return (
        <GlassCard
            style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 100,
                maxWidth: '480px',
            }}
            padding={40}
            borderRadius={60}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                .profile-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 24px;
                    text-align: center;
                }
                .profile-photo-wrapper {
                    position: relative;
                    width: 140px;
                    height: 140px;
                    border-radius: 50%;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
                }
                .profile-photo-wrapper:hover {
                    transform: scale(1.05);
                }
                .profile-photo {
                    border-radius: 50%;
                    object-fit: cover;
                }
                .profile-title {
                    margin: 0;
                    font-size: 32px;
                    font-weight: 700;
                    color: var(--color-white);
                    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
                    letter-spacing: -0.5px;
                    line-height: 1.1;
                }
                .profile-subtitle {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 400;
                    color: var(--color-white);
                    opacity: 0.9;
                    line-height: 1.6;
                    max-width: 400px;
                }
                .profile-welcome {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 500;
                    color: var(--color-white);
                    opacity: 0.8;
                    font-style: italic;
                }
            `}} />


            <div className="profile-content">
                {avatarUrl && (
                    <div className="profile-photo-wrapper">
                        <Image
                            src={avatarUrl}
                            alt={siteConfig.identity.name}
                            width={140}
                            height={140}
                            className="profile-photo"
                            unoptimized
                            priority
                        />
                    </div>
                )}

                <h1 className="profile-title">
                    {siteConfig.identity.name}
                </h1>

                <p className="profile-welcome">
                    Welcome to my little corner of the internet
                </p>
            </div>
        </GlassCard>
    );
}
