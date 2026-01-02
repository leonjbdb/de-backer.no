"use client";

import type { GreetingVisibility } from "../types";

interface GreetingSectionProps {
    stage: number;
    visibility: GreetingVisibility;
    theme: "light" | "dark";
}

/**
 * The "Hi!" greeting that appears on initial load
 * Fades out as user scrolls down
 */
export function GreetingSection({ stage, visibility, theme }: GreetingSectionProps) {
    // Don't render if not visible
    if (!visibility.visible && stage >= 3) {
        return null;
    }

    const greetingClass = [
        "greeting",
        stage >= 1 ? "emerging" : "",
        stage >= 2 ? "popped" : "",
    ]
        .filter(Boolean)
        .join(" ");

    return (
        <>
            <style jsx>{`
                .greeting {
                    font-size: clamp(5rem, 20vw, 14rem);
                    font-weight: 700;
                    letter-spacing: -0.04em;
                    color: #000000;
                    transform: scale(0.7);
                    transition: color 8s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 10s cubic-bezier(0.16, 1, 0.3, 1), text-shadow 5s ease 3s;
                    position: relative;
                    z-index: 10;
                    visibility: hidden;
                    user-select: none;
                    -webkit-user-select: none;
                    pointer-events: none;
                }

                .greeting.emerging {
                    visibility: visible;
                    color: #888888;
                    transform: scale(0.9);
                    text-shadow: 0 0 60px rgba(78, 5, 6, 0.4), 0 0 120px rgba(78, 5, 6, 0.2);
                }

                .greeting.popped {
                    color: ${theme === "light" ? "#1a1a1a" : "#ffffff"};
                    transform: scale(1);
                    transition: color 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                        transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), text-shadow 0.5s ease;
                    text-shadow: 0 0 100px rgba(78, 5, 6, 0.8), 0 0 200px rgba(78, 5, 6, 0.4),
                        0 0 300px rgba(78, 5, 6, 0.2);
                }
            `}</style>

            <h1
                className={greetingClass}
                style={{
                    opacity: stage >= 3 ? visibility.opacity : undefined,
                    visibility: visibility.opacity <= 0 ? "hidden" : undefined,
                }}
            >
                Hi!
            </h1>
        </>
    );
}

