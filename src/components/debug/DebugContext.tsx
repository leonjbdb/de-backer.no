"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { debugStorage } from "@/lib/storage";

/**
 * Debug state interface for all toggle options.
 */
export interface DebugState {
	/** Whether debug mode is enabled */
	enabled: boolean;
	/** Show red collision area cells */
	showCollisionArea: boolean;
	/** Show yellow avoidance area cells */
	showAvoidanceArea: boolean;
	/** Enable spawn on click (+ show green hover cell) */
	enableSpawnOnClick: boolean;
	/** Show orb graphics (visual orb canvas) */
	showGraphics: boolean;
	/** Show cards (card carousel visibility) */
	showCards: boolean;
	/** Show velocity arrow vectors on orbs */
	showArrowVector: boolean;
	/** Show true position indicator (1px dot) on orbs */
	showTruePosition: boolean;
	/** Show grid lines */
	showGrid: boolean;
	/** Enable continuous orb spawning */
	enableOrbSpawning: boolean;
	/** Enable orb despawning (lifetime expiration) */
	enableOrbDespawning: boolean;
	/** Pause physics simulation */
	pausePhysics: boolean;
	/** Disable orb-orb hard collisions (red zones) */
	disableCollisions: boolean;
	/** Disable orb-orb soft avoidance (yellow zones) */
	disableAvoidance: boolean;
}

/**
 * Debug context value interface.
 */
interface DebugContextValue {
	state: DebugState;
	/** Toggle a specific debug option */
	toggle: (key: keyof Omit<DebugState, "enabled">) => void;
	/** Set debug mode enabled/disabled */
	setEnabled: (enabled: boolean) => void;
	/** Update a specific state value */
	setState: <K extends keyof DebugState>(key: K, value: DebugState[K]) => void;
	/** Current active card (for URL sync) */
	activeCard: string | null;
	/** Set active card (for URL sync) */
	setActiveCard: (card: string | null) => void;
}

const defaultState: DebugState = {
	enabled: false,
	showCollisionArea: true,
	showAvoidanceArea: true,
	enableSpawnOnClick: true,
	showGraphics: true,
	showCards: true,
	showArrowVector: true,
	showTruePosition: true,
	showGrid: true,
	enableOrbSpawning: true,
	enableOrbDespawning: true,
	pausePhysics: false,
	disableCollisions: false,
	disableAvoidance: false,
};

const DebugContext = createContext<DebugContextValue | null>(null);

/**
 * Hook to access the debug context.
 * Must be used within a DebugProvider.
 */
export function useDebug(): DebugContextValue {
	const context = useContext(DebugContext);
	if (!context) {
		throw new Error("useDebug must be used within a DebugProvider");
	}
	return context;
}

/**
 * Hook to safely access debug context (returns null if not within provider).
 * Useful for components that may or may not be in debug mode.
 */
export function useDebugSafe(): DebugContextValue | null {
	return useContext(DebugContext);
}

interface DebugProviderProps {
	children: ReactNode;
	/** Initial enabled state (e.g., from /debug route) */
	initialEnabled?: boolean;
	/** Initial card (e.g., from /debug/[card] route) */
	initialCard?: string | null;
}

/**
 * Provider component for debug state.
 */
export function DebugProvider({
	children,
	initialEnabled = false,
	initialCard = null,
}: DebugProviderProps) {
	const [state, setStateInternal] = useState<DebugState>(() => ({
		...defaultState,
		enabled: initialEnabled,
	}));
	const [activeCard, setActiveCard] = useState<string | null>(initialCard);

	// Sync debug enabled state to storage abstraction
	useEffect(() => {
		debugStorage.setEnabled(state.enabled);
	}, [state.enabled]);

	const toggle = useCallback((key: keyof Omit<DebugState, "enabled">) => {
		setStateInternal((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	}, []);

	const setEnabled = useCallback((enabled: boolean) => {
		setStateInternal((prev) => ({
			...prev,
			enabled,
		}));
	}, []);

	const setState = useCallback(<K extends keyof DebugState>(key: K, value: DebugState[K]) => {
		setStateInternal((prev) => ({
			...prev,
			[key]: value,
		}));
	}, []);

	return (
		<DebugContext.Provider
			value={{
				state,
				toggle,
				setEnabled,
				setState,
				activeCard,
				setActiveCard,
			}}
		>
			{children}
		</DebugContext.Provider>
	);
}
