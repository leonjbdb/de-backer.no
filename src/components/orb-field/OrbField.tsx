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
import { DEFAULT_SPEED_LIMIT_CONFIG, DEFAULT_ORB_SPAWN_CONFIG, DEFAULT_LAYER_ATTRACTION_CONFIG, DEFAULT_CONTINUOUS_SPAWN_CONFIG } from './orb/config';
import { OrbVisualRenderer } from './orb/visuals/OrbVisualRenderer';
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
	/** When true, triggers the orb burst explosion. Should transition from false to true once. */
	triggerBurst?: boolean;
	/** Callback fired when grid roll animation completes. */
	onAnimationComplete?: () => void;
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
	layer: initialLayer = 50, // Start in middle layer (of 100) for 3D movement
	opacity = DEFAULT_ORBFIELD_CONFIG.defaultOpacity,
	revealConfig: revealOverrides,
	styleConfig: styleOverrides,
	triggerBurst = false,
	onAnimationComplete,
}: OrbFieldProps) {
	// =========================================================================
	// Refs for High-Performance Loop (No Re-renders)
	// =========================================================================
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const visualCanvasRef = useRef<HTMLCanvasElement>(null);
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
	const isPausedRef = useRef(false);
	const burstTimeRef = useRef<number | null>(null); // Track when burst happened for delayed continuous spawning
	const mousePosRef = useRef<{ x: number; y: number } | null>(null); // Track mouse position for orb repulsion
	const hasBurstRef = useRef(false); // Track if burst has already happened (prevent double burst)
	const isPageVisibleRef = useRef(typeof document !== 'undefined' ? !document.hidden : true); // Track if page/tab is visible (pause spawning when hidden)

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
	const [isPaused, setIsPaused] = useState(false);

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
		spawnOrbBurst,
		spawnRandomOrbs,
		deleteOrb,
		selectOrb,
		updateSelectedOrbData,
		syncOrbsState,
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

	// Calculate target orb count based on screen size
	const targetOrbCount = useMemo(() => {
		const { targetOrbCountAt4K, referenceScreenArea } = DEFAULT_CONTINUOUS_SPAWN_CONFIG;
		const screenArea = windowSize.width * windowSize.height;
		const areaScale = screenArea / referenceScreenArea;
		return Math.round(targetOrbCountAt4K * areaScale);
	}, [windowSize]);

	// Config refs for stable loop access
	const revealConfigRef = useRef(revealConfig);
	const styleConfigRef = useRef(styleConfig);
	const opacityRef = useRef(opacity);

	// Sync refs with state changes
	useEffect(() => { revealConfigRef.current = revealConfig; }, [revealConfig]);
	useEffect(() => { styleConfigRef.current = styleConfig; }, [styleConfig]);
	useEffect(() => { opacityRef.current = opacity; }, [opacity]);
	useEffect(() => { currentLayerRef.current = currentLayer; }, [currentLayer]);
	useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

	// =========================================================================
	// 1. Mount & Resize Logic + Global Mouse Tracking
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

		// Global mouse tracking for orb repulsion (works even when canvas has pointerEvents: none)
		const handleGlobalMouseMove = (e: MouseEvent) => {
			mousePosRef.current = { x: e.clientX, y: e.clientY };
		};

		const handleGlobalMouseLeave = () => {
			mousePosRef.current = null;
		};

		// Track page visibility AND window focus to pause spawning when inactive
		// visibilitychange: fires when tab is hidden (e.g., switching browser tabs)
		// blur/focus: fires when window loses/gains focus (e.g., switching to another app)
		const updateVisibility = () => {
			const isVisible = document.hasFocus() && !document.hidden;
			isPageVisibleRef.current = isVisible;
		};

		const handleVisibilityChange = () => {
			updateVisibility();
		};

		const handleWindowFocus = () => {
			isPageVisibleRef.current = !document.hidden;
		};

		const handleWindowBlur = () => {
			isPageVisibleRef.current = false;
		};

		// Set initial visibility state
		updateVisibility();

		handleResize();
		window.addEventListener('resize', handleResize);
		window.addEventListener('mousemove', handleGlobalMouseMove);
		document.addEventListener('mouseleave', handleGlobalMouseLeave);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		window.addEventListener('focus', handleWindowFocus);
		window.addEventListener('blur', handleWindowBlur);

		return () => {
			window.removeEventListener('resize', handleResize);
			window.removeEventListener('mousemove', handleGlobalMouseMove);
			document.removeEventListener('mouseleave', handleGlobalMouseLeave);
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			window.removeEventListener('focus', handleWindowFocus);
			window.removeEventListener('blur', handleWindowBlur);
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

		// A. Physics Update (only after reveal completes and when not paused)
		if (easedProgress >= 1 && !isPausedRef.current) {
			const currentOrbs = orbsRef.current;

			// Phase 1: Mark all orbs at current positions
			grid.clearDynamic();
			for (const orb of currentOrbs) {
				OrbPhysics.markOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
			}

			// Phase 2: Apply mouse repulsion (2D only, affects all orbs once regardless of z-layer)
			const mousePos = mousePosRef.current;
			if (mousePos) {
				CollisionSystem.applyMouseRepulsion(currentOrbs, mousePos.x, mousePos.y, deltaTime);
			}

			// Phase 3: Apply speed limits (larger orbs are slower)
			const { baseMaxSpeed, minMaxSpeed, decelerationRate } = DEFAULT_SPEED_LIMIT_CONFIG;
			for (const orb of currentOrbs) {
				OrbPhysics.applySpeedLimit(orb, baseMaxSpeed, minMaxSpeed, decelerationRate, deltaTime);
			}

			// Phase 4: Apply wander behavior (organic velocity drift)
			for (const orb of currentOrbs) {
				OrbPhysics.applyWander(orb, deltaTime);
			}

			// Phase 5: Apply layer attraction (orbs drift toward preferred depth)
			const { maxSize } = DEFAULT_ORB_SPAWN_CONFIG;
			const { attractionStrength } = DEFAULT_LAYER_ATTRACTION_CONFIG;
			const totalLayers = grid.config.layers;
			for (const orb of currentOrbs) {
				OrbPhysics.applyLayerAttraction(orb, maxSize, totalLayers, attractionStrength, deltaTime);
			}

			// Phase 6: Move all orbs
			for (const orb of currentOrbs) {
				OrbPhysics.updatePosition(orb, deltaTime);
			}

			// Phase 7: Check border/wall collisions for each orb (3D) AFTER movement
			for (const orb of currentOrbs) {
				// Temporarily clear this orb's cells
				OrbPhysics.clearOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);

				const collision = CollisionSystem.checkMove(orb, deltaTime, grid, vpc);

				// Restore orb's cells
				OrbPhysics.markOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);

				if (collision.blocked) {
					// Revert the movement and reflect velocity
					OrbPhysics.updatePosition(orb, -deltaTime);
					CollisionSystem.applyReflection(orb, collision.reflectX, collision.reflectY, collision.reflectZ);
				}
			}

			// Phase 8: Re-mark at new positions for rendering
			grid.clearDynamic();
			for (const orb of currentOrbs) {
				OrbPhysics.markOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
			}

			// Phase 9: Check and remove expired orbs
			const now = performance.now();
			const expiredOrbs = currentOrbs.filter(orb => (now - orb.createdAt) > orb.lifetimeMs);
			if (expiredOrbs.length > 0) {
				for (const expiredOrb of expiredOrbs) {
					OrbPhysics.clearOrbCircular(grid, expiredOrb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
				}
				orbsRef.current = currentOrbs.filter(orb => (now - orb.createdAt) <= orb.lifetimeMs);
				syncOrbsState(); // Update React state for UI
			}

			// Phase 10: Continuous spawning to maintain target orb count
			// Only spawn if page is visible and burst has happened
			const burstTime = burstTimeRef.current;
			const { targetOrbCountAt4K, referenceScreenArea, delayAfterBurstMs, baseSpawnRateAt4K, maxSpawnsPerFrame } = DEFAULT_CONTINUOUS_SPAWN_CONFIG;
			if (burstTime && (now - burstTime) > delayAfterBurstMs && isPageVisibleRef.current) {
				// Scale target and spawn rate linearly with screen area
				// At 4K (3840x2160): 1000 orbs, at 1080p (1920x1080): ~250 orbs
				const screenArea = ws.width * ws.height;
				const areaScale = screenArea / referenceScreenArea;
				const targetOrbCount = Math.round(targetOrbCountAt4K * areaScale);
				const baseSpawnRate = baseSpawnRateAt4K * areaScale;

				const currentCount = orbsRef.current.length;
				const deficit = targetOrbCount - currentCount;

				if (deficit > 0) {
					// Calculate spawn rate based on deficit (more deficit = faster spawning)
					// Use a smooth curve: spawn rate scales with how far below target we are
					const deficitRatio = Math.min(1, deficit / targetOrbCount); // 0 to 1
					const spawnRate = baseSpawnRate * deficitRatio; // orbs per second

					// Calculate how many to spawn this frame (probabilistic for smooth spawning)
					const expectedSpawns = spawnRate * deltaTime;
					const guaranteedSpawns = Math.floor(expectedSpawns);
					const fractionalChance = expectedSpawns - guaranteedSpawns;
					const extraSpawn = Math.random() < fractionalChance ? 1 : 0;
					const spawnsThisFrame = Math.min(guaranteedSpawns + extraSpawn, maxSpawnsPerFrame);

					if (spawnsThisFrame > 0) {
						spawnRandomOrbs(spawnsThisFrame, ws.width, ws.height, grid, vpc);
					}
				}
			}
		} else if (easedProgress >= 1 && isPausedRef.current) {
			// When paused, still mark orbs for rendering but don't update physics
			const currentOrbs = orbsRef.current;
			grid.clearDynamic();
			for (const orb of currentOrbs) {
				OrbPhysics.markOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
			}
		}

		// B. Canvas Size Sync (both debug and visual canvases)
		if (canvas.width !== ws.width || canvas.height !== ws.height) {
			canvas.width = ws.width;
			canvas.height = ws.height;
		}

		const visualCanvas = visualCanvasRef.current;
		if (visualCanvas && (visualCanvas.width !== ws.width || visualCanvas.height !== ws.height)) {
			visualCanvas.width = ws.width;
			visualCanvas.height = ws.height;
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

		// D. Render Debug Frame (grid lines, occupied cells, debug visuals)
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

		// E. Render Visual Orbs (maroon orbs with glow and depth blur)
		// Uses separate canvas layer (visualCanvasRef) to appear behind page content
		if (visualCanvas && easedProgress >= 1) {
			const visualCtx = visualCanvas.getContext('2d');
			if (visualCtx) {
				const now = performance.now();
				OrbVisualRenderer.draw(
					visualCtx,
					ws,
					orbsRef.current,
					grid.config.layers,
					undefined, // use default config
					now       // current time for spawn/despawn animations
				);
			}
		}

		// F. Debug Panel Sync
		if (IS_DEBUG_MODE && selectedOrbIdRef.current) {
			updateSelectedOrbData();
		}
	}, [orbsRef, selectedOrbIdRef, updateSelectedOrbData, syncOrbsState, spawnRandomOrbs]);

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

				// Notify parent that grid animation is complete
				onAnimationComplete?.();

				// Orb burst is now triggered by triggerBurst prop, not grid animation completion

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
	}, [visible, gridConfig, runLoop, revealConfig.duration, onAnimationComplete]);

	// =========================================================================
	// 4b. Orb Burst Trigger (Controlled by Parent)
	// =========================================================================
	// Store triggerBurst in a ref so the physics loop can check it
	const triggerBurstRef = useRef(triggerBurst);
	useEffect(() => {
		triggerBurstRef.current = triggerBurst;
	}, [triggerBurst]);

	// Check for burst trigger in the physics loop (runLoop) via a helper
	// This ensures grid is ready since runLoop only runs after animation starts
	useEffect(() => {
		// Poll for burst trigger after grid is ready
		if (!triggerBurst || hasBurstRef.current) return;

		const checkAndBurst = () => {
			if (hasBurstRef.current) return;

			const grid = gridRef.current;
			const vpc = viewportCellsRef.current;
			const ws = windowSizeRef.current;

			if (grid && vpc && ws.width > 0 && hasAnimatedRef.current) {
				hasBurstRef.current = true;
				const centerX = ws.width / 2;
				const centerY = ws.height / 2;
				spawnOrbBurst(centerX, centerY, grid, vpc);
				burstTimeRef.current = performance.now();
			} else {
				// Grid not ready yet, try again next frame
				requestAnimationFrame(checkAndBurst);
			}
		};

		checkAndBurst();
	}, [triggerBurst, spawnOrbBurst]);

	// =========================================================================
	// 5. Interaction Handlers
	// =========================================================================
	const handleMouseMove = useCallback((e: React.MouseEvent) => {
		// Debug mode cell tracking only (mouse repulsion handled by global listener)
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
		// Debug mode only (mouse repulsion handled by global listener)
		hoveredCellRef.current = null;
		setHoveredCell(null);
	}, []);

	const handleTogglePause = useCallback(() => {
		setIsPaused((prev) => !prev);
	}, []);

	// =========================================================================
	// Render
	// =========================================================================
	if (!visible || !isMounted) return null;

	const { canvasZIndex, debugPanelZIndex } = DEFAULT_ORBFIELD_CONFIG;

	// Visual orb canvas sits behind content but above page background (z-index: 0)
	const visualCanvasZIndex = 0;

	return (
		<>
			{/* Visual Orb Canvas - renders maroon orbs with glow and depth blur */}
			<canvas
				ref={visualCanvasRef}
				style={{
					position: 'fixed',
					inset: 0,
					pointerEvents: 'none',
					zIndex: visualCanvasZIndex,
				}}
			/>

			{/* Debug/Grid Canvas - renders grid lines and debug visuals */}
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
						targetOrbCount={targetOrbCount}
						selectedOrbId={selectedOrbId}
						selectedOrb={selectedOrbData}
						orbSize={orbSize}
						isPaused={isPaused}
						onSelectOrb={selectOrb}
						onDeleteOrb={handleDeleteOrb}
						onSizeChange={setOrbSize}
						onTogglePause={handleTogglePause}
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
