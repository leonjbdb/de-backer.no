"use client";

// =============================================================================
// OrbDebugPanel - Debug UI for Orb System Management
// =============================================================================

import { useState } from 'react';
import { type Orb } from '../../orb/types';
import { DEFAULT_ORB_SPAWN_CONFIG } from '../../orb/config';
import { glassStyles, combineGlassStyles } from '@/components/glass/styles';
import { debugMenuConfig } from '@/components/debug/GlassDebugMenu/config/debugMenuConfig';

/**
 * Props for the OrbDebugPanel component.
 */
interface OrbDebugPanelProps {
	/** Current list of orbs in the system. */
	orbs?: Orb[];
	/** Target orb count (scales with screen size). */
	targetOrbCount?: number;
	/** Currently selected orb ID. */
	selectedOrbId?: string | null;
	/** Real-time data for the selected orb. */
	selectedOrb?: Orb | null;
	/** Current brush size for new orbs. */
	orbSize?: number;
	/** Whether spawn-on-click is enabled. */
	enableSpawnOnClick?: boolean;
	/** Callback when an orb is selected. */
	onSelectOrb?: (id: string | null) => void;
	/** Callback when an orb is deleted. */
	onDeleteOrb?: (id: string) => void;
	/** Callback when the brush size changes. */
	onSizeChange?: (size: number) => void;
}

/**
 * Debug panel for managing orbs.
 *
 * Features:
 * - Orb selector dropdown
 * - Real-time position and velocity display
 * - Delete button for selected orb
 * - Brush size slider for new orbs (when spawn-on-click is enabled)
 *
 * Only visible when debug mode is enabled.
 * Follows Open/Closed Principle: Uses shared glassStyles and debugMenuConfig.
 */
export function OrbDebugPanel({
	orbs = [],
	targetOrbCount,
	selectedOrbId,
	selectedOrb: selectedOrbProp,
	orbSize = DEFAULT_ORB_SPAWN_CONFIG.defaultSize,
	enableSpawnOnClick = false,
	onSelectOrb,
	onDeleteOrb,
	onSizeChange,
}: OrbDebugPanelProps) {
	// Track when the orb selector dropdown is open
	// When open, freeze the orbs list to prevent updates making selection impossible
	const [isOrbSelectorOpen, setIsOrbSelectorOpen] = useState(false);
	const [frozenOrbs, setFrozenOrbs] = useState<Orb[]>([]);

	// Use frozen orbs list when dropdown is open, otherwise use real-time orbs
	const displayOrbs = isOrbSelectorOpen ? frozenOrbs : orbs;

	const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newSize = parseInt(e.target.value, 10);
		onSizeChange?.(newSize);
	};

	// Use real-time prop if available, otherwise find in list
	const selectedOrb = selectedOrbProp || orbs.find((o) => o.id === selectedOrbId);

	const { minSize, maxSize } = DEFAULT_ORB_SPAWN_CONFIG;
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
				display: 'flex',
				flexDirection: 'column',
				gap: spacing.gapLg,
				minWidth: 180,
			}}
		>
			<div
				style={{
					fontWeight: typography.fontWeightBold,
					fontSize: typography.fontSizeLg,
					color: colors.textPrimary,
					borderBottom: `1px solid ${colors.borderLight}`,
					paddingBottom: spacing.gapLg,
					marginBottom: spacing.gapSm,
				}}
			>
				Orb Debug ({orbs.length}{targetOrbCount ? ` / ${targetOrbCount}` : ''})
			</div>

			{/* Orb Selector */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: spacing.gapSm }}>
				<label htmlFor="debug-panel-orb-select" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
					<span style={{ color: colors.textSecondary }}>Select:</span>
					<select
						id="debug-panel-orb-select"
						name="debug-panel-orb-select"
						value={selectedOrbId || ''}
						onChange={(e) => {
							onSelectOrb?.(e.target.value || null);
							setIsOrbSelectorOpen(false);
						}}
						onFocus={() => {
							// Freeze the orb list when dropdown opens
							setFrozenOrbs([...orbs]);
							setIsOrbSelectorOpen(true);
						}}
						onBlur={() => {
							// Unfreeze when dropdown closes
							setIsOrbSelectorOpen(false);
						}}
						style={{
							background: colors.inputBg,
							color: colors.textPrimary,
							border: `1px solid ${colors.inputBorder}`,
							borderRadius: dimensions.borderRadiusSm,
							fontSize: typography.fontSizeSm,
							padding: `${spacing.gapSm}px ${spacing.gapMd}px`,
							maxWidth: dimensions.selectMaxWidth,
							cursor: 'pointer',
						}}
					>
						<option value="">None</option>
						{displayOrbs.map((orb, i) => (
							<option key={orb.id} value={orb.id}>
								Orb {i + 1} ({orb.size})
							</option>
						))}
					</select>
				</label>
			</div>

			{/* Selected Orb Info */}
			{selectedOrb && (
				<div
					style={{
						fontSize: typography.fontSizeSm,
						color: colors.textMuted,
						padding: `${spacing.gapLg}px 0`,
						borderTop: `1px solid ${colors.borderLight}`,
					}}
				>
					Pos: {selectedOrb.pxX.toFixed(0)}, {selectedOrb.pxY.toFixed(0)}, z={selectedOrb.z.toFixed(1)}
					<br />
					Size: {selectedOrb.size} | Speed: {selectedOrb.speed.toFixed(1)} px/s
					<br />
					Vel: vx={selectedOrb.vx.toFixed(1)}, vy={selectedOrb.vy.toFixed(1)}, vz={selectedOrb.vz.toFixed(2)}
				</div>
			)}

			{/* Delete Button */}
			<div style={{ display: 'flex', gap: spacing.gapSm }}>
				<button
					onClick={() => onDeleteOrb?.(selectedOrbId!)}
					style={{
						flex: 1,
						background: colors.maroonButton,
						color: colors.textPrimary,
						border: `1px solid ${colors.inputBorder}`,
						borderRadius: dimensions.borderRadiusSm,
						padding: `${spacing.gapMd}px ${spacing.gapSm}px`,
						fontSize: typography.fontSizeSm,
						cursor: selectedOrbId ? 'pointer' : 'not-allowed',
						opacity: selectedOrbId ? 1 : 0.5,
						transition: 'background 0.2s ease',
					}}
					disabled={!selectedOrbId}
				>
					Delete Selected
				</button>
			</div>

			{/* Brush Size Slider - Only show if spawn-on-click is enabled */}
			{enableSpawnOnClick && (
				<>
					<div style={{ display: 'flex', flexDirection: 'column', gap: spacing.gapSm }}>
						<label htmlFor="debug-panel-brush-size" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ color: colors.textSecondary }}>Brush Size:</span>
							<span style={{ color: colors.textPrimary }}>{orbSize}</span>
						</label>
						<input
							id="debug-panel-brush-size"
							name="debug-panel-brush-size"
							type="range"
							min={minSize}
							max={maxSize}
							step={1}
							value={orbSize}
							onChange={handleSizeChange}
							aria-label={`Brush size: ${orbSize}`}
							style={{
								width: '100%',
								cursor: 'pointer',
								accentColor: colors.maroonAccent,
							}}
						/>
					</div>

					<div style={{ fontSize: typography.fontSizeSm, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.gapSm }}>
						* Click grid to place orb
					</div>
				</>
			)}
		</div>
	);
}
