"use client";

import Image from "next/image";
import { useInteraction3D } from "./hooks";
import styles from "./HoverablePhoto.module.css";

interface HoverablePhotoProps {
	src: string;
	alt: string;
	size?: number;
	priority?: boolean;
}

/**
 * HoverablePhoto - A photo component with 3D hover effect
 * Uses the same interaction pattern as GlassButton for consistency
 */
export function HoverablePhoto({ src, alt, size = 140, priority }: HoverablePhotoProps) {
	const { isActive, interactionProps } = useInteraction3D({ trigger: 'hover' });

	return (
		<div className={styles.wrapper} {...interactionProps}>
			<div className={`${styles.photo} ${isActive ? styles.active : ''}`}>
				<div className={styles.clipper}>
					<Image
						src={src}
						alt={alt}
						width={size}
						height={size}
						className={styles.image}
						priority={priority}
						unoptimized
					/>
				</div>
			</div>
		</div>
	);
}
