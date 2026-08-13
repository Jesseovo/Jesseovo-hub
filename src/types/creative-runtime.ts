import type { CreativeItem } from "@/types/creative";

export type CreativeIntroPhase =
  | "loading"
  | "circle"
  | "spin"
  | "collapse"
  | "explode"
  | "interactive";

export interface CreativeSceneSnapshot {
  hoveredIndex: number | null;
  expandedIndex: number | null;
  overExpandedPlane: boolean;
  openPlaneWidthPx: number | null;
  introPhase: CreativeIntroPhase;
  progress: number;
}

export interface CreativeSpaceCanvasProps {
  items: CreativeItem[];
  overviewOpen: boolean;
  reservedBottomPx: number;
  onSnapshotChange: (snapshot: CreativeSceneSnapshot) => void;
  onNavigateCase: (slug: string) => void;
  onToggleOverview: () => void;
}

export interface CreativeSpaceOverlayProps {
  items: CreativeItem[];
  snapshot: CreativeSceneSnapshot;
  overviewOpen: boolean;
  onNavigateCase: (slug: string) => void;
  onToggleOverview: () => void;
  onReservedBottomChange: (height: number) => void;
}
