"use client";

// =============================================================================
// GridDebugPanel - Debug UI for Grid System Information
// =============================================================================

import { type GridConfig, type ViewportCells } from '../../grid/types';
import { glassStyles, combineGlassStyles } from '@/components/glass/styles';
import { debugMenuConfig } from '@/components/debug/GlassDebugMenu/config/debugMenuConfig';

/**
 * Props for the GridDebugPanel component.
 */
interface GridDebugPanelProps {
	/** Current grid configuration. */
	gridConfig: GridConfig;
	/** Current viewport cell metrics. */
	viewportCells: ViewportCells;
	/** Currently active depth layer. */
	currentLayer: number;
	/** Callback when the depth layer slider changes. */
	onLayerChange: (layer: number) => void;
	/** Currently hovered cell information, or null. */
	hoveredCell: { x: number; y: number; worldX: number; worldY: number } | null;
}

/**
 * Debug panel displaying grid system statistics.
 *
 * Shows:
 * - Grid dimensions (cells × cells × layers)
 * - Cell size in centimeters
 * - Depth layer slider
 * - Currently hovered cell coordinates
 *
 * Only visible when debug mode is enabled.
 * Follows Open/Closed Principle: Uses shared glassStyles and debugMenuConfig.
 */
export function GridDebugPanel({
	gridConfig,
	viewportCells,
	currentLayer,
	onLayerChange,
	hoveredCell,
}: GridDebugPanelProps) {
	const { dimensions, spacing, typography, colors } = debugMenuConfig;

	// Combine glass styles from central source
	const panelStyles = combineGlassStyles(
		glassStyles.background.default,
		glassStyles.backdrop.blur,
		glassStyles.border.default,
		glassStyles.shadow.card
	);

	return (
		<div
			style={{
				...panelStyles,
				padding: spacing.padding,
				borderRadius: dimensions.borderRadiusLg,
				color: colors.textPrimary,
				fontFamily: 'var(--font-mono), monospace',
				fontSize: typography.fontSizeMd,
				minWidth: 160,
			}}
		>
			<div
				style={{
					fontWeight: typography.fontWeightBold,
					fontSize: typography.fontSizeLg,
					color: colors.textPrimary,
					borderBottom: `1px solid ${colors.borderLight}`,
					paddingBottom: spacing.gapLg,
					marginBottom: spacing.gapLg,
				}}
			>
				Grid Stats
			</div>

			<div style={{ marginBottom: spacing.gapMd, display: 'flex', justifyContent: 'space-between' }}>
				<span style={{ color: colors.textSecondary }}>Grid:</span>
				<span>{gridConfig.cellsX}×{gridConfig.cellsY}×{gridConfig.layers}</span>
			</div>

			<div style={{ marginBottom: spacing.gapMd, display: 'flex', justifyContent: 'space-between' }}>
				<span style={{ color: colors.textSecondary }}>Cell:</span>
				<span>{viewportCells.cellSizeXCm.toFixed(2)}×{viewportCells.cellSizeYCm.toFixed(2)}cm</span>
			</div>

			<div style={{ marginBottom: spacing.gapLg }}>
				<label htmlFor="debug-panel-layer-z" style={{ display: 'flex', alignItems: 'center', gap: spacing.gapLg }}>
					<span style={{ color: colors.textSecondary }}>Z:</span>
					<input
						id="debug-panel-layer-z"
						name="debug-panel-layer-z"
						type="range"
						min={0}
						max={gridConfig.layers - 1}
						value={currentLayer}
						onChange={(e) => onLayerChange(parseInt(e.target.value))}
						style={{
							flex: 1,
							cursor: 'pointer',
							accentColor: colors.maroonAccent,
						}}
					/>
					<span style={{ minWidth: dimensions.layerInputMinWidth, textAlign: 'right' }}>{currentLayer}</span>
				</label>
			</div>

			{hoveredCell && (
				<div
					style={{
						color: colors.textSuccess,
						fontSize: typography.fontSizeSm,
						borderTop: `1px solid ${colors.borderLight}`,
						paddingTop: spacing.gapLg,
					}}
				>
					Cell ({hoveredCell.x}, {hoveredCell.y})
					<br />
					{hoveredCell.worldX.toFixed(1)}cm, {hoveredCell.worldY.toFixed(1)}cm
				</div>
			)}
		</div>
	);
}
