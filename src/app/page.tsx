"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ThemeToggle } from "@/components";
import { useTheme } from "@/components/providers";
import { OrbField } from "@/components/orb-field";
import { ProfileCardLive } from "@/components/liquid-glass/ProfileCardLive";
import { LinksCardLive } from "@/components/liquid-glass/LinksCardLive";
import { ContactCardLive } from "@/components/liquid-glass/ContactCardLive";
import { ScrollDotIndicator } from "@/components/ui/ScrollDotIndicator";

// Total scroll sections (in viewport heights)
const TOTAL_SECTIONS = 4;

// Resting points for scroll snap (in viewport heights)
// These are the "bottom" points where cards are fully visible
// Index 0 = Profile, 1 = Links, 2 = Contact (no Hi! since it's one-time)
const RESTING_POINTS = [0.75, 1.75, 2.75];

// Minimum scroll position once greeting is passed (profile card fully visible position)
const MIN_SCROLL_AFTER_GREETING = 0.75;

// Scroll snap debounce delay (ms) - longer delay for gentler snapping
const SNAP_DELAY = 500;

export default function HomePage() {
    const [stage, setStage] = useState(0);
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
    const [scrollProgress, setScrollProgress] = useState(0);
    const [hasPassedGreeting, setHasPassedGreeting] = useState(false);
    const [activeSection, setActiveSection] = useState(0);
    const [isJumping, setIsJumping] = useState(false); // For fade transition when clicking dots
    const rafRef = useRef<number | undefined>(undefined);
    const snapTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const isSnappingRef = useRef(false);
    const { theme } = useTheme();

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (rafRef.current) return;
        rafRef.current = requestAnimationFrame(() => {
            setMousePos({
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
            });
            rafRef.current = undefined;
        });
    }, []);

    // Smooth scroll to a resting point with parabolic animation for natural feel
    const scrollToRestingPoint = useCallback((targetProgress: number) => {
        const viewportHeight = window.innerHeight;
        const targetScrollY = targetProgress * viewportHeight;
        const startScrollY = window.scrollY;
        const distance = targetScrollY - startScrollY;
        
        // Don't animate if already very close
        if (Math.abs(distance) < 5) return;
        
        isSnappingRef.current = true;
        
        // Duration scales with distance for natural feel
        // Base: ~2400ms for small distances, up to ~6000ms for large distances
        const distanceInVh = Math.abs(distance) / viewportHeight;
        const duration = Math.min(6000, Math.max(2400, distanceInVh * 7500));
        const startTime = performance.now();
        
        const animateScroll = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Parabolic easing: starts slow, accelerates, then decelerates naturally
            // Like a ball rolling into a valley and settling at the bottom
            // Using ease-in-out quint for a smooth parabolic feel
            const eased = progress < 0.5
                ? 16 * progress * progress * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 5) / 2;
            
            window.scrollTo({
                top: startScrollY + distance * eased,
                behavior: 'instant'
            });
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            } else {
                isSnappingRef.current = false;
            }
        };
        
        requestAnimationFrame(animateScroll);
    }, []);

    // Find nearest resting point
    const findNearestRestingPoint = useCallback((progress: number): number => {
        // All resting points are for the 3 cards (Profile, Links, Contact)
        let nearest = RESTING_POINTS[0];
        let minDistance = Math.abs(progress - nearest);
        
        for (const point of RESTING_POINTS) {
            const distance = Math.abs(progress - point);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = point;
            }
        }
        
        return nearest;
    }, []);

    // Handle scroll for fade transitions
    const handleScroll = useCallback(() => {
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
        // Progress in viewport heights (0 to TOTAL_SECTIONS)
        let progress = scrollY / viewportHeight;
        
        // Mark greeting as passed once user reaches the profile card's fully visible position
        if (progress >= 0.7 && !hasPassedGreeting) {
            setHasPassedGreeting(true);
        }
        
        // Prevent scrolling above the minimum position when greeting is passed
        if (hasPassedGreeting && progress < MIN_SCROLL_AFTER_GREETING) {
            window.scrollTo({
                top: MIN_SCROLL_AFTER_GREETING * viewportHeight,
                behavior: 'instant'
            });
            progress = MIN_SCROLL_AFTER_GREETING;
        }
        
        setScrollProgress(progress);
        
        // Determine active section for dot indicator (3 sections: Profile=0, Links=1, Contact=2)
        if (progress < 1.25) {
            setActiveSection(0); // Profile
        } else if (progress < 2.25) {
            setActiveSection(1); // Links
        } else {
            setActiveSection(2); // Contact
        }
        
        // Clear any existing snap timeout
        if (snapTimeoutRef.current) {
            clearTimeout(snapTimeoutRef.current);
        }
        
        // Don't snap if we're currently in a snap animation
        if (isSnappingRef.current) return;
        
        // Set up snap timeout - will trigger after user stops scrolling
        snapTimeoutRef.current = setTimeout(() => {
            let currentProgress = window.scrollY / window.innerHeight;
            
            // Enforce minimum scroll position
            if (hasPassedGreeting && currentProgress < MIN_SCROLL_AFTER_GREETING) {
                currentProgress = MIN_SCROLL_AFTER_GREETING;
            }
            
            const nearestPoint = findNearestRestingPoint(currentProgress);
            
            // Only snap if we're not already at the resting point
            if (Math.abs(currentProgress - nearestPoint) > 0.08) {
                scrollToRestingPoint(nearestPoint);
            }
        }, SNAP_DELAY);
    }, [hasPassedGreeting, findNearestRestingPoint, scrollToRestingPoint]);

    // Handle dot click navigation (3 dots for Profile, Links, Contact)
    // Fade out current card, jump, then fade in new card
    const handleDotClick = useCallback((index: number) => {
        const targetProgress = RESTING_POINTS[index];
        const viewportHeight = window.innerHeight;
        
        // Don't do anything if already jumping or clicking current section
        if (isJumping || index === activeSection) return;
        
        // Clear any pending snap
        if (snapTimeoutRef.current) {
            clearTimeout(snapTimeoutRef.current);
        }
        
        // Start fade out
        setIsJumping(true);
        
        // After fade out completes, jump to new position
        setTimeout(() => {
            window.scrollTo({
                top: targetProgress * viewportHeight,
                behavior: 'instant'
            });
            
            // Wait a moment then fade in the new card
            setTimeout(() => {
                setIsJumping(false);
            }, 100);
        }, 400); // Wait for fade out to complete
    }, [activeSection, isJumping]);

    useEffect(() => {
        const timer1 = setTimeout(() => setStage(1), 1500);
        const timer2 = setTimeout(() => setStage(2), 6000);
        const timer3 = setTimeout(() => setStage(3), 7500);

        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
            window.removeEventListener('mousemove', handleMouseMove);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
        };
    }, [handleMouseMove]);

    // Add scroll listener and enable scrolling after stage 3 (animations complete)
    useEffect(() => {
        if (stage >= 3) {
            // Enable scrolling by directly setting body overflow and min-height
            document.body.style.overflowY = 'auto';
            document.body.style.minHeight = `${TOTAL_SECTIONS * 100}vh`;
            document.documentElement.style.overflowY = 'auto';
            
            window.addEventListener('scroll', handleScroll);
            // Use requestAnimationFrame to defer the initial scroll check
            const rafId = requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                const viewportHeight = window.innerHeight;
                const progress = scrollY / viewportHeight;
                setScrollProgress(progress);
            });
            return () => {
                window.removeEventListener('scroll', handleScroll);
                cancelAnimationFrame(rafId);
                document.body.style.minHeight = '';
            };
        } else {
            // Disable scrolling before stage 3
            document.body.style.overflowY = 'hidden';
            document.body.style.minHeight = '100vh';
            document.documentElement.style.overflowY = 'hidden';
        }
    }, [stage, handleScroll]);

    // Calculate section-based visibility and animations with spacing
    // New scroll zones with dead space between cards:
    // Section 0-0.3: Hi! visible (fades out 0.2-0.4)
    // Section 0.4-0.5: Dead zone (nothing visible)
    // Section 0.5-1.2: Profile visible (entry 0.5-0.7, exit 1.0-1.2)
    // Section 1.2-1.4: Dead zone
    // Section 1.4-2.2: Links visible (entry 1.4-1.6, exit 2.0-2.2)
    // Section 2.2-2.4: Dead zone
    // Section 2.4+: Contact visible (entry 2.4-2.6)

    // Hi! opacity: 1 at 0-0.2, fades to 0 at 0.4 (but hidden if hasPassedGreeting)
    const greetingOpacity = hasPassedGreeting 
        ? 0 
        : Math.max(0, Math.min(1, 1 - (scrollProgress - 0.2) / 0.2));

    // Profile: entry 0.5-0.7, exit 1.0-1.2
    const profileEntry = Math.max(0, Math.min(1, (scrollProgress - 0.5) / 0.2));
    const profileExit = Math.max(0, Math.min(1, (scrollProgress - 1.0) / 0.2));
    const profileOpacity = profileEntry * (1 - profileExit);
    const profileEntryProgress = profileEntry;
    const profileExitProgress = profileExit;

    // Links: entry 1.4-1.6, exit 2.0-2.2
    const linksEntry = Math.max(0, Math.min(1, (scrollProgress - 1.4) / 0.2));
    const linksExit = Math.max(0, Math.min(1, (scrollProgress - 2.0) / 0.2));
    const linksOpacity = linksEntry * (1 - linksExit);
    const linksEntryProgress = linksEntry;
    const linksExitProgress = linksExit;

    // Contact: entry 2.4-2.6
    const contactEntry = Math.max(0, Math.min(1, (scrollProgress - 2.4) / 0.2));
    const contactOpacity = contactEntry;
    const contactEntryProgress = contactEntry;

    return (
        <>
            <style jsx global>{`
                html, body {
                    background: #000000 !important;
                    overflow-x: hidden;
                }
            `}</style>

            <style jsx>{`
                .homepage {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: fixed;
                    inset: 0;
                    background: #000000;
                    transition: background 0.8s ease;
                }
                
                .homepage.popped {
                    background: ${theme === 'light' ? '#e8e4e0' : '#000000'};
                }
                
                .greeting {
                    font-size: clamp(5rem, 20vw, 14rem);
                    font-weight: 700;
                    letter-spacing: -0.04em;
                    color: #000000;
                    transform: scale(0.7);
                    transition: 
                        color 8s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 10s cubic-bezier(0.16, 1, 0.3, 1),
                        text-shadow 5s ease 3s;
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
                    text-shadow: 
                        0 0 60px rgba(78, 5, 6, 0.4),
                        0 0 120px rgba(78, 5, 6, 0.2);
                }
                
                .greeting.popped {
                    color: ${theme === 'light' ? '#1a1a1a' : '#ffffff'};
                    transform: scale(1);
                    transition: 
                        color 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                        transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1),
                        text-shadow 0.5s ease;
                    text-shadow: 
                        0 0 100px rgba(78, 5, 6, 0.8),
                        0 0 200px rgba(78, 5, 6, 0.4),
                        0 0 300px rgba(78, 5, 6, 0.2);
                }
                
                .theme-toggle-wrapper {
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity 0.5s ease;
                    pointer-events: none;
                    position: relative;
                    z-index: 100;
                }
                
                .theme-toggle-wrapper.visible {
                    visibility: visible;
                    opacity: 1;
                    pointer-events: auto;
                }
            `}</style>

            {/* Fixed viewport content */}
            <main className={`homepage ${stage >= 2 ? 'popped' : ''}`}>
                <OrbField
                    visible={stage >= 2}
                    mouseX={mousePos.x}
                    mouseY={mousePos.y}
                />

                <div className={`theme-toggle-wrapper ${stage >= 3 ? 'visible' : ''}`}>
                    <ThemeToggle />
                </div>

                {/* Greeting with scroll-based fade out - hidden permanently after passing */}
                {!hasPassedGreeting && (
                    <h1 
                        className={`greeting ${stage >= 1 ? 'emerging' : ''} ${stage >= 2 ? 'popped' : ''}`}
                        style={{ 
                            opacity: stage >= 3 ? greetingOpacity : undefined,
                            visibility: greetingOpacity <= 0 ? 'hidden' : undefined,
                        }}
                    >
                        Hi!
                    </h1>
                )}

                {/* Profile card with scroll-based fade in/out */}
                <ProfileCardLive 
                    opacity={stage >= 3 ? (isJumping ? 0 : profileOpacity) : 0} 
                    entryProgress={profileEntryProgress}
                    exitProgress={profileExitProgress}
                />

                {/* Links card with scroll-based fade in/out */}
                <LinksCardLive 
                    opacity={stage >= 3 ? (isJumping ? 0 : linksOpacity) : 0}
                    entryProgress={linksEntryProgress}
                    exitProgress={linksExitProgress}
                />

                {/* Contact card with scroll-based fade in */}
                <ContactCardLive 
                    opacity={stage >= 3 ? (isJumping ? 0 : contactOpacity) : 0}
                    entryProgress={contactEntryProgress}
                />

                {/* Dot navigation indicator - 3 sections: Profile, Links, Contact */}
                <ScrollDotIndicator
                    totalSections={3}
                    activeSection={activeSection}
                    onDotClick={handleDotClick}
                    visible={stage >= 3}
                    theme={theme}
                />
            </main>
        </>
    );
}
