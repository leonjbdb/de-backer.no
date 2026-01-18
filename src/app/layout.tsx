import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components";

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-mono",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Leon",
	description: "Leon Joachim Buverud De Backer",
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={jetbrainsMono.className}>
				<Providers>{children}</Providers>
				{/* Landscape orientation overlay - shown on mobile when in landscape */}
				<div className="landscape-overlay" aria-hidden="true">
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
						<line x1="12" y1="18" x2="12" y2="18" />
					</svg>
					<p>Please rotate your device to portrait mode</p>
				</div>
			</body>
		</html>
	);
}
