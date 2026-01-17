// =============================================================================
// Orb System Configuration
// =============================================================================

/**
 * Configuration for orb spawning behavior.
 */
export interface OrbSpawnConfig {
	/** Minimum speed for newly spawned orbs (pixels/second). */
	minSpeed: number;
	/** Maximum speed for newly spawned orbs (pixels/second). */
	maxSpeed: number;
	/** Default size for newly spawned orbs (grid cells). */
	defaultSize: number;
	/** Minimum allowed orb size. */
	minSize: number;
	/** Maximum allowed orb size. */
	maxSize: number;
}

/**
 * Configuration for orb speed limiting.
 */
export interface OrbSpeedLimitConfig {
	/** Base max speed for size 1 orbs (pixels/second). */
	baseMaxSpeed: number;
	/** How quickly orbs decelerate when over max speed (0-1, higher = faster). */
	decelerationRate: number;
	/** Minimum max speed for the largest orbs (pixels/second). */
	minMaxSpeed: number;
}

/**
 * Configuration for orb layer attraction behavior.
 */
export interface OrbLayerAttractionConfig {
	/** Strength of attraction toward preferred layer (very low for gentle drift). */
	attractionStrength: number;
}

/**
 * Configuration for orb wander behavior (organic velocity drift).
 */
export interface OrbWanderConfig {
	/** Minimum wander strength (radians/second). */
	minWanderStrength: number;
	/** Maximum wander strength (radians/second). */
	maxWanderStrength: number;
	/** Minimum wander speed - how fast direction changes (radians/second). */
	minWanderSpeed: number;
	/** Maximum wander speed (radians/second). */
	maxWanderSpeed: number;
	/** Minimum modulation speed for intensity variation. */
	minModulationSpeed: number;
	/** Maximum modulation speed. */
	maxModulationSpeed: number;
}

/**
 * Configuration for orb burst spawning behavior.
 */
export interface OrbBurstConfig {
	/** Target number of orbs to spawn in burst. */
	targetCount: number;
	/** Maximum allowed orb size for burst. */
	maxSize: number;
	/** Spawn zone radius from center point in pixels. */
	spawnRadiusPx: number;
	/** Maximum retry attempts per orb for collision-safe placement. */
	maxRetries: number;
	/** Base minimum speed for size 1 orbs (pixels/second). */
	minSpeed: number;
	/** Base maximum speed for size 1 orbs (pixels/second). */
	maxSpeed: number;
	/** Minimum lifetime for orbs in milliseconds. */
	minLifetimeMs: number;
	/** Maximum lifetime for orbs in milliseconds. */
	maxLifetimeMs: number;
}

/**
 * Configuration for orb debug visualization.
 */
export interface OrbDebugVisualConfig {
	/** Color of the orb position indicator. */
	positionColor: string;
	/** Color of the velocity vector arrow. */
	arrowColor: string;
	/** Opacity of the velocity arrow (0-1). */
	arrowOpacity: number;
	/** Scale factor for velocity vector visualization. */
	arrowScale: number;
	/** Length of the arrowhead in pixels. */
	arrowHeadLength: number;
	/** Line width of the velocity arrow. */
	arrowLineWidth: number;
}

/**
 * Default spawn configuration for orbs.
 */
export const DEFAULT_ORB_SPAWN_CONFIG: OrbSpawnConfig = {
	minSpeed: 50,
	maxSpeed: 150,
	defaultSize: 1,
	minSize: 1,
	maxSize: 20,
};

/**
 * Default speed limit configuration for orbs.
 * Larger orbs have lower max speeds.
 */
export const DEFAULT_SPEED_LIMIT_CONFIG: OrbSpeedLimitConfig = {
	baseMaxSpeed: 200,      // Size 1 orbs can go up to 200 px/s
	decelerationRate: 0.05, // 5% per frame toward max speed (smooth curve)
	minMaxSpeed: 50,        // Even the largest orbs can go at least 50 px/s
};

/**
 * Default layer attraction configuration for orbs.
 * Orbs are gently pulled toward their preferred Z-layer based on size.
 */
export const DEFAULT_LAYER_ATTRACTION_CONFIG: OrbLayerAttractionConfig = {
	attractionStrength: 0.5, // Very gentle - units are layers/s² acceleration
};

/**
 * Default wander configuration for orbs.
 * Creates organic, drifting motion by slowly changing velocity direction.
 * Values are intentionally subtle for gentle, gradual curves.
 */
export const DEFAULT_WANDER_CONFIG: OrbWanderConfig = {
	minWanderStrength: 0.02,   // Minimum turn rate (radians/second) - very subtle
	maxWanderStrength: 0.08,   // Maximum turn rate (radians/second) - gentle curves
	minWanderSpeed: 0.05,      // Slowest wander cycle (radians/second for phase)
	maxWanderSpeed: 0.15,      // Fastest wander cycle - still quite slow
	minModulationSpeed: 0.01,  // Slowest intensity variation
	maxModulationSpeed: 0.05,  // Fastest intensity variation
};

/**
 * Default burst spawn configuration for orbs.
 * Spawns 75-100 orbs from center with size-based distribution and velocity.
 */
export const DEFAULT_ORB_BURST_CONFIG: OrbBurstConfig = {
	targetCount: 87,       // Target number of orbs (75-100 range)
	maxSize: 8,            // Cap at size 8
	spawnRadiusPx: 150,    // Spawn within 150px radius from center
	maxRetries: 20,        // Try up to 20 positions per orb
	minSpeed: 750,         // Base min speed for size 1 orbs (increased for explosion feel)
	maxSpeed: 1000,         // Base max speed for size 1 orbs (increased for explosion feel)
	minLifetimeMs: 10000,  // Minimum lifetime: 10 seconds
	maxLifetimeMs: 180000, // Maximum lifetime: 3 minutes
};

/**
 * Configuration for continuous orb spawning.
 */
export interface ContinuousSpawnConfig {
	/** Target number of orbs at 4K resolution (3840x2160). Scales linearly with screen area. */
	targetOrbCountAt4K: number;
	/** Reference screen area for 4K resolution (3840 * 2160). */
	referenceScreenArea: number;
	/** Delay after burst before continuous spawning starts (milliseconds). */
	delayAfterBurstMs: number;
	/** Base spawn rate per second when at 0 orbs (at 4K, scales with screen). */
	baseSpawnRateAt4K: number;
	/** Maximum orbs to spawn per frame. */
	maxSpawnsPerFrame: number;
	/** Margin around screen edge where orbs won't spawn (pixels). */
	edgeMarginPx: number;
}

/**
 * Default configuration for continuous orb spawning.
 * Orb count and spawn rate scale linearly with screen area.
 * At 4K: 600 orbs, at 1080p: ~150 orbs.
 */
export const DEFAULT_CONTINUOUS_SPAWN_CONFIG: ContinuousSpawnConfig = {
	targetOrbCountAt4K: 600,           // Target at 4K resolution (reduced by 2/5ths)
	referenceScreenArea: 3840 * 2160,  // 4K resolution area (8,294,400 pixels)
	delayAfterBurstMs: 3000,           // Wait 3 seconds after burst
	baseSpawnRateAt4K: 50,             // Base spawn rate at 4K
	maxSpawnsPerFrame: 5,              // Max 5 orbs per frame for smooth spawning
	edgeMarginPx: 50,                  // Keep orbs 50px from screen edges
};

/**
 * Default debug visualization configuration for orbs.
 */
export const DEFAULT_ORB_DEBUG_CONFIG: OrbDebugVisualConfig = {
	positionColor: '#FFFFFF',
	arrowColor: 'rgba(255, 255, 255, 0.8)',
	arrowOpacity: 0.8,
	arrowScale: 0.5,
	arrowHeadLength: 6,
	arrowLineWidth: 1,
};

