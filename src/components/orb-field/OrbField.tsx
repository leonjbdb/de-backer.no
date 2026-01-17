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
import { useDebugSafe, GlassDebugMenu } from '@/components/debug';

/** Debug mode flag - checks both environment variable and localStorage. */
const getDebugMode = (): boolean => {
	// Server-side or initial load: use environment variable
	if (typeof window === 'undefined') {
		return process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
	}
	// Client-side: check localStorage first, fall back to environment variable
	const stored = localStorage.getItem('debug-mode-enabled');
	if (stored !== null) {
		return stored === 'true';
	}
	return process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';
};

/** Pixels of grid/orb movement per viewport unit of scroll progress. */
const SCROLL_OFFSET_PX_PER_UNIT = 100;

/** Reference scroll progress where offset is zero (first resting point). */
const SCROLL_OFFSET_REFERENCE = 0.75;

/** Smoothing factor for interpolating scroll offset (0-1, lower = smoother). */
const SCROLL_OFFSET_SMOOTHING = 0.08;

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
	/** Current scroll/swipe progress (0.75 to 2.75 range). Used for parallax grid movement. */
	scrollProgress?: number;
	/** Whether device is mobile (affects scroll direction: horizontal vs vertical). */
	isMobile?: boolean;
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
	scrollProgress = SCROLL_OFFSET_REFERENCE,
	isMobile = false,
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
	const burstTimeRef = useRef<number | null>(null); // Track when burst happened for delayed continuous spawning
	const mousePosRef = useRef<{ x: number; y: number } | null>(null); // Track mouse position for orb repulsion
	const hasBurstRef = useRef(false); // Track if burst has already happened (prevent double burst)
	const isPageVisibleRef = useRef(typeof document !== 'undefined' ? !document.hidden : true); // Track if page/tab is visible (pause spawning when hidden)
	const scrollProgressRef = useRef(scrollProgress); // Track scroll progress for parallax offset
	const isMobileRef = useRef(isMobile); // Track mobile mode for scroll direction
	const currentScrollOffsetRef = useRef({ x: 0, y: 0 }); // Smoothly interpolated scroll offset for rendering
	const isDebugModeRef = useRef(false); // Track debug mode for animation loop
	const pausedAtTimeRef = useRef<number | null>(null); // When physics was paused (for freezing time)
	const pausedTimeOffsetRef = useRef(0); // Accumulated time while paused (to freeze animations)

	// Debug option refs for animation loop access
	const showGridRef = useRef(true);
	const showCollisionAreaRef = useRef(true);
	const showAvoidanceAreaRef = useRef(true);
	const showGraphicsRef = useRef(true);
	const enableOrbSpawningRef = useRef(true);
	const enableOrbDespawningRef = useRef(true);
	const enableSpawnOnClickRef = useRef(true);
	const pausePhysicsRef = useRef(false);
	const showArrowVectorRef = useRef(true);
	const showTruePositionRef = useRef(true);

	// =========================================================================
	// Debug Context Integration
	// =========================================================================
	const debugContext = useDebugSafe();

	// Sync debug options to refs for animation loop access
	useEffect(() => {
		if (debugContext?.state) {
			showGridRef.current = debugContext.state.showGrid;
			showCollisionAreaRef.current = debugContext.state.showCollisionArea;
			showAvoidanceAreaRef.current = debugContext.state.showAvoidanceArea;
			showGraphicsRef.current = debugContext.state.showGraphics;
			enableOrbSpawningRef.current = debugContext.state.enableOrbSpawning;
			enableOrbDespawningRef.current = debugContext.state.enableOrbDespawning;
			enableSpawnOnClickRef.current = debugContext.state.enableSpawnOnClick;
			showArrowVectorRef.current = debugContext.state.showArrowVector;
			showTruePositionRef.current = debugContext.state.showTruePosition;
			
			// Handle pause state change
			const wasPaused = pausePhysicsRef.current;
			const isPaused = debugContext.state.pausePhysics;
			pausePhysicsRef.current = isPaused;
			
			// Track pause/resume for time freezing
			if (!wasPaused && isPaused) {
				// Just paused - record the time
				pausedAtTimeRef.current = performance.now();
			} else if (wasPaused && !isPaused) {
				// Just resumed - accumulate the paused time
				if (pausedAtTimeRef.current !== null) {
					pausedTimeOffsetRef.current += performance.now() - pausedAtTimeRef.current;
					pausedAtTimeRef.current = null;
				}
			}
			
			// Also sync to isPaused state for UI display
			setIsPaused(debugContext.state.pausePhysics);
		}
	}, [debugContext?.state]);

	// Listen for debug option changes when context is not available (from GlassDebugMenu)
	useEffect(() => {
		const handleDebugOptionChange = (e: CustomEvent<{ key: string; value: boolean }>) => {
			const { key, value } = e.detail;
			switch (key) {
				case "showGrid":
					showGridRef.current = value;
					break;
				case "showCollisionArea":
					showCollisionAreaRef.current = value;
					break;
				case "showAvoidanceArea":
					showAvoidanceAreaRef.current = value;
					break;
				case "showGraphics":
					showGraphicsRef.current = value;
					break;
				case "showArrowVector":
					showArrowVectorRef.current = value;
					break;
				case "showTruePosition":
					showTruePositionRef.current = value;
					break;
				case "enableOrbSpawning":
					enableOrbSpawningRef.current = value;
					break;
				case "enableOrbDespawning":
					enableOrbDespawningRef.current = value;
					break;
				case "enableSpawnOnClick":
					enableSpawnOnClickRef.current = value;
					break;
				case "pausePhysics":
					// Handle pause state change
					const wasPaused = pausePhysicsRef.current;
					const isPaused = value;
					pausePhysicsRef.current = isPaused;
					
					// Track pause/resume for time freezing
					if (!wasPaused && isPaused) {
						// Just paused - record the time
						pausedAtTimeRef.current = performance.now();
					} else if (wasPaused && !isPaused) {
						// Just resumed - accumulate the paused time
						if (pausedAtTimeRef.current !== null) {
							pausedTimeOffsetRef.current += performance.now() - pausedAtTimeRef.current;
							pausedAtTimeRef.current = null;
						}
					}
					
					setIsPaused(value);
					break;
			}
		};

		window.addEventListener("debugOptionChanged", handleDebugOptionChange as EventListener);
		return () => {
			window.removeEventListener("debugOptionChanged", handleDebugOptionChange as EventListener);
		};
	}, []);

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
	const [isDebugMode, setIsDebugMode] = useState(false);

	// Initialize debug mode on mount
	useEffect(() => {
		const debugMode = getDebugMode();
		setIsDebugMode(debugMode);
		isDebugModeRef.current = debugMode;
		
		// Listen for debug mode changes from slider
		const handleDebugModeChange = (e: CustomEvent) => {
			setIsDebugMode(e.detail.enabled);
			isDebugModeRef.current = e.detail.enabled;
		};
		
		window.addEventListener('debugModeChanged', handleDebugModeChange as EventListener);
		
		return () => {
			window.removeEventListener('debugModeChanged', handleDebugModeChange as EventListener);
		};
	}, []);

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
	useEffect(() => { scrollProgressRef.current = scrollProgress; }, [scrollProgress]);
	useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);

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
	
	/**
	 * Get the effective time for animations.
	 * When paused, returns the frozen time (time at pause).
	 * When not paused, returns current time minus accumulated pause duration.
	 */
	const getEffectiveTime = useCallback((): number => {
		const now = performance.now();
		if (pausePhysicsRef.current && pausedAtTimeRef.current !== null) {
			// Currently paused - return the frozen time
			return pausedAtTimeRef.current - pausedTimeOffsetRef.current;
		}
		// Not paused - return current time minus all accumulated paused time
		return now - pausedTimeOffsetRef.current;
	}, []);
	
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
		if (easedProgress >= 1 && !pausePhysicsRef.current) {
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

		// Phase 5.5: Apply orb-orb avoidance (soft nudging when avoidance zones overlap)
		CollisionSystem.applyAvoidanceRepulsion(currentOrbs, vpc, deltaTime);

		// Phase 5.6: Resolve orb-orb collisions (hard bounce when bodies overlap)
		CollisionSystem.resolveOrbOrbCollisions(currentOrbs, vpc);

		// Phase 6: Check wall collisions BEFORE movement, then move
		for (const orb of currentOrbs) {
			// Temporarily clear this orb's cells for collision check
			OrbPhysics.clearOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);

			const collision = CollisionSystem.checkMove(orb, deltaTime, grid, vpc);

			// Restore orb's cells
			OrbPhysics.markOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);

			if (collision.blocked) {
				// Reflect velocity on blocked axes BEFORE movement
				CollisionSystem.applyReflection(orb, collision.reflectX, collision.reflectY, collision.reflectZ);
			}

			// Now move with (possibly reflected) velocity
			OrbPhysics.updatePosition(orb, deltaTime);
		}

		// Phase 6.5: Safety check - unstick any orbs that ended up inside walls
		for (const orb of currentOrbs) {
			OrbPhysics.clearOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
			CollisionSystem.unstickFromWall(orb, grid, vpc);
			OrbPhysics.markOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
		}

			// Phase 8: Re-mark at new positions for rendering
			grid.clearDynamic();
			for (const orb of currentOrbs) {
				OrbPhysics.markOrbCircular(grid, orb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
			}

			// Phase 9: Check and remove expired orbs (only if despawning is enabled)
			const now = getEffectiveTime();
			if (enableOrbDespawningRef.current) {
				const expiredOrbs = currentOrbs.filter(orb => (now - orb.createdAt) > orb.lifetimeMs);
				if (expiredOrbs.length > 0) {
					for (const expiredOrb of expiredOrbs) {
						OrbPhysics.clearOrbCircular(grid, expiredOrb, vpc.startCellX, vpc.startCellY, vpc.invCellSizeXPx, vpc.invCellSizeYPx);
					}
					orbsRef.current = currentOrbs.filter(orb => (now - orb.createdAt) <= orb.lifetimeMs);
					syncOrbsState(); // Update React state for UI
				}
			}

			// Phase 10: Continuous spawning to maintain target orb count
			// Only spawn if page is visible, burst has happened, and spawning is enabled
			const burstTime = burstTimeRef.current;
			const { targetOrbCountAt4K, referenceScreenArea, delayAfterBurstMs, baseSpawnRateAt4K, maxSpawnsPerFrame } = DEFAULT_CONTINUOUS_SPAWN_CONFIG;
			if (burstTime && (now - burstTime) > delayAfterBurstMs && isPageVisibleRef.current && enableOrbSpawningRef.current) {
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
		} else if (easedProgress >= 1 && pausePhysicsRef.current) {
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
		if (!isDebugModeRef.current) {
			const fadeStart = DEFAULT_ORBFIELD_CONFIG.fadeOutStart;
			if (easedProgress > fadeStart) {
				const fadeFactor = (easedProgress - fadeStart) / (1 - fadeStart);
				finalOpacity *= (1 - fadeFactor);
			}
		} else {
			// In debug mode, always use full opacity
			finalOpacity = 1;
		}
		canvas.style.opacity = finalOpacity.toString();

		// Calculate target parallax offset based on scroll progress
		// Desktop: vertical offset (move up as scroll increases)
		// Mobile: horizontal offset (move left as scroll increases)
		const scrollOffset = -(scrollProgressRef.current - SCROLL_OFFSET_REFERENCE) * SCROLL_OFFSET_PX_PER_UNIT;
		const targetOffsetX = isMobileRef.current ? scrollOffset : 0;
		const targetOffsetY = isMobileRef.current ? 0 : scrollOffset;

		// Smoothly interpolate toward target offset for buttery animation
		const current = currentScrollOffsetRef.current;
		current.x += (targetOffsetX - current.x) * SCROLL_OFFSET_SMOOTHING;
		current.y += (targetOffsetY - current.y) * SCROLL_OFFSET_SMOOTHING;

		// D. Render Debug Frame (grid lines, occupied cells, debug visuals)
		GridRenderer.draw(
			ctx,
			ws,
			vpc,
			easedProgress,
			revealConfigRef.current,
			styleConfigRef.current,
			isDebugModeRef.current && enableSpawnOnClickRef.current ? hoveredCellRef.current : null,
			grid,
			currentLayerRef.current,
			isDebugModeRef.current ? orbsRef.current : [],
			undefined, // use default orbDebugConfig
			current.x,
			current.y,
			showGridRef.current,
			showCollisionAreaRef.current,
			showAvoidanceAreaRef.current,
			showArrowVectorRef.current,
			showTruePositionRef.current
		);

		// E. Render Visual Orbs (maroon orbs with glow and depth blur)
		// Uses separate canvas layer (visualCanvasRef) to appear behind page content
		if (visualCanvas && easedProgress >= 1) {
			const visualCtx = visualCanvas.getContext('2d');
			if (visualCtx) {
				if (showGraphicsRef.current) {
					const now = getEffectiveTime();
					OrbVisualRenderer.draw(
						visualCtx,
						ws,
						orbsRef.current,
						grid.config.layers,
						undefined, // use default config
						now,       // frozen time for spawn/despawn animations when paused
						current.x,
						current.y
					);
				} else {
					// Clear the canvas when graphics are disabled
					visualCtx.clearRect(0, 0, ws.width, ws.height);
				}
			}
		}

		// F. Debug Panel Sync
		if (isDebugModeRef.current && selectedOrbIdRef.current) {
			updateSelectedOrbData();
		}
	}, [orbsRef, selectedOrbIdRef, updateSelectedOrbData, syncOrbsState, spawnRandomOrbs, getEffectiveTime]);

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
		if (!vpc || !gc || rollProgressRef.current < 1 || !isDebugMode) return;

		// Account for scroll offset when calculating cell position
		const currentOffset = currentScrollOffsetRef.current;
		const adjustedX = e.clientX - currentOffset.x;
		const adjustedY = e.clientY - currentOffset.y;

		const cellX = vpc.startCellX + Math.floor(adjustedX / vpc.cellSizeXPx);
		const cellY = vpc.startCellY + Math.floor(adjustedY / vpc.cellSizeYPx);

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
		// Only allow click-to-create if debug mode AND enableSpawnOnClick are both true
		// Use ref instead of context to work when context is not available
		if (!grid || !vpc || !isDebugMode || !enableSpawnOnClickRef.current) return;

		// Account for scroll offset when calculating click position
		const currentOffset = currentScrollOffsetRef.current;
		const adjustedX = e.clientX - currentOffset.x;
		const adjustedY = e.clientY - currentOffset.y;

		createOrb(adjustedX, adjustedY, currentLayerRef.current, orbSize, grid, vpc);
	}, [orbSize, createOrb, isDebugMode]);

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
					pointerEvents: isDebugMode ? 'auto' : 'none',
					opacity,
					zIndex: canvasZIndex,
				}}
			/>

			{/* GlassDebugMenu - on mobile includes all debug info, on desktop just toggles */}
			<GlassDebugMenu
				orbs={orbs}
				targetOrbCount={targetOrbCount}
				selectedOrbId={selectedOrbId}
				selectedOrb={selectedOrbData}
				orbSize={orbSize}
				onSelectOrb={selectOrb}
				onDeleteOrb={handleDeleteOrb}
				onSizeChange={setOrbSize}
				gridConfig={gridConfig}
				viewportCells={viewportCells}
				currentLayer={currentLayer}
				onLayerChange={setCurrentLayer}
				hoveredCell={hoveredCell}
			/>

			{/* Desktop-only: separate debug panels (hidden on mobile) */}
			{isDebugMode && gridConfig && viewportCells && !isMobile && (
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
