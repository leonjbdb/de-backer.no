import { useEffect, useState, useRef, useCallback } from "react";
import type { OrbConfig, OrbState } from "./types";
import { 
    ORB_PROPERTIES,
    ORB_COUNT,
    SPAWN_DURATION,
    DESPAWN_DURATION,
    MAX_SPEED, 
    SMOOTHING,
    FOCAL_OSCILLATION_SPEED,
    FOCAL_OSCILLATION_AMPLITUDE
} from "./constants";
import { 
    distance, 
    clamp, 
    randomInRange,
    easeOutQuint, 
    easeInQuint,
    createInitialState,
    generateOrbConfig,
    findEmptySpot
} from "./utils";

interface UseOrbPhysicsOptions {
    orbConfigs: OrbConfig[];
    mousePosition: { x: number; y: number };
    tilt: { x: number; y: number };
    enabled: boolean;
    /** Scroll delta for orb reaction (-1 to 1), orbs drift in scroll direction */
    scrollDelta?: number;
}

export function useOrbPhysics(options: UseOrbPhysicsOptions): { 
    states: Map<number, OrbState>; 
    focalZ: number;
    configs: OrbConfig[];
} {
    const { orbConfigs: initialConfigs, mousePosition, enabled, scrollDelta = 0 } = options;
    
    // Store scroll delta in a ref so the animation loop can access latest value
    const scrollDeltaRef = useRef(scrollDelta);
    scrollDeltaRef.current = scrollDelta;
    
    // Dynamic orb configs (can grow/shrink)
    const [configs, setConfigs] = useState<OrbConfig[]>(initialConfigs);
    const nextIdRef = useRef(initialConfigs.length);
    
    const [states, setStates] = useState<Map<number, OrbState>>(() => {
        const initial = new Map<number, OrbState>();
        const now = performance.now();
        initialConfigs.forEach(orb => {
            // Initial orbs are burst orbs - spawn from center with outward velocity
            const state = createInitialState(now, 50, 50, undefined, true);
            // Stagger initial spawns for visual interest
            state.lifecycleStart = now - Math.random() * SPAWN_DURATION * 0.3;
            initial.set(orb.id, state);
        });
        return initial;
    });
    
    // Track if initial burst phase is complete
    const burstCompleteRef = useRef(false);
    const startTimeRef = useRef<number>(0);
    
    const [focalZ, setFocalZ] = useState(50);
    const animationRef = useRef<number | undefined>(undefined);
    const lastTimeRef = useRef<number>(0);
    const lastSpawnCheckRef = useRef<number>(0);

    // Spawn a new orb
    const spawnOrb = useCallback((currentTime: number, existingStates?: Map<number, OrbState>) => {
        const id = nextIdRef.current++;
        const config = generateOrbConfig(id);
        
        // After burst phase, spawn at empty spots across screen
        // During burst, spawn from center with burst velocity
        const isBurst = !burstCompleteRef.current;
        let x = 50;
        let y = 50;
        
        if (!isBurst && existingStates) {
            const spot = findEmptySpot(existingStates);
            x = spot.x;
            y = spot.y;
        }
        
        const state = createInitialState(currentTime, x, y, undefined, isBurst);
        
        return { config, state };
    }, []);

    useEffect(() => {
        if (!enabled) return;
        
        const animate = (currentTime: number) => {
            // Track start time for burst phase
            if (startTimeRef.current === 0) {
                startTimeRef.current = currentTime;
            }
            
            const deltaTime = lastTimeRef.current ? currentTime - lastTimeRef.current : 16;
            lastTimeRef.current = currentTime;
            
            // Elapsed time since start
            const elapsed = currentTime - startTimeRef.current;
            
            // Update focal plane (breathing depth-of-field effect)
            const newFocalZ = 50 + Math.sin(currentTime * FOCAL_OSCILLATION_SPEED) * FOCAL_OSCILLATION_AMPLITUDE;
            setFocalZ(newFocalZ);
            
            // Mark burst phase as complete after 5 seconds
            if (!burstCompleteRef.current && elapsed > 5000) {
                burstCompleteRef.current = true;
            }
            
            setStates(prev => {
                const next = new Map<number, OrbState>();
                const configsToAdd: OrbConfig[] = [];
                const idsToRemove: number[] = [];
                
                // Count total alive orbs
                let aliveCount = 0;
                
                configs.forEach(orb => {
                    const state = prev.get(orb.id);
                    if (!state) return;
                    
                    const props = ORB_PROPERTIES;
                    
                    // Speed based on depth layer: larger (closer) orbs move slower
                    // depthLayer 0 = far/small = fast, depthLayer 1 = close/large = slow
                    const speedMultiplier = 1.5 - orb.depthLayer; // 1.5x for small, 0.5x for large
                    
                    // ---------- Lifecycle Management (very gradual transitions) ----------
                    let { lifecycle, lifecycleStart, scale } = state;
                    
                    if (lifecycle === 'spawning') {
                        const progress = clamp((currentTime - lifecycleStart) / SPAWN_DURATION, 0, 1);
                        // Very gradual fade in using quint easing (power of 5)
                        scale = easeOutQuint(progress);
                        aliveCount++;
                        if (progress >= 1) {
                            lifecycle = 'alive';
                            lifecycleStart = currentTime;
                        }
                    } else if (lifecycle === 'alive') {
                        scale = 1;
                        aliveCount++;
                        // Check if it's time to despawn
                        if (currentTime > state.deathTime) {
                            lifecycle = 'despawning';
                            lifecycleStart = currentTime;
                        }
                    } else if (lifecycle === 'despawning') {
                        const progress = clamp((currentTime - lifecycleStart) / DESPAWN_DURATION, 0, 1);
                        // Very gradual fade out - starts slow, accelerates at end
                        scale = 1 - easeInQuint(progress);
                        if (progress >= 1) {
                            lifecycle = 'dead';
                            idsToRemove.push(orb.id);
                        }
                    } else if (lifecycle === 'dead') {
                        idsToRemove.push(orb.id);
                        return; // Don't process dead orbs
                    }
                    
                    // ---------- Movement (only if visible) ----------
                    if (scale < 0.01) {
                        next.set(orb.id, { ...state, lifecycle, lifecycleStart, scale });
                        return;
                    }
                    
                    const inputPctX = mousePosition.x * 100;
                    const inputPctY = mousePosition.y * 100;
                    
                    // Calculate distance from center once (used multiple times)
                    const distFromCenter = distance(state.x, state.y, 50, 50);
                    
                    // ---------- Ultra-Gentle Avoidance ----------
                    const distToInput = distance(state.x, state.y, inputPctX, inputPctY);
                    let avoidX = 0, avoidY = 0;
                    let isAvoiding = false;
                    
                    // Larger orbs have larger avoidance radius
                    const avoidRadius = props.avoidRadius * (0.8 + orb.depthLayer * 0.4);
                    
                    if (distToInput < avoidRadius && distToInput > 0.1) {
                        isAvoiding = true;
                        const dirX = (state.x - inputPctX) / distToInput;
                        const dirY = (state.y - inputPctY) / distToInput;
                        
                        const proximity = 1 - (distToInput / avoidRadius);
                        const falloff = Math.pow(proximity, 4);
                        
                        const strength = falloff * props.avoidStrength * scale;
                        avoidX = dirX * strength;
                        avoidY = dirY * strength;
                    }
                    
                    // ---------- Orb-to-Orb Avoidance ----------
                    // Orbs gently repel each other to spread out
                    let orbRepelX = 0, orbRepelY = 0;
                    const orbAvoidRadius = 15 + orb.baseSize * 0.3; // Larger orbs need more space
                    
                    prev.forEach((otherState, otherId) => {
                        if (otherId === orb.id || otherState.lifecycle === 'dead') return;
                        
                        const distToOther = distance(state.x, state.y, otherState.x, otherState.y);
                        if (distToOther < orbAvoidRadius && distToOther > 0.1) {
                            const dirX = (state.x - otherState.x) / distToOther;
                            const dirY = (state.y - otherState.y) / distToOther;
                            
                            // Gentle repulsion, stronger when closer
                            const proximity = 1 - (distToOther / orbAvoidRadius);
                            const repelStrength = Math.pow(proximity, 2) * 0.0003;
                            
                            orbRepelX += dirX * repelStrength;
                            orbRepelY += dirY * repelStrength;
                        }
                    });
                    
                    // ---------- Target movement - seek empty areas ----------
                    let { targetX, targetY, targetZ } = state;
                    const distToTarget = distance(state.x, state.y, targetX, targetY);
                    const distToTargetZ = Math.abs(state.z - targetZ);
                    
                    // Update target when close OR randomly (to keep movement varied)
                    const shouldUpdateTarget = distToTarget < 10 && distToTargetZ < 10;
                    const randomUpdate = Math.random() < 0.001; // 0.1% chance per frame
                    
                    if (shouldUpdateTarget || randomUpdate) {
                        // Find emptiest area on screen for target
                        // Sample a few candidate positions and pick the one furthest from other orbs
                        let bestX = randomInRange(5, 95);
                        let bestY = randomInRange(5, 95);
                        let bestScore = 0;
                        
                        for (let i = 0; i < 5; i++) {
                            const candidateX = randomInRange(5, 95);
                            const candidateY = randomInRange(5, 95);
                            
                            // Calculate minimum distance to any other orb
                            let minDist = Infinity;
                            prev.forEach((otherState, otherId) => {
                                if (otherId !== orb.id && otherState.lifecycle !== 'dead') {
                                    const dist = distance(candidateX, candidateY, otherState.x, otherState.y);
                                    minDist = Math.min(minDist, dist);
                                }
                            });
                            
                            if (minDist > bestScore) {
                                bestScore = minDist;
                                bestX = candidateX;
                                bestY = candidateY;
                            }
                        }
                        
                        targetX = bestX;
                        targetY = bestY;
                        targetZ = randomInRange(20, 80);
                    }
                    
                    const dx = targetX - state.x;
                    const dy = targetY - state.y;
                    const dz = targetZ - state.z;
                    const mag = Math.sqrt(dx * dx + dy * dy) || 1;
                    
                    // Speed based on depth - larger/closer orbs move slower
                    const orbSpeed = props.baseSpeed * speedMultiplier;
                    const orbZSpeed = props.zSpeed * speedMultiplier;
                    
                    const targetVx = (dx / mag) * orbSpeed * deltaTime;
                    const targetVy = (dy / mag) * orbSpeed * deltaTime;
                    const targetVz = Math.sign(dz) * orbZSpeed * deltaTime;
                    
                    const zOscillation = Math.sin(currentTime * 0.0005 + orb.phaseOffset) * 0.00005 * deltaTime;
                    
                    // Burst orbs maintain their velocity, regular orbs use smooth transitions
                    let vx: number;
                    let vy: number;
                    
                    // Transition to normal movement if burst complete OR orb has traveled far enough
                    const shouldUseNormalMovement = burstCompleteRef.current || distFromCenter > 35;
                    
                    if (state.isBurstOrb && !shouldUseNormalMovement) {
                        // Burst phase: maintain velocity with gradual slowdown
                        // Faster decay as they get further from center
                        const distanceFactor = distFromCenter / 35; // 0 to 1
                        const decayRate = 0.985 - (distanceFactor * 0.01); // Much faster decay
                        const decay = Math.pow(decayRate, deltaTime / 16);
                        vx = state.vx * decay;
                        vy = state.vy * decay;
                    } else {
                        // Normal phase: smooth velocity changes toward target
                        // Accelerate toward target
                        vx = state.vx + (targetVx - state.vx) * SMOOTHING;
                        vy = state.vy + (targetVy - state.vy) * SMOOTHING;
                        
                        // Apply mouse avoidance
                        if (isAvoiding) {
                            vx += avoidX;
                            vy += avoidY;
                        }
                        
                        // Apply orb-to-orb repulsion (always active)
                        vx += orbRepelX;
                        vy += orbRepelY;
                        
                        // Apply scroll delta influence - orbs drift in scroll direction
                        // Larger orbs (closer) react more to scroll for parallax effect
                        const scrollInfluence = scrollDeltaRef.current * 0.08 * (0.5 + orb.depthLayer * 0.5);
                        vy += scrollInfluence * deltaTime * 0.01;
                    }
                    
                    const vz = state.vz + (targetVz - state.vz) * SMOOTHING + zOscillation;
                    
                    // Speed clamp - burst orbs get higher max speed (but not too high)
                    const burstMultiplier = state.isBurstOrb && !burstCompleteRef.current ? 8 : 1;
                    const maxSpeed = MAX_SPEED * scale * burstMultiplier;
                    const speed = Math.sqrt(vx * vx + vy * vy);
                    if (speed > maxSpeed) {
                        const s = maxSpeed / speed;
                        vx *= s;
                        vy *= s;
                    }
                    
                    // Position update
                    let x = state.x + vx * deltaTime;
                    let y = state.y + vy * deltaTime;
                    const z = state.z + vz * deltaTime;
                    
                    // Soft edge bounce - reverse velocity and pick new random target
                    if (x < 5) { 
                        x = 5; 
                        vx = Math.abs(vx) * 0.3;
                        targetX = randomInRange(20, 95); // Away from edge
                    }
                    if (x > 95) { 
                        x = 95; 
                        vx = -Math.abs(vx) * 0.3;
                        targetX = randomInRange(5, 80); // Away from edge
                    }
                    if (y < 5) { 
                        y = 5; 
                        vy = Math.abs(vy) * 0.3;
                        targetY = randomInRange(20, 95); // Away from edge
                    }
                    if (y > 95) { 
                        y = 95; 
                        vy = -Math.abs(vy) * 0.3;
                        targetY = randomInRange(5, 80); // Away from edge
                    }
                    
                    // After burst phase, clear burst flag so orbs behave normally
                    const isBurstOrb = burstCompleteRef.current ? false : state.isBurstOrb;
                    
                    next.set(orb.id, {
                        x: clamp(x, 0, 100),
                        y: clamp(y, 0, 100),
                        z: clamp(z, 10, 90),
                        vx,
                        vy,
                        vz,
                        targetX,
                        targetY,
                        targetZ,
                        deathTime: state.deathTime,
                        lifecycle,
                        lifecycleStart,
                        scale,
                        isBurstOrb,
                    });
                });
                
                // ---------- Always Maintain Orb Counts ----------
                // Immediately spawn if below minimum (check every frame)
                while (aliveCount < ORB_COUNT.min) {
                    const { config, state: newState } = spawnOrb(currentTime, next);
                    configsToAdd.push(config);
                    next.set(config.id, newState);
                    aliveCount++;
                }
                
                // Occasionally spawn extra orbs (check every 2 seconds)
                if (currentTime - lastSpawnCheckRef.current > 2000) {
                    lastSpawnCheckRef.current = currentTime;
                    if (aliveCount < ORB_COUNT.max && Math.random() < 0.4) {
                        const { config, state: newState } = spawnOrb(currentTime, next);
                        configsToAdd.push(config);
                        next.set(config.id, newState);
                    }
                }
                
                // Update configs if needed
                if (configsToAdd.length > 0 || idsToRemove.length > 0) {
                    setConfigs(prevConfigs => {
                        const filtered = prevConfigs.filter(c => !idsToRemove.includes(c.id));
                        return [...filtered, ...configsToAdd];
                    });
                }
                
                return next;
            });
            
            animationRef.current = requestAnimationFrame(animate);
        };
        
        animationRef.current = requestAnimationFrame(animate);
        
        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [enabled, mousePosition.x, mousePosition.y, configs, spawnOrb]);

    return { states, focalZ, configs };
}
