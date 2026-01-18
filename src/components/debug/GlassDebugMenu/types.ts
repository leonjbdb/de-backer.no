/**
 * Type definitions for GlassDebugMenu
 * Follows Interface Segregation Principle - focused interfaces for specific concerns
 */

import { type Orb } from "@/components/orb-field/orb/types";
import { type GridConfig, type ViewportCells } from "@/components/orb-field/grid/types";
import { type DebugState } from "../DebugContext";

/**
 * Props for orb debugging functionality
 */
export interface OrbDebugProps {
	/** Array of orbs to display in debug UI */
	orbs?: Orb[];
	/** Target orb count for spawn system */
	targetOrbCount?: number;
	/** Currently selected orb ID */
	selectedOrbId?: string | null;
	/** Selected orb data (real-time) */
	selectedOrb?: Orb | null;
	/** Current orb spawn size */
	orbSize?: number;
	/** Callback when orb is selected */
	onSelectOrb?: (id: string | null) => void;
	/** Callback when orb is deleted */
	onDeleteOrb?: (id: string) => void;
	/** Callback when orb size changes */
	onSizeChange?: (size: number) => void;
}

/**
 * Props for grid debugging functionality
 */
export interface GridDebugProps {
	/** Grid configuration */
	gridConfig?: GridConfig | null;
	/** Viewport cells information */
	viewportCells?: ViewportCells | null;
	/** Current z-layer */
	currentLayer?: number;
	/** Callback when layer changes */
	onLayerChange?: (layer: number) => void;
	/** Currently hovered cell */
	hoveredCell?: { x: number; y: number; worldX: number; worldY: number } | null;
}

/**
 * Combined props for GlassDebugMenu
 */
export interface GlassDebugMenuProps extends OrbDebugProps, GridDebugProps { }

/**
 * Toggle item configuration
 */
export interface ToggleItem {
	key: keyof Omit<DebugState, "enabled">;
	label: string;
	description?: string;
}

/**
 * Props for ToggleRow component
 */
export interface ToggleRowProps {
	item: ToggleItem;
	checked: boolean;
	onToggle: () => void;
}

/**
 * Props for ToggleSlider component
 */
export interface ToggleSliderProps {
	checked: boolean;
	onToggle: () => void;
}

/**
 * Props for SectionHeader component
 */
export interface SectionHeaderProps {
	title: string;
	icon?: React.ReactNode;
}

/**
 * Props for internal menu component variants
 */
export interface MenuComponentProps {
	isOpen: boolean;
	setIsOpen: (open: boolean) => void;
	state: DebugState;
	handleToggle: (key: keyof Omit<DebugState, "enabled">) => void;
	toggleItems: ToggleItem[];
	glassStyles: React.CSSProperties;
}
