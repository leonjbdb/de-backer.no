"use client";

import { useRef, useCallback } from "react";

interface ScrollDotIndicatorProps {
	totalSections: number;
	activeSection: number;
	onDotClick: (index: number) => void;
	visible: boolean;
	theme: "light" | "dark";
	sectionLabels: string[];
}

export function ScrollDotIndicator({
	totalSections,
	activeSection,
	onDotClick,
	visible,
	theme,
	sectionLabels,
}: ScrollDotIndicatorProps) {
	// Refs for each dot button
	const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);

	// Handle arrow key navigation within the dot indicator
	const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
		let targetIndex: number | null = null;

		if (e.key === "ArrowDown" || e.key === "ArrowRight") {
			e.preventDefault();
			targetIndex = Math.min(totalSections - 1, currentIndex + 1);
		} else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
			e.preventDefault();
			targetIndex = Math.max(0, currentIndex - 1);
		} else if (e.key === "Home") {
			e.preventDefault();
			targetIndex = 0;
		} else if (e.key === "End") {
			e.preventDefault();
			targetIndex = totalSections - 1;
		}

		if (targetIndex !== null && targetIndex !== currentIndex) {
			// Navigate to the section and move focus
			onDotClick(targetIndex);
			dotRefs.current[targetIndex]?.focus();
		}
	}, [totalSections, onDotClick]);

	// Don't render at all until visible to prevent flash
	if (!visible) {
		return null;
	}

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
                    -webkit-tap-highlight-color: transparent;
                }

                .dot:hover {
                    transform: scale(1.2);
                }

                .dot:focus-visible {
                    outline: 3px solid #ffffff;
                    outline-offset: 3px;
                    box-shadow: 0 0 0 4px rgba(0, 0, 0, 0.5);
                    transform: scale(1.3);
                }

                /* Dark outline for light theme focus */
                .dot.light-theme:focus-visible {
                    outline: 3px solid #000000;
                }

				.dot:active {
                    background-color: var(--color-maroon, #4E0506) !important;
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

                .dot-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .dot-label {
                    position: absolute;
                    white-space: nowrap;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 500;
                    pointer-events: none;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    z-index: 100;
                    background: ${theme === "dark" ? "rgba(0, 0, 0, 0.9)" : "rgba(255, 255, 255, 0.95)"};
                    color: ${theme === "dark" ? "#ffffff" : "#000000"};
                    border: 1px solid ${theme === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.1)"};
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                    backdrop-filter: blur(10px);
                }

                .dot:hover + .dot-label,
                .dot:focus-visible + .dot-label {
                    opacity: 1;
                }

                /* Desktop: label appears to the right */
                @media (min-width: 768px) {
                    .dot-label {
                        left: calc(100% + 12px);
                        top: 50%;
                        transform: translateY(-50%);
                    }
                }

                /* Mobile: label appears above */
                @media (max-width: 767px) {
                    .dot-label {
                        bottom: calc(100% + 12px);
                        left: 50%;
                        transform: translateX(-50%);
                    }
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
					if (theme === "light") {
						dotClass += " light-theme";
					}
					if (isActive) {
						dotClass += " active";
					} else if (isPassed) {
						dotClass += " passed";
					} else if (isUpcoming) {
						dotClass += " inactive";
					}

					const label = sectionLabels[index] || `Section ${index + 1}`;

					return (
						<div key={index} className="dot-wrapper">
							<button
								ref={(el) => {
									dotRefs.current[index] = el;
								}}
								className={dotClass}
								onClick={() => onDotClick(index)}
								onKeyDown={(e) => handleKeyDown(e, index)}
								aria-label={`Go to ${label}`}
								aria-current={isActive ? "true" : undefined}
								tabIndex={isActive ? 0 : -1}
								type="button"
							/>
							<span className="dot-label" aria-hidden="true">
								{label}
							</span>
						</div>
					);
				})}
			</nav>
		</>
	);
}
