import type { OrbConfig, OrbState } from './types';
import { ORB_COUNT, ORB_PROPERTIES, MIN_LIFESPAN, MAX_LIFESPAN } from './constants';

// =============================================================================
// Utility Functions
// =============================================================================

export function randomInRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
    return Math.floor(randomInRange(min, max + 1));
}

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

export function distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

export function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

export function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
}

export function easeInQuart(t: number): number {
    return t * t * t * t;
}

// Very gradual easing for spawn/despawn
export function easeOutQuint(t: number): number {
    return 1 - Math.pow(1 - t, 5);
}

export function easeInQuint(t: number): number {
    return t * t * t * t * t;
}

// Extra smooth sine-based easing
export function easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
}

// =============================================================================
// Orb Generation
// =============================================================================

export function generateOrbConfig(id: number): OrbConfig {
    const props = ORB_PROPERTIES;
    
    // Generate size first - this determines depth layer
    const baseSize = randomInRange(props.sizeRange[0], props.sizeRange[1]);
    
    // Calculate depth layer from size (0 = far/small, 1 = close/large)
    const sizeRange = props.sizeRange[1] - props.sizeRange[0];
    const depthLayer = (baseSize - props.sizeRange[0]) / sizeRange;
    
    // Larger orbs (closer) are less saturated and darker, smaller orbs (further) are brighter
    const lightness = props.lightnessRange[0] + (1 - depthLayer) * (props.lightnessRange[1] - props.lightnessRange[0]);
    const opacity = props.opacityRange[0] + (1 - depthLayer * 0.5) * (props.opacityRange[1] - props.opacityRange[0]);
    
    // Larger orbs are blurrier (soft foreground), smaller orbs are sharper (distant but clear)
    const blur = props.blurRange[0] + depthLayer * (props.blurRange[1] - props.blurRange[0]);

    return {
        id,
        baseSize,
        baseOpacity: opacity,
        baseBlur: blur,
        hue: randomInRange(355, 365) % 360,
        saturation: randomInRange(70, 95),
        lightness,
        depthLayer,
        phaseOffset: randomInRange(0, Math.PI * 2),
    };
}

export function generateAllOrbs(): OrbConfig[] {
    const orbs: OrbConfig[] = [];
    const count = randomInt(ORB_COUNT.min, ORB_COUNT.max);
    for (let i = 0; i < count; i++) {
        orbs.push(generateOrbConfig(i));
    }
    return orbs;
}

export function createInitialState(
    currentTime: number, 
    x?: number, 
    y?: number,
    lifespan?: number,
    isBurst?: boolean
): OrbState {
    // Default spawn from center (where "Hi!" is), or use provided position
    const posX = x ?? 50;
    const posY = y ?? 50;
    
    // Random lifespan if not provided
    const life = lifespan ?? randomInRange(MIN_LIFESPAN, MAX_LIFESPAN);
    
    // For burst orbs, calculate outward velocity from center
    let vx = 0;
    let vy = 0;
    let targetX = randomInRange(10, 90);
    let targetY = randomInRange(10, 90);
    
    if (isBurst) {
        // Random angle for burst direction (THX-like explosion)
        const angle = randomInRange(0, Math.PI * 2);
        // Wide range of speeds for good spread - some fast, some slow
        const burstSpeed = randomInRange(0.01, 0.06);
        vx = Math.cos(angle) * burstSpeed;
        vy = Math.sin(angle) * burstSpeed;
        
        // Set target in the direction of burst (varied distances)
        const targetDist = randomInRange(20, 45);
        targetX = clamp(50 + Math.cos(angle) * targetDist, 10, 90);
        targetY = clamp(50 + Math.sin(angle) * targetDist, 10, 90);
    }
    
    return {
        x: posX,
        y: posY,
        z: randomInRange(20, 80),
        vx,
        vy,
        vz: 0,
        targetX,
        targetY,
        targetZ: randomInRange(20, 80),
        deathTime: currentTime + life,
        lifecycle: 'spawning',
        lifecycleStart: currentTime,
        scale: 0,
        isBurstOrb: isBurst ?? false,
    };
}

// Find an empty spot on screen, preferring areas with fewer orbs
export function findEmptySpot(existingStates: Map<number, OrbState>): { x: number; y: number } {
    const candidates: { x: number; y: number; score: number }[] = [];
    
    // Generate candidate positions across full screen
    for (let i = 0; i < 20; i++) {
        const x = randomInRange(5, 95);
        const y = randomInRange(5, 95);
        
        // Calculate minimum distance to any existing orb
        let minDist = Infinity;
        existingStates.forEach(state => {
            if (state.lifecycle !== 'dead') {
                const dist = distance(x, y, state.x, state.y);
                minDist = Math.min(minDist, dist);
            }
        });
        
        candidates.push({ x, y, score: minDist });
    }
    
    // Sort by score (higher = more empty space) and pick from top candidates
    candidates.sort((a, b) => b.score - a.score);
    
    // Add some randomness by picking from top 5
    const topCandidates = candidates.slice(0, 5);
    const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)];
    
    return { x: chosen.x, y: chosen.y };
}

// =============================================================================
// Depth-based rendering calculations
// =============================================================================

export function calculateDepthEffects(
    z: number,
    baseSize: number,
    baseOpacity: number,
    baseBlur: number,
    focalZ: number
) {
    // 3D scaling: 0.4x to 1.6x
    const depthScale = 0.4 + (z / 100) * 1.2;
    const size = baseSize * depthScale;
    
    // Depth opacity
    const depthOpacity = 0.5 + (z / 100) * 0.6;
    const opacity = clamp(baseOpacity * depthOpacity, 0.15, 1);
    
    // Gentle focus-based blur (reduced effect)
    const distanceFromFocal = Math.abs(z - focalZ);
    const depthBlurMultiplier = 1 + (distanceFromFocal / 80) * 0.5; // gentler blur falloff
    const blur = baseBlur * depthBlurMultiplier;
    
    // Subtle glow for foreground orbs
    const glowIntensity = Math.max(0, (z - 50) / 50) * 0.2;
    
    return { size, opacity, blur, glowIntensity };
}


