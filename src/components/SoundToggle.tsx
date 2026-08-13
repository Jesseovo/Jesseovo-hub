"use client";

import gsap from "gsap";
import { useCallback, useEffect, useRef, useState } from "react";

import { SoundRingIcon } from "@/components/icons";

type SoundEffectName = "enter" | "hit1" | "hit2" | "softClick" | "softClick2";
type SoundEffectOptions = { volume?: number; duck?: boolean };
type ScrubTickOptions = { rate?: number; volume?: number };

declare global {
  interface Window {
    __cameFromInAppNav?: boolean;
    __creativeSpaceExploded?: boolean;
    __playSfx?: (name: SoundEffectName, options?: SoundEffectOptions) => void;
    __playScrubTick?: (options?: ScrubTickOptions) => void;
    __soundEnabled?: boolean;
  }
}

const EFFECT_SOURCES: Record<SoundEffectName, string> = {
  enter: "/assets/audio/ENTER.mp3",
  hit1: "/assets/audio/HIT 1.mp3",
  hit2: "/assets/audio/HIT 2.mp3",
  softClick: "/assets/audio/SOFT CLICK.mp3",
  softClick2: "/assets/audio/SOFT CLICK 2.mp3",
};

const SCRUB_SOURCE = "/assets/audio/SCRUBBLE.mp3";
const AMBIENT_SOURCE = "/assets/audio/AMBIENT.mp3";
const CIRCLE_LENGTH = Math.PI * 2 * 44;

type AudioPool = { nodes: HTMLAudioElement[]; index: number };

function pauseAndReset(audio: HTMLAudioElement) {
  try {
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute("src");
    audio.load();
  } catch {
    // A detached media node may already have released its resource.
  }
}

export default function SoundToggle() {
  const [enabled, setEnabled] = useState(false);
  const [top, setTop] = useState(15);
  const enabledRef = useRef(false);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const effectPoolsRef = useRef<Partial<Record<SoundEffectName, AudioPool>>>({});
  const scrubPoolRef = useRef<AudioPool>({ nodes: [], index: 0 });
  const iconRef = useRef<SVGSVGElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    enabledRef.current = enabled;
    window.__soundEnabled = enabled;
    window.dispatchEvent(new CustomEvent("sound:change", { detail: { enabled } }));
  }, [enabled]);

  useEffect(() => {
    if (window.innerWidth <= 1024) return;

    const ambient = new Audio();
    ambient.loop = true;
    ambient.preload = "none";
    ambient.volume = 0;
    ambientRef.current = ambient;

    const effectPools = Object.fromEntries(
      Object.entries(EFFECT_SOURCES).map(([name, source]) => [
        name,
        {
          nodes: Array.from({ length: 3 }, () => {
            const audio = new Audio(source);
            audio.preload = "auto";
            return audio;
          }),
          index: 0,
        },
      ]),
    ) as Record<SoundEffectName, AudioPool>;
    effectPoolsRef.current = effectPools;
    scrubPoolRef.current = {
      nodes: Array.from({ length: 6 }, () => {
        const audio = new Audio(SCRUB_SOURCE);
        audio.preload = "auto";
        return audio;
      }),
      index: 0,
    };

    return () => {
      gsap.killTweensOf(ambient);
      pauseAndReset(ambient);
      Object.values(effectPools).forEach((pool) => pool.nodes.forEach(pauseAndReset));
      scrubPoolRef.current.nodes.forEach(pauseAndReset);
      ambientRef.current = null;
      effectPoolsRef.current = {};
      scrubPoolRef.current = { nodes: [], index: 0 };
    };
  }, []);

  useEffect(() => {
    if (window.innerWidth <= 1024) return;
    const navbar = document.querySelector<HTMLElement>("[data-navbar]");
    if (!navbar) return;

    const alignToNavbar = () => {
      setTop((Number.parseFloat(getComputedStyle(navbar).top) || 0) + navbar.offsetHeight / 2 - 6);
    };
    alignToNavbar();
    window.addEventListener("resize", alignToNavbar);
    return () => window.removeEventListener("resize", alignToNavbar);
  }, []);

  useEffect(() => {
    const ambient = ambientRef.current;
    if (!ambient) return;

    gsap.killTweensOf(ambient);
    if (enabled) {
      ambient.volume = 0;
      void ambient.play().catch(() => setEnabled(false));
      gsap.to(ambient, { volume: 0.3, duration: 1.2, ease: "power1.inOut" });
      return;
    }

    gsap.to(ambient, {
      volume: 0,
      duration: 0.6,
      ease: "power1.inOut",
      onComplete: () => {
        if (!enabledRef.current) ambient.pause();
      },
    });
  }, [enabled]);

  useEffect(() => {
    const icon = iconRef.current;
    const circle = circleRef.current;
    if (!enabled || !icon || !circle) return;

    gsap.set(circle, { strokeDasharray: CIRCLE_LENGTH, strokeDashoffset: CIRCLE_LENGTH });
    const rotation = gsap.to(icon, {
      rotation: 360,
      transformOrigin: "50% 50%",
      duration: 18,
      ease: "none",
      repeat: -1,
    });
    const drawing = gsap
      .timeline({ repeat: -1 })
      .fromTo(
        circle,
        { strokeDashoffset: CIRCLE_LENGTH },
        { strokeDashoffset: 0, duration: 7.25, ease: "none" },
      )
      .to(circle, { strokeDashoffset: -CIRCLE_LENGTH, duration: 7.25, ease: "none" });

    return () => {
      rotation.kill();
      drawing.kill();
      gsap.set(icon, { rotation: 0 });
    };
  }, [enabled]);

  const playSfx = useCallback((name: SoundEffectName, options: SoundEffectOptions = {}) => {
    if (!enabledRef.current || window.innerWidth <= 1024) return;
    const pool = effectPoolsRef.current[name];
    if (!pool?.nodes.length) return;

    const audio = pool.nodes[pool.index];
    pool.index = (pool.index + 1) % pool.nodes.length;
    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = options.volume ?? 1;
      void audio.play().catch(() => {});
      if (options.duck && ambientRef.current) {
        gsap.to(ambientRef.current, {
          volume: 0.1,
          duration: 0.3,
          ease: "power2.out",
          overwrite: true,
        });
      }
    } catch {
      // Audio playback can fail when the browser revokes media permission.
    }
  }, []);

  const playScrubTick = useCallback((options: ScrubTickOptions = {}) => {
    if (!enabledRef.current || window.innerWidth <= 1024) return;
    const pool = scrubPoolRef.current;
    if (!pool.nodes.length) return;

    const audio = pool.nodes[pool.index];
    pool.index = (pool.index + 1) % pool.nodes.length;
    try {
      audio.playbackRate = options.rate ?? 1;
      audio.volume = options.volume ?? 1;
      audio.currentTime = 0;
      void audio.play().catch(() => {});
    } catch {
      // Keep pointer/canvas interactions responsive if audio playback fails.
    }
  }, []);

  useEffect(() => {
    window.__playSfx = playSfx;
    window.__playScrubTick = playScrubTick;
    return () => {
      if (window.__playSfx === playSfx) delete window.__playSfx;
      if (window.__playScrubTick === playScrubTick) delete window.__playScrubTick;
      delete window.__soundEnabled;
    };
  }, [playScrubTick, playSfx]);

  const toggleSound = () => {
    const ambient = ambientRef.current;
    if (window.innerWidth <= 1024 || !ambient) return;
    if (!enabledRef.current) {
      if (!ambient.src) {
        ambient.src = AMBIENT_SOURCE;
        ambient.load();
      }
      ambient.volume = 0;
      void ambient.play().catch(() => setEnabled(false));
    }
    setEnabled((current) => !current);
  };

  return (
    <>
      <button
        className="sound-toggle"
        type="button"
        style={{ top }}
        aria-label={enabled ? "Turn off sound" : "Turn on sound"}
        aria-pressed={enabled}
        onClick={toggleSound}
      >
        <span
          className="sound-toggle__core"
          style={{
            width: enabled ? 12 : 4,
            height: enabled ? 12 : 4,
            backgroundColor: enabled ? "transparent" : "#fff",
          }}
        >
          <span className="sound-toggle__icon-scale" style={{ opacity: enabled ? 1 : 0 }}>
            <SoundRingIcon ref={iconRef} circleRef={circleRef} />
          </span>
        </span>
      </button>

      <style>{`
        .sound-toggle {
          position: fixed;
          right: 15px;
          z-index: 9999;
          width: 12px;
          height: 12px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          background: transparent;
          color: #fff;
          mix-blend-mode: exclusion;
          cursor: pointer;
        }

        .sound-toggle__core {
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          transition:
            width 450ms cubic-bezier(0.65, 0, 0.35, 1),
            height 450ms cubic-bezier(0.65, 0, 0.35, 1),
            background-color 450ms cubic-bezier(0.65, 0, 0.35, 1);
        }

        .sound-toggle__icon-scale {
          width: 96px;
          height: 96px;
          flex: 0 0 96px;
          display: block;
          transform: scale(0.125);
          transform-origin: center;
          transition: opacity 300ms ease;
        }

        .sound-toggle__icon-scale svg { display: block; }

        @media (max-width: 1024px) {
          .sound-toggle { display: none; }
        }
      `}</style>
    </>
  );
}
