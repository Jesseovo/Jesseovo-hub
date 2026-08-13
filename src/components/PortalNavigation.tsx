"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Home, Moon, Sun } from "lucide-react";
import type { PortalView } from "@/types/portal";

type PortalNavigationProps = {
  activeView: PortalView;
  onNavigate: (view: PortalView) => void;
};

const navItems: Array<{
  view: PortalView;
  label: string;
  title: string;
}> = [
  { view: "home", label: "home", title: "home" },
  { view: "creative", label: "一", title: "moment" },
  { view: "archive", label: "二", title: "project" },
  { view: "about", label: "三", title: "me" },
];

const pixelGlyphs: Record<string, string[]> = {
  J: ["111", "001", "001", "101", "111"],
  e: ["111", "100", "110", "100", "111"],
  s: ["111", "100", "111", "001", "111"],
  "-": ["000", "000", "111", "000", "000"],
  h: ["100", "100", "111", "101", "101"],
  u: ["101", "101", "101", "101", "111"],
  b: ["100", "100", "110", "101", "110"],
};

function PixelMascotMark() {
  return (
    <svg
      className="portal-brand-mascot"
      viewBox="0 0 30 30"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path fill="#3e3932" d="M3 10V6h2V3h2V1h3v3h2v4h6V4h2V1h3v2h2v3h2v4z" />
      <path fill="#c4ad70" d="M5 9V6h2V3h2v3h2v3zm14 0V6h2V3h2v3h2v3z" />
      <path fill="#8f7447" d="M3 8h24v3h2v7H1v-7h2z" />
      <path fill="#b99a58" d="M5 7h20v3h2v5H3v-5h2z" />
      <rect x="2" y="10" width="5" height="2" fill="#2e6962" />
      <rect x="2" y="12" width="5" height="2" fill="#b64e43" />
      <rect x="23" y="10" width="5" height="2" fill="#2e6962" />
      <rect x="23" y="12" width="5" height="2" fill="#b64e43" />
      <rect x="5" y="9" width="8" height="7" fill="#393d3d" />
      <rect x="17" y="9" width="8" height="7" fill="#393d3d" />
      <rect x="7" y="11" width="4" height="3" fill="#d9d2b6" />
      <rect x="19" y="11" width="4" height="3" fill="#d9d2b6" />
      <rect x="13" y="11" width="4" height="2" fill="#393d3d" />
      <path fill="#403931" d="M2 15h26v9h-2v3h-4v2H8v-1H4v-3H2z" />
      <path fill="#f1ead9" d="M4 16h22v8h-2v2h-4v2H9v-1H6v-3H4z" />
      <rect x="6" y="16" width="3" height="3" fill="#10110f" />
      <rect x="21" y="16" width="3" height="3" fill="#10110f" />
      <rect x="5" y="21" width="4" height="2" fill="#d98f91" />
      <rect x="21" y="21" width="4" height="2" fill="#d98f91" />
      <rect x="14" y="21" width="2" height="2" fill="#3d3730" />
      <rect x="12" y="23" width="2" height="1" fill="#3d3730" />
      <rect x="16" y="23" width="2" height="1" fill="#3d3730" />
      <rect x="3" y="16" width="2" height="8" fill="#9d8352" />
      <rect x="25" y="16" width="2" height="8" fill="#9d8352" />
    </svg>
  );
}

function PixelWordmark() {
  const text = "Jesse-hub";

  return (
    <svg
      className="portal-brand-wordmark"
      viewBox="0 0 35 5"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {Array.from(text).map((character, characterIndex) => (
        <g key={`${character}-${characterIndex}`} transform={`translate(${characterIndex * 4} 0)`}>
          {pixelGlyphs[character].map((row, rowIndex) =>
            Array.from(row).map((pixel, columnIndex) =>
              pixel === "1" ? (
                <rect
                  key={`${rowIndex}-${columnIndex}`}
                  x={columnIndex}
                  y={rowIndex}
                  width="1"
                  height="1"
                  fill="currentColor"
                />
              ) : null,
            ),
          )}
        </g>
      ))}
    </svg>
  );
}

export default function PortalNavigation({
  activeView,
  onNavigate,
}: PortalNavigationProps) {
  const [dark, setDark] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const root = document.documentElement;
    const saved = localStorage.getItem("theme");
    const isDark =
      saved === "dark" ||
      (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);

    root.setAttribute("data-theme", isDark ? "dark" : "light");
    setDark(isDark);

    const syncTheme = () => {
      setDark(root.getAttribute("data-theme") === "dark");
    };
    window.addEventListener("portal-stage-change", syncTheme);
    return () => window.removeEventListener("portal-stage-change", syncTheme);
  }, []);

  const toggleTheme = () => {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.setAttribute(
      "data-theme",
      nextDark ? "dark" : "light",
    );
    localStorage.setItem("theme", nextDark ? "dark" : "light");
  };

  return (
    <>
      <motion.button
        type="button"
        onClick={() => onNavigate("home")}
        className="portal-brand fixed left-5 top-5 z-[70] flex items-center gap-2 md:left-7 md:top-6"
        style={{ color: "var(--fg)" }}
        initial={reduceMotion ? false : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.5 }}
        whileHover={reduceMotion ? undefined : { y: -2, color: "var(--accent)" }}
        aria-label="返回首页"
        title="首页"
      >
        <PixelMascotMark />
        <PixelWordmark />
      </motion.button>

      <nav
        className="fixed right-5 top-5 z-[70] flex md:left-7 md:right-auto md:top-1/2 md:-translate-y-1/2 md:flex-col"
        aria-label="全局门户导航"
      >
        {navItems.map((item, index) => {
          const active = activeView === item.view;
          return (
            <button
              key={item.view}
              type="button"
              onClick={() => onNavigate(item.view)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center text-sm transition-colors duration-200 md:h-14 md:w-14 md:text-base ${
                index === 0 ? "" : "-ml-px md:ml-0 md:-mt-px"
              }`}
              style={{
                color: active ? "var(--nav-active-ink)" : "var(--nav-ink)",
                background: active
                  ? "var(--nav-active-bg)"
                  : "var(--nav-surface)",
                border: "1px solid var(--nav-border)",
              }}
              aria-label={item.title}
              aria-current={active ? "page" : undefined}
              title={item.title}
            >
              {item.view === "home" ? (
                <Home size={16} strokeWidth={1.5} aria-hidden="true" />
              ) : (
                item.label
              )}
            </button>
          );
        })}
      </nav>

      <motion.button
        type="button"
        onClick={toggleTheme}
        className="fixed bottom-5 right-5 z-[70] flex h-11 w-11 items-center justify-center border md:bottom-auto md:right-7 md:top-6 md:h-10 md:w-10"
        style={{
          color: "var(--nav-ink)",
          background: "var(--nav-surface)",
          borderColor: "var(--nav-border)",
        }}
        whileHover={reduceMotion ? undefined : { rotate: 12 }}
        whileTap={reduceMotion ? undefined : { scale: 0.94 }}
        aria-label={dark ? "切换到浅色模式" : "切换到深色模式"}
        title={dark ? "浅色模式" : "深色模式"}
      >
        {dark ? (
          <Sun size={17} strokeWidth={1.5} aria-hidden="true" />
        ) : (
          <Moon size={17} strokeWidth={1.5} aria-hidden="true" />
        )}
      </motion.button>
    </>
  );
}
