/**
 * Orientation tilt calculation utility
 * Follows Single Responsibility Principle - only calculates tilt transform
 */

/**
 * Calculate tilt transform for device orientation (mobile)
 * 
 * @param tiltX - Horizontal tilt (0-1, 0.5 = neutral)
 * @param tiltY - Vertical tilt (0-1, 0.5 = neutral)
 * @param maxTilt - Maximum tilt angle in degrees (default: 18)
 * @returns CSS transform string
 */
export function calculateOrientationTilt(
	tiltX: number,
	tiltY: number,
	maxTilt: number = 18
): string {
	// Center the values: 0.5 becomes 0, range becomes -0.5 to 0.5
	// Then scale to max rotation
	const rotateY = -(tiltX - 0.5) * 2 * maxTilt;  // left-right (inverted so card faces user)
	const rotateX = (tiltY - 0.5) * 2 * maxTilt;   // front-back (positive so card faces user)

	return `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1, 1, 1)`;
}
