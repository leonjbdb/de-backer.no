"use client";

import { useMemo } from "react";
import type { OrbFieldProps } from './types';
import { generateAllOrbs } from './utils';
import { useOrbPhysics } from './useOrbPhysics';
import { SingleOrb } from './SingleOrb';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';

export function OrbField({ visible, mouseX, mouseY, scrollDelta = 0 }: OrbFieldProps) {
    const initialConfigs = useMemo(() => generateAllOrbs(), []);
    const { tiltX, tiltY } = useDeviceOrientation();
    
    const mousePosition = { x: mouseX, y: mouseY };
    const tilt = { x: tiltX, y: tiltY };
    
    // Use dynamic configs from physics hook
    const { states, focalZ, configs } = useOrbPhysics({
        orbConfigs: initialConfigs,
        mousePosition,
        tilt,
        enabled: visible,
        scrollDelta,
    });

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                opacity: visible ? 1 : 0,
                transform: visible ? 'scale(1)' : 'scale(0.8)',
                transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
                // Help browser optimize rendering
                contain: 'layout style',
            }}
        >
            {configs.map(orb => {
                const state = states.get(orb.id);
                if (!state || state.lifecycle === 'dead' || state.scale < 0.01) return null;
                return (
                    <SingleOrb
                        key={orb.id}
                        config={orb}
                        state={state}
                        focalZ={focalZ}
                        tiltX={tiltX}
                        tiltY={tiltY}
                    />
                );
            })}
        </div>
    );
}

export default OrbField;


