"use client";

import { ReactNode } from "react";
import { useInteraction3D } from "./hooks";
import styles from "./GlassButton.module.css";

interface GlassButtonProps {
	icon: ReactNode;
	label: string;
	href: string;
	target?: string;
	rel?: string;
}

/**
 * GlassButton - A glassmorphic button/link component with hover effects
 * 
 * Note: The 'glass-button-link' class is added alongside the module class
 * because it's used by other components for focus management and keyboard navigation.
 */
export function GlassButton({ icon, label, href, target, rel }: GlassButtonProps) {
	const { isActive, interactionProps } = useInteraction3D({
		trigger: 'hover',
		enableFocus: true,
	});

	// Build className - 'glass-button-link' is kept for cross-component compatibility
	const linkClassName = [
		styles.link,
		'glass-button-link',
		isActive ? styles.isHovered : '',
	].filter(Boolean).join(' ');

	return (
		<a
			href={href}
			target={target}
			rel={rel}
			className={linkClassName}
			{...interactionProps}
		>
			<div className={styles.content}>
				<span className={styles.icon}>
					{icon}
				</span>
				<span className={styles.label}>
					{label}
				</span>
				<span className={styles.arrow} aria-hidden="true">
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M5 12h14M12 5l7 7-7 7" />
					</svg>
				</span>
			</div>
		</a>
	);
}
