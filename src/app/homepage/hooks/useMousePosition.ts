"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import type { MousePosition } from "../types";

/**
 * Hook to track mouse position with requestAnimationFrame throttling
 * Returns normalized coordinates (0-1) for x and y
 */
export function useMousePosition(): MousePosition {
    const [mousePos, setMousePos] = useState<MousePosition>({ x: 0.5, y: 0.5 });
    const rafRef = useRef<number | undefined>(undefined);

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (rafRef.current) return;

        rafRef.current = requestAnimationFrame(() => {
            setMousePos({
                x: e.clientX / window.innerWidth,
                y: e.clientY / window.innerHeight,
            });
            rafRef.current = undefined;
        });
    }, []);

    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [handleMouseMove]);

    return mousePos;
}

