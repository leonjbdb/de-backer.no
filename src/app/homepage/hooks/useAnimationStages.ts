"use client";

import { useEffect, useState } from "react";
import { STAGE_TIMINGS } from "../constants";
import type { AnimationStagesState } from "../types";

/**
 * Hook to manage the timed animation stage transitions
 * Stage 0: Initial state
 * Stage 1: Greeting emerging (after 1.5s)
 * Stage 2: Greeting popped, orbs visible (after 6s)
 * Stage 3: Ready for interaction (after 7.5s)
 */
export function useAnimationStages(): AnimationStagesState {
    const [stage, setStage] = useState(0);

    useEffect(() => {
        const timer1 = setTimeout(() => setStage(1), STAGE_TIMINGS.stage1);
        const timer2 = setTimeout(() => setStage(2), STAGE_TIMINGS.stage2);
        const timer3 = setTimeout(() => setStage(3), STAGE_TIMINGS.stage3);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
        };
    }, []);

    return {
        stage,
        isReady: stage >= 3,
    };
}

