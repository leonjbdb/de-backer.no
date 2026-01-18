"use client";

import { useEffect, useState } from "react";
import { STAGE_TIMINGS } from "../constants";
import { introStorage } from "../services";
import type { AnimationStagesState, AnimationStagesOptions } from "../types";

/**
 * Hook to manage the timed animation stage transitions
 * Stage 0: Initial state
 * Stage 1: Hi! emerging (growing from tiny)
 * Stage 2: Hi! popped (burst)
 * Stage 3: Hi! fading out
 * Stage 4: Hi! fully gone, Welcome starts appearing
 * Stage 5: Welcome fully visible
 * Stage 6: Welcome starts fading out
 * Stage 7: Welcome fully gone, about card appears
 * 
 * Refactored to use IntroStorageService abstraction for persistence
 * 
 * @param options.skipAnimation - If true, skip directly to stage 7 (ready state)
 */
export function useAnimationStages(options?: AnimationStagesOptions): AnimationStagesState {
	// Check if we should skip based on explicit option
	// NOTE: We only use the explicit skipAnimation option for initial state to avoid hydration mismatch.
	// Storage-based skip is checked in useEffect after hydration.
	const [shouldSkip, setShouldSkip] = useState(() => {
		// Only use explicit skip option for initial state (SSR-safe)
		return options?.skipAnimation ?? false;
	});

	// Track if skip was triggered by storage (cookie/localStorage)
	const [wasSkippedFromStorage, setWasSkippedFromStorage] = useState(false);

	// Track if we've checked storage yet (to delay animation start)
	const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

	const [stage, setStage] = useState(shouldSkip ? 7 : 0);

	// Re-check storage on client mount (handles SSR mismatch)
	// This must complete before animation timers start
	useEffect(() => {
		// Use queueMicrotask to avoid synchronous setState warning
		queueMicrotask(() => {
			if (options?.skipAnimation) {
				// Already skipping via prop, no need to check storage
				setHasCheckedStorage(true);
				return;
			}

			if (introStorage.hasIntroBeenPlayed()) {
				setShouldSkip(true);
				setWasSkippedFromStorage(true);
				setStage(7);
			}
			setHasCheckedStorage(true);
		});
	}, [options?.skipAnimation]);

	useEffect(() => {
		// Wait for storage check to complete before starting animations
		if (!hasCheckedStorage) {
			return;
		}

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
			introStorage.markIntroAsPlayed();
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
	}, [shouldSkip, hasCheckedStorage]);

	return {
		stage,
		isReady: stage >= 7,
		wasSkippedFromStorage,
		hasCheckedStorage,
	};
}
