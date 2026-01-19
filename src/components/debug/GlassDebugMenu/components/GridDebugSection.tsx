"use client";

import { SectionHeader } from "./SectionHeader";
import { debugMenuConfig } from "../config/debugMenuConfig";
import type { GridDebugProps } from "../types";

/**
 * GridDebugSection - Displays grid debugging controls
 * Follows Single Responsibility Principle - only handles grid debug UI
 */
export function GridDebugSection({
	gridConfig,
	viewportCells,
	currentLayer = 0,
	onLayerChange,
	hoveredCell,
}: GridDebugProps) {
	const { spacing, typography, colors, dimensions } = debugMenuConfig;

	if (!gridConfig || !viewportCells) return null;

	return (
		<>
			<SectionHeader title="Grid Stats" />

			<div style={{ marginBottom: spacing.gapMd, display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizeMd }}>
				<span style={{ color: colors.textSecondary }}>Grid:</span>
				<span style={{ color: colors.textPrimary }}>
					{gridConfig.cellsX}×{gridConfig.cellsY}×{gridConfig.layers}
				</span>
			</div>

			<div style={{ marginBottom: spacing.gapMd, display: 'flex', justifyContent: 'space-between', fontSize: typography.fontSizeMd }}>
				<span style={{ color: colors.textSecondary }}>Cell:</span>
				<span style={{ color: colors.textPrimary }}>
					{viewportCells.cellSizeXCm.toFixed(2)}×{viewportCells.cellSizeYCm.toFixed(2)}cm
				</span>
			</div>

			<div style={{ marginBottom: spacing.gapLg, fontSize: typography.fontSizeMd }}>
				<label htmlFor="debug-layer-z" style={{ display: 'flex', alignItems: 'center', gap: spacing.gapLg }}>
					<span style={{ color: colors.textSecondary }}>Z:</span>
					<input
						id="debug-layer-z"
						name="debug-layer-z"
						type="range"
						min={0}
						max={gridConfig.layers - 1}
						value={currentLayer}
						onChange={(e) => onLayerChange?.(parseInt(e.target.value))}
						style={{
							flex: 1,
							cursor: 'pointer',
							accentColor: colors.maroonAccent,
						}}
					/>
					<span style={{ minWidth: dimensions.layerInputMinWidth, textAlign: 'right', color: colors.textPrimary }}>
						{currentLayer}
					</span>
				</label>
			</div>

			{hoveredCell && (
				<div style={{ color: colors.textSuccess, fontSize: typography.fontSizeSm, paddingTop: spacing.gapLg, borderTop: `1px solid ${colors.borderLight}` }}>
					Cell ({hoveredCell.x}, {hoveredCell.y})
					<br />
					{hoveredCell.worldX.toFixed(1)}cm, {hoveredCell.worldY.toFixed(1)}cm
				</div>
			)}
		</>
	);
}
