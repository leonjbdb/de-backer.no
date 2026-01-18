"use client";

import { ReactNode } from "react";

interface CardTemplateProps {
	title: string;
	children: ReactNode;
	/** Additional gap between title and content. Default: 20px */
	contentGap?: number;
}

/**
 * Shared card template for consistent styling across all cards.
 * Provides standardized title placement and content layout.
 */
export function CardTemplate({ title, children, contentGap = 20 }: CardTemplateProps) {
	return (
		<>
			<style suppressHydrationWarning dangerouslySetInnerHTML={{
				__html: `
                    .card-template-content {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        transform-style: preserve-3d;
                    }
                    .card-template-title {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 600;
                        color: var(--color-white, #ffffff);
                        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
                        text-align: center;
                    }
                `
			}} />

			<div className="card-template-content" style={{ gap: `${contentGap}px` }}>
				<h2 className="card-template-title">
					{title}
				</h2>
				{children}
			</div>
		</>
	);
}
