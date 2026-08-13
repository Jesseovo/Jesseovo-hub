"use client";

import { useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";

export type GridTransitionPhase = "idle" | "cover" | "reveal";

type GridPageTransitionProps = {
  phase: GridTransitionPhase;
  seed: number;
  onCovered: () => void;
  onRevealed: () => void;
};

function shuffledRanks(length: number, seed: number) {
  const values = Array.from({ length }, (_, index) => index);
  let state = (seed + 1) * 2654435761;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  const ranks = new Array(length);
  values.forEach((cellIndex, rank) => { ranks[cellIndex] = rank; });
  return ranks;
}

export default function GridPageTransition({
  phase,
  seed,
  onCovered,
  onRevealed,
}: GridPageTransitionProps) {
  const reducedMotion = useReducedMotion();
  const [grid, setGrid] = useState({ columns: 24, rows: 18 });

  useEffect(() => {
    const measure = () => {
      const columns = window.innerWidth <= 750 ? 10 : 24;
      const size = window.innerWidth / columns;
      setGrid({ columns, rows: Math.ceil(window.innerHeight / size) });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const count = grid.columns * grid.rows;
  const coverRanks = useMemo(() => shuffledRanks(count, seed * 2 + 1), [count, seed]);
  const revealRanks = useMemo(() => shuffledRanks(count, seed * 2 + 2), [count, seed]);
  const delayStep = reducedMotion ? 0 : grid.columns === 24 ? 2.4 : 3.1;
  const phaseDuration = reducedMotion ? 70 : (count - 1) * delayStep + 30;

  useEffect(() => {
    if (phase === "idle") return;
    const timer = window.setTimeout(
      phase === "cover" ? onCovered : onRevealed,
      phaseDuration,
    );
    return () => window.clearTimeout(timer);
  }, [onCovered, onRevealed, phase, phaseDuration]);

  return (
    <div
      aria-hidden="true"
      data-grid-transition={phase}
      className="fixed inset-0 z-[200] grid"
      style={{
        gridTemplateColumns: `repeat(${grid.columns}, 1fr)`,
        gridTemplateRows: `repeat(${grid.rows}, 1fr)`,
        pointerEvents: phase === "idle" ? "none" : "auto",
        visibility: phase === "idle" ? "hidden" : "visible",
      }}
    >
      {Array.from({ length: count }, (_, index) => {
        const rank = phase === "reveal" ? revealRanks[index] : coverRanks[index];
        return (
          <span
            key={index}
            style={{
              background: "var(--bg-elevated)",
              outline: "0.5px solid var(--border)",
              opacity: phase === "cover" ? 1 : 0,
              transitionDelay: `${rank * delayStep}ms`,
              transitionDuration: reducedMotion ? "60ms" : "12ms",
              transitionProperty: "opacity",
              transitionTimingFunction: "linear",
            }}
          />
        );
      })}
    </div>
  );
}
