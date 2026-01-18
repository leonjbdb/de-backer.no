"use client";

import { ToggleSlider } from "./ToggleSlider";
import { debugMenuConfig } from "../config/debugMenuConfig";
import type { ToggleRowProps } from "../types";

/**
 * ToggleRow - A row displaying a toggle option with label and description
 * Follows Single Responsibility Principle - only handles row layout
 */
export function ToggleRow({ item, checked, onToggle }: ToggleRowProps) {
	const { spacing, typography, colors } = debugMenuConfig;

	return (
		<div style={{
			display: "flex",
			alignItems: "center",
			justifyContent: "space-between",
			paddingTop: `${spacing.gapLg}px`,
			paddingBottom: `${spacing.gapLg}px`,
			gap: `${spacing.gapXl}px`,
		}}>
			<div style={{ display: "flex", flexDirection: "column", gap: `${spacing.gapXs}px`, flex: 1, minWidth: 0 }}>
				<span style={{ fontSize: `${typography.fontSizeLg}px`, fontWeight: typography.fontWeightNormal, color: colors.textPrimary }}>
					{item.label}
				</span>
				{item.description && (
					<span style={{ fontSize: `${typography.fontSizeSm}px`, color: colors.textMuted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
						{item.description}
					</span>
				)}
			</div>
			<ToggleSlider checked={checked} onToggle={onToggle} />
		</div>
	);
}
