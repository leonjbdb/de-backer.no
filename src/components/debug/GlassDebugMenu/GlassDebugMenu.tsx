"use client";

import { useState, useEffect } from "react";
import { Settings, X, ChevronRight } from "lucide-react";
import { glassStyles, combineGlassStyles } from "@/components/glass/styles";
import { debugMenuConfig } from "./config/debugMenuConfig";
import { useDebugMenuState } from "./hooks/useDebugMenuState";
import { ToggleRow } from "./components/ToggleRow";
import { SectionHeader } from "./components/SectionHeader";
import { OrbDebugSection } from "./components/OrbDebugSection";
import { GridDebugSection } from "./components/GridDebugSection";
import type { GlassDebugMenuProps, ToggleItem, MenuComponentProps } from "./types";

const toggleItems: ToggleItem[] = [
	{ key: "showGrid", label: "Grid Lines", description: "Spatial grid visualization" },
	{ key: "showCollisionArea", label: "Collision Area", description: "Red cells showing orb bodies" },
	{ key: "showAvoidanceArea", label: "Avoidance Area", description: "Yellow cells showing proximity zones" },
	{ key: "showGraphics", label: "Orb Graphics", description: "Visual orb rendering" },
	{ key: "showArrowVector", label: "Arrow Vectors", description: "Show velocity arrows on orbs" },
	{ key: "showTruePosition", label: "True Position", description: "Show position indicator dot" },
	{ key: "pausePhysics", label: "Pause Physics", description: "Freeze orb movement" },
	{ key: "disableCollisions", label: "Disable Orb Collisions", description: "No hard bounce (red zones)" },
	{ key: "disableAvoidance", label: "Disable Avoidance", description: "No soft nudge (yellow zones)" },
	{ key: "enableOrbSpawning", label: "Orb Spawning", description: "Continuous orb spawning" },
	{ key: "enableOrbDespawning", label: "Orb Despawning", description: "Lifetime expiration" },
	{ key: "enableSpawnOnClick", label: "Click to Create", description: "Click to spawn orbs" },
	{ key: "showCards", label: "Show Cards", description: "Card carousel visibility" },
];

/**
 * GlassDebugMenu - Glass-styled debug menu with slider toggles
 * Follows SOLID Principles:
 * - Single Responsibility: Orchestrates sub-components
 * - Open/Closed: Configuration via config file
 * - Liskov Substitution: Consistent component interfaces
 * - Interface Segregation: Focused prop interfaces
 * - Dependency Inversion: Uses debugStorage abstraction
 */
export function GlassDebugMenu(props: GlassDebugMenuProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [isMobile, setIsMobile] = useState(() => {
		if (typeof window !== 'undefined') {
			return window.innerWidth < debugMenuConfig.breakpoint;
		}
		return false;
	});

	const { isDebugEnabled, state, handleToggle } = useDebugMenuState();

	// Client-side only rendering
	const [mounted, setMounted] = useState(false);
	useEffect(() => {
		// Using requestAnimationFrame to avoid cascading setState
		requestAnimationFrame(() => setMounted(true));

		const checkMobile = () => {
			setIsMobile(window.innerWidth < debugMenuConfig.breakpoint);
		};
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	if (!mounted || !isDebugEnabled) return null;

	const baseGlassStyles = combineGlassStyles(
		glassStyles.background.default,
		glassStyles.backdrop.blur,
		glassStyles.border.default,
		glassStyles.shadow.card
	);

	return isMobile ? (
		<MobileMenu
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			state={state}
			handleToggle={handleToggle}
			toggleItems={toggleItems}
			glassStyles={baseGlassStyles}
			{...props}
		/>
	) : (
		<DesktopMenu
			isOpen={isOpen}
			setIsOpen={setIsOpen}
			state={state}
			handleToggle={handleToggle}
			toggleItems={toggleItems}
			glassStyles={baseGlassStyles}
		/>
	);
}

/**
 * Desktop dropdown menu variant
 */
function DesktopMenu({
	isOpen,
	setIsOpen,
	state,
	handleToggle,
	toggleItems,
	glassStyles: baseGlassStyles,
}: MenuComponentProps) {
	const { dimensions, zIndex, spacing, colors } = debugMenuConfig;

	return (
		<div
			style={{
				position: "fixed",
				top: `${spacing.buttonTop}px`,
				left: `${spacing.buttonLeft}px`,
				zIndex: zIndex.button,
				fontFamily: "var(--font-mono), monospace",
			}}
		>
			<button
				onClick={() => setIsOpen(!isOpen)}
				style={{
					...baseGlassStyles,
					width: `${dimensions.buttonSize}px`,
					height: `${dimensions.buttonSize}px`,
					borderRadius: "50%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
					transition: debugMenuConfig.transitions.scale,
				}}
				onMouseEnter={(e) => {
					e.currentTarget.style.transform = "scale(1.05)";
				}}
				onMouseLeave={(e) => {
					e.currentTarget.style.transform = "scale(1)";
				}}
				aria-label={isOpen ? "Close debug menu" : "Open debug menu"}
			>
				{isOpen ? (
					<X style={{ width: `${dimensions.iconSize}px`, height: `${dimensions.iconSize}px`, color: colors.iconDefault }} />
				) : (
					<Settings style={{ width: `${dimensions.iconSize}px`, height: `${dimensions.iconSize}px`, color: colors.iconDefault }} />
				)}
			</button>

			{isOpen && (
				<div
					style={{
						...baseGlassStyles,
						position: "absolute",
						top: `${spacing.dropdownTop}px`,
						left: "0",
						width: `${dimensions.dropdownWidth}px`,
						borderRadius: `${dimensions.borderRadiusLg}px`,
						padding: `${spacing.padding}px`,
						maxHeight: `calc(100vh - ${spacing.viewportOffset}px)`,
						overflowY: "auto",
					}}
				>
					<SectionHeader title="Debug Options" icon={<Settings style={{ width: `${dimensions.sectionIconSize}px`, height: `${dimensions.sectionIconSize}px`, color: colors.iconMuted }} />} />

					<div style={{ display: "flex", flexDirection: "column" }}>
						{toggleItems.map((item: ToggleItem) => (
							<ToggleRow
								key={item.key}
								item={item}
								checked={state[item.key]}
								onToggle={() => handleToggle(item.key)}
							/>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

/**
 * Mobile slide-in panel variant
 */
function MobileMenu({
	isOpen,
	setIsOpen,
	state,
	handleToggle,
	toggleItems,
	glassStyles: baseGlassStyles,
	orbs,
	targetOrbCount,
	selectedOrbId,
	selectedOrb,
	orbSize,
	onSelectOrb,
	onDeleteOrb,
	onSizeChange,
	gridConfig,
	viewportCells,
	currentLayer,
	onLayerChange,
	hoveredCell,
}: MenuComponentProps & GlassDebugMenuProps) {
	const { dimensions, zIndex, spacing, colors } = debugMenuConfig;

	return (
		<>
			{/* Toggle Button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				style={{
					...baseGlassStyles,
					position: "fixed",
					top: `${spacing.buttonTop}px`,
					left: `${spacing.buttonLeft}px`,
					zIndex: zIndex.button,
					width: `${dimensions.buttonSizeMobile}px`,
					height: `${dimensions.buttonSizeMobile}px`,
					borderRadius: "50%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					cursor: "pointer",
					transition: debugMenuConfig.transitions.scale,
				}}
				aria-label={isOpen ? "Close debug menu" : "Open debug menu"}
			>
				{isOpen ? (
					<X style={{ width: `${dimensions.iconSizeMobile}px`, height: `${dimensions.iconSizeMobile}px`, color: colors.iconDefault }} />
				) : (
					<ChevronRight style={{ width: `${dimensions.iconSizeMobile}px`, height: `${dimensions.iconSizeMobile}px`, color: colors.iconDefault }} />
				)}
			</button>

			{/* Backdrop */}
			{isOpen && (
				<div
					onClick={() => setIsOpen(false)}
					style={{
						position: "fixed",
						inset: 0,
						background: colors.backdropBg,
						zIndex: zIndex.backdrop,
					}}
				/>
			)}

			{/* Slide-in Panel */}
			<div
				onTouchStart={(e) => e.stopPropagation()}
				onTouchMove={(e) => e.stopPropagation()}
				onTouchEnd={(e) => e.stopPropagation()}
				style={{
					...baseGlassStyles,
					position: "fixed",
					top: 0,
					left: 0,
					bottom: 0,
					width: `min(${dimensions.panelWidthMobile}px, 85vw)`,
					zIndex: zIndex.panel,
					transform: isOpen ? "translateX(0)" : "translateX(-100%)",
					transition: debugMenuConfig.transitions.transform,
					overflowY: "auto",
					fontFamily: "var(--font-mono), monospace",
					padding: `${spacing.paddingMobile}px`,
					paddingTop: `${spacing.panelTopMobile}px`,
					touchAction: "pan-y",
				}}
			>
				<SectionHeader title="Debug Options" icon={<Settings style={{ width: `${dimensions.sectionIconSize}px`, height: `${dimensions.sectionIconSize}px`, color: colors.iconMuted }} />} />

				<div style={{ display: "flex", flexDirection: "column" }}>
					{toggleItems.map((item: ToggleItem) => (
						<ToggleRow
							key={item.key}
							item={item}
							checked={state[item.key]}
							onToggle={() => handleToggle(item.key)}
						/>
					))}
				</div>

				<GridDebugSection
					gridConfig={gridConfig}
					viewportCells={viewportCells}
					currentLayer={currentLayer}
					onLayerChange={onLayerChange}
					hoveredCell={hoveredCell}
				/>

				<OrbDebugSection
					orbs={orbs}
					targetOrbCount={targetOrbCount}
					selectedOrbId={selectedOrbId}
					selectedOrb={selectedOrb}
					orbSize={orbSize}
					onSelectOrb={onSelectOrb}
					onDeleteOrb={onDeleteOrb}
					onSizeChange={onSizeChange}
				/>
			</div>
		</>
	);
}
