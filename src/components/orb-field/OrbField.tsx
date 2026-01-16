"use client";

// =============================================================================
// OrbField - Controller Component for Grid and Orb Systems
// =============================================================================

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { GridConfigFactory } from './grid/core/GridConfigFactory';
import { ViewportCellsFactory } from './grid/core/ViewportCellsFactory';
import { SpatialGrid } from './grid/core/SpatialGrid';
import { OrbPhysics } from './orb/core/OrbPhysics';
import { CollisionSystem } from './collision/CollisionSystem';
import { useOrbManager } from './orb/hooks/useOrbManager';
import { type GridConfig, type ViewportCells } from './grid/types';
import {
	DEFAULT_REVEAL_CONFIG,
	DEFAULT_STYLE_CONFIG,
	DEFAULT_ORBFIELD_CONFIG,
	type GridRevealConfig,
	type GridStyleConfig,
} from './shared/config';
import { GridRenderer } from './grid/visuals/GridRenderer';
import { GridAnimator } from './grid/visuals/GridAnimator';
import { OrbDebugPanel } from './debug-info/components/OrbDebugPanel';
import { GridDebugPanel } from './debug-info/components/GridDebugPanel';

/** Debug mode flag from environment variable. */
const IS_DEBUG_MODE = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

/**
 * Props for the OrbField component.
 */
interface OrbFieldProps {
	/** Visibility toggle for the entire system. */
	visible?: boolean;
	/** Initial depth layer for visualization. */
	layer?: number;
	/** Base opacity of the canvas element. */
	opacity?: number;
	/** Overrides for reveal animation configuration. */
	revealConfig?: Partial<GridRevealConfig>;
	/** Overrides for visual style configuration. */
	styleConfig?: Partial<GridStyleConfig>;
}

/**
 * Main controller component for the Orb Field visualization system.
 *
 * Responsibilities:
 * - Orchestrates grid initialization and resize handling
 * - Manages animation and physics loop
 * - Delegates orb management to useOrbManager hook
 * - Delegates rendering to GridRenderer
 *
 * @param props - Component configuration props.
 */
export function OrbField({
	visible = true,
	layer: initialLayer = 0,
	opacity = DEFAULT_ORBFIELD_CONFIG.defaultOpacity,
	revealConfig: revealOverrides,
	styleConfig: styleOverrides,
}: OrbFieldProps) {
	// =========================================================================
	// Refs for High-Performance Loop (No Re-renders)
	// =========================================================================
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const gridRef = useRef<SpatialGrid | null>(null);
	const animatorRef = useRef<GridAnimator | null>(null);
	const loopIdRef = useRef<number | null>(null);
	const lastFrameTimeRef = useRef<number>(0);
	const rollProgressRef = useRef(0);
	const hasAnimatedRef = useRef(false);

	// Refs for stable loop access without triggering effects
	const viewportCellsRef = useRef<ViewportCells | null>(null);
	const windowSizeRef = useRef({ width: 0, height: 0 });
	const currentLayerRef = useRef(initialLayer);
	const hoveredCellRef = useRef<{ x: number; y: number; worldX: number; worldY: number } | null>(null);

	// =========================================================================
	// React State for UI
	// =========================================================================
	const [gridConfig, setGridConfig] = useState<GridConfig | null>(null);
	const [viewportCells, setViewportCells] = useState<ViewportCells | null>(null);
	const [currentLayer, setCurrentLayer] = useState(initialLayer);
	const [orbSize, setOrbSize] = useState(1);
	const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; worldX: number; worldY: number } | null>(null);
	const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });
	const [isMounted, setIsMounted] = useState(false);

	// =========================================================================
	// Orb Management (Delegated to Custom Hook)
	// =========================================================================
	const {
		orbsRef,
		orbs,
		selectedOrbId,
		selectedOrbData,
		selectedOrbIdRef,
		createOrb,
		deleteOrb,
		selectOrb,
		updateSelectedOrbData,
	} = useOrbManager();

	// =========================================================================
	// Memoized Configs
	// =========================================================================
	const revealConfig = useMemo(
		() => ({ ...DEFAULT_REVEAL_CONFIG, ...revealOverrides }),
		[revealOverrides]
	);
	const styleConfig = useMemo(
		() => ({ ...DEFAULT_STYLE_CONFIG, ...styleOverrides }),
		[styleOverrides]
	);

	// Config refs for stable loop access
	const revealConfigRef = useRef(revealConfig);
	const styleConfigRef = useRef(styleConfig);
	const opacityRef = useRef(opacity);

	// Sync refs with state changes
	useEffect(() => { revealConfigRef.current = revealConfig; }, [revealConfig]);
	useEffect(() => { styleConfigRef.current = styleConfig; }, [styleConfig]);
	useEffect(() => { opacityRef.current = opacity; }, [opacity]);
	useEffect(() => { currentLayerRef.current = currentLayer; }, [currentLayer]);

	// =========================================================================
	// 1. Mount & Resize Logic
	// =========================================================================
	useEffect(() => {
		const frameId = requestAnimationFrame(() => setIsMounted(true));

		if (typeof window === 'undefined') {
			return () => cancelAnimationFrame(frameId);
		}

		const handleResize = () => {
			const width = window.innerWidth;
			const height = window.innerHeight;
			setWindowSize({ width, height });
			windowSizeRef.current = { width, height };
		};

		handleResize();
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
			cancelAnimationFrame(frameId);
		};
	}, []);

	// =========================================================================
	// 2. Grid Initialization (Only on Resize)
	// =========================================================================
	useEffect(() => {
		if (windowSize.width === 0) return;

		const config = GridConfigFactory.create(window);
		const newGrid = new SpatialGrid(config);

		// Initialize border walls around grid edges
		newGrid.initializeBorder();

		const vpc = ViewportCellsFactory.create(config);

		// Update refs for immediate loop access
		gridRef.current = newGrid;
		viewportCellsRef.current = vpc;

		// Update React state asynchronously to avoid cascading renders
		queueMicrotask(() => {
			setGridConfig(config);
			setViewportCells(vpc);
		});

		// Reset animation state on resize
		hasAnimatedRef.current = false;
		rollProgressRef.current = 0;
	}, [windowSize]);

	// =========================================================================
	// 3. Unified Update Loop
	// =========================================================================
	const runLoop = useCallback((easedProgress: number, deltaTime: number) => {
		const canvas = canvasRef.current;
		const grid = gridRef.current;
		const vpc = viewportCellsRef.current;
		const ws = windowSizeRef.current;

		if (!canvas || !grid || !vpc || ws.width === 0) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		// A. Physics Update (only after reveal completes)
		if (easedProgress >= 1) {
			const currentOrbs = orbsRef.current;

			// Phase 1: Mark all orbs at current positions
			grid.clearDynamic();
			for (const orb of currentOrbs) {
				OrbPhysics.markOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
			}

			// Phase 2: Check border/wall collisions for each orb
			for (const orb of currentOrbs) {
				// Temporarily clear this orb's cells to check collision with walls and other orbs
				OrbPhysics.clearOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);

				const collision = CollisionSystem.checkMove(orb, deltaTime, grid, vpc);

				// Restore orb's cells
				OrbPhysics.markOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);

				if (collision.blocked) {
					// Apply reflection on colliding axes (walls/borders)
					CollisionSystem.applyReflection(orb, collision.reflectX, collision.reflectY);
				}
			}

			// Phase 3: Apply soft avoidance repulsion (when avoidance zones overlap)
			CollisionSystem.applyAvoidanceRepulsion(currentOrbs, vpc);

			// Phase 4: Resolve orb-orb hard collisions (mutual elastic bounce)
			CollisionSystem.resolveOrbOrbCollisions(currentOrbs, vpc);

			// Phase 5: Move all orbs
			for (const orb of currentOrbs) {
				OrbPhysics.updatePosition(orb, deltaTime);
			}

			// Phase 6: Re-mark at new positions for rendering
			grid.clearDynamic();
			for (const orb of currentOrbs) {
				OrbPhysics.markOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
			}
		}

		// B. Canvas Size Sync
		if (canvas.width !== ws.width || canvas.height !== ws.height) {
			canvas.width = ws.width;
			canvas.height = ws.height;
		}

		// C. Opacity Fade Logic (non-debug mode)
		let finalOpacity = opacityRef.current;
		if (!IS_DEBUG_MODE) {
			const fadeStart = DEFAULT_ORBFIELD_CONFIG.fadeOutStart;
			if (easedProgress > fadeStart) {
				const fadeFactor = (easedProgress - fadeStart) / (1 - fadeStart);
				finalOpacity *= (1 - fadeFactor);
			}
		}
		canvas.style.opacity = finalOpacity.toString();

		// D. Render Frame
		GridRenderer.draw(
			ctx,
			ws,
			vpc,
			easedProgress,
			revealConfigRef.current,
			styleConfigRef.current,
			IS_DEBUG_MODE ? hoveredCellRef.current : null,
			grid,
			currentLayerRef.current,
			IS_DEBUG_MODE ? orbsRef.current : []
		);

		// E. Debug Panel Sync
		if (IS_DEBUG_MODE && selectedOrbIdRef.current) {
			updateSelectedOrbData();
		}
	}, [orbsRef, selectedOrbIdRef, updateSelectedOrbData]);

	// =========================================================================
	// 4. Animation Loop Controller
	// =========================================================================
	useEffect(() => {
		if (!visible || !gridConfig) return;

		animatorRef.current = new GridAnimator(
			revealConfig.duration,
			(progress, eased) => {
				const now = performance.now();
				const dt = lastFrameTimeRef.current ? (now - lastFrameTimeRef.current) / 1000 : 0;
				lastFrameTimeRef.current = now;

				rollProgressRef.current = eased;
				runLoop(eased, dt);
			},
			() => {
				hasAnimatedRef.current = true;

				// Continue with physics loop after reveal
				const physicsLoop = () => {
					if (!hasAnimatedRef.current) return;

					const now = performance.now();
					const dt = (now - lastFrameTimeRef.current) / 1000;
					lastFrameTimeRef.current = now;

					runLoop(1, dt);
					loopIdRef.current = requestAnimationFrame(physicsLoop);
				};
				loopIdRef.current = requestAnimationFrame(physicsLoop);
			}
		);

		animatorRef.current.start();

		return () => {
			animatorRef.current?.stop();
			if (loopIdRef.current) cancelAnimationFrame(loopIdRef.current);
			hasAnimatedRef.current = false;
		};
	}, [visible, gridConfig, runLoop, revealConfig.duration]);

	// =========================================================================
	// 5. Interaction Handlers
	// =========================================================================
	const handleMouseMove = useCallback((e: React.MouseEvent) => {
		const vpc = viewportCellsRef.current;
		const gc = gridConfig;
		if (!vpc || !gc || rollProgressRef.current < 1 || !IS_DEBUG_MODE) return;

		const cellX = vpc.startCellX + Math.floor(e.clientX / vpc.cellSizeXPx);
		const cellY = vpc.startCellY + Math.floor(e.clientY / vpc.cellSizeYPx);

		const cellInfo = {
			x: cellX,
			y: cellY,
			worldX: gc.minXCm + cellX * vpc.cellSizeXCm,
			worldY: gc.minYCm + cellY * vpc.cellSizeYCm,
		};

		hoveredCellRef.current = cellInfo;
		setHoveredCell(cellInfo);
	}, [gridConfig]);

	const handleClick = useCallback((e: React.MouseEvent) => {
		const vpc = viewportCellsRef.current;
		const grid = gridRef.current;
		if (!grid || !vpc || !IS_DEBUG_MODE) return;

		createOrb(e.clientX, e.clientY, currentLayerRef.current, orbSize, grid, vpc);
	}, [orbSize, createOrb]);

	const handleDeleteOrb = useCallback((id: string) => {
		const grid = gridRef.current;
		const vpc = viewportCellsRef.current;
		if (!grid || !vpc) return;

		deleteOrb(id, grid, vpc);
	}, [deleteOrb]);

	const handleMouseLeave = useCallback(() => {
		hoveredCellRef.current = null;
		setHoveredCell(null);
	}, []);

	// =========================================================================
	// Render
	// =========================================================================
	if (!visible || !isMounted) return null;

	const { canvasZIndex, debugPanelZIndex } = DEFAULT_ORBFIELD_CONFIG;

	return (
		<>
			<canvas
				ref={canvasRef}
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				onClick={handleClick}
				style={{
					position: 'fixed',
					inset: 0,
					pointerEvents: IS_DEBUG_MODE ? 'auto' : 'none',
					opacity,
					zIndex: canvasZIndex,
				}}
			/>

			{IS_DEBUG_MODE && gridConfig && viewportCells && (
				<div
					style={{
						position: 'fixed',
						top: 16,
						right: 16,
						display: 'flex',
						flexDirection: 'row-reverse',
						alignItems: 'flex-start',
						gap: 12,
						zIndex: debugPanelZIndex,
					}}
				>
					<OrbDebugPanel
						orbs={orbs}
						selectedOrbId={selectedOrbId}
						selectedOrb={selectedOrbData}
						orbSize={orbSize}
						onSelectOrb={selectOrb}
						onDeleteOrb={handleDeleteOrb}
						onSizeChange={setOrbSize}
					/>

					<GridDebugPanel
						gridConfig={gridConfig}
						viewportCells={viewportCells}
						currentLayer={currentLayer}
						onLayerChange={setCurrentLayer}
						hoveredCell={hoveredCell}
					/>
				</div>
			)}
		</>
	);
}

export default OrbField;
