// =============================================================================
// Types
// =============================================================================

export interface OrbConfig {
    id: number;
    baseSize: number; // Size determines depth: larger = closer = slower
    baseOpacity: number;
    baseBlur: number;
    hue: number;
    saturation: number;
    lightness: number;
    depthLayer: number; // 0-1, derived from size (larger = higher layer = closer)
    phaseOffset: number; // Per-orb movement phase offset
}

export type OrbLifecycle = 'spawning' | 'alive' | 'despawning' | 'dead';

export interface OrbState {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    targetX: number;
    targetY: number;
    targetZ: number;
    deathTime: number; // when this orb should start despawning
    lifecycle: OrbLifecycle;
    lifecycleStart: number; // when current lifecycle phase began
    scale: number; // 0-1 for spawn/despawn animation
    isBurstOrb: boolean; // true for initial THX-like burst orbs
}

export interface OrbFieldProps {
    visible: boolean;
    mouseX: number;
    mouseY: number;
    /** Scroll delta for orb reaction (-1 to 1), orbs drift in scroll direction */
    scrollDelta?: number;
}

export interface OrbPhysicsConfig {
    sizeRange: [number, number];
    opacityRange: [number, number];
    blurRange: [number, number];
    lightnessRange: [number, number];
    baseSpeed: number;
    zSpeed: number;
    avoidRadius: number;
    avoidStrength: number;
}


