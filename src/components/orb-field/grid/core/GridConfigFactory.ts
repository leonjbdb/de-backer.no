// =============================================================================
// GridConfigFactory - Creates GridConfig from window dimensions
// =============================================================================

import { DEFAULT_GRID_CONFIG, type GridSystemConfig } from '../../shared/config';
import { type GridConfig } from '../types';

/**
 * Factory for creating GridConfig instances.
 *
 * Encapsulates the calculation logic for grid geometry based on
 * window dimensions, device pixel ratio, and configuration options.
 *
 * Single Responsibility: Calculate grid dimensions from viewport.
 */
export class GridConfigFactory {
	/**
	 * Creates a GridConfig based on current window dimensions.
	 *
	 * The grid is sized to:
	 * 1. Fit cells perfectly within the viewport (no partial cells)
	 * 2. Extend beyond the viewport by the configured multiplier
	 * 3. Account for device DPI for consistent physical sizing
	 *
	 * @param window - Browser window object for dimensions and DPI.
	 * @param options - Optional overrides for default configuration.
	 * @returns Fully calculated GridConfig object.
	 */
	static create(window: Window, options: Partial<GridSystemConfig> = {}): GridConfig {
		const config = { ...DEFAULT_GRID_CONFIG, ...options };

		// Calculate physical dimensions using device pixel ratio
		const dpi = (window.devicePixelRatio || 1) * config.baseDpi;
		const cmPerPixel = 2.54 / dpi;
		const pixelsPerCm = dpi / 2.54;

		const screenWidthCm = window.innerWidth * cmPerPixel;
		const screenHeightCm = window.innerHeight * cmPerPixel;

		// Calculate exact cell count to perfectly fit viewport
		const cellsXPerViewport = Math.round(screenWidthCm / config.targetCellSizeCm);
		const cellsYPerViewport = Math.round(screenHeightCm / config.targetCellSizeCm);

		// Recalculate cell sizes for pixel-perfect fit
		const cellSizeXCm = screenWidthCm / cellsXPerViewport;
		const cellSizeYCm = screenHeightCm / cellsYPerViewport;

		// Apply extension multiplier for off-screen grid area
		const multiplier = config.extensionMultiplier;
		let cellsX = cellsXPerViewport * (1 + 2 * multiplier);
		let cellsY = cellsYPerViewport * (1 + 2 * multiplier);

		// Cap grid size to prevent excessive memory usage on large screens
		const maxCellsX = 315;
		const maxCellsY = 175;
		cellsX = Math.min(cellsX, maxCellsX);
		cellsY = Math.min(cellsY, maxCellsY);

		// Calculate world-space grid bounds
		const minXCm = -screenWidthCm * multiplier;
		const maxXCm = screenWidthCm * (1 + multiplier);
		const minYCm = -screenHeightCm * multiplier;
		const maxYCm = screenHeightCm * (1 + multiplier);

		return {
			cellsX,
			cellsY,
			layers: config.layers,
			cellSizeXCm,
			cellSizeYCm,
			minXCm,
			maxXCm,
			minYCm,
			maxYCm,
			viewportMinXCm: 0,
			viewportMaxXCm: screenWidthCm,
			viewportMinYCm: 0,
			viewportMaxYCm: screenHeightCm,
			pixelsPerCm,
			cmPerPixel,
		};
	}
}
