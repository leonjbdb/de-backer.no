"use client";

// =============================================================================
// GridView - 3D Spatial Grid Visualization
// =============================================================================

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { 
    SpatialGrid, 
    createGridConfig, 
    type GridConfig,
} from './SpatialGrid';

interface GridViewProps {
    /** Whether the grid view is visible */
    visible?: boolean;
    /** Which depth layer to display (0 = front, layers-1 = back) */
    layer?: number;
    /** Opacity of the grid overlay */
    opacity?: number;
}

/**
 * Grid visualization component
 * Shows grid cells with a roll-down reveal animation
 */
export function GridView({
    visible = true,
    layer: initialLayer = 0,
    opacity = 0.6,
}: GridViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gridConfig, setGridConfig] = useState<GridConfig | null>(null);
    const [grid, setGrid] = useState<SpatialGrid | null>(null);
    const [currentLayer, setCurrentLayer] = useState(initialLayer);
    const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number; worldX: number; worldY: number } | null>(null);
    
    // Animation state for roll-down effect
    const rollProgressRef = useRef(0);
    const animationRef = useRef<number | null>(null);
    const startTimeRef = useRef<number | null>(null);
    const isAnimatingRef = useRef(false);
    
    // Initialize grid on mount (client-side only)
    useEffect(() => {
        if (!visible) {
            // Reset animation when hidden
            rollProgressRef.current = 0;
            startTimeRef.current = null;
            isAnimatingRef.current = false;
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            return;
        }
        
        const config = createGridConfig();
        if (!config) return;
        
        const newGrid = new SpatialGrid(config);
        
        queueMicrotask(() => {
            setGridConfig(config);
            setGrid(newGrid);
        });
    }, [visible]);
    
    // Calculate viewport cell range
    const viewportCells = useMemo(() => {
        if (!gridConfig) return null;
        
        const { cellSizeCm, viewportMinXCm, viewportMaxXCm, viewportMinYCm, viewportMaxYCm, minXCm, minYCm, pixelsPerCm } = gridConfig;
        
        const startCellX = Math.floor((viewportMinXCm - minXCm) / cellSizeCm);
        const endCellX = Math.ceil((viewportMaxXCm - minXCm) / cellSizeCm);
        const startCellY = Math.floor((viewportMinYCm - minYCm) / cellSizeCm);
        const endCellY = Math.ceil((viewportMaxYCm - minYCm) / cellSizeCm);
        
        const cellSizePx = cellSizeCm * pixelsPerCm;
        
        return {
            startCellX,
            endCellX,
            startCellY,
            endCellY,
            cellSizePx,
            cellSizeCm,
            pixelsPerCm,
        };
    }, [gridConfig]);
    
    // Animation and drawing loop
    useEffect(() => {
        if (!visible || !grid || !gridConfig || !viewportCells || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { startCellX, endCellX, startCellY, endCellY, cellSizePx } = viewportCells;
        
        // Set canvas size
        const width = window.innerWidth;
        const height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        
        const cellsInViewX = endCellX - startCellX;
        const cellsInViewY = endCellY - startCellY;
        
        // The base grey color for grid lines
        const baseGreyR = 100;
        const baseGreyG = 100;
        const baseGreyB = 130;
        
        // Distance for white-to-grey gradient (from bottom)
        const whiteToGreyDistance = 200;
        // Distance for fade-in from nothing to white (at the very bottom)
        const fadeInDistance = 150;
        
        // Start animation
        isAnimatingRef.current = true;
        startTimeRef.current = null;
        
        const animate = (timestamp: number) => {
            if (!isAnimatingRef.current) return;
            
            if (startTimeRef.current === null) {
                startTimeRef.current = timestamp;
            }
            
            const elapsed = timestamp - startTimeRef.current;
            const duration = 1500; // 1.5 seconds for the roll
            const progress = Math.min(1, elapsed / duration);
            
            // Ease out cubic for smooth deceleration
            const eased = 1 - Math.pow(1 - progress, 3);
            rollProgressRef.current = eased;
            
            // The Y position where the fade ENDS (fully invisible below this)
            // Starts above the screen (-200) and ends below the screen (height + 500)
            const startY = -200;
            const endY = height + 500;
            const fadeEndY = startY + eased * (endY - startY);
            
            // The Y position where white starts (fade-in zone is between fadeEndY and whiteStartY)
            const whiteStartY = fadeEndY - fadeInDistance;
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            // Draw grid lines
            ctx.lineWidth = 0.5;
            
            for (let cy = 0; cy <= cellsInViewY; cy++) {
                const y = cy * cellSizePx;
                
                // Skip rows completely below the fade end
                if (y > fadeEndY) continue;
                
                // Calculate opacity based on position relative to fade zone
                let opacity = 1;
                if (y > whiteStartY) {
                    // In the fade-in zone: fade from 0 (at fadeEndY) to 1 (at whiteStartY)
                    opacity = (fadeEndY - y) / fadeInDistance;
                    opacity = Math.max(0, Math.min(1, opacity));
                    // Smoothstep for gradual fade
                    opacity = opacity * opacity * (3 - 2 * opacity);
                }
                
                // Skip if invisible
                if (opacity < 0.01) continue;
                
                // Calculate how far above the white zone we are
                const distanceAboveWhite = whiteStartY - y;
                
                // Calculate white-to-grey mix (0 = white, 1 = grey)
                let greyMix = 0;
                if (distanceAboveWhite > 0) {
                    greyMix = distanceAboveWhite / whiteToGreyDistance;
                    greyMix = Math.min(1, greyMix);
                    // Smoothstep for gradual transition
                    greyMix = greyMix * greyMix * (3 - 2 * greyMix);
                }
                
                // Interpolate color: white (255,255,255) -> grey (baseGreyR,G,B)
                const r = Math.round(255 - (255 - baseGreyR) * greyMix);
                const g = Math.round(255 - (255 - baseGreyG) * greyMix);
                const b = Math.round(255 - (255 - baseGreyB) * greyMix);
                
                // Alpha: higher when white, lower when grey, multiplied by fade-in opacity
                const baseAlphaVal = 0.7 - 0.35 * greyMix; // 0.7 when white, 0.35 when grey
                const alpha = baseAlphaVal * opacity;
                
                ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                
                // Draw horizontal line
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
                
                // Draw vertical lines for this row (down to next row or fade boundary)
                for (let cx = 0; cx <= cellsInViewX; cx++) {
                    const x = cx * cellSizePx;
                    const nextY = (cy + 1) * cellSizePx;
                    const lineEndY = Math.min(nextY, fadeEndY);
                    
                    if (lineEndY > y) {
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.lineTo(x, lineEndY);
                        ctx.stroke();
                    }
                }
            }
            
            // Highlight hovered cell (only after animation completes)
            if (progress >= 1 && hoveredCell) {
                const hx = (hoveredCell.x - startCellX) * cellSizePx;
                const hy = (hoveredCell.y - startCellY) * cellSizePx;
                ctx.fillStyle = 'rgba(80, 200, 150, 0.2)';
                ctx.fillRect(hx, hy, cellSizePx, cellSizePx);
                ctx.strokeStyle = 'rgba(80, 200, 150, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(hx, hy, cellSizePx, cellSizePx);
            }
            
            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                isAnimatingRef.current = false;
            }
        };
        
        animationRef.current = requestAnimationFrame(animate);
        
        return () => {
            isAnimatingRef.current = false;
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [visible, grid, gridConfig, viewportCells, hoveredCell]);
    
    // Redraw on hover (only after animation)
    useEffect(() => {
        if (!visible || !canvasRef.current || !viewportCells || rollProgressRef.current < 1) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const { startCellX, endCellX, startCellY, endCellY, cellSizePx } = viewportCells;
        const width = canvas.width;
        const cellsInViewX = endCellX - startCellX;
        const cellsInViewY = endCellY - startCellY;
        
        // Redraw grid
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(100, 100, 130, 0.35)';
        ctx.lineWidth = 0.5;
        
        for (let cy = 0; cy <= cellsInViewY; cy++) {
            const y = cy * cellSizePx;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            for (let cx = 0; cx <= cellsInViewX; cx++) {
                const x = cx * cellSizePx;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, Math.min((cy + 1) * cellSizePx, canvas.height));
                ctx.stroke();
            }
        }
        
        // Draw hovered cell
        if (hoveredCell) {
            const hx = (hoveredCell.x - startCellX) * cellSizePx;
            const hy = (hoveredCell.y - startCellY) * cellSizePx;
            ctx.fillStyle = 'rgba(80, 200, 150, 0.2)';
            ctx.fillRect(hx, hy, cellSizePx, cellSizePx);
            ctx.strokeStyle = 'rgba(80, 200, 150, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(hx, hy, cellSizePx, cellSizePx);
        }
    }, [visible, viewportCells, hoveredCell]);
    
    // Handle mouse move for cell hover
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!viewportCells || !grid || !gridConfig || rollProgressRef.current < 1) return;
        
        const { startCellX, startCellY, cellSizePx, cellSizeCm } = viewportCells;
        
        const cellX = startCellX + Math.floor(e.clientX / cellSizePx);
        const cellY = startCellY + Math.floor(e.clientY / cellSizePx);
        
        const worldX = gridConfig.minXCm + cellX * cellSizeCm;
        const worldY = gridConfig.minYCm + cellY * cellSizeCm;
        
        setHoveredCell({ x: cellX, y: cellY, worldX, worldY });
    }, [viewportCells, grid, gridConfig]);
    
    if (!visible) return null;
    
    return (
        <>
            {/* Canvas overlay */}
            <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredCell(null)}
                style={{
                    position: 'fixed',
                    inset: 0,
                    pointerEvents: 'auto',
                    opacity,
                    zIndex: 1,
                }}
            />
            
            {/* Info panel */}
            {gridConfig && viewportCells && (
                <div style={{
                    position: 'fixed',
                    bottom: 16,
                    left: 16,
                    padding: 12,
                    background: 'rgba(0,0,0,0.7)',
                    border: '1px solid #333',
                    borderRadius: 6,
                    color: 'white',
                    fontFamily: 'monospace',
                    fontSize: 11,
                    zIndex: 2,
                    backdropFilter: 'blur(4px)',
                }}>
                    <div style={{ marginBottom: 4 }}>
                        <strong>Grid:</strong> {gridConfig.cellsX}×{gridConfig.cellsY}×{gridConfig.layers}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                        <strong>Cell:</strong> {gridConfig.cellSizeCm.toFixed(2)}cm
                    </div>
                    <div style={{ marginBottom: 6 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong>Z:</strong>
                            <input
                                type="range"
                                min={0}
                                max={gridConfig.layers - 1}
                                value={currentLayer}
                                onChange={(e) => setCurrentLayer(parseInt(e.target.value))}
                                style={{ width: 60 }}
                            />
                            <span>{currentLayer}</span>
                        </label>
                    </div>
                    {hoveredCell && (
                        <div style={{ color: '#8f8', fontSize: 10 }}>
                            Cell ({hoveredCell.x}, {hoveredCell.y}) • {hoveredCell.worldX.toFixed(1)}cm, {hoveredCell.worldY.toFixed(1)}cm
                        </div>
                    )}
                </div>
            )}
        </>
    );
}

export default GridView;

