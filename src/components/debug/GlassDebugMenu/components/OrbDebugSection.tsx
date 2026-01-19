"use client";

import { useState } from "react";
import { DEFAULT_ORB_SPAWN_CONFIG } from "@/components/orb-field/orb/config";
import { debugMenuConfig } from "../config/debugMenuConfig";
import { SectionHeader } from "./SectionHeader";
import type { OrbDebugProps } from "../types";

/**
 * OrbDebugSection - Displays orb debugging controls
 * Follows Single Responsibility Principle - only handles orb debug UI
 */
export function OrbDebugSection({
	orbs = [],
	targetOrbCount,
	selectedOrbId,
	selectedOrb: selectedOrbProp,
	orbSize = DEFAULT_ORB_SPAWN_CONFIG.defaultSize,
	enableSpawnOnClick = false,
	onSelectOrb,
	onDeleteOrb,
	onSizeChange,
}: OrbDebugProps) {
	const { minSize, maxSize } = DEFAULT_ORB_SPAWN_CONFIG;
	const { spacing, typography, colors, dimensions } = debugMenuConfig;

	// Track when the orb selector dropdown is open
	// When open, we freeze the orbs list to prevent it from updating and making selection impossible
	const [isOrbSelectorOpen, setIsOrbSelectorOpen] = useState(false);
	const [frozenOrbs, setFrozenOrbs] = useState(orbs);

	// Use frozen orbs list when dropdown is open, otherwise use real-time orbs
	const displayOrbs = isOrbSelectorOpen ? frozenOrbs : orbs;

	// Use real-time prop if available, otherwise find in list
	const selectedOrb = selectedOrbProp || orbs.find((o) => o.id === selectedOrbId);

	if (orbs.length === 0) return null;

	return (
		<>
			<SectionHeader title={`Orb Debug (${orbs.length}${targetOrbCount ? ` / ${targetOrbCount}` : ''})`} />

			{/* Orb Selector */}
			<div style={{ display: 'flex', flexDirection: 'column', gap: spacing.gapSm, marginBottom: spacing.gapLg }}>
				<label htmlFor="debug-orb-select" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: typography.fontSizeMd }}>
					<span style={{ color: colors.textSecondary }}>Select:</span>
					<select
						id="debug-orb-select"
						name="debug-orb-select"
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
				<div style={{ fontSize: typography.fontSizeSm, color: colors.textMuted, padding: `${spacing.gapLg}px 0`, borderTop: `1px solid ${colors.borderLight}` }}>
					Pos: {selectedOrb.pxX.toFixed(0)}, {selectedOrb.pxY.toFixed(0)}, z={selectedOrb.z.toFixed(1)}
					<br />
					Size: {selectedOrb.size} | Speed: {selectedOrb.speed.toFixed(1)} px/s
					<br />
					Vel: vx={selectedOrb.vx.toFixed(1)}, vy={selectedOrb.vy.toFixed(1)}, vz={selectedOrb.vz.toFixed(2)}
				</div>
			)}

			{/* Delete Button */}
			<div style={{ display: 'flex', gap: spacing.gapSm, marginBottom: spacing.gapLg }}>
				<button
					onClick={() => selectedOrbId && onDeleteOrb?.(selectedOrbId)}
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
					}}
					disabled={!selectedOrbId}
				>
					Delete Selected
				</button>
			</div>

			{/* Brush Size Slider - Only show if spawn-on-click is enabled */}
			{enableSpawnOnClick && (
				<>
					<div style={{ display: 'flex', flexDirection: 'column', gap: spacing.gapSm, fontSize: typography.fontSizeMd }}>
						<label htmlFor="debug-brush-size" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<span style={{ color: colors.textSecondary }}>Brush Size:</span>
							<span style={{ color: colors.textPrimary }}>{orbSize}</span>
						</label>
						<input
							id="debug-brush-size"
							name="debug-brush-size"
							type="range"
							min={minSize}
							max={maxSize}
							step={1}
							value={orbSize}
							onChange={(e) => onSizeChange?.(parseInt(e.target.value, 10))}
							aria-label={`Brush size: ${orbSize}`}
							style={{
								width: '100%',
								cursor: 'pointer',
								accentColor: colors.maroonAccent,
							}}
						/>
					</div>

					<div style={{ fontSize: typography.fontSizeSm, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.gapMd }}>
						* Tap grid to place orb
					</div>
				</>
			)}
		</>
	);
}
