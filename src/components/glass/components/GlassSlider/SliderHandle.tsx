"use client";

import { CSSProperties, forwardRef } from "react";
import { glassStyles, combineGlassStyles, handleColors, animationTimings } from "../../styles";
import { SliderConfig } from "../../types";

interface SliderHandleProps {
	config: SliderConfig;
	position: number;
	isDragging: boolean;
	isHovering: boolean;
	onMouseDown: (e: React.MouseEvent) => void;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
}

/**
 * SliderHandle - The draggable handle component
 * Follows Single Responsibility Principle - only renders the handle
 * Uses forwardRef to allow parent to attach touch event listeners with passive: false
 */
export const SliderHandle = forwardRef<HTMLDivElement, SliderHandleProps>(function SliderHandle({
	config,
	position,
	isDragging,
	isHovering,
	onMouseDown,
	onMouseEnter,
	onMouseLeave,
}, ref) {
	const borderRadius = config.handleHeight / 2;
	const handleLeft = `calc(${config.padding}px + ${position} * (100% - ${config.handleWidth}px - ${config.padding * 2}px))`;
	const arrowRotation = -(position * 180);

	const handleStyle: CSSProperties = {
		position: "absolute",
		top: "50%",
		left: handleLeft,
		transform: isDragging
			? "translateY(-50%) translateZ(50px) scale(1.05)"
			: "translateY(-50%) scale(1)",
		width: config.handleWidth,
		height: config.handleHeight,
		borderRadius: `${borderRadius}px`,
		...combineGlassStyles(
			isHovering || isDragging ? glassStyles.background.hover : glassStyles.background.subtle,
			isHovering || isDragging ? glassStyles.border.hover : glassStyles.border.subtle,
			isDragging ? glassStyles.shadow.handleDragging : glassStyles.shadow.handle,
			glassStyles.backdrop.blurLight
		),
		cursor: isDragging ? "grabbing" : "grab",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		transition: `transform ${animationTimings.duration.fast} ${animationTimings.easing.smooth}, background ${animationTimings.duration.normal} ease, border-color ${animationTimings.duration.normal} ease, box-shadow ${animationTimings.duration.normal} ease`,
		willChange: "left, transform",
		transformStyle: "preserve-3d",
	};

	return (
		<div
			ref={ref}
			onMouseDown={onMouseDown}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			style={handleStyle}
		>
			{/* Arrow icon */}
			<svg
				width="20"
				height="20"
				viewBox="0 0 24 24"
				fill="none"
				stroke={isHovering || isDragging ? handleColors.arrowActive : handleColors.arrowDefault}
				strokeWidth="2.5"
				strokeLinecap="round"
				strokeLinejoin="round"
				style={{
					transform: `rotate(${arrowRotation}deg)`,
					transition: isDragging
						? "none"
						: `transform ${animationTimings.duration.normal} ${animationTimings.easing.easeOut}, stroke ${animationTimings.duration.normal} ease`,
				}}
			>
				<path d="M9 18l6-6-6-6" />
			</svg>
		</div>
	);
});
