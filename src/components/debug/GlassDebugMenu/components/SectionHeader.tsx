"use client";

import { debugMenuConfig } from "../config/debugMenuConfig";
import type { SectionHeaderProps } from "../types";

/**
 * SectionHeader - A section header with optional icon
 * Follows Single Responsibility Principle - only handles section header UI
 */
export function SectionHeader({ title, icon }: SectionHeaderProps) {
	const { spacing, typography, colors } = debugMenuConfig;

	return (
		<div style={{
			marginBottom: `${spacing.gapLg}px`,
			paddingBottom: `${spacing.gapLg}px`,
			borderBottom: `1px solid ${colors.borderLight}`,
			marginTop: `${spacing.marginSection}px`,
		}}>
			<div style={{ display: "flex", alignItems: "center", gap: `${spacing.gapLg}px` }}>
				{icon}
				<span style={{ fontSize: `${typography.fontSizeLg}px`, fontWeight: typography.fontWeightBold, color: colors.textPrimary }}>
					{title}
				</span>
			</div>
		</div>
	);
}
