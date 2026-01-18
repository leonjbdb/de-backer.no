"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { debugMenuConfig } from "../config/debugMenuConfig";
import { glassStyles } from "@/components/glass/styles";
import type { ToggleSliderProps } from "../types";

/**
 * ToggleSlider - A glass-styled slider toggle component
 * Follows Single Responsibility Principle - only handles slider toggle UI and drag interaction
 * Uses shared glassStyles and configuration (Open/Closed Principle)
 */
export function ToggleSlider({ checked, onToggle }: ToggleSliderProps) {
	const trackRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragPosition, setDragPosition] = useState<number | null>(null);
	const dragStartRef = useRef<{ x: number; startPosition: number } | null>(null);

	const { dimensions, colors, spacing, shadows, transitions } = debugMenuConfig;

	// Use drag position during drag, otherwise derive from checked
	const position = isDragging && dragPosition !== null ? dragPosition : (checked ? 1 : 0);

	const calculatePosition = useCallback((clientX: number): number => {
		if (!trackRef.current) return position;
		const rect = trackRef.current.getBoundingClientRect();
		const handleWidth = dimensions.handleWidth;
		const padding = spacing.sliderPadding;
		const trackWidth = rect.width - handleWidth - (padding * 2);
		const trackLeft = rect.left + padding;
		const relativeX = clientX - trackLeft - (handleWidth / 2);
		return Math.max(0, Math.min(1, relativeX / trackWidth));
	}, [position, dimensions.handleWidth, spacing.sliderPadding]);

	const handleDragStart = useCallback((clientX: number) => {
		setIsDragging(true);
		dragStartRef.current = { x: clientX, startPosition: position };
	}, [position]);

	const handleDragMove = useCallback((clientX: number) => {
		if (!isDragging || !dragStartRef.current) return;
		const newPosition = calculatePosition(clientX);
		setDragPosition(newPosition);
	}, [isDragging, calculatePosition]);

	const handleDragEnd = useCallback(() => {
		if (!isDragging) return;
		setIsDragging(false);
		dragStartRef.current = null;
		const shouldBeOn = position > 0.5;
		setDragPosition(null);
		if (shouldBeOn !== checked) {
			onToggle();
		}
	}, [isDragging, position, checked, onToggle]);

	useEffect(() => {
		if (!isDragging) return;
		const handleMouseMove = (e: MouseEvent) => {
			e.preventDefault();
			handleDragMove(e.clientX);
		};
		const handleTouchMove = (e: TouchEvent) => {
			e.preventDefault();
			handleDragMove(e.touches[0].clientX);
		};
		const handleMouseUp = () => handleDragEnd();
		const handleTouchEnd = () => handleDragEnd();

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		document.addEventListener("touchmove", handleTouchMove, { passive: false });
		document.addEventListener("touchend", handleTouchEnd);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.removeEventListener("touchmove", handleTouchMove);
			document.removeEventListener("touchend", handleTouchEnd);
		};
	}, [isDragging, handleDragMove, handleDragEnd]);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onToggle();
	};

	const handleWidth = dimensions.handleWidth;
	const padding = spacing.sliderPadding;
	const handleLeft = `calc(${padding}px + ${position} * (100% - ${handleWidth}px - ${padding * 2}px))`;

	return (
		<div
			ref={trackRef}
			onClick={handleClick}
			style={{
				position: "relative",
				width: `${dimensions.trackWidth}px`,
				height: `${dimensions.trackHeight}px`,
				borderRadius: `${dimensions.trackBorderRadius}px`,
				background: position > 0.5
					? colors.maroon
					: glassStyles.background.default.background,
				border: glassStyles.border.default.border,
				cursor: "pointer",
				transition: transitions.background,
				flexShrink: 0,
			}}
		>
			<div
				onMouseDown={(e) => {
					e.preventDefault();
					e.stopPropagation();
					handleDragStart(e.clientX);
				}}
				onTouchStart={(e) => {
					e.stopPropagation();
					handleDragStart(e.touches[0].clientX);
				}}
				style={{
					position: "absolute",
					top: "50%",
					left: handleLeft,
					transform: "translateY(-50%)",
					width: handleWidth,
					height: `${dimensions.handleHeight}px`,
					borderRadius: `${dimensions.handleBorderRadius}px`,
					background: position > 0.5
						? colors.handleActive
						: colors.handleInactive,
					boxShadow: shadows.handle,
					cursor: isDragging ? "grabbing" : "grab",
					transition: isDragging ? "none" : transitions.slider,
				}}
			/>
		</div>
	);
}
