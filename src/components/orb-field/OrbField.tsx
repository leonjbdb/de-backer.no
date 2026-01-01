"use client";

import { useMemo, useState, useEffect } from "react";
import type { OrbFieldProps } from './types';
import { generateAllOrbs } from './utils';
import { useOrbPhysics } from './useOrbPhysics';
import { SingleOrb } from './SingleOrb';
import { useDeviceOrientation } from '@/hooks/useDeviceOrientation';

export function OrbField({ visible, mouseX, mouseY }: OrbFieldProps) {
    const initialConfigs = useMemo(() => generateAllOrbs(), []);
    const { tiltX, tiltY } = useDeviceOrientation();
    const [currentTime, setCurrentTime] = useState(0);
    
    const mousePosition = { x: mouseX, y: mouseY };
    const tilt = { x: tiltX, y: tiltY };
    
    // Use dynamic configs from physics hook
    const { states, focalZ, configs } = useOrbPhysics({
        orbConfigs: initialConfigs,
        mousePosition,
        tilt,
        enabled: visible,
    });
    
    // Update current time for animations
    useEffect(() => {
        if (!visible) return;
        
        const interval = setInterval(() => {
            setCurrentTime(performance.now());
        }, 16);
        
        return () => clearInterval(interval);
    }, [visible]);

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 1,
                opacity: visible ? 1 : 0,
                transform: visible ? 'scale(1)' : 'scale(0.8)',
                transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
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
                        currentTime={currentTime}
                    />
                );
            })}
        </div>
    );
}

export default OrbField;


