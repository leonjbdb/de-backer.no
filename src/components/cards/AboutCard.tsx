"use client";

import { siteConfig } from "@/config/site.config";
import { HoverablePhoto } from "@/components/glass";
import { CardTemplate } from "./CardTemplate";
import styles from "./AboutCard.module.css";

/**
 * AboutCard - Pure content component
 * Only handles the card's content, no animation/transition logic
 */
export function AboutCard() {
	return (
		<CardTemplate title="About">
			<HoverablePhoto
				src="/leon.webp"
				alt={siteConfig.identity.name}
				priority
			/>

			<h2 className={styles.name}>
				Leon Joachim Buverud <span className={styles.noBreak}>De Backer</span>
			</h2>

			<div className={styles.info}>
				<p className={styles.role}>
					{siteConfig.identity.role} — {siteConfig.identity.division}
				</p>
				<p className={styles.org}>
					{siteConfig.identity.organization}
				</p>
			</div>
		</CardTemplate>
	);
}
