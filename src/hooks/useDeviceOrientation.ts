import { useEffect, useState } from "react";
import { clamp } from "@/components/orb-field/utils";

interface DeviceOrientation {
    tiltX: number;
    tiltY: number;
    hasPermission: boolean;
}

export function useDeviceOrientation(): DeviceOrientation {
    const [orientation, setOrientation] = useState({ beta: 0, gamma: 0 });
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        const handleOrientation = (e: DeviceOrientationEvent) => {
            if (e.beta !== null && e.gamma !== null) {
                setOrientation({
                    beta: clamp(e.beta, -45, 45),
                    gamma: clamp(e.gamma, -45, 45),
                });
            }
        };
        
        const requestPermission = async () => {
            // iOS 13+ requires permission for DeviceOrientationEvent
            const DOE = DeviceOrientationEvent as unknown as {
                new(): DeviceOrientationEvent;
                requestPermission?: () => Promise<'granted' | 'denied'>;
            };
            
            if (typeof DeviceOrientationEvent !== 'undefined' && DOE.requestPermission) {
                try {
                    const permission = await DOE.requestPermission();
                    if (permission === 'granted') {
                        setHasPermission(true);
                        window.addEventListener('deviceorientation', handleOrientation);
                    }
                } catch { }
            } else if (typeof DeviceOrientationEvent !== 'undefined') {
                setHasPermission(true);
                window.addEventListener('deviceorientation', handleOrientation);
            }
        };
        
        const handleFirstTouch = () => {
            requestPermission();
            window.removeEventListener('touchstart', handleFirstTouch);
        };
        
        window.addEventListener('touchstart', handleFirstTouch);
        requestPermission();
        
        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
            window.removeEventListener('touchstart', handleFirstTouch);
        };
    }, []);
    
    const tiltX = (orientation.gamma + 45) / 90;
    const tiltY = (orientation.beta + 45) / 90;
    
    return { tiltX, tiltY, hasPermission };
}


