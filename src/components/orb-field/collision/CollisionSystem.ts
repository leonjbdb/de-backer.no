// =============================================================================
// CollisionSystem - Collision Detection and Resolution
// =============================================================================

import { hasCellFlag, CELL_FILLED, CELL_BORDER } from '../shared/types';
import { SpatialGrid } from '../grid/core/SpatialGrid';
import { type ViewportCells } from '../grid/types';
import { type Orb } from '../orb/types';

/**
 * Result of a 3D collision check containing blocking status and reflection axes.
 */
export interface CollisionResult {
	/** Whether any collision was detected. */
	blocked: boolean;
	/** Whether to reflect velocity on the X-axis. */
	reflectX: boolean;
	/** Whether to reflect velocity on the Y-axis. */
	reflectY: boolean;
	/** Whether to reflect velocity on the Z-axis. */
	reflectZ: boolean;
}

/**
 * Collision detection and resolution system.
 *
 * Single Responsibility: All collision logic in one place.
 * Separates concerns from physics (movement) and grid (storage).
 */
export class CollisionSystem {
	/**
	 * Checks if a 3D move would result in collision and returns resolution.
	 *
	 * Performs axis-independent collision detection for proper corner handling.
	 * Tests X-axis, Y-axis, Z-axis, and diagonal movements separately.
	 * For multi-cell orbs (size > 1), checks the 3D spherical footprint.
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
		const nextZ = orb.z + orb.vz * deltaTime;

		const currCellX = ((orb.pxX * vpc.invCellSizeXPx) | 0) + vpc.startCellX;
		const currCellY = ((orb.pxY * vpc.invCellSizeYPx) | 0) + vpc.startCellY;
		const currLayer = Math.round(orb.z);
		const nextCellX = ((nextX * vpc.invCellSizeXPx) | 0) + vpc.startCellX;
		const nextCellY = ((nextY * vpc.invCellSizeYPx) | 0) + vpc.startCellY;
		const nextLayer = Math.round(nextZ);

		// For size 1 orbs, use simple single-cell collision
		// Each axis is checked independently to avoid cross-axis reflection
		// Use isWall() instead of isBlocking() - only bounce off actual walls, not other orbs
		if (orb.size === 1) {
			const blockedX = grid.isWall(nextCellX, currCellY, currLayer);
			const blockedY = grid.isWall(currCellX, nextCellY, currLayer);
			const blockedZ = grid.isWall(currCellX, currCellY, nextLayer);

			// Only reflect axes that are independently blocked
			// This preserves momentum in non-blocked axes (e.g., Z-bounce shouldn't affect X/Y)
			return {
				blocked: blockedX || blockedY || blockedZ,
				reflectX: blockedX,
				reflectY: blockedY,
				reflectZ: blockedZ,
			};
		}

		// For multi-cell orbs, check 3D spherical footprint
		// Radius is size - 1, ensuring each size is distinct
		const radius = orb.size - 1;
		let blockedX = false;
		let blockedY = false;
		let blockedZ = false;

		// Check cells in 3D spherical footprint at next position
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dy = -radius; dy <= radius; dy++) {
				for (let dx = -radius; dx <= radius; dx++) {
					if (dx * dx + dy * dy + dz * dz <= radius * radius) {
						// Check X-axis movement - use isWall() to only bounce off actual walls
						if (grid.isWall(nextCellX + dx, currCellY + dy, currLayer + dz)) {
							blockedX = true;
						}
						// Check Y-axis movement
						if (grid.isWall(currCellX + dx, nextCellY + dy, currLayer + dz)) {
							blockedY = true;
						}
						// Check Z-axis movement
						if (grid.isWall(currCellX + dx, currCellY + dy, nextLayer + dz)) {
							blockedZ = true;
						}
					}
				}
			}
		}

		return {
			blocked: blockedX || blockedY || blockedZ,
			reflectX: blockedX,
			reflectY: blockedY,
			reflectZ: blockedZ,
		};
	}

	/**
	 * Validates if spawning at a 3D position is allowed.
	 *
	 * Prevents spawning in occupied cells or on border walls.
	 * For multi-cell orbs (size > 1), checks the entire 3D spherical footprint.
	 *
	 * @param pxX - Pixel X position where spawn is attempted.
	 * @param pxY - Pixel Y position where spawn is attempted.
	 * @param z - Z-layer for the spawn (continuous).
	 * @param size - Size of the orb in grid cells.
	 * @param grid - The spatial grid instance for occupancy queries.
	 * @param vpc - Viewport cell metrics for coordinate conversion.
	 * @returns True if spawning is allowed, false if blocked.
	 */
	static canSpawn(
		pxX: number,
		pxY: number,
		z: number,
		size: number,
		grid: SpatialGrid,
		vpc: ViewportCells
	): boolean {
		const centerCellX = ((pxX * vpc.invCellSizeXPx) | 0) + vpc.startCellX;
		const centerCellY = ((pxY * vpc.invCellSizeYPx) | 0) + vpc.startCellY;
		const centerLayer = Math.round(z);

		// For size 1 orbs, check single cell - only block on FILLED or BORDER
		if (size === 1) {
			const state = grid.getCell(centerCellX, centerCellY, centerLayer);
			return !hasCellFlag(state, CELL_FILLED) && !hasCellFlag(state, CELL_BORDER);
		}

		// For multi-cell orbs, check 3D spherical footprint
		// Radius is size - 1, ensuring each size is distinct
		const radius = size - 1;

		for (let dz = -radius; dz <= radius; dz++) {
			for (let dy = -radius; dy <= radius; dy++) {
				for (let dx = -radius; dx <= radius; dx++) {
					if (dx * dx + dy * dy + dz * dz <= radius * radius) {
						const state = grid.getCell(centerCellX + dx, centerCellY + dy, centerLayer + dz);
						// Check if cell has blocking flags (FILLED or BORDER)
						if (hasCellFlag(state, CELL_FILLED) || hasCellFlag(state, CELL_BORDER)) {
							return false;
						}
					}
				}
			}
		}

		return true;
	}

	/**
	 * Applies 3D collision response to orb velocity.
	 *
	 * Reflects velocity components on specified axes.
	 * Call this after detecting a collision via checkMove().
	 *
	 * @param orb - The orb to update.
	 * @param reflectX - Whether to reflect X-axis velocity.
	 * @param reflectY - Whether to reflect Y-axis velocity.
	 * @param reflectZ - Whether to reflect Z-axis velocity.
	 */
	static applyReflection(
		orb: Orb,
		reflectX: boolean,
		reflectY: boolean,
		reflectZ: boolean = false
	): void {
		if (reflectX) orb.vx = -orb.vx;
		if (reflectY) orb.vy = -orb.vy;
		if (reflectZ) orb.vz = -orb.vz;

		// Update the orb's angle to match the new velocity direction
		orb.angle = Math.atan2(orb.vy, orb.vx);
	}

	/**
	 * Applies soft 3D repulsion forces when orbs' avoidance zones overlap.
		 * 
		 * The closer orbs get, the stronger the repulsion force.
		 * Force is mass-weighted so larger orbs push smaller orbs more.
		 * Uses deltaTime for frame-rate independent, gradual velocity changes.
		 * 
		 * @param orbs - Array of all orbs to check.
		 * @param vpc - Viewport cell metrics for coordinate conversion.
		 * @param deltaTime - Time elapsed since last frame in seconds.
		 * @param repulsionStrength - Base strength of the repulsion acceleration (default 200).
		 */
	static applyAvoidanceRepulsion(
		orbs: Orb[],
		vpc: ViewportCells,
		deltaTime: number,
		repulsionStrength: number = 200
	): void {
		for (let i = 0; i < orbs.length; i++) {
			for (let j = i + 1; j < orbs.length; j++) {
				const orbA = orbs[i];
				const orbB = orbs[j];

				// Calculate 3D distance between centers in cells
				const cellAX = orbA.pxX * vpc.invCellSizeXPx;
				const cellAY = orbA.pxY * vpc.invCellSizeYPx;
				const cellAZ = orbA.z;
				const cellBX = orbB.pxX * vpc.invCellSizeXPx;
				const cellBY = orbB.pxY * vpc.invCellSizeYPx;
				const cellBZ = orbB.z;

				const dx = cellBX - cellAX;
				const dy = cellBY - cellAY;
				const dz = cellBZ - cellAZ;
				const distSq = dx * dx + dy * dy + dz * dz;

				if (distSq < 0.001) continue; // Avoid division by zero

				const dist = Math.sqrt(distSq);

				// Calculate avoidance radii - smaller zone for subtler avoidance
				const radiusA = orbA.size - 1;
				const radiusB = orbB.size - 1;
				// Reduced avoidance zone: just 0.5 cells beyond the body radius
				const avoidanceA = radiusA + 0.5;
				const avoidanceB = radiusB + 0.5;

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
					// This is now an acceleration, applied gradually via deltaTime
					const acceleration = overlap * overlap * repulsionStrength;

					// Direction from A to B (normalized) in 3D
					const nx = dx / dist;
					const ny = dy / dist;
					const nz = dz / dist;

					// Mass-weighted repulsion (smaller orbs get pushed more)
					const massA = orbA.size;
					const massB = orbB.size;
					const totalMass = massA + massB;

					const accelA = acceleration * (massB / totalMass);
					const accelB = acceleration * (massA / totalMass);

					// Apply 3D repulsion as gradual acceleration (push orbs apart)
					// Guard against NaN propagation
					if (isFinite(accelA) && isFinite(accelB)) {
						orbA.vx -= accelA * nx * deltaTime;
						orbA.vy -= accelA * ny * deltaTime;
						orbA.vz -= accelA * nz * deltaTime;
						orbB.vx += accelB * nx * deltaTime;
						orbB.vy += accelB * ny * deltaTime;
						orbB.vz += accelB * nz * deltaTime;

						// Update angles to match new velocity directions
						orbA.angle = Math.atan2(orbA.vy, orbA.vx);
						orbB.angle = Math.atan2(orbB.vy, orbB.vx);
					}
				}
			}
		}
	}

	/**
	 * Applies 2D mouse repulsion to all orbs.
	 * 
	 * The mouse acts as a repulsion point that pushes orbs away in the XY plane.
	 * Z-axis is not affected - this is purely 2D interaction.
	 * Each orb reacts to the mouse exactly once per frame (z-layer independent).
	 * 
	 * @param orbs - Array of all orbs to affect.
	 * @param mouseX - Mouse X position in pixels.
	 * @param mouseY - Mouse Y position in pixels.
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 * @param repulsionRadius - Radius in pixels within which orbs are affected.
	 * @param repulsionStrength - Base strength of the repulsion acceleration.
	 */
	static applyMouseRepulsion(
		orbs: Orb[],
		mouseX: number,
		mouseY: number,
		deltaTime: number,
		repulsionRadius: number = 150,
		repulsionStrength: number = 80
	): void {
		// Skip if mouse position is invalid
		if (!isFinite(mouseX) || !isFinite(mouseY)) return;

		for (const orb of orbs) {
			// Calculate 2D distance from mouse to orb center (XY only)
			const dx = orb.pxX - mouseX;
			const dy = orb.pxY - mouseY;
			const distSq = dx * dx + dy * dy;

			// Skip if too far or at same position
			if (distSq >= repulsionRadius * repulsionRadius || distSq < 1) continue;

			const dist = Math.sqrt(distSq);

			// Calculate repulsion strength based on distance
			// Stronger when closer (inverse relationship)
			const normalizedDist = dist / repulsionRadius;
			const falloff = 1 - normalizedDist; // 1 at center, 0 at edge

			// Quadratic falloff for smooth, natural repulsion
			const acceleration = falloff * falloff * repulsionStrength;

			// Direction away from mouse (normalized)
			const nx = dx / dist;
			const ny = dy / dist;

			// Apply repulsion as acceleration (XY only, no Z)
			// Guard against NaN propagation
			if (isFinite(acceleration) && isFinite(nx) && isFinite(ny)) {
				orb.vx += acceleration * nx * deltaTime;
				orb.vy += acceleration * ny * deltaTime;

				// Update angle to match new velocity direction
				orb.angle = Math.atan2(orb.vy, orb.vx);
			}
		}
	}

	/**
	 * Resolves 3D orb-orb collisions with mass-weighted elastic bounce.
	 * 
	 * Checks all pairs of orbs for overlap and applies impulses based on
	 * their relative masses (size). Larger orbs affect smaller orbs more.
	 * 
	 * Uses the elastic collision formula in 3D:
	 * v1' = v1 - (2*m2/(m1+m2)) * dot(v1-v2, n) * n
	 * v2' = v2 + (2*m1/(m1+m2)) * dot(v1-v2, n) * n
	 * 
	 * Also includes position correction to prevent orbs from getting stuck.
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

				// Calculate 3D distance between centers in cells
				const cellAX = orbA.pxX * vpc.invCellSizeXPx;
				const cellAY = orbA.pxY * vpc.invCellSizeYPx;
				const cellAZ = orbA.z;
				const cellBX = orbB.pxX * vpc.invCellSizeXPx;
				const cellBY = orbB.pxY * vpc.invCellSizeYPx;
				const cellBZ = orbB.z;

				const dx = cellBX - cellAX;
				const dy = cellBY - cellAY;
				const dz = cellBZ - cellAZ;
				const distSq = dx * dx + dy * dy + dz * dz;

				// Combined radius (in cells) - orbs touch when distance <= sum of radii + 1
				const radiusA = orbA.size - 1;
				const radiusB = orbB.size - 1;
				const minDist = radiusA + radiusB + 1;

				if (distSq < minDist * minDist && distSq > 0.001) {
					const dist = Math.sqrt(distSq);
					const nx = dx / dist;
					const ny = dy / dist;
					const nz = dz / dist;

					// Use size as mass (larger orbs have more momentum)
					const massA = orbA.size;
					const massB = orbB.size;
					const totalMass = massA + massB;

					// Position correction: push orbs apart if overlapping
					const overlap = minDist - dist;
					if (overlap > 0) {
						// Distribute separation based on mass (smaller orbs move more)
						// Use 1.1x to fully separate plus a small buffer to prevent re-collision
						const separationA = (overlap * massB / totalMass) * 1.1;
						const separationB = (overlap * massA / totalMass) * 1.1;

						// Convert back to pixel space for XY, keep Z in layers
						const cellSizeXPx = 1 / vpc.invCellSizeXPx;
						const cellSizeYPx = 1 / vpc.invCellSizeYPx;

						// Guard against NaN propagation
						if (isFinite(separationA) && isFinite(separationB) && isFinite(nx) && isFinite(ny) && isFinite(nz)) {
							orbA.pxX -= nx * separationA * cellSizeXPx;
							orbA.pxY -= ny * separationA * cellSizeYPx;
							orbA.z -= nz * separationA;
							orbB.pxX += nx * separationB * cellSizeXPx;
							orbB.pxY += ny * separationB * cellSizeYPx;
							orbB.z += nz * separationB;
						}
					}

					// Relative velocity of A with respect to B in 3D
					const dvx = orbA.vx - orbB.vx;
					const dvy = orbA.vy - orbB.vy;
					const dvz = orbA.vz - orbB.vz;

					// Relative velocity in collision normal direction
					const dvn = dvx * nx + dvy * ny + dvz * nz;

					// Only resolve velocity if objects are approaching each other
					if (dvn > 0 && isFinite(dvn)) {
						// Mass-weighted impulse factors with reduced elasticity
						// Using 0.8 instead of 2.0 for softer, less oscillation-prone collisions
						const elasticity = 0.8;
						const impulseA = (elasticity * massB / totalMass) * dvn;
						const impulseB = (elasticity * massA / totalMass) * dvn;

						// Guard against NaN propagation
						if (isFinite(impulseA) && isFinite(impulseB)) {
							orbA.vx -= impulseA * nx;
							orbA.vy -= impulseA * ny;
							orbA.vz -= impulseA * nz;
							orbB.vx += impulseB * nx;
							orbB.vy += impulseB * ny;
							orbB.vz += impulseB * nz;

							// Update angles to match new velocity directions
							orbA.angle = Math.atan2(orbA.vy, orbA.vx);
							orbB.angle = Math.atan2(orbB.vy, orbB.vx);
						}
					}
				}
			}
		}
	}
}
