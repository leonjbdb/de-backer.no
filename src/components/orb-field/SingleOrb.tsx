import type { OrbConfig, OrbState } from './types';
import { calculateDepthEffects } from './utils';

interface SingleOrbProps {
    config: OrbConfig;
    state: OrbState;
    focalZ: number;
    tiltX: number;
    tiltY: number;
    currentTime: number;
}

export function SingleOrb({ config, state, focalZ, tiltX, tiltY }: SingleOrbProps) {
    const color = `hsl(${config.hue}, ${config.saturation}%, ${config.lightness}%)`;
    
    // Use lifecycle-based scale for smooth spawn/despawn
    const scale = state.scale;
    
    // Calculate depth effects with dynamic focal plane
    const { size, opacity, blur, glowIntensity } = calculateDepthEffects(
        state.z,
        config.baseSize,
        config.baseOpacity,
        config.baseBlur,
        focalZ
    );
    
    // Apply scale to size and opacity for fluid spawn/despawn
    const scaledSize = size * scale;
    const finalOpacity = opacity * scale;
    
    // Parallax effect based on tilt and depth
    const parallaxStrength = (state.z / 100) * 12;
    const displayX = state.x + (tiltX - 0.5) * parallaxStrength;
    const displayY = state.y + (tiltY - 0.5) * parallaxStrength;
    
    // Glow effect for foreground orbs
    const scaledGlow = glowIntensity * scale;
    const glowColor = `hsla(${config.hue}, ${config.saturation}%, ${config.lightness + 20}%, ${scaledGlow})`;
    
    return (
        <div
            style={{
                position: 'absolute',
                width: `${scaledSize}vmin`,
                height: `${scaledSize}vmin`,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                filter: `blur(${blur * scale}px)`,
                opacity: finalOpacity,
                left: `${displayX}%`,
                top: `${displayY}%`,
                transform: 'translate(-50%, -50%)',
                boxShadow: scaledGlow > 0 ? `0 0 ${scaledSize * 2}px ${glowColor}` : 'none',
                // Use CSS transition for extra smoothness
                transition: 'width 0.1s ease-out, height 0.1s ease-out, opacity 0.1s ease-out',
                willChange: 'left, top, width, height, opacity, filter',
                pointerEvents: 'none',
            }}
        />
    );
}


