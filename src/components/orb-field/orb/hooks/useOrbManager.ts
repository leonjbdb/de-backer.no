"use client";

// =============================================================================
// useOrbManager - Custom hook for orb CRUD operations
// =============================================================================

import { useRef, useState, useCallback, useMemo } from 'react';
import { type Orb } from '../types';
import { OrbPhysics } from '../core/OrbPhysics';
import { SpatialGrid } from '../../grid/core/SpatialGrid';
import { type ViewportCells } from '../../grid/types';
import { DEFAULT_ORB_SPAWN_CONFIG, DEFAULT_ORB_BURST_CONFIG, DEFAULT_CONTINUOUS_SPAWN_CONFIG, DEFAULT_WANDER_CONFIG, type OrbSpawnConfig, type OrbBurstConfig, type ContinuousSpawnConfig } from '../config';
import { DEFAULT_ORB_VISUAL_CONFIG } from '../visuals/OrbVisualConfig';
import { CollisionSystem } from '../../collision/CollisionSystem';

/**
 * Generates random animation durations for an orb.
 * Each orb gets unique spawn and despawn durations within the configured range.
 */
function generateAnimationDurations(): { spawnAnimDurationMs: number; despawnAnimDurationMs: number } {
	const { spawnDurationMinMs, spawnDurationMaxMs, despawnDurationMinMs, despawnDurationMaxMs } = DEFAULT_ORB_VISUAL_CONFIG;
	return {
		spawnAnimDurationMs: spawnDurationMinMs + Math.random() * (spawnDurationMaxMs - spawnDurationMinMs),
		despawnAnimDurationMs: despawnDurationMinMs + Math.random() * (despawnDurationMaxMs - despawnDurationMinMs),
	};
}

/**
 * Generates random wander parameters for an orb.
 * Each orb gets unique wander characteristics for organic movement.
 */
function generateWanderParams(): {
	wanderStrength: number;
	wanderPhase: number;
	wanderSpeed: number;
	wanderModulationSpeed: number;
	wanderModulationPhase: number;
} {
	const { minWanderStrength, maxWanderStrength, minWanderSpeed, maxWanderSpeed, minModulationSpeed, maxModulationSpeed } = DEFAULT_WANDER_CONFIG;
	return {
		wanderStrength: minWanderStrength + Math.random() * (maxWanderStrength - minWanderStrength),
		wanderPhase: Math.random() * Math.PI * 2, // Start at random phase
		wanderSpeed: minWanderSpeed + Math.random() * (maxWanderSpeed - minWanderSpeed),
		wanderModulationSpeed: minModulationSpeed + Math.random() * (maxModulationSpeed - minModulationSpeed),
		wanderModulationPhase: Math.random() * Math.PI * 2,
	};
}

interface UseOrbManagerOptions {
	/** Configuration for orb spawning. */
	spawnConfig?: Partial<OrbSpawnConfig>;
	/** Configuration for burst spawning. */
	burstConfig?: Partial<OrbBurstConfig>;
	/** Configuration for continuous spawning. */
	continuousConfig?: Partial<ContinuousSpawnConfig>;
}

interface UseOrbManagerReturn {
	/** Ref to the internal orbs array for high-performance loop access. */
	orbsRef: React.MutableRefObject<Orb[]>;
	/** React state for orbs (for UI sync). */
	orbs: Orb[];
	/** Currently selected orb ID. */
	selectedOrbId: string | null;
	/** Currently selected orb data (real-time). */
	selectedOrbData: Orb | null;
	/** Ref for stable access to selected orb ID in loops. */
	selectedOrbIdRef: React.MutableRefObject<string | null>;
	/** Creates a new orb at the specified position. */
	createOrb: (pxX: number, pxY: number, layer: number, size: number, grid: SpatialGrid, vpc: ViewportCells) => void;
	/** Spawns a burst of orbs from a center point. */
	spawnOrbBurst: (centerX: number, centerY: number, grid: SpatialGrid, vpc: ViewportCells) => void;
	/** Deletes an orb by ID. */
	deleteOrb: (id: string, grid: SpatialGrid, vpc: ViewportCells) => void;
	/** Selects an orb by ID. */
	selectOrb: (id: string | null) => void;
	/** Updates the selected orb data (for real-time debug display). */
	updateSelectedOrbData: () => void;
	/** Syncs React state with orbsRef (for UI updates after direct ref modifications). */
	syncOrbsState: () => void;
	/** Spawns random orbs at random positions across the viewport. */
	spawnRandomOrbs: (count: number, screenWidth: number, screenHeight: number, grid: SpatialGrid, vpc: ViewportCells) => number;
}

/**
 * Custom hook encapsulating all orb CRUD operations.
 * Separates orb management logic from the main controller component.
 */
export function useOrbManager(options: UseOrbManagerOptions = {}): UseOrbManagerReturn {
	const spawnConfig = useMemo(
		() => ({ ...DEFAULT_ORB_SPAWN_CONFIG, ...options.spawnConfig }),
		[options.spawnConfig]
	);
	const burstConfig = useMemo(
		() => ({ ...DEFAULT_ORB_BURST_CONFIG, ...options.burstConfig }),
		[options.burstConfig]
	);
	const continuousConfig = useMemo(
		() => ({ ...DEFAULT_CONTINUOUS_SPAWN_CONFIG, ...options.continuousConfig }),
		[options.continuousConfig]
	);

	const orbsRef = useRef<Orb[]>([]);
	const selectedOrbIdRef = useRef<string | null>(null);

	const [orbs, setOrbs] = useState<Orb[]>([]);
	const [selectedOrbId, setSelectedOrbId] = useState<string | null>(null);
	const [selectedOrbData, setSelectedOrbData] = useState<Orb | null>(null);

	const createOrb = useCallback((
		pxX: number,
		pxY: number,
		z: number,
		size: number,
		grid: SpatialGrid,
		vpc: ViewportCells
	) => {
		// Validate spawn position - block if cell is occupied
		if (!CollisionSystem.canSpawn(pxX, pxY, z, size, grid, vpc)) {
			return;
		}

		// Random 3D direction - use spherical coordinates
		const theta = Math.random() * Math.PI * 2; // XY plane angle
		const phi = (Math.random() - 0.5) * Math.PI * 0.5; // Z angle (±45°)
		const speedRange = spawnConfig.maxSpeed - spawnConfig.minSpeed;
		const speed = spawnConfig.minSpeed + Math.random() * speedRange;

		// Convert to velocity components
		const cosTheta = Math.cos(theta);
		const sinTheta = Math.sin(theta);
		const cosPhi = Math.cos(phi);
		const sinPhi = Math.sin(phi);

		// Generate random animation durations and wander params for this orb
		const animDurations = generateAnimationDurations();
		const wanderParams = generateWanderParams();

		const newOrb: Orb = {
			id: crypto.randomUUID(),
			pxX,
			pxY,
			z,
			vx: cosTheta * cosPhi * speed,
			vy: sinTheta * cosPhi * speed,
			vz: sinPhi * speed * 0.05, // Scale vz since it's in layers/s not px/s
			speed,
			angle: theta,
			size,
			createdAt: performance.now(),
			lifetimeMs: Infinity, // Manual spawns don't expire
			spawnAnimDurationMs: animDurations.spawnAnimDurationMs,
			despawnAnimDurationMs: animDurations.despawnAnimDurationMs,
			...wanderParams,
		};

		orbsRef.current.push(newOrb);
		setOrbs([...orbsRef.current]);
		setSelectedOrbId(newOrb.id);
		selectedOrbIdRef.current = newOrb.id;

		OrbPhysics.markOrbCircular(grid, newOrb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
	}, [spawnConfig.minSpeed, spawnConfig.maxSpeed]);

	const deleteOrb = useCallback((id: string, grid: SpatialGrid, vpc: ViewportCells) => {
		const orbToDelete = orbsRef.current.find(o => o.id === id);
		if (orbToDelete) {
			OrbPhysics.clearOrbCircular(grid, orbToDelete, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
			orbsRef.current = orbsRef.current.filter(o => o.id !== id);
			setOrbs([...orbsRef.current]);

			if (selectedOrbIdRef.current === id) {
				setSelectedOrbId(null);
				setSelectedOrbData(null);
				selectedOrbIdRef.current = null;
			}
		}
	}, []);

	const selectOrb = useCallback((id: string | null) => {
		setSelectedOrbId(id);
		selectedOrbIdRef.current = id;
		if (id) {
			const found = orbsRef.current.find(o => o.id === id);
			setSelectedOrbData(found ? { ...found } : null);
		} else {
			setSelectedOrbData(null);
		}
	}, []);

	const updateSelectedOrbData = useCallback(() => {
		if (selectedOrbIdRef.current) {
			const found = orbsRef.current.find(o => o.id === selectedOrbIdRef.current);
			if (found) {
				setSelectedOrbData({ ...found });
			}
		}
	}, []);

	/**
	 * Spawns a burst of orbs from a center point with size-based distribution.
	 * 
	 * Implements:
	 * - Weighted size selection (inverse square law - more small orbs than large)
	 * - Size-based layer assignment (larger orbs on back layers)
	 * - Size-scaled velocity (smaller orbs faster, larger orbs slower)
	 * - Collision-safe positioning with retries
	 * - Outward velocity from center point
	 */
	const spawnOrbBurst = useCallback((
		centerX: number,
		centerY: number,
		grid: SpatialGrid,
		vpc: ViewportCells
	) => {
		const { targetCount, maxSize, spawnRadiusPx, maxRetries, minSpeed, maxSpeed, minLifetimeMs, maxLifetimeMs } = burstConfig;
		const totalLayers = grid.config.layers;
		const newOrbs: Orb[] = [];

		// Helper: Weighted random size selection (inverse square law)
		const getRandomSize = (): number => {
			// Build cumulative weights: 1/(1^2), 1/(2^2), 1/(3^2), etc.
			const weights: number[] = [];
			let sum = 0;
			for (let size = 1; size <= maxSize; size++) {
				const weight = 1 / (size * size);
				sum += weight;
				weights.push(sum);
			}

			// Random selection
			const rand = Math.random() * sum;
			for (let i = 0; i < weights.length; i++) {
				if (rand <= weights[i]) {
					return i + 1;
				}
			}
			return 1; // Fallback
		};

		// Helper: Get random position near center within spawn radius
		const getRandomPosition = (): { x: number; y: number } => {
			const angle = Math.random() * Math.PI * 2;
			const distance = Math.random() * spawnRadiusPx;
			return {
				x: centerX + Math.cos(angle) * distance,
				y: centerY + Math.sin(angle) * distance,
			};
		};

		// Spawn each orb
		for (let i = 0; i < targetCount; i++) {
			const size = getRandomSize();
			const layer = OrbPhysics.getPreferredLayer(size, maxSize, totalLayers);

			let spawnPos: { x: number; y: number } | null = null;
			let attempts = 0;

			// Try to find a valid spawn position
			while (attempts < maxRetries) {
				const pos = getRandomPosition();
				if (CollisionSystem.canSpawn(pos.x, pos.y, layer, size, grid, vpc)) {
					spawnPos = pos;
					break;
				}
				attempts++;
			}

			// Skip if no valid position found
			if (!spawnPos) continue;

			// Calculate outward velocity from center
			const dx = spawnPos.x - centerX;
			const dy = spawnPos.y - centerY;
			const angle = Math.atan2(dy, dx);

			// Size-based speed scaling (inverse square root - consistent with OrbPhysics)
			// Smaller orbs get higher velocities, larger orbs get lower velocities
			const sizeSpeedFactor = 1 / Math.sqrt(size);
			const scaledMinSpeed = minSpeed * sizeSpeedFactor;
			const scaledMaxSpeed = maxSpeed * sizeSpeedFactor;
			const speed = scaledMinSpeed + Math.random() * (scaledMaxSpeed - scaledMinSpeed);

			// Random lifetime between min and max
			const lifetimeMs = minLifetimeMs + Math.random() * (maxLifetimeMs - minLifetimeMs);

			// Generate random animation durations and wander params for this orb
			const animDurations = generateAnimationDurations();
			const wanderParams = generateWanderParams();

			// Create orb
			const newOrb: Orb = {
				id: crypto.randomUUID(),
				pxX: spawnPos.x,
				pxY: spawnPos.y,
				z: layer,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				vz: 0, // Start with no Z velocity - layer attraction will handle depth movement
				speed,
				angle,
				size,
				createdAt: performance.now(),
				lifetimeMs,
				spawnAnimDurationMs: animDurations.spawnAnimDurationMs,
				despawnAnimDurationMs: animDurations.despawnAnimDurationMs,
				...wanderParams,
			};

			// Mark on grid
			OrbPhysics.markOrbCircular(grid, newOrb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
			newOrbs.push(newOrb);
		}

		// Add all new orbs to the array
		orbsRef.current.push(...newOrbs);
		setOrbs([...orbsRef.current]);
	}, [burstConfig]);

	const syncOrbsState = useCallback(() => {
		setOrbs([...orbsRef.current]);
	}, []);

	/**
	 * Spawns random orbs at random positions across the viewport.
	 * Uses the same size distribution and lifetime as burst spawning.
	 * Returns the number of orbs actually spawned.
	 */
	const spawnRandomOrbs = useCallback((
		count: number,
		screenWidth: number,
		screenHeight: number,
		grid: SpatialGrid,
		vpc: ViewportCells
	): number => {
		const { maxSize, maxRetries, minSpeed, maxSpeed, minLifetimeMs, maxLifetimeMs } = burstConfig;
		const { edgeMarginPx } = continuousConfig;
		const totalLayers = grid.config.layers;
		const newOrbs: Orb[] = [];

		// Helper: Weighted random size selection (inverse square law)
		const getRandomSize = (): number => {
			const weights: number[] = [];
			let sum = 0;
			for (let size = 1; size <= maxSize; size++) {
				const weight = 1 / (size * size);
				sum += weight;
				weights.push(sum);
			}
			const rand = Math.random() * sum;
			for (let i = 0; i < weights.length; i++) {
				if (rand <= weights[i]) {
					return i + 1;
				}
			}
			return 1;
		};

		// Helper: Get random position within viewport (with margin from edges)
		const getRandomPosition = (): { x: number; y: number } => {
			return {
				x: edgeMarginPx + Math.random() * (screenWidth - 2 * edgeMarginPx),
				y: edgeMarginPx + Math.random() * (screenHeight - 2 * edgeMarginPx),
			};
		};

		for (let i = 0; i < count; i++) {
			const size = getRandomSize();
			const layer = OrbPhysics.getPreferredLayer(size, maxSize, totalLayers);

			let spawnPos: { x: number; y: number } | null = null;
			let attempts = 0;

			while (attempts < maxRetries) {
				const pos = getRandomPosition();
				if (CollisionSystem.canSpawn(pos.x, pos.y, layer, size, grid, vpc)) {
					spawnPos = pos;
					break;
				}
				attempts++;
			}

			if (!spawnPos) continue;

			// Random direction for velocity
			const angle = Math.random() * Math.PI * 2;

			// Size-based speed scaling
			const sizeSpeedFactor = 1 / Math.sqrt(size);
			const scaledMinSpeed = minSpeed * sizeSpeedFactor;
			const scaledMaxSpeed = maxSpeed * sizeSpeedFactor;
			const speed = scaledMinSpeed + Math.random() * (scaledMaxSpeed - scaledMinSpeed);

			// Random lifetime
			const lifetimeMs = minLifetimeMs + Math.random() * (maxLifetimeMs - minLifetimeMs);

			// Generate random animation durations and wander params for this orb
			const animDurations = generateAnimationDurations();
			const wanderParams = generateWanderParams();

			const newOrb: Orb = {
				id: crypto.randomUUID(),
				pxX: spawnPos.x,
				pxY: spawnPos.y,
				z: layer,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				vz: 0,
				speed,
				angle,
				size,
				createdAt: performance.now(),
				lifetimeMs,
				spawnAnimDurationMs: animDurations.spawnAnimDurationMs,
				despawnAnimDurationMs: animDurations.despawnAnimDurationMs,
				...wanderParams,
			};

			OrbPhysics.markOrbCircular(grid, newOrb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
			newOrbs.push(newOrb);
		}

		if (newOrbs.length > 0) {
			orbsRef.current.push(...newOrbs);
			setOrbs([...orbsRef.current]); // Sync React state for UI
		}

		return newOrbs.length;
	}, [burstConfig, continuousConfig]);

	return {
		orbsRef,
		orbs,
		selectedOrbId,
		selectedOrbData,
		selectedOrbIdRef,
		createOrb,
		spawnOrbBurst,
		spawnRandomOrbs,
		deleteOrb,
		selectOrb,
		updateSelectedOrbData,
		syncOrbsState,
	};
}

