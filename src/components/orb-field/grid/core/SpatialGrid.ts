// =============================================================================
// SpatialGrid - 3D Grid Data Structure for Collision Detection
// =============================================================================

import { CELL_EMPTY, CELL_BORDER, CELL_FILLED, hasCellFlag, type CellState } from '../../shared/types';
import { type GridConfig } from '../types';

/**
 * 3D Spatial Grid for efficient collision detection and spatial queries.
 *
 * Uses a flat Uint8Array for memory-efficient storage of cell states.
 * The grid is indexed as [layer][y][x] in row-major order.
 *
 * Single Responsibility: Manages raw grid data and coordinate conversions.
 */
export class SpatialGrid {
	/** Grid configuration containing dimensions and world-space metrics. */
	readonly config: GridConfig;

	/** Flat array storing cell states for all layers. */
	private cells: Uint8Array;

	/**
	 * Creates a new SpatialGrid instance.
	 *
	 * @param config - Grid configuration with dimensions and world coordinates.
	 */
	constructor(config: GridConfig) {
		this.config = config;
		const totalCells = config.cellsX * config.cellsY * config.layers;
		this.cells = new Uint8Array(totalCells);
	}

	/**
	 * Calculates the flat array index for a 3D cell coordinate.
	 *
	 * @param cellX - X-coordinate of the cell.
	 * @param cellY - Y-coordinate of the cell.
	 * @param layer - Z-layer of the cell.
	 * @returns Flat array index.
	 */
	private getIndex(cellX: number, cellY: number, layer: number): number {
		return (
			layer * this.config.cellsX * this.config.cellsY +
			cellY * this.config.cellsX +
			cellX
		);
	}

	/**
	 * Checks if coordinates are within grid bounds.
	 *
	 * @param cellX - X-coordinate to check.
	 * @param cellY - Y-coordinate to check.
	 * @param layer - Z-layer to check.
	 * @returns True if coordinates are valid.
	 */
	isInBounds(cellX: number, cellY: number, layer: number): boolean {
		return (
			cellX >= 0 && cellX < this.config.cellsX &&
			cellY >= 0 && cellY < this.config.cellsY &&
			layer >= 0 && layer < this.config.layers
		);
	}

	/**
	 * Gets the state of a specific cell.
	 *
	 * @param cellX - X-coordinate of the cell.
	 * @param cellY - Y-coordinate of the cell.
	 * @param layer - Z-layer of the cell.
	 * @returns Cell state, or CELL_EMPTY if out of bounds.
	 */
	getCell(cellX: number, cellY: number, layer: number): CellState {
		if (!this.isInBounds(cellX, cellY, layer)) return CELL_EMPTY;
		return this.cells[this.getIndex(cellX, cellY, layer)] as CellState;
	}

	/**
	 * Sets the state of a specific cell.
	 *
	 * @param cellX - X-coordinate of the cell.
	 * @param cellY - Y-coordinate of the cell.
	 * @param layer - Z-layer of the cell.
	 * @param state - New cell state to set.
	 */
	setCell(cellX: number, cellY: number, layer: number, state: CellState): void {
		if (!this.isInBounds(cellX, cellY, layer)) return;
		this.cells[this.getIndex(cellX, cellY, layer)] = state;
	}

	/**
	 * Adds a flag to a cell (using bitwise OR).
	 * Allows multiple states to coexist in the same cell.
	 *
	 * @param cellX - X-coordinate of the cell.
	 * @param cellY - Y-coordinate of the cell.
	 * @param layer - Z-layer of the cell.
	 * @param flag - Flag to add to the cell.
	 */
	addCellFlag(cellX: number, cellY: number, layer: number, flag: CellState): void {
		if (!this.isInBounds(cellX, cellY, layer)) return;
		const idx = this.getIndex(cellX, cellY, layer);
		this.cells[idx] |= flag;
	}

	/**
	 * Removes a flag from a cell (using bitwise AND NOT).
	 *
	 * @param cellX - X-coordinate of the cell.
	 * @param cellY - Y-coordinate of the cell.
	 * @param layer - Z-layer of the cell.
	 * @param flag - Flag to remove from the cell.
	 */
	removeCellFlag(cellX: number, cellY: number, layer: number, flag: CellState): void {
		if (!this.isInBounds(cellX, cellY, layer)) return;
		const idx = this.getIndex(cellX, cellY, layer);
		this.cells[idx] &= ~flag;
	}

	/**
	 * Converts world coordinates (cm) to grid cell coordinates.
	 *
	 * @param xCm - World X position in centimeters.
	 * @param yCm - World Y position in centimeters.
	 * @param layer - Z-layer (will be clamped to valid range).
	 * @returns Object with cellX, cellY, and clamped layer.
	 */
	worldToGrid(xCm: number, yCm: number, layer: number): { cellX: number; cellY: number; layer: number } {
		const cfg = this.config;
		const cellX = Math.floor((xCm - cfg.minXCm) / cfg.cellSizeXCm);
		const cellY = Math.floor((yCm - cfg.minYCm) / cfg.cellSizeYCm);
		const clampedLayer = Math.max(0, Math.min(cfg.layers - 1, Math.round(layer)));
		return { cellX, cellY, layer: clampedLayer };
	}

	/**
	 * Converts grid cell coordinates to world coordinates (cm).
	 * Returns the center position of the cell.
	 *
	 * @param cellX - Grid X index.
	 * @param cellY - Grid Y index.
	 * @param layer - Z-layer.
	 * @returns Object with xCm, yCm, and layer.
	 */
	gridToWorld(cellX: number, cellY: number, layer: number): { xCm: number; yCm: number; layer: number } {
		const cfg = this.config;
		const xCm = cfg.minXCm + (cellX + 0.5) * cfg.cellSizeXCm;
		const yCm = cfg.minYCm + (cellY + 0.5) * cfg.cellSizeYCm;
		return { xCm, yCm, layer };
	}

	/**
	 * Resets all cells to CELL_EMPTY.
	 * Uses Uint8Array.fill() for optimal performance.
	 */
	clear(): void {
		this.cells.fill(CELL_EMPTY);
	}

	/**
	 * Clears only dynamic cells (CELL_FILLED, CELL_PROXIMITY).
	 * Preserves CELL_BORDER flag on cells to maintain permanent walls.
	 */
	clearDynamic(): void {
		for (let i = 0; i < this.cells.length; i++) {
			// Check if cell has BORDER flag using bit mask
			if ((this.cells[i] & CELL_BORDER) !== 0) {
				// Keep only the BORDER flag, clear everything else
				this.cells[i] = CELL_BORDER;
			} else {
				this.cells[i] = CELL_EMPTY;
			}
		}
	}

	/**
	 * Initializes border cells around the XY edges of the grid.
	 * Walls extend infinitely in Z - they exist on all layers.
	 * There are NO front/back Z walls - orbs can move freely in Z.
	 */
	initializeBorder(): void {
		const { cellsX, cellsY, layers } = this.config;

		// XY border walls extend through ALL layers (infinite in Z)
		for (let layer = 0; layer < layers; layer++) {
			// Top and bottom edges
			for (let x = 0; x < cellsX; x++) {
				this.setCell(x, 0, layer, CELL_BORDER);
				this.setCell(x, cellsY - 1, layer, CELL_BORDER);
			}

			// Left and right edges
			for (let y = 0; y < cellsY; y++) {
				this.setCell(0, y, layer, CELL_BORDER);
				this.setCell(cellsX - 1, y, layer, CELL_BORDER);
			}
		}
		// No Z-axis walls - orbs move freely in the Z dimension
	}

	/**
	 * Checks if a cell blocks movement.
	 * 
	 * Returns true if:
	 * - Cell is out of bounds (acts as invisible wall)
	 * - Cell has CELL_FILLED flag (another orb)
	 * - Cell has CELL_BORDER flag (edge wall)
	 *
	 * @param cellX - X-coordinate of the cell.
	 * @param cellY - Y-coordinate of the cell.
	 * @param layer - Z-layer of the cell.
	 * @returns True if the cell blocks movement.
	 */
	isBlocking(cellX: number, cellY: number, layer: number): boolean {
		// Out of bounds = blocked (implicit walls at grid boundaries)
		if (!this.isInBounds(cellX, cellY, layer)) return true;

		const state = this.getCell(cellX, cellY, layer);
		return hasCellFlag(state, CELL_FILLED) || hasCellFlag(state, CELL_BORDER);
	}

	/**
	 * Checks if a cell is blocked by an actual WALL (border or out-of-bounds).
	 * Unlike isBlocking(), this does NOT treat other orbs (CELL_FILLED) as blocking.
	 * Use this for wall collision detection to avoid treating orbs as walls.
	 */
	isWall(cellX: number, cellY: number, layer: number): boolean {
		// Out of bounds = wall (implicit walls at grid boundaries)
		if (!this.isInBounds(cellX, cellY, layer)) return true;

		const state = this.getCell(cellX, cellY, layer);
		return hasCellFlag(state, CELL_BORDER);
	}
}
