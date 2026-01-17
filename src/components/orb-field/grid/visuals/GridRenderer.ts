// =============================================================================
// GridRenderer - Pure rendering logic for grid visualization
// =============================================================================

import { type GridRevealConfig, type GridStyleConfig } from '../../shared/config';
import { CELL_FILLED, CELL_PROXIMITY, hasCellFlag } from '../../shared/types';
import { type Orb } from '../../orb/types';
import { DEFAULT_ORB_DEBUG_CONFIG, type OrbDebugVisualConfig } from '../../orb/config';
import { SpatialGrid } from '../core/SpatialGrid';
import { type ViewportCells } from '../types';

/**
 * Represents the current window dimensions.
 */
interface WindowSize {
	width: number;
	height: number;
}

/**
 * Handles the pure rendering logic for the grid visualization.
 * Encapsulates all Canvas API calls and visual calculations.
 *
 * Single Responsibility: Only responsible for drawing to canvas.
 * Does not manage state or handle user interaction.
 */
export class GridRenderer {
	/**
	 * Renders a complete frame of the grid visualization.
	 *
	 * @param ctx - The 2D canvas rendering context.
	 * @param windowSize - Current window dimensions.
	 * @param viewportCells - Viewport cell metrics for coordinate conversion.
	 * @param progress - Animation progress (0 to 1).
	 * @param revealConfig - Configuration for reveal animation.
	 * @param styleConfig - Configuration for visual styles.
	 * @param hoveredCell - Currently hovered cell coordinates, or null.
	 * @param grid - SpatialGrid instance for cell state queries.
	 * @param currentLayer - Currently visible depth layer.
	 * @param orbs - Array of orbs to render debug visuals for.
	 * @param orbDebugConfig - Configuration for orb debug visualization.
	 * @param offsetX - Horizontal offset in pixels for parallax scrolling.
	 * @param offsetY - Vertical offset in pixels for parallax scrolling.
	 */
	static draw(
		ctx: CanvasRenderingContext2D,
		windowSize: WindowSize,
		viewportCells: ViewportCells,
		progress: number,
		revealConfig: GridRevealConfig,
		styleConfig: GridStyleConfig,
		hoveredCell: { x: number; y: number } | null,
		grid: SpatialGrid | null = null,
		currentLayer: number = 0,
		orbs: Orb[] = [],
		orbDebugConfig: OrbDebugVisualConfig = DEFAULT_ORB_DEBUG_CONFIG,
		offsetX: number = 0,
		offsetY: number = 0
	): void {
		const { width, height } = windowSize;
		const { startCellX, endCellX, startCellY, endCellY, cellSizeXPx, cellSizeYPx } = viewportCells;
		const { startYOffset, endYOffset, fadeInDistance, whiteToGreyDistance } = revealConfig;
		const {
			lineColorGrey,
			baseAlpha,
			whiteAlpha,
			lineWidth,
			hoverLineWidth,
			hoverFillColor,
			hoverBorderColor,
			filledCellColor
		} = styleConfig;

		// Calculate animation boundaries
		const fadeEndY = startYOffset + progress * (height + endYOffset - startYOffset);
		const whiteStartY = fadeEndY - fadeInDistance;

		ctx.clearRect(0, 0, width, height);

		// Apply parallax offset translation
		ctx.save();
		ctx.translate(offsetX, offsetY);

		// Phase 1: Draw occupied cells (only after reveal completes)
		if (grid && progress >= 1) {
			this.drawOccupiedCells(
				ctx,
				grid,
				startCellX,
				endCellX,
				startCellY,
				endCellY,
				cellSizeXPx,
				cellSizeYPx,
				currentLayer,
				filledCellColor
			);
		}

		// Phase 2: Draw grid lines with reveal animation
		this.drawGridLines(
			ctx,
			width,
			startCellX,
			endCellX,
			startCellY,
			endCellY,
			cellSizeXPx,
			cellSizeYPx,
			fadeEndY,
			whiteStartY,
			fadeInDistance,
			whiteToGreyDistance,
			lineColorGrey,
			baseAlpha,
			whiteAlpha,
			lineWidth
		);

		// Phase 3: Draw hover highlight (only after reveal completes)
		if (progress >= 1 && hoveredCell) {
			this.drawHoverHighlight(
				ctx,
				hoveredCell,
				startCellX,
				startCellY,
				cellSizeXPx,
				cellSizeYPx,
				hoverFillColor,
				hoverBorderColor,
				hoverLineWidth
			);
		}

		// Phase 4: Draw orb debug visuals (only after reveal completes)
		if (orbs.length > 0 && progress >= 1) {
			this.drawOrbDebugVisuals(ctx, orbs, currentLayer, orbDebugConfig);
		}

		// Restore canvas state after parallax offset
		ctx.restore();
	}

	/**
	 * Draws cells that are occupied (CELL_FILLED and CELL_PROXIMITY states).
	 * Renders in two passes to ensure red orb bodies always appear above yellow zones.
	 * Uses bit flags so cells can have multiple states simultaneously.
	 */
	private static drawOccupiedCells(
		ctx: CanvasRenderingContext2D,
		grid: SpatialGrid,
		startCellX: number,
		endCellX: number,
		startCellY: number,
		endCellY: number,
		cellSizeXPx: number,
		cellSizeYPx: number,
		currentLayer: number,
		fillColor: string
	): void {
		// Pass 1: Draw ALL proximity cells (yellow/avoidance zones)
		ctx.fillStyle = 'rgba(255, 220, 0, 0.5)'; // Brighter yellow with more opacity
		for (let cy = 0; cy <= (endCellY - startCellY); cy++) {
			for (let cx = 0; cx <= (endCellX - startCellX); cx++) {
				const cellX = startCellX + cx;
				const cellY = startCellY + cy;
				const state = grid.getCell(cellX, cellY, currentLayer);

				if (hasCellFlag(state, CELL_PROXIMITY)) {
					ctx.fillRect(cx * cellSizeXPx, cy * cellSizeYPx, cellSizeXPx, cellSizeYPx);
				}
			}
		}

		// Pass 2: Draw ALL filled cells (red/orb bodies) on top
		ctx.fillStyle = fillColor;
		for (let cy = 0; cy <= (endCellY - startCellY); cy++) {
			for (let cx = 0; cx <= (endCellX - startCellX); cx++) {
				const cellX = startCellX + cx;
				const cellY = startCellY + cy;
				const state = grid.getCell(cellX, cellY, currentLayer);

				if (hasCellFlag(state, CELL_FILLED)) {
					ctx.fillRect(cx * cellSizeXPx, cy * cellSizeYPx, cellSizeXPx, cellSizeYPx);
				}
			}
		}
	}

	/**
	 * Draws the grid lines with reveal animation gradient.
	 */
	private static drawGridLines(
		ctx: CanvasRenderingContext2D,
		width: number,
		startCellX: number,
		endCellX: number,
		startCellY: number,
		endCellY: number,
		cellSizeXPx: number,
		cellSizeYPx: number,
		fadeEndY: number,
		whiteStartY: number,
		fadeInDistance: number,
		whiteToGreyDistance: number,
		lineColorGrey: { r: number; g: number; b: number },
		baseAlpha: number,
		whiteAlpha: number,
		lineWidth: number
	): void {
		ctx.lineWidth = lineWidth;

		for (let cy = 0; cy <= (endCellY - startCellY); cy++) {
			const y = cy * cellSizeYPx;
			if (y > fadeEndY) continue;

			// Calculate reveal opacity with smoothstep easing
			let revealOpacity = 1;
			if (y > whiteStartY) {
				revealOpacity = Math.max(0, Math.min(1, (fadeEndY - y) / fadeInDistance));
				revealOpacity = revealOpacity * revealOpacity * (3 - 2 * revealOpacity);
			}

			if (revealOpacity < 0.01) continue;

			// Calculate color gradient (white to grey) with smoothstep easing
			let greyMix = 0;
			const distAboveWhite = whiteStartY - y;
			if (distAboveWhite > 0) {
				greyMix = Math.min(1, distAboveWhite / whiteToGreyDistance);
				greyMix = greyMix * greyMix * (3 - 2 * greyMix);
			}

			const r = Math.round(255 - (255 - lineColorGrey.r) * greyMix);
			const g = Math.round(255 - (255 - lineColorGrey.g) * greyMix);
			const b = Math.round(255 - (255 - lineColorGrey.b) * greyMix);
			const alpha = (whiteAlpha - (whiteAlpha - baseAlpha) * greyMix) * revealOpacity;

			ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

			// Draw horizontal line
			ctx.beginPath();
			ctx.moveTo(0, y);
			ctx.lineTo(width, y);
			ctx.stroke();

			// Draw vertical lines for this row segment
			for (let cx = 0; cx <= (endCellX - startCellX); cx++) {
				const x = cx * cellSizeXPx;
				const lineEndY = Math.min((cy + 1) * cellSizeYPx, fadeEndY);

				if (lineEndY > y) {
					ctx.beginPath();
					ctx.moveTo(x, y);
					ctx.lineTo(x, lineEndY);
					ctx.stroke();
				}
			}
		}
	}

	/**
	 * Draws the hover highlight for the currently hovered cell.
	 */
	private static drawHoverHighlight(
		ctx: CanvasRenderingContext2D,
		hoveredCell: { x: number; y: number },
		startCellX: number,
		startCellY: number,
		cellSizeXPx: number,
		cellSizeYPx: number,
		fillColor: string,
		borderColor: string,
		borderWidth: number
	): void {
		const hx = (hoveredCell.x - startCellX) * cellSizeXPx;
		const hy = (hoveredCell.y - startCellY) * cellSizeYPx;

		ctx.fillStyle = fillColor;
		ctx.fillRect(hx, hy, cellSizeXPx, cellSizeYPx);

		ctx.strokeStyle = borderColor;
		ctx.lineWidth = borderWidth;
		ctx.strokeRect(hx, hy, cellSizeXPx, cellSizeYPx);
	}

	/**
	 * Draws debug visuals for orbs (position indicator and velocity vector).
	 */
	private static drawOrbDebugVisuals(
		ctx: CanvasRenderingContext2D,
		orbs: Orb[],
		currentLayer: number,
		config: OrbDebugVisualConfig
	): void {
		for (const orb of orbs) {
			// Show all orbs regardless of layer (they move in 3D)
			// Opacity could be adjusted based on z-distance in the future

			// Draw position indicator (1x1 pixel)
			ctx.fillStyle = config.positionColor;
			ctx.fillRect(orb.pxX, orb.pxY, 1, 1);

			// Draw velocity vector arrow
			const speed = Math.sqrt(orb.vx * orb.vx + orb.vy * orb.vy);
			if (speed > 0) {
				const endX = orb.pxX + orb.vx * config.arrowScale;
				const endY = orb.pxY + orb.vy * config.arrowScale;

				ctx.strokeStyle = config.arrowColor;
				ctx.lineWidth = config.arrowLineWidth;
				ctx.beginPath();
				ctx.moveTo(orb.pxX, orb.pxY);
				ctx.lineTo(endX, endY);

				// Draw arrowhead
				const angle = Math.atan2(orb.vy, orb.vx);
				const headLen = config.arrowHeadLength;
				const headAngle = Math.PI / 6;

				ctx.lineTo(
					endX - headLen * Math.cos(angle - headAngle),
					endY - headLen * Math.sin(angle - headAngle)
				);
				ctx.moveTo(endX, endY);
				ctx.lineTo(
					endX - headLen * Math.cos(angle + headAngle),
					endY - headLen * Math.sin(angle + headAngle)
				);
				ctx.stroke();
			}
		}
	}
}
