import type { OrbPhysicsConfig } from './types';

// =============================================================================
// Constants
// =============================================================================

// Single orb type - size determines depth layer
export const ORB_COUNT = { min: 15, max: 25 };

// Size range for orbs (smaller = further, larger = closer)
export const ORB_PROPERTIES: OrbPhysicsConfig = {
    sizeRange: [4, 50], // Wide range for depth variety
    opacityRange: [0.3, 0.9],
    blurRange: [2, 40],
    lightnessRange: [15, 40],
    baseSpeed: 0.00025, // Base speed (modified by depth)
    zSpeed: 0.00006,
    avoidRadius: 8,
    avoidStrength: 0.001,
} as const;

// Physics constants
export const SPAWN_DURATION = 5000; // 5 seconds to fully appear (very gradual)
export const DESPAWN_DURATION = 4000; // 4 seconds to fully disappear
export const MIN_LIFESPAN = 20000;
export const MAX_LIFESPAN = 60000;
export const SPAWN_INTERVAL = 3000;
export const MAX_SPEED = 0.1;
export const SMOOTHING = 0.025;
export const FOCAL_OSCILLATION_SPEED = 0.0004;
export const FOCAL_OSCILLATION_AMPLITUDE = 15;


