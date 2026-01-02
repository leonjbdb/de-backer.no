"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ThemeToggle } from "@/components";
import { useTheme } from "@/components/providers";
import { OrbField } from "@/components/orb-field";
import { ProfileCardLive } from "@/components/liquid-glass/ProfileCardLive";
import { LinksCardLive } from "@/components/liquid-glass/LinksCardLive";
import { ContactCardLive } from "@/components/liquid-glass/ContactCardLive";
import { ScrollDotIndicator } from "@/components/ui/ScrollDotIndicator";

// Total scroll sections (in viewport units)
const TOTAL_SECTIONS = 4;

// Resting points for scroll snap (in viewport units)
// These are the "bottom" points where cards are fully visible
// Index 0 = Profile, 1 = Links, 2 = Contact (no Hi! since it's one-time)
const RESTING_POINTS = [0.75, 1.75, 2.75];

// Minimum scroll position once greeting is passed (profile card fully visible position)
const MIN_SCROLL_AFTER_GREETING = 0.75;

// Scroll snap debounce delay (ms) - longer delay for gentler snapping
const SNAP_DELAY = 500;

// Mobile breakpoint
const MOBILE_BREAKPOINT = 768;

export default function HomePage() {
    const [stage, setStage] = useState(0);
    const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
    const [scrollProgress, setScrollProgress] = useState(0);
    const [hasPassedGreeting, setHasPassedGreeting] = useState(false);
    const [activeSection, setActiveSection] = useState(0);
    const [isJumping, setIsJumping] = useState(false); // For fade transition when clicking dots
    const [isMobile, setIsMobile] = useState(false);
    const [mobileSection, setMobileSection] = useState(-1); // -1 = greeting, 0 = Profile, 1 = Links, 2 = Contact
    const rafRef = useRef<number | undefined>(undefined);
    const snapTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    const isSnappingRef = useRef(false);
    const touchStartRef = useRef<{ x: number; time: number; section: number; lastX: number; lastTime: number } | null>(null);
    const { theme } = useTheme();

    // Detect mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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


    // Smooth scroll/animate to a resting point with parabolic animation for natural feel
    const scrollToRestingPoint = useCallback((targetProgress: number, startProgress?: number) => {
        const currentProgress = startProgress ?? (isMobile ? scrollProgress : window.scrollY / window.innerHeight);
        const distance = targetProgress - currentProgress;
        
        // Don't animate if already very close
        if (Math.abs(distance) < 0.02) return;
        
        isSnappingRef.current = true;
        
        // Duration scales with distance for natural feel
        // Base: ~2400ms for small distances, up to ~6000ms for large distances
        const duration = Math.min(6000, Math.max(2400, Math.abs(distance) * 7500));
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
            
            const newProgress = currentProgress + distance * eased;
            
            if (isMobile) {
                // On mobile, update scroll progress state directly
                setScrollProgress(newProgress);
            } else {
                // On desktop, use window scroll
                window.scrollTo({
                    top: newProgress * window.innerHeight,
                    behavior: 'instant'
                });
            }
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            } else {
                isSnappingRef.current = false;
            }
        };
        
        requestAnimationFrame(animateScroll);
    }, [isMobile, scrollProgress]);

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

    // Update active section based on progress
    const updateActiveSection = useCallback((progress: number) => {
        if (progress < 1.25) {
            setActiveSection(0); // Profile
        } else if (progress < 2.25) {
            setActiveSection(1); // Links
        } else {
            setActiveSection(2); // Contact
        }
    }, []);

    // Handle scroll for fade transitions (desktop only)
    const handleScroll = useCallback(() => {
        if (isMobile) return; // Mobile uses touch events
        
        const scrollY = window.scrollY;
        const viewportHeight = window.innerHeight;
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
        updateActiveSection(progress);
        
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
                scrollToRestingPoint(nearestPoint, currentProgress);
            }
        }, SNAP_DELAY);
    }, [hasPassedGreeting, findNearestRestingPoint, scrollToRestingPoint, isMobile, updateActiveSection]);

    // Animate to a mobile section with parabolic snap
    const snapToMobileSection = useCallback((targetSection: number, fromProgress?: number) => {
        if (isSnappingRef.current) return;
        
        const clampedSection = Math.max(0, Math.min(2, targetSection));
        const targetProgress = RESTING_POINTS[clampedSection];
        const startProgress = fromProgress ?? scrollProgress;
        const distance = targetProgress - startProgress;
        
        if (Math.abs(distance) < 0.02) {
            setScrollProgress(targetProgress);
            setMobileSection(clampedSection);
            setActiveSection(clampedSection);
            return;
        }
        
        isSnappingRef.current = true;
        const startTime = performance.now();
        
        // Duration based on distance - shorter for mobile but still natural
        const duration = Math.min(400, Math.max(200, Math.abs(distance) * 400));
        
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Parabolic easing (ease-in-out quint) for natural motion
            const eased = progress < 0.5
                ? 16 * progress * progress * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 5) / 2;
            
            const newProgress = startProgress + distance * eased;
            setScrollProgress(newProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setScrollProgress(targetProgress);
                setMobileSection(clampedSection);
                setActiveSection(clampedSection);
                isSnappingRef.current = false;
            }
        };
        
        requestAnimationFrame(animate);
    }, [scrollProgress]);

    // Handle touch events for mobile horizontal swiping
    const handleTouchStart = useCallback((e: TouchEvent) => {
        if (!isMobile || stage < 3 || isSnappingRef.current) return;
        const now = performance.now();
        touchStartRef.current = {
            x: e.touches[0].clientX,
            time: now,
            section: mobileSection,
            lastX: e.touches[0].clientX,
            lastTime: now
        };
    }, [isMobile, stage, mobileSection]);

    const handleTouchMove = useCallback((e: TouchEvent) => {
        if (!isMobile || !touchStartRef.current || stage < 3 || isSnappingRef.current) return;
        
        const currentX = e.touches[0].clientX;
        const now = performance.now();
        const deltaX = touchStartRef.current.x - currentX;
        
        // Update last position for velocity calculation
        touchStartRef.current.lastX = currentX;
        touchStartRef.current.lastTime = now;
        
        // Calculate progress delta based on swipe distance
        // One full viewport width = 1 section (1 unit of progress difference between sections)
        const viewportWidth = window.innerWidth;
        const sectionWidth = 1; // Progress units between sections
        const progressDelta = (deltaX / viewportWidth) * sectionWidth;
        
        // Calculate new progress from the section's resting point
        const startSection = touchStartRef.current.section;
        let baseProgress: number;
        if (startSection === -1) {
            baseProgress = 0; // Greeting at 0
        } else {
            baseProgress = RESTING_POINTS[startSection];
        }
        
        let newProgress = baseProgress + progressDelta;
        
        // Clamp progress (can't go back to greeting once passed, can't go past last section)
        const minProgress = hasPassedGreeting ? RESTING_POINTS[0] : 0;
        const maxProgress = RESTING_POINTS[2];
        newProgress = Math.max(minProgress, Math.min(maxProgress, newProgress));
        
        // Mark greeting as passed if we've moved past it
        if (newProgress >= 0.5 && !hasPassedGreeting) {
            setHasPassedGreeting(true);
        }
        
        setScrollProgress(newProgress);
        
        // Update active section based on current progress
        if (newProgress < RESTING_POINTS[0] + 0.5) {
            setActiveSection(0);
        } else if (newProgress < RESTING_POINTS[1] + 0.5) {
            setActiveSection(1);
        } else {
            setActiveSection(2);
        }
        
        // Prevent default to stop page scroll
        e.preventDefault();
    }, [isMobile, stage, hasPassedGreeting]);

    const handleTouchEnd = useCallback((e: TouchEvent) => {
        if (!isMobile || !touchStartRef.current || stage < 3) return;
        
        const endX = e.changedTouches[0].clientX;
        const endTime = performance.now();
        const startSection = touchStartRef.current.section;
        
        // Calculate velocity from recent movement (pixels per millisecond)
        const recentDeltaX = touchStartRef.current.lastX - endX;
        const recentDeltaTime = endTime - touchStartRef.current.lastTime;
        const velocity = recentDeltaTime > 0 ? recentDeltaX / recentDeltaTime : 0;
        
        // Total distance swiped
        const totalDeltaX = touchStartRef.current.x - endX;
        
        touchStartRef.current = null;
        
        // Current progress
        const currentProgress = scrollProgress;
        
        // Velocity threshold for triggering page change (pixels per ms) - higher = less sensitive
        const VELOCITY_THRESHOLD = 5.0;
        // Distance threshold for triggering page change (fraction of viewport) - higher = less sensitive
        const DISTANCE_THRESHOLD = 0.35;
        const viewportWidth = window.innerWidth;
        const distanceFraction = Math.abs(totalDeltaX) / viewportWidth;
        
        // Determine target section based on velocity and distance
        let targetSection: number;
        
        if (startSection === -1) {
            // From greeting - only allow going to section 0
            if (velocity > VELOCITY_THRESHOLD || distanceFraction > DISTANCE_THRESHOLD) {
                targetSection = 0;
                setHasPassedGreeting(true);
            } else {
                // Snap back to greeting position (but we'll show section 0 since we can't really go back)
                targetSection = 0;
                setHasPassedGreeting(true);
            }
        } else {
            // Determine based on velocity or distance
            if (velocity > VELOCITY_THRESHOLD || (totalDeltaX > 0 && distanceFraction > DISTANCE_THRESHOLD)) {
                // Swiping left with speed - go to next section
                targetSection = Math.min(2, startSection + 1);
            } else if (velocity < -VELOCITY_THRESHOLD || (totalDeltaX < 0 && distanceFraction > DISTANCE_THRESHOLD)) {
                // Swiping right with speed - go to previous section
                targetSection = Math.max(0, startSection - 1);
            } else {
                // Not enough velocity or distance - snap back to current section
                targetSection = startSection;
            }
        }
        
        // Snap to target section immediately with parabolic animation
        snapToMobileSection(targetSection, currentProgress);
    }, [isMobile, stage, scrollProgress, snapToMobileSection]);

    // Handle dot click navigation (3 dots for Profile, Links, Contact)
    const handleDotClick = useCallback((index: number) => {
        // Don't do anything if already jumping/snapping or clicking current section
        if (isJumping || isSnappingRef.current || index === activeSection) return;
        
        // Clear any pending snap
        if (snapTimeoutRef.current) {
            clearTimeout(snapTimeoutRef.current);
        }
        
        if (isMobile) {
            // On mobile, use fast snap animation
            snapToMobileSection(index);
        } else {
            // On desktop, fade out then jump
            setIsJumping(true);
            
            setTimeout(() => {
                const targetProgress = RESTING_POINTS[index];
                window.scrollTo({
                    top: targetProgress * window.innerHeight,
                    behavior: 'instant'
                });
                
                updateActiveSection(targetProgress);
                
                setTimeout(() => {
                    setIsJumping(false);
                }, 100);
            }, 400);
        }
    }, [activeSection, isJumping, isMobile, updateActiveSection, snapToMobileSection]);

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

    // Add scroll/touch listener and enable scrolling after stage 3 (animations complete)
    useEffect(() => {
        if (stage >= 3) {
            if (isMobile) {
                // Mobile: use touch events for horizontal swiping
                document.body.style.overflow = 'hidden';
                document.body.style.minHeight = '100vh';
                document.documentElement.style.overflow = 'hidden';
                
                window.addEventListener('touchstart', handleTouchStart, { passive: true });
                window.addEventListener('touchmove', handleTouchMove, { passive: false });
                window.addEventListener('touchend', handleTouchEnd, { passive: true });
            } else {
                // Desktop: vertical scrolling on body
                document.body.style.overflowY = 'auto';
                document.body.style.overflowX = 'hidden';
                document.body.style.minHeight = `${TOTAL_SECTIONS * 100}vh`;
                document.documentElement.style.overflowY = 'auto';
                
                window.addEventListener('scroll', handleScroll);
                
                // Initialize scroll progress from current position using requestAnimationFrame
                requestAnimationFrame(() => {
                    handleScroll();
                });
            }
            
            return () => {
                if (isMobile) {
                    window.removeEventListener('touchstart', handleTouchStart);
                    window.removeEventListener('touchmove', handleTouchMove);
                    window.removeEventListener('touchend', handleTouchEnd);
                } else {
                    window.removeEventListener('scroll', handleScroll);
                }
                document.body.style.minHeight = '';
                document.body.style.overflow = '';
            };
        } else {
            // Disable scrolling before stage 3
            document.body.style.overflow = 'hidden';
            document.body.style.minHeight = '100vh';
            document.documentElement.style.overflow = 'hidden';
        }
    }, [stage, handleScroll, handleTouchStart, handleTouchMove, handleTouchEnd, isMobile]);

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
                
                @media (max-width: 767px) {
                    html, body {
                        overflow: hidden !important;
                    }
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
