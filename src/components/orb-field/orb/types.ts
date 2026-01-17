// =============================================================================
// Orb Types - Type definitions for the orb system
// =============================================================================

/**
 * Represents an individual orb in the 3D simulation.
 *
 * Orbs have continuous 3D positioning and velocity for smooth movement,
 * with additional metadata for size and direction tracking.
 */
export interface Orb {
	/** Unique identifier for the orb. */
	id: string;

	/** Pixel X position relative to the viewport origin. */
	pxX: number;

	/** Pixel Y position relative to the viewport origin. */
	pxY: number;

	/** Z position in layers (continuous, can be fractional). */
	z: number;

	/** X velocity component in pixels per second. */
	vx: number;

	/** Y velocity component in pixels per second. */
	vy: number;

	/** Z velocity component in layers per second. */
	vz: number;

	/** Speed magnitude in pixels per second (XY plane). */
	speed: number;

	/** Direction of travel in XY plane in radians. */
	angle: number;

	/** Orb diameter in grid cells (3D sphere). */
	size: number;

	/** Timestamp when the orb was created (milliseconds since epoch). */
	createdAt: number;

	/** Lifetime duration in milliseconds. */
	lifetimeMs: number;

	/** Spawn-in animation duration for this specific orb (milliseconds). */
	spawnAnimDurationMs: number;

	/** Despawn/fade-out animation duration for this specific orb (milliseconds). */
	despawnAnimDurationMs: number;

	// =========================================================================
	// Wander Behavior (organic velocity drift)
	// =========================================================================

	/** 
	 * Base wander strength for this orb (radians/second).
	 * Controls how quickly the orb's direction can change.
	 * Each orb has a unique value for variety.
	 */
	wanderStrength: number;

	/**
	 * Current wander phase (0 to 2π).
	 * Used with sine wave for smooth, continuous direction changes.
	 */
	wanderPhase: number;

	/**
	 * Speed at which the wander phase progresses (radians/second).
	 * Lower = slower, more gradual changes. Higher = faster direction shifts.
	 * Varies per orb for organic feel.
	 */
	wanderSpeed: number;

	/**
	 * Secondary modulation speed for wander intensity variation.
	 * Creates periods of more/less wandering for the same orb.
	 */
	wanderModulationSpeed: number;

	/**
	 * Phase for the secondary modulation.
	 */
	wanderModulationPhase: number;
}
