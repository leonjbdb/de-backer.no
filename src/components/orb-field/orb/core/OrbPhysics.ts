// =============================================================================
// OrbPhysics - Geometry and Grid Interaction
// =============================================================================

import { SpatialGrid } from '../../grid/core/SpatialGrid';
import { CELL_FILLED, CELL_PROXIMITY } from '../../shared/types';
import { type Orb } from '../types';

/**
 * Handles the physical representation and movement of orbs on the spatial grid.
 *
 * Single Responsibility: Translating orb state into grid modifications
 * and updating orb positions based on velocity.
 */
export class OrbPhysics {
	/**
	 * Updates an orb's position based on its velocity and delta time.
	 * Uses frame-rate independent calculation for all 3 axes.
	 *
	 * @param orb - The orb to update.
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 */
	static updatePosition(orb: Orb, deltaTime: number): void {
		// Skip update if deltaTime is invalid (prevents NaN propagation)
		if (!isFinite(deltaTime) || deltaTime <= 0 || deltaTime > 1) return;

		const newX = orb.pxX + orb.vx * deltaTime;
		const newY = orb.pxY + orb.vy * deltaTime;
		const newZ = orb.z + orb.vz * deltaTime;

		// Only apply if results are finite (prevents NaN propagation)
		if (isFinite(newX)) orb.pxX = newX;
		if (isFinite(newY)) orb.pxY = newY;
		if (isFinite(newZ)) orb.z = newZ;
	}

	/**
	 * Calculates the maximum speed for an orb based on its size.
	 * Larger orbs have lower max speeds (inverse square root).
	 *
	 * @param size - The orb's size.
	 * @param baseMaxSpeed - Max speed for size 1 orbs.
	 * @param minMaxSpeed - Minimum max speed for largest orbs.
	 * @returns The maximum speed in pixels/second.
	 */
	static getMaxSpeed(size: number, baseMaxSpeed: number, minMaxSpeed: number): number {
		// Inverse square root: larger orbs are slower
		const maxSpeed = baseMaxSpeed / Math.sqrt(size);
		return Math.max(minMaxSpeed, maxSpeed);
	}

	/**
	 * Applies smooth speed limiting to an orb in 3D.
	 * If the orb exceeds its max speed, gradually decelerates with a smooth curve.
	 * Uses exponential interpolation for natural-feeling deceleration.
	 *
	 * @param orb - The orb to limit.
	 * @param baseMaxSpeed - Max speed for size 1 orbs.
	 * @param minMaxSpeed - Minimum max speed for largest orbs.
	 * @param decelerationRate - How quickly to approach max speed (0-1).
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 */
	static applySpeedLimit(
		orb: Orb,
		baseMaxSpeed: number,
		minMaxSpeed: number,
		decelerationRate: number,
		deltaTime: number
	): void {
		// Calculate 3D speed (vz is in layers/sec, scale to match XY)
		const vzScaled = orb.vz * 20; // Scale Z velocity to be comparable to XY
		const currentSpeed = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy + vzScaled * vzScaled);
		if (currentSpeed < 0.001) return; // Avoid division by zero

		const maxSpeed = this.getMaxSpeed(orb.size, baseMaxSpeed, minMaxSpeed);

		if (currentSpeed > maxSpeed) {
			// Calculate smooth deceleration factor
			// Use exponential decay for smooth curve: factor = 1 - (1 - rate)^(dt * 60)
			// The 60 normalizes for 60fps, so rate works consistently across frame rates
			const smoothFactor = 1 - Math.pow(1 - decelerationRate, deltaTime * 60);

			// Lerp current speed toward max speed
			const newSpeed = currentSpeed + (maxSpeed - currentSpeed) * smoothFactor;

			// Apply the new speed while preserving direction
			const scale = newSpeed / currentSpeed;
			orb.vx *= scale;
			orb.vy *= scale;
			orb.vz *= scale;

			// Update the orb's stored speed value (XY plane for compatibility)
			orb.speed = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy);
		}
	}

	/**
	 * Synchronizes velocity components (vx, vy) from speed and angle.
	 * Call this after modifying an orb's speed or angle directly.
	 *
	 * @param orb - The orb to synchronize.
	 */
	static syncVelocity(orb: Orb): void {
		orb.vx = Math.cos(orb.angle) * orb.speed;
		orb.vy = Math.sin(orb.angle) * orb.speed;
	}

	/**
	 * Marks an orb's footprint on the spatial grid.
	 * Uses bitwise OR for efficient floor operation.
	 *
	 * @param grid - The spatial grid instance.
	 * @param orb - The orb to mark.
	 * @param startCellX - Viewport start cell X offset.
	 * @param startCellY - Viewport start cell Y offset.
	 * @param invCellSizeX - Inverse cell width for fast division.
	 * @param invCellSizeY - Inverse cell height for fast division.
	 */
	static markOrb(
		grid: SpatialGrid,
		orb: Orb,
		startCellX: number,
		startCellY: number,
		invCellSizeX: number,
		invCellSizeY: number
	): void {
		const cellX = ((orb.pxX * invCellSizeX) | 0) + startCellX;
		const cellY = ((orb.pxY * invCellSizeY) | 0) + startCellY;
		const layer = Math.round(orb.z);

		grid.setCell(cellX, cellY, layer, CELL_FILLED);
	}

	/**
	 * Marks cells in a 3D spherical pattern based on orb size.
	 * 
	 * Orbs are 3D spheres that span multiple layers:
	 * - Size 1: 1x1x1 (single cell)
	 * - Size 2: 3D plus shape (extends 1 cell in each direction including Z)
	 * - Size 3+: Full 3D sphere
	 * 
	 * Also marks a 3D avoidance zone around the orb.
	 * 
	 * @param grid - The spatial grid instance.
	 * @param orb - The orb to mark.
	 * @param startCellX - Viewport start cell X offset.
	 * @param startCellY - Viewport start cell Y offset.
	 * @param invCellSizeX - Inverse cell width for fast division.
	 * @param invCellSizeY - Inverse cell height for fast division.
	 */
	static markOrbCircular(
		grid: SpatialGrid,
		orb: Orb,
		startCellX: number,
		startCellY: number,
		invCellSizeX: number,
		invCellSizeY: number
	): void {
		const centerCellX = ((orb.pxX * invCellSizeX) | 0) + startCellX;
		const centerCellY = ((orb.pxY * invCellSizeY) | 0) + startCellY;
		const centerLayer = Math.round(orb.z);

		// Radius is size - 1, ensuring each size is distinct:
		// Size 1 → radius 0 (1 cell), Size 2 → radius 1, etc.
		const radius = orb.size - 1;

		// Avoidance zone scales with orb size but with diminishing returns
		const avoidanceRadius = Math.floor(Math.sqrt(orb.size) + radius + 1);

		// 3D sphere marking - iterate over all three axes
		// First pass: Mark avoidance zone (yellow cells) in 3D
		for (let dz = -avoidanceRadius; dz <= avoidanceRadius; dz++) {
			for (let dy = -avoidanceRadius; dy <= avoidanceRadius; dy++) {
				for (let dx = -avoidanceRadius; dx <= avoidanceRadius; dx++) {
					const distSq = dx * dx + dy * dy + dz * dz;
					// Mark cells in avoidance shell (beyond orb but within avoidance radius)
					if (distSq > radius * radius && distSq <= avoidanceRadius * avoidanceRadius) {
						grid.addCellFlag(centerCellX + dx, centerCellY + dy, centerLayer + dz, CELL_PROXIMITY);
					}
				}
			}
		}

		// Second pass: Mark orb cells (red cells) in 3D
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dy = -radius; dy <= radius; dy++) {
				for (let dx = -radius; dx <= radius; dx++) {
					// Check if cell is within 3D spherical boundary
					if (dx * dx + dy * dy + dz * dz <= radius * radius) {
						grid.addCellFlag(centerCellX + dx, centerCellY + dy, centerLayer + dz, CELL_FILLED);
					}
				}
			}
		}
	}

	/**
	 * Clears an orb's footprint from the spatial grid.
	 * Uses removeCellFlag to preserve other flags.
	 *
	 * @param grid - The spatial grid instance.
	 * @param orb - The orb to clear.
	 * @param startCellX - Viewport start cell X offset.
	 * @param startCellY - Viewport start cell Y offset.
	 * @param invCellSizeX - Inverse cell width for fast division.
	 * @param invCellSizeY - Inverse cell height for fast division.
	 */
	static clearOrb(
		grid: SpatialGrid,
		orb: Orb,
		startCellX: number,
		startCellY: number,
		invCellSizeX: number,
		invCellSizeY: number
	): void {
		const cellX = ((orb.pxX * invCellSizeX) | 0) + startCellX;
		const cellY = ((orb.pxY * invCellSizeY) | 0) + startCellY;
		const layer = Math.round(orb.z);

		grid.removeCellFlag(cellX, cellY, layer, CELL_FILLED);
		grid.removeCellFlag(cellX, cellY, layer, CELL_PROXIMITY);
	}

	/**
	 * Clears an orb's 3D spherical footprint from the spatial grid.
	 * 
	 * Uses removeCellFlag to only remove this orb's flags without
	 * affecting other orbs or border flags.
	 * 
	 * @param grid - The spatial grid instance.
	 * @param orb - The orb to clear.
	 * @param startCellX - Viewport start cell X offset.
	 * @param startCellY - Viewport start cell Y offset.
	 * @param invCellSizeX - Inverse cell width for fast division.
	 * @param invCellSizeY - Inverse cell height for fast division.
	 */
	static clearOrbCircular(
		grid: SpatialGrid,
		orb: Orb,
		startCellX: number,
		startCellY: number,
		invCellSizeX: number,
		invCellSizeY: number
	): void {
		const centerCellX = ((orb.pxX * invCellSizeX) | 0) + startCellX;
		const centerCellY = ((orb.pxY * invCellSizeY) | 0) + startCellY;
		const centerLayer = Math.round(orb.z);
		const radius = orb.size - 1;
		const avoidanceRadius = Math.floor(Math.sqrt(orb.size) + radius + 1);

		// Clear 3D avoidance zone flags
		for (let dz = -avoidanceRadius; dz <= avoidanceRadius; dz++) {
			for (let dy = -avoidanceRadius; dy <= avoidanceRadius; dy++) {
				for (let dx = -avoidanceRadius; dx <= avoidanceRadius; dx++) {
					const distSq = dx * dx + dy * dy + dz * dz;
					if (distSq > radius * radius && distSq <= avoidanceRadius * avoidanceRadius) {
						grid.removeCellFlag(centerCellX + dx, centerCellY + dy, centerLayer + dz, CELL_PROXIMITY);
					}
				}
			}
		}

		// Clear 3D body flags
		for (let dz = -radius; dz <= radius; dz++) {
			for (let dy = -radius; dy <= radius; dy++) {
				for (let dx = -radius; dx <= radius; dx++) {
					if (dx * dx + dy * dy + dz * dz <= radius * radius) {
						grid.removeCellFlag(centerCellX + dx, centerCellY + dy, centerLayer + dz, CELL_FILLED);
					}
				}
			}
		}
	}

	/**
	 * Calculates the preferred Z-layer for an orb based on its size.
	 * Uses logarithmic mapping so smaller orbs prefer the front (low Z),
	 * and larger orbs prefer the back (high Z).
	 * 
	 * Formula scales dynamically with maxSize and totalLayers:
	 * - Size 1 always maps to layer 0 (front)
	 * - Size maxSize always maps to layer (totalLayers - 1) (back)
	 * - Intermediate sizes follow a logarithmic curve
	 * 
	 * @param size - The orb's size.
	 * @param maxSize - Maximum allowed orb size.
	 * @param totalLayers - Total number of Z-layers in the grid.
	 * @returns The preferred layer for this orb (0 to totalLayers-1).
	 */
	static getPreferredLayer(size: number, maxSize: number, totalLayers: number): number {
		// Logarithmic mapping: small orbs spread across front, large clustered at back
		// log(1) = 0, so size 1 maps to layer 0
		// log(maxSize) / log(maxSize) = 1, so maxSize maps to top layer
		const normalizedPosition = Math.log(size) / Math.log(maxSize);
		return (totalLayers - 1) * normalizedPosition;
	}

	/**
	 * Applies a gentle Z-axis attraction force toward the orb's preferred layer.
	 * The force is proportional to the distance from the preferred layer,
	 * creating a very slow drift that allows collisions to override it.
	 * 
	 * This is applied continuously, so orbs will always slowly return to
	 * their preferred depth even after being pushed away by collisions.
	 * 
	 * @param orb - The orb to apply attraction to.
	 * @param maxSize - Maximum allowed orb size.
	 * @param totalLayers - Total number of Z-layers in the grid.
	 * @param strength - Attraction strength (layers/s² acceleration).
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 */
	static applyLayerAttraction(
		orb: Orb,
		maxSize: number,
		totalLayers: number,
		strength: number,
		deltaTime: number
	): void {
		const preferredLayer = this.getPreferredLayer(orb.size, maxSize, totalLayers);
		const distanceToPreferred = preferredLayer - orb.z;

		// Apply acceleration proportional to distance (spring-like attraction)
		// Very weak force - takes many seconds to settle
		const acceleration = distanceToPreferred * strength;

		// Apply acceleration to Z velocity
		orb.vz += acceleration * deltaTime;

		// Cap Z velocity to prevent oscillation and ensure gentle movement
		// Max drift speed of 0.5 layers/second
		const maxDriftSpeed = 0.5;
		if (Math.abs(orb.vz) > maxDriftSpeed) {
			orb.vz = Math.sign(orb.vz) * maxDriftSpeed;
		}
	}

	/**
	 * Applies organic wander behavior to gradually change orb velocity direction.
	 * 
	 * Uses dual sine waves for smooth, natural-looking movement:
	 * - Primary wave controls direction change
	 * - Secondary wave modulates intensity (creates periods of more/less wandering)
	 * 
	 * Updates the orb's wander phases for the next frame.
	 * 
	 * @param orb - The orb to apply wander to.
	 * @param deltaTime - Time elapsed since last frame in seconds.
	 */
	static applyWander(orb: Orb, deltaTime: number): void {
		// Skip if deltaTime is invalid
		if (!isFinite(deltaTime) || deltaTime <= 0 || deltaTime > 1) return;

		// Update wander phases
		orb.wanderPhase += orb.wanderSpeed * deltaTime;
		orb.wanderModulationPhase += orb.wanderModulationSpeed * deltaTime;

		// Keep phases in 0-2π range to prevent overflow
		if (orb.wanderPhase > Math.PI * 2) orb.wanderPhase -= Math.PI * 2;
		if (orb.wanderModulationPhase > Math.PI * 2) orb.wanderModulationPhase -= Math.PI * 2;

		// Calculate current wander intensity (modulated by secondary wave)
		// Goes from 0.2 to 1.0, so there's always some wander but it varies
		const modulationFactor = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(orb.wanderModulationPhase));

		// Calculate angular change using sine wave for smooth direction changes
		const angularChange = Math.sin(orb.wanderPhase) * orb.wanderStrength * modulationFactor * deltaTime;

		// Skip if change is negligible or invalid
		if (!isFinite(angularChange) || Math.abs(angularChange) < 0.0001) return;

		// Get current speed (preserve it)
		const currentSpeed = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy);
		if (currentSpeed < 0.1) return; // Don't wander if nearly stationary

		// Get current angle and apply change
		const currentAngle = Math.atan2(orb.vy, orb.vx);
		const newAngle = currentAngle + angularChange;

		// Apply new velocity direction while preserving speed
		orb.vx = Math.cos(newAngle) * currentSpeed;
		orb.vy = Math.sin(newAngle) * currentSpeed;
		orb.angle = newAngle;
	}
}

