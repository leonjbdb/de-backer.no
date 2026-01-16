// =============================================================================
// CollisionSystem - Collision Detection and Resolution
// =============================================================================

import { CELL_EMPTY, hasCellFlag, CELL_FILLED, CELL_BORDER } from '../shared/types';
import { SpatialGrid } from '../grid/core/SpatialGrid';
import { type ViewportCells } from '../grid/types';
import { type Orb } from '../orb/types';

/**
 * Result of a collision check containing blocking status and reflection axes.
 */
export interface CollisionResult {
	/** Whether any collision was detected. */
	blocked: boolean;
	/** Whether to reflect velocity on the X-axis. */
	reflectX: boolean;
	/** Whether to reflect velocity on the Y-axis. */
	reflectY: boolean;
}

/**
 * Collision detection and resolution system.
 *
 * Single Responsibility: All collision logic in one place.
 * Separates concerns from physics (movement) and grid (storage).
 */
export class CollisionSystem {
	/**
	 * Checks if a move would result in collision and returns resolution.
	 *
	 * Performs axis-independent collision detection for proper corner handling.
	 * Tests X-axis, Y-axis, and diagonal movement separately.
	 * For multi-cell orbs (size > 1), checks the circular footprint.
	 *
	 * @param orb - The orb attempting to move.
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 * @param grid - The spatial grid instance for collision queries.
	 * @param vpc - Viewport cell metrics for coordinate conversion.
	 * @returns CollisionResult with blocking status and reflection axes.
	 */
	static checkMove(
		orb: Orb,
		deltaTime: number,
		grid: SpatialGrid,
		vpc: ViewportCells
	): CollisionResult {
		const nextX = orb.pxX + orb.vx * deltaTime;
		const nextY = orb.pxY + orb.vy * deltaTime;

		const currCellX = ((orb.pxX * vpc.invCellSizeXPx) | 0) + vpc.startCellX;
		const currCellY = ((orb.pxY * vpc.invCellSizeYPx) | 0) + vpc.startCellY;
		const nextCellX = ((nextX * vpc.invCellSizeXPx) | 0) + vpc.startCellX;
		const nextCellY = ((nextY * vpc.invCellSizeYPx) | 0) + vpc.startCellY;

		// For size 1 orbs, use simple single-cell collision
		if (orb.size === 1) {
			const blockedX = grid.isBlocking(nextCellX, currCellY, orb.layer);
			const blockedY = grid.isBlocking(currCellX, nextCellY, orb.layer);
			const blockedDiag = grid.isBlocking(nextCellX, nextCellY, orb.layer);

			return {
				blocked: blockedX || blockedY || blockedDiag,
				reflectX: blockedX || (blockedDiag && nextCellX !== currCellX),
				reflectY: blockedY || (blockedDiag && nextCellY !== currCellY),
			};
		}

		// For multi-cell orbs, check circular footprint
		// Radius is size - 1, ensuring each size is distinct
		const radius = orb.size - 1;
		let blockedX = false;
		let blockedY = false;

		// Check cells in circular footprint at next position
		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				if (dx * dx + dy * dy <= radius * radius) {
					// Check X-axis movement
					if (grid.isBlocking(nextCellX + dx, currCellY + dy, orb.layer)) {
						blockedX = true;
					}
					// Check Y-axis movement
					if (grid.isBlocking(currCellX + dx, nextCellY + dy, orb.layer)) {
						blockedY = true;
					}
				}
			}
		}

		return {
			blocked: blockedX || blockedY,
			reflectX: blockedX,
			reflectY: blockedY,
		};
	}

	/**
	 * Validates if spawning at a position is allowed.
	 *
	 * Prevents spawning in occupied cells or on border walls.
	 * For multi-cell orbs (size > 1), checks the entire circular footprint.
	 *
	 * @param pxX - Pixel X position where spawn is attempted.
	 * @param pxY - Pixel Y position where spawn is attempted.
	 * @param layer - Z-layer for the spawn.
	 * @param size - Size of the orb in grid cells.
	 * @param grid - The spatial grid instance for occupancy queries.
	 * @param vpc - Viewport cell metrics for coordinate conversion.
	 * @returns True if spawning is allowed, false if blocked.
	 */
	static canSpawn(
		pxX: number,
		pxY: number,
		layer: number,
		size: number,
		grid: SpatialGrid,
		vpc: ViewportCells
	): boolean {
		const centerCellX = ((pxX * vpc.invCellSizeXPx) | 0) + vpc.startCellX;
		const centerCellY = ((pxY * vpc.invCellSizeYPx) | 0) + vpc.startCellY;

		// For size 1 orbs, check single cell
		if (size === 1) {
			return grid.getCell(centerCellX, centerCellY, layer) === CELL_EMPTY;
		}

		// For multi-cell orbs, check circular footprint
		// Radius is size - 1, ensuring each size is distinct
		const radius = size - 1;

		for (let dy = -radius; dy <= radius; dy++) {
			for (let dx = -radius; dx <= radius; dx++) {
				if (dx * dx + dy * dy <= radius * radius) {
					const state = grid.getCell(centerCellX + dx, centerCellY + dy, layer);
					// Check if cell has blocking flags (FILLED or BORDER)
					if (hasCellFlag(state, CELL_FILLED) || hasCellFlag(state, CELL_BORDER)) {
						return false;
					}
				}
			}
		}

		return true;
	}

	/**
	 * Applies collision response to orb velocity.
	 *
	 * Reflects velocity components on specified axes.
	 * Call this after detecting a collision via checkMove().
	 *
	 * @param orb - The orb to update.
	 * @param reflectX - Whether to reflect X-axis velocity.
	 * @param reflectY - Whether to reflect Y-axis velocity.
	 */
	static applyReflection(
		orb: Orb,
		reflectX: boolean,
		reflectY: boolean
	): void {
		if (reflectX) orb.vx = -orb.vx;
		if (reflectY) orb.vy = -orb.vy;
	}

	/**
	 * Applies soft repulsion forces when orbs' avoidance zones overlap.
	 * 
	 * The closer orbs get, the stronger the repulsion force.
	 * Force is mass-weighted so larger orbs push smaller orbs more.
	 * 
	 * @param orbs - Array of all orbs to check.
	 * @param vpc - Viewport cell metrics for coordinate conversion.
	 * @param repulsionStrength - Base strength of the repulsion force (default 50).
	 */
	static applyAvoidanceRepulsion(
		orbs: Orb[],
		vpc: ViewportCells,
		repulsionStrength: number = 50
	): void {
		for (let i = 0; i < orbs.length; i++) {
			for (let j = i + 1; j < orbs.length; j++) {
				const orbA = orbs[i];
				const orbB = orbs[j];

				// Skip if on different layers
				if (orbA.layer !== orbB.layer) continue;

				// Calculate distance between centers in cells
				const cellAX = orbA.pxX * vpc.invCellSizeXPx;
				const cellAY = orbA.pxY * vpc.invCellSizeYPx;
				const cellBX = orbB.pxX * vpc.invCellSizeXPx;
				const cellBY = orbB.pxY * vpc.invCellSizeYPx;

				const dx = cellBX - cellAX;
				const dy = cellBY - cellAY;
				const distSq = dx * dx + dy * dy;

				if (distSq < 0.001) continue; // Avoid division by zero

				const dist = Math.sqrt(distSq);

				// Calculate avoidance radii (matching OrbPhysics formula)
				const radiusA = orbA.size - 1;
				const radiusB = orbB.size - 1;
				const avoidanceA = Math.floor(Math.sqrt(orbA.size) + radiusA + 1);
				const avoidanceB = Math.floor(Math.sqrt(orbB.size) + radiusB + 1);

				// Combined avoidance radius (when zones start to overlap)
				const combinedAvoidance = avoidanceA + avoidanceB;

				// Combined body radius (for hard collision, handled separately)
				const combinedBody = radiusA + radiusB + 1;

				// Check if avoidance zones overlap but not hard collision yet
				if (dist < combinedAvoidance && dist > combinedBody) {
					// Calculate repulsion strength based on overlap
					// 0 at edge of avoidance, 1 at edge of body
					const overlap = 1 - (dist - combinedBody) / (combinedAvoidance - combinedBody);

					// Quadratic falloff for smooth repulsion (stronger when closer)
					const force = overlap * overlap * repulsionStrength;

					// Direction from A to B (normalized)
					const nx = dx / dist;
					const ny = dy / dist;

					// Mass-weighted repulsion (smaller orbs get pushed more)
					const massA = orbA.size;
					const massB = orbB.size;
					const totalMass = massA + massB;

					const forceA = force * (massB / totalMass);
					const forceB = force * (massA / totalMass);

					// Apply repulsion (push orbs apart)
					orbA.vx -= forceA * nx;
					orbA.vy -= forceA * ny;
					orbB.vx += forceB * nx;
					orbB.vy += forceB * ny;
				}
			}
		}
	}

	/**
	 * Resolves orb-orb collisions with mass-weighted elastic bounce.
	 * 
	 * Checks all pairs of orbs for overlap and applies impulses based on
	 * their relative masses (size). Larger orbs affect smaller orbs more.
	 * 
	 * Uses the elastic collision formula:
	 * v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, n) * n
	 * v2' = v2 + (2*m1/(m1+m2)) * dot(v1-v2, n) * n
	 * 
	 * @param orbs - Array of all orbs to check.
	 * @param vpc - Viewport cell metrics for coordinate conversion.
	 */
	static resolveOrbOrbCollisions(
		orbs: Orb[],
		vpc: ViewportCells
	): void {
		for (let i = 0; i < orbs.length; i++) {
			for (let j = i + 1; j < orbs.length; j++) {
				const orbA = orbs[i];
				const orbB = orbs[j];

				// Skip if on different layers
				if (orbA.layer !== orbB.layer) continue;

				// Calculate distance between centers in cells
				const cellAX = orbA.pxX * vpc.invCellSizeXPx;
				const cellAY = orbA.pxY * vpc.invCellSizeYPx;
				const cellBX = orbB.pxX * vpc.invCellSizeXPx;
				const cellBY = orbB.pxY * vpc.invCellSizeYPx;

				const dx = cellBX - cellAX;
				const dy = cellBY - cellAY;
				const distSq = dx * dx + dy * dy;

				// Combined radius (in cells) - orbs touch when distance <= sum of radii + 1
				const radiusA = orbA.size - 1;
				const radiusB = orbB.size - 1;
				const minDist = radiusA + radiusB + 1;

				if (distSq < minDist * minDist && distSq > 0.001) {
					// Collision detected - apply mass-weighted elastic collision
					const dist = Math.sqrt(distSq);
					const nx = dx / dist;
					const ny = dy / dist;

					// Use size as mass (larger orbs have more momentum)
					const massA = orbA.size;
					const massB = orbB.size;
					const totalMass = massA + massB;

					// Relative velocity of A with respect to B
					const dvx = orbA.vx - orbB.vx;
					const dvy = orbA.vy - orbB.vy;

					// Relative velocity in collision normal direction
					const dvn = dvx * nx + dvy * ny;

					// Only resolve if objects are approaching each other
					if (dvn > 0) {
						// Mass-weighted impulse factors
						// Smaller orbs get pushed more, larger orbs get pushed less
						const impulseA = (2 * massB / totalMass) * dvn;
						const impulseB = (2 * massA / totalMass) * dvn;

						orbA.vx -= impulseA * nx;
						orbA.vy -= impulseA * ny;
						orbB.vx += impulseB * nx;
						orbB.vy += impulseB * ny;
					}
				}
			}
		}
	}
}
