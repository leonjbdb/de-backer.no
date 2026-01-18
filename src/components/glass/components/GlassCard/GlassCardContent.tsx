"use client";

import { ReactNode, CSSProperties } from "react";
import { cardDefaults } from "../../styles";

interface GlassCardContentProps {
	padding: string;
	children: ReactNode;
}

/**
 * GlassCardContent - The content wrapper layer
 * Follows Single Responsibility Principle - only renders the content wrapper
 * Follows Open/Closed Principle - uses config constants
 */
export function GlassCardContent({ padding, children }: GlassCardContentProps) {
	const contentStyle: CSSProperties = {
		position: "relative",
		zIndex: 1,
		padding,
		transform: `translateZ(${cardDefaults.contentZOffset}px)`,
		transformStyle: "preserve-3d",
	};

	return (
		<div className="glass-card-content" style={contentStyle}>
			{children}
		</div>
	);
}
