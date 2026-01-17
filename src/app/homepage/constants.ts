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
// Stage 0: Initial (hidden) - Grid roll animation plays during this time (1500ms)
// Stage 1: Hi! emerging (growing from tiny)
// Stage 2: Hi! popped (burst)
// Stage 3: Hi! fading out
// Stage 4: Hi! fully gone, Welcome starts appearing
// Stage 5: Welcome fully visible
// Stage 6: Welcome starts fading out
// Stage 7: Welcome fully gone, profile card appears
// Note: All timings delayed by 1500ms to let grid animation complete first
export const STAGE_TIMINGS = {
	stage1: 0,   // Hi! starts emerging (after 1500ms grid animation + 1500ms pause)
	stage2: 7500,   // Hi! bursts
	stage3: 8500,   // 1s after burst: Hi! starts fading
	stage4: 9300,   // Hi! fully gone, Welcome starts
	stage5: 10100,  // Welcome fully visible
	stage6: 13100,  // 3s of Welcome, then start fade out
	stage7: 14700,  // Welcome fully gone (1.6s fade), show profile
} as const;

// Scroll zones for card visibility
// Widened entry zones (0.35vh instead of 0.2vh) for smoother slide-in animations
export const SCROLL_ZONES = {
	// "Hi!" greeting visibility - fades out first
	greeting: {
		fadeStart: 0.0,
		fadeEnd: 0.15,
	},
	// "Welcome..." visibility - fades in as Hi! fades, then fades out before card
	welcome: {
		fadeInStart: 0.08,
		fadeInEnd: 0.18,
		fadeOutStart: 0.28,
		fadeOutEnd: 0.45,
	},
	// Profile: fully visible at start (entry 0-0), exit 0.95-1.25
	profile: {
		entryStart: 0,
		entryEnd: 0,
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

