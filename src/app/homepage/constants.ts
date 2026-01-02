/**
 * Homepage configuration constants
 */

// Total scroll sections (in viewport units)
export const TOTAL_SECTIONS = 4;

// Resting points for scroll snap (in viewport units)
// These are the "bottom" points where cards are fully visible
// Index 0 = Profile, 1 = Links, 2 = Contact (no Hi! since it's one-time)
export const RESTING_POINTS = [0.75, 1.75, 2.75] as const;

// Minimum scroll position once greeting is passed (profile card fully visible position)
export const MIN_SCROLL_AFTER_GREETING = 0.75;

// Scroll snap debounce delay (ms) - quick response for snappy feel
export const SNAP_DELAY = 120;

// Mobile breakpoint
export const MOBILE_BREAKPOINT = 768;

// Animation stage timing (ms)
export const STAGE_TIMINGS = {
    stage1: 1500,
    stage2: 6000,
    stage3: 7500,
} as const;

// Scroll zones for card visibility
// Widened entry zones (0.35vh instead of 0.2vh) for smoother slide-in animations
export const SCROLL_ZONES = {
    // Greeting visibility
    greeting: {
        fadeStart: 0.2,
        fadeEnd: 0.4,
    },
    // Profile: entry 0.35-0.7, exit 0.95-1.25
    profile: {
        entryStart: 0.35,
        entryEnd: 0.7,
        exitStart: 0.95,
        exitEnd: 1.25,
    },
    // Links: entry 1.30-1.65, exit 1.90-2.25
    links: {
        entryStart: 1.30,
        entryEnd: 1.65,
        exitStart: 1.90,
        exitEnd: 2.25,
    },
    // Contact: entry 2.30-2.65
    contact: {
        entryStart: 2.30,
        entryEnd: 2.65,
    },
} as const;

// Section thresholds for determining active section
export const SECTION_THRESHOLDS = {
    profileToLinks: 1.25,
    linksToContact: 2.25,
} as const;

// Touch/swipe thresholds
export const SWIPE_THRESHOLDS = {
    velocity: 5.0, // pixels per ms
    distance: 0.35, // fraction of viewport
} as const;

