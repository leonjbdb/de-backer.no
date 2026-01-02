"use client";

interface ScrollDotIndicatorProps {
    totalSections: number;
    activeSection: number;
    onDotClick: (index: number) => void;
    visible: boolean;
    theme: "light" | "dark";
}

export function ScrollDotIndicator({
    totalSections,
    activeSection,
    onDotClick,
    visible,
    theme,
}: ScrollDotIndicatorProps) {
    // Colors based on theme
    const activeColor = theme === "dark" ? "#ffffff" : "#000000";
    const inactiveColor = theme === "dark" ? "#888888" : "#555555";
    const passedColor = theme === "dark" ? "#444444" : "#999999"; // Deeper grey for passed sections
    const glowColor = theme === "dark" ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.3)";

    return (
        <>
            <style jsx>{`
                .dot-indicator {
                    position: fixed;
                    z-index: 50;
                    display: flex;
                    gap: 12px;
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.5s ease, visibility 0.5s ease;
                    pointer-events: none;
                }

                .dot-indicator.visible {
                    opacity: 1;
                    visibility: visible;
                    pointer-events: auto;
                }

                /* Desktop: left corner, vertical layout */
                @media (min-width: 768px) {
                    .dot-indicator {
                        left: 32px;
                        top: 50%;
                        transform: translateY(-50%);
                        flex-direction: column;
                    }
                }

                /* Mobile: bottom center, horizontal layout */
                @media (max-width: 767px) {
                    .dot-indicator {
                        bottom: 32px;
                        left: 50%;
                        transform: translateX(-50%);
                        flex-direction: row;
                    }
                }

                .dot {
                    width: 10px;
                    height: 10px;
                    border-radius: 50%;
                    cursor: pointer;
                    transition: 
                        background-color 0.3s ease,
                        box-shadow 0.3s ease,
                        transform 0.2s ease;
                    border: none;
                    padding: 0;
                    outline: none;
                }

                .dot:hover {
                    transform: scale(1.2);
                }

                .dot:focus-visible {
                    outline: 2px solid ${activeColor};
                    outline-offset: 2px;
                }

                .dot.active {
                    background-color: ${activeColor};
                    box-shadow: 
                        0 0 8px ${glowColor},
                        0 0 16px ${glowColor},
                        0 0 24px ${glowColor};
                }

                .dot.inactive {
                    background-color: ${inactiveColor};
                    box-shadow: none;
                }

                .dot.passed {
                    background-color: ${passedColor};
                    box-shadow: none;
                }
            `}</style>

            <nav 
                className={`dot-indicator ${visible ? "visible" : ""}`}
                aria-label="Section navigation"
            >
                {Array.from({ length: totalSections }, (_, index) => {
                    const isActive = activeSection === index;
                    const isPassed = index < activeSection;
                    const isUpcoming = index > activeSection;
                    
                    let dotClass = "dot";
                    if (isActive) {
                        dotClass += " active";
                    } else if (isPassed) {
                        dotClass += " passed";
                    } else if (isUpcoming) {
                        dotClass += " inactive";
                    }
                    
                    return (
                        <button
                            key={index}
                            className={dotClass}
                            onClick={() => onDotClick(index)}
                            aria-label={`Go to section ${index + 1}`}
                            aria-current={isActive ? "true" : undefined}
                            type="button"
                        />
                    );
                })}
            </nav>
        </>
    );
}
