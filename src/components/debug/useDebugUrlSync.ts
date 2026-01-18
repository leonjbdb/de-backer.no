"use client";

import { useEffect, useRef } from "react";
import { useDebugSafe } from "./DebugContext";

// Map section indices to card slugs
const SECTION_TO_CARD = ["about", "links", "contact"] as const;

// Map card slugs to section indices
const CARD_TO_SECTION: Record<string, number> = {
	about: 0,
	links: 1,
	contact: 2,
};

// Debug mode storage key
const DEBUG_MODE_KEY = "debug-mode-enabled";

/**
 * Hook to sync debug mode with URL bidirectionally.
 * 
 * When debug mode is enabled:
 * - URL updates to /debug/[card] when card changes
 * - URL updates to /debug when cards are hidden
 * 
 * When navigating to a /debug URL:
 * - Debug mode is automatically enabled
 * 
 * This hook should be called from a component that has access to:
 * - activeSection (current card index)
 * - hasPassedGreeting (whether greeting animation completed)
 */
export function useDebugUrlSync(
	activeSection: number,
	hasPassedGreeting: boolean
) {
	const debug = useDebugSafe();
	const lastUpdateRef = useRef<string>("");

	// Enable debug mode when navigating to /debug URL
	useEffect(() => {
		if (typeof window === "undefined") return;

		const currentPath = window.location.pathname;
		const isDebugRoute = currentPath.startsWith("/debug");

		if (isDebugRoute && debug && !debug.state.enabled) {
			// User navigated to debug URL - enable debug mode
			debug.setEnabled(true);
			localStorage.setItem(DEBUG_MODE_KEY, "true");

			// Dispatch event to notify other components
			window.dispatchEvent(
				new CustomEvent("debugModeChanged", { detail: { enabled: true } })
			);
		}
	}, [debug]);

	// Sync URL when debug state changes
	useEffect(() => {
		if (typeof window === "undefined") return;

		const currentPath = window.location.pathname;
		const isDebugRoute = currentPath.startsWith("/debug");

		// If not in debug mode or not on debug route, don't manage URLs
		if (!debug?.state.enabled || !isDebugRoute) return;

		// If greeting hasn't passed, don't update URL yet
		if (!hasPassedGreeting) return;

		let targetPath: string;

		// If cards are hidden, just use /debug
		if (!debug.state.showCards) {
			targetPath = "/debug";
		} else {
			// Use /debug/[card] format
			const cardSlug = SECTION_TO_CARD[activeSection];
			targetPath = `/debug/${cardSlug}`;
		}

		// Only update if path actually changed
		if (targetPath !== currentPath && targetPath !== lastUpdateRef.current) {
			lastUpdateRef.current = targetPath;
			window.history.replaceState(null, "", targetPath);
		}

		// Also update the debug context's activeCard
		if (debug.state.showCards) {
			const cardSlug = SECTION_TO_CARD[activeSection];
			if (debug.activeCard !== cardSlug) {
				debug.setActiveCard(cardSlug);
			}
		} else if (debug.activeCard !== null) {
			debug.setActiveCard(null);
		}
	}, [activeSection, hasPassedGreeting, debug]);
}

/**
 * Get the initial section from the current URL if on a debug route.
 * Returns undefined if not on a debug route or no specific card.
 */
export function getInitialSectionFromDebugUrl(): number | undefined {
	if (typeof window === "undefined") return undefined;

	const path = window.location.pathname;
	const match = path.match(/^\/debug\/(\w+)$/);

	if (match) {
		const card = match[1];
		if (card in CARD_TO_SECTION) {
			return CARD_TO_SECTION[card];
		}
	}

	return undefined;
}

/**
 * Check if the current URL is a debug route.
 */
export function isDebugUrl(): boolean {
	if (typeof window === "undefined") return false;
	return window.location.pathname.startsWith("/debug");
}
