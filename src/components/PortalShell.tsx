"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AboutExperience from "@/components/AboutExperience";
import CatMascot from "@/components/CatMascot";
import CreativeSpace from "@/components/CreativeSpace";
import GridPageTransition, {
  type GridTransitionPhase,
} from "@/components/GridPageTransition";
import LandingView from "@/components/LandingView";
import PortalNavigation from "@/components/PortalNavigation";
import SoundToggle from "@/components/SoundToggle";
import WorkArchiveView from "@/components/WorkArchiveView";
import type { PortalView } from "@/types/portal";

type PortalStage = "intro" | "creative" | "archive" | "about";

const stageHash: Record<PortalStage, string> = {
  intro: "",
  creative: "moment",
  archive: "project",
  about: "OvO",
};

function stageFromHash(): PortalStage {
  if (typeof window === "undefined") return "intro";
  let hash = window.location.hash.slice(1);
  try {
    hash = decodeURIComponent(hash);
  } catch {
    // Keep the raw hash when it contains malformed escape sequences.
  }
  if (hash === stageHash.about || hash === "about") return "about";
  if (hash === stageHash.archive || hash === "archive" || hash === "( ⁰▿⁰)") {
    return "archive";
  }
  if (hash === stageHash.creative || hash === "creative" || hash === "₍^. .^₎") {
    return "creative";
  }
  return "intro";
}

export default function PortalShell() {
  const [stage, setStage] = useState<PortalStage>("intro");
  const [transitionPhase, setTransitionPhase] =
    useState<GridTransitionPhase>("idle");
  const [transitionSeed, setTransitionSeed] = useState(0);
  const stageRef = useRef<PortalStage>("intro");
  const pendingStageRef = useRef<PortalStage | null>(null);
  const transitioningRef = useRef(false);
  const stageEnteredAtRef = useRef(0);
  const wheelRef = useRef({ total: 0, lastAt: 0 });

  const transitionTo = useCallback(
    (nextStage: PortalStage, updateHistory = true) => {
      if (nextStage === stageRef.current || transitioningRef.current) return;

      transitioningRef.current = true;
      pendingStageRef.current = nextStage;
      wheelRef.current = { total: 0, lastAt: 0 };

      if (updateHistory) {
        const hash = stageHash[nextStage];
        const url = hash
          ? `${window.location.pathname}#${hash}`
          : window.location.pathname;
        window.history.pushState({ portalStage: nextStage }, "", url);
      }

      setTransitionSeed((value) => value + 1);
      setTransitionPhase("cover");
    },
    [],
  );

  useEffect(() => {
    const initialStage = stageFromHash();
    stageRef.current = initialStage;
    setStage(initialStage);
    stageEnteredAtRef.current = performance.now();

    const onHistoryChange = () => transitionTo(stageFromHash(), false);
    window.addEventListener("popstate", onHistoryChange);
    window.addEventListener("hashchange", onHistoryChange);
    return () => {
      window.removeEventListener("popstate", onHistoryChange);
      window.removeEventListener("hashchange", onHistoryChange);
    };
  }, [transitionTo]);

  useEffect(() => {
    stageRef.current = stage;
    stageEnteredAtRef.current = performance.now();

    window.dispatchEvent(
      new CustomEvent("portal-stage-change", { detail: { stage } }),
    );
  }, [stage]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (transitioningRef.current || event.ctrlKey || stageRef.current === "about") {
        return;
      }

      const now = performance.now();
      if (now - wheelRef.current.lastAt > 900) wheelRef.current.total = 0;
      wheelRef.current.lastAt = now;
      wheelRef.current.total += event.deltaY;

      if (stageRef.current === "intro" && wheelRef.current.total > 70) {
        transitionTo("creative");
      } else if (
        stageRef.current === "creative" &&
        now - stageEnteredAtRef.current > 1800 &&
        wheelRef.current.total > 240
      ) {
        transitionTo("about");
      } else if (
        stageRef.current === "creative" &&
        wheelRef.current.total < -180
      ) {
        transitionTo("intro");
      }
    };

    let touchStartY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      if (stageRef.current === "intro" && event.touches.length === 1) {
        touchStartY = event.touches[0].clientY;
      }
    };
    const onTouchEnd = (event: TouchEvent) => {
      if (touchStartY === null || stageRef.current !== "intro") return;
      const endY = event.changedTouches[0]?.clientY ?? touchStartY;
      if (touchStartY - endY > 56) transitionTo("creative");
      touchStartY = null;
    };

    window.addEventListener("wheel", onWheel, { capture: true, passive: true });
    window.addEventListener("touchstart", onTouchStart, {
      capture: true,
      passive: true,
    });
    window.addEventListener("touchend", onTouchEnd, {
      capture: true,
      passive: true,
    });
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchend", onTouchEnd, { capture: true });
    };
  }, [transitionTo]);

  const onCovered = useCallback(() => {
    const nextStage = pendingStageRef.current;
    if (!nextStage) return;
    stageRef.current = nextStage;
    setStage(nextStage);
    setTransitionPhase("reveal");
  }, []);

  const onRevealed = useCallback(() => {
    pendingStageRef.current = null;
    transitioningRef.current = false;
    setTransitionPhase("idle");
  }, []);

  const navigateFromGlobalNav = (view: PortalView) => {
    if (view === "home") transitionTo("intro");
    else transitionTo(view);
  };

  const activeView: PortalView = stage === "intro" ? "home" : stage;

  const stageContent = (() => {
    if (stage === "intro") {
      return (
        <>
          <main data-page-root>
            <LandingView onExplore={() => transitionTo("creative")} />
          </main>
          <CatMascot />
        </>
      );
    }

    if (stage === "creative") {
      return (
        <>
          <SoundToggle />
          <main data-page-root>
            <CreativeSpace />
          </main>
          <button
            type="button"
            className="portal-next-stage"
            onClick={() => transitionTo("about")}
            aria-label="Continue to About"
          >
            <i aria-hidden="true" />
          </button>
        </>
      );
    }

    if (stage === "archive") {
      return (
        <main data-page-root>
          <WorkArchiveView />
        </main>
      );
    }

    return (
      <>
        <SoundToggle />
        <main data-page-root>
          <AboutExperience />
        </main>
      </>
    );
  })();

  return (
    <div className="portal-shell" data-portal-stage={stage}>
      <PortalNavigation
        activeView={activeView}
        onNavigate={navigateFromGlobalNav}
      />
      {stageContent}

      <GridPageTransition
        phase={transitionPhase}
        seed={transitionSeed}
        onCovered={onCovered}
        onRevealed={onRevealed}
      />
    </div>
  );
}
