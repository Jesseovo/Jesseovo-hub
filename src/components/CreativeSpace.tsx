"use client";

import { useCallback, useState } from "react";

import CreativeSpaceCanvas from "@/components/CreativeSpaceCanvas";
import CreativeSpaceOverlay from "@/components/CreativeSpaceOverlay";
import { creativeItems } from "@/data/creative-items";
import type { CreativeSceneSnapshot } from "@/types/creative-runtime";

const INITIAL_SNAPSHOT: CreativeSceneSnapshot = {
  hoveredIndex: null,
  expandedIndex: null,
  overExpandedPlane: false,
  openPlaneWidthPx: null,
  introPhase: "loading",
  progress: 1,
};

export default function CreativeSpace() {
  const [snapshot, setSnapshot] = useState<CreativeSceneSnapshot>(INITIAL_SNAPSHOT);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [reservedBottomPx, setReservedBottomPx] = useState(0);

  const updateSnapshot = useCallback((next: CreativeSceneSnapshot) => {
    setSnapshot(next);
    if (next.expandedIndex === null) {
      setOverviewOpen(false);
      setReservedBottomPx(0);
    }
  }, []);

  const navigateCase = useCallback((slug: string) => {
    const href = `/projects/${slug}`;
    window.__playSfx?.("softClick");
    window.dispatchEvent(new CustomEvent("site:navigate", { detail: { href } }));
  }, []);

  const toggleOverview = useCallback(() => {
    setOverviewOpen((open) => !open);
  }, []);

  return (
    <section className="creative-space" aria-label="Creative space">
      <h1 className="sr-only">Selected work</h1>

      <CreativeSpaceCanvas
        items={creativeItems}
        overviewOpen={overviewOpen}
        reservedBottomPx={reservedBottomPx}
        onSnapshotChange={updateSnapshot}
        onNavigateCase={navigateCase}
        onToggleOverview={toggleOverview}
      />
      <CreativeSpaceOverlay
        items={creativeItems}
        snapshot={snapshot}
        overviewOpen={overviewOpen}
        onNavigateCase={navigateCase}
        onToggleOverview={toggleOverview}
        onReservedBottomChange={setReservedBottomPx}
      />

      <style>{`
        .creative-space {
          position: relative;
          width: 100%;
          height: 100dvh;
          overflow: hidden;
          background: var(--creative-bg);
          color: var(--creative-ink);
          transition: background-color 420ms ease, color 420ms ease;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>
    </section>
  );
}
