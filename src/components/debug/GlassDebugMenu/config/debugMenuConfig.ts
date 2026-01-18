/**
 * Configuration for GlassDebugMenu component
 * Follows Open/Closed Principle - extend by adding new config sections
 */

export const debugMenuConfig = {
	dimensions: {
		buttonSize: 44,
		buttonSizeMobile: 44,
		dropdownWidth: 280,
		panelWidth: 320,
		panelWidthMobile: 320,
		handleWidth: 20,
		trackWidth: 56,
		trackHeight: 28,
		handleHeight: 22,
		handleBorderRadius: 11,
		trackBorderRadius: 14,
		iconSize: 20,
		iconSizeMobile: 22,
		borderRadiusSm: 6,
		borderRadiusMd: 11,
		borderRadiusLg: 12,
		borderRadiusFull: "50%",
		sectionIconSize: 14,
		selectMaxWidth: 120,
		layerInputMinWidth: 16,
	},
	zIndex: {
		backdrop: 9999,
		panel: 10000,
		button: 10001,
	},
	breakpoint: 768, // Mobile breakpoint in pixels
	spacing: {
		padding: 16,
		paddingMobile: 16,
		buttonTop: 16,
		buttonLeft: 16,
		buttonRight: 16,
		dropdownTop: 48,
		panelTopMobile: 72, // Space for button
		gapXs: 2,
		gapSm: 4,
		gapMd: 6,
		gapLg: 8,
		gapXl: 12,
		marginSection: 16,
		sliderPadding: 3,
		viewportOffset: 80, // for max-height calc
	},
	typography: {
		fontSizeXs: 9,      // Hint text
		fontSizeSm: 10,     // Small labels
		fontSizeMd: 11,     // Medium labels
		fontSizeLg: 12,     // Section headers, labels
		fontWeightNormal: 500,
		fontWeightBold: 600,
	},
	transitions: {
		transform: "transform 0.3s ease",
		scale: "transform 0.2s",
		background: "background 0.3s ease",
		slider: "left 0.3s ease, background 0.3s ease",
	},
	colors: {
		maroon: "rgba(78, 5, 6, 0.4)", // Active state
		maroonAccent: "rgba(78, 5, 6, 0.8)", // Slider accent
		maroonButton: "rgba(170, 17, 17, 0.6)", // Delete button
		textPrimary: "rgba(255, 255, 255, 0.9)",
		textSecondary: "rgba(255, 255, 255, 0.7)",
		textMuted: "rgba(255, 255, 255, 0.5)",
		textDisabled: "rgba(255, 255, 255, 0.4)",
		textSuccess: "rgba(136, 255, 136, 0.9)",
		iconDefault: "rgba(255, 255, 255, 0.8)",
		iconMuted: "rgba(255, 255, 255, 0.7)",
		handleActive: "rgba(255, 255, 255, 0.9)",
		handleInactive: "rgba(255, 255, 255, 0.6)",
		inputBg: "rgba(255, 255, 255, 0.1)",
		inputBorder: "rgba(255, 255, 255, 0.15)",
		backdropBg: "rgba(0, 0, 0, 0.5)",
		borderLight: "rgba(255, 255, 255, 0.1)",
	},
	shadows: {
		handle: "0 2px 8px rgba(0, 0, 0, 0.3)",
	},
} as const;
