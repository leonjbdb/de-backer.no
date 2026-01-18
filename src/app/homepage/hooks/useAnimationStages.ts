"use client";

import { useEffect, useState } from "react";
import { STAGE_TIMINGS } from "../constants";
import type { AnimationStagesState, AnimationStagesOptions } from "../types";

// Cookie/localStorage key for tracking intro played state
const INTRO_PLAYED_KEY = "intro-played";

// Cookie expiry in days (1 year)
const COOKIE_EXPIRY_DAYS = 365;

/**
 * Check if intro has been played before (from cookie or localStorage)
 */
function hasIntroBeenPlayed(): boolean {
	if (typeof window === "undefined") return false;

	// Check localStorage first (more reliable)
	const stored = localStorage.getItem(INTRO_PLAYED_KEY);
	if (stored === "true") return true;

	// Fallback to cookie check
	const cookies = document.cookie.split(";");
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split("=");
		if (name === INTRO_PLAYED_KEY && value === "true") {
			return true;
		}
	}

	return false;
}

/**
 * Mark intro as played (set both cookie and localStorage for redundancy)
 */
function markIntroAsPlayed(): void {
	if (typeof window === "undefined") return;

	// Set localStorage
	localStorage.setItem(INTRO_PLAYED_KEY, "true");

	// Set cookie with 1-year expiry
	const expiryDate = new Date();
	expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS);
	document.cookie = `${INTRO_PLAYED_KEY}=true; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Hook to manage the timed animation stage transitions
 * Stage 0: Initial state
 * Stage 1: Hi! emerging (growing from tiny)
 * Stage 2: Hi! popped (burst)
 * Stage 3: Hi! fading out
 * Stage 4: Hi! fully gone, Welcome starts appearing
 * Stage 5: Welcome fully visible
 * Stage 6: Welcome starts fading out
 * Stage 7: Welcome fully gone, profile card appears
 * 
 * @param options.skipAnimation - If true, skip directly to stage 7 (ready state)
 */
export function useAnimationStages(options?: AnimationStagesOptions): AnimationStagesState {
	// Check if we should skip based on explicit option OR cookie/localStorage
	const [shouldSkip, setShouldSkip] = useState(() => {
		// Start with explicit skip option if provided
		if (options?.skipAnimation) return true;
		// Check cookie/localStorage on mount (SSR-safe with initial false)
		if (typeof window !== "undefined") {
			return hasIntroBeenPlayed();
		}
		return false;
	});

	const [stage, setStage] = useState(shouldSkip ? 7 : 0);

	// Re-check cookie on client mount (handles SSR mismatch)
	useEffect(() => {
		if (!options?.skipAnimation && hasIntroBeenPlayed()) {
			// Use microtask to avoid synchronous setState warning
			queueMicrotask(() => {
				setShouldSkip(true);
				setStage(7);
			});
		}
	}, [options?.skipAnimation]);

	useEffect(() => {
		// Skip all animations if requested
		if (shouldSkip) {
			return;
		}

		const timer1 = setTimeout(() => setStage(1), STAGE_TIMINGS.stage1);
		const timer2 = setTimeout(() => setStage(2), STAGE_TIMINGS.stage2);
		const timer3 = setTimeout(() => setStage(3), STAGE_TIMINGS.stage3);
		const timer4 = setTimeout(() => setStage(4), STAGE_TIMINGS.stage4);
		const timer5 = setTimeout(() => setStage(5), STAGE_TIMINGS.stage5);
		const timer6 = setTimeout(() => setStage(6), STAGE_TIMINGS.stage6);
		const timer7 = setTimeout(() => {
			setStage(7);
			// Mark intro as played when animation completes
			markIntroAsPlayed();
		}, STAGE_TIMINGS.stage7);

		return () => {
			clearTimeout(timer1);
			clearTimeout(timer2);
			clearTimeout(timer3);
			clearTimeout(timer4);
			clearTimeout(timer5);
			clearTimeout(timer6);
			clearTimeout(timer7);
		};
	}, [shouldSkip]);

	return {
		stage,
		isReady: stage >= 7,
	};
}
