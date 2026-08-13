"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const sectionMessages: Record<string, string> = {
  hero: "你好呀，欢迎参观我的小屋 ovo",
  about: "这是关于我的故事～ 慢慢看不着急 (=^・ω・^=)",
  craft: "这都是我做的，厉害吧！(｡•̀ᴗ-)✧",
  writing: "我写得一些文章～ 都是干货耶ฅ^•ﻌ•^ฅ",
  connect: "想找我玩吗？随时欢迎哦！₍˄·͈༝·͈˄₎◞ ̑̑",
};

const idleMessages = [
  "你还在看呀～ 真开心 ovo",
  "往下滑还有更多xixi～",
  "要不要加我好友呀 (=´ω`=)",
  "感谢你来我的小屋做客 ♡",
  "这个网站是我自己做的哦～",
];

const portalViewMessages: Record<string, string> = {
  home: sectionMessages.hero,
  about: sectionMessages.about,
  archive: sectionMessages.craft,
  contact: sectionMessages.connect,
};

const CAT_W = 52;
const CAT_H = 52;
const TEXT_PUSH_R = 60;
const TEXT_FORCE = 10;
const TEXT_LERP = 0.25;
const TEXT_LERP_BACK = 0.08;
const TITLE_PUSH_R = 130;
const TITLE_FORCE = 60;
const LERP_RESTORE = 0.055;
const FRICTION = 0.91;

interface PhysState {
  tx: number; ty: number;
  vx: number; vy: number;
  rot: number; vr: number;
  kicked: boolean;
}

export default function CatMascot() {
  const [message, setMessage] = useState("你好呀，欢迎参观我的小屋 ovo");
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleKey, setBubbleKey] = useState(0);
  const lastSectionRef = useRef("hero");
  const silenceUntilRef = useRef(0);

  const [isDragging, setIsDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const [catPos, setCatPos] = useState({ x: 20, y: 0 });
  const catPosRef = useRef({ x: 20, y: 0 });
  const prevCatPos = useRef({ x: 20, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasEverDragged = useRef(false);
  const [showDragHint, setShowDragHint] = useState(true);
  const isDraggingRef = useRef(false);
  const catElRef = useRef<HTMLDivElement>(null);

  const stateMap = useRef(new WeakMap<HTMLElement, PhysState>());
  const animatingRef = useRef(false);
  const isHomeRef = useRef(true);
  const viewCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cachedTitleEls = useRef<HTMLElement[]>([]);
  const cachedTextEls = useRef<HTMLElement[]>([]);
  const cacheStale = useRef(true);
  const cacheTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getHomePos = () => ({
    x: 20,
    y: (typeof window !== "undefined" ? window.innerHeight : 700) - CAT_H - 16,
  });

  const refreshCache = useCallback(() => {
    cachedTitleEls.current = Array.from(document.querySelectorAll<HTMLElement>("[data-cat-char]"));
    cachedTextEls.current = Array.from(document.querySelectorAll<HTMLElement>("[data-cat-text]"));
    cacheStale.current = false;
  }, []);


  useEffect(() => {
    const home = getHomePos();
    setCatPos(home);
    catPosRef.current = home;
    prevCatPos.current = home;
    setReady(true);

    refreshCache();
    const mo = new MutationObserver(() => {
      if (cacheTimer.current) clearTimeout(cacheTimer.current);
      cacheTimer.current = setTimeout(() => { cacheStale.current = true; }, 800);
    });
    mo.observe(document.body, { childList: true, subtree: true, attributes: false, characterData: false });
    return () => mo.disconnect();
  }, [refreshCache]);

  const showMsg = useCallback((msg: string) => {
    if (Date.now() < silenceUntilRef.current) return;
    setMessage(msg);
    setShowBubble(true);
    setBubbleKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setShowBubble(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const sections = Object.keys(sectionMessages);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
            const id = entry.target.id;
            if (id && sectionMessages[id] && id !== lastSectionRef.current) {
              lastSectionRef.current = id;
              showMsg(sectionMessages[id]);
            }
          }
        }
      },
      { threshold: 0.3 }
    );
    for (const id of sections) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [showMsg]);

  useEffect(() => {
    const onPortalViewChange = (event: Event) => {
      const view = (event as CustomEvent<{ view?: string }>).detail?.view;
      if (!view || !portalViewMessages[view]) return;
      lastSectionRef.current = view;
      showMsg(portalViewMessages[view]);
    };

    window.addEventListener("portal-view-change", onPortalViewChange);
    return () => window.removeEventListener("portal-view-change", onPortalViewChange);
  }, [showMsg]);

  useEffect(() => {
    if (!showBubble) return;
    const timer = setTimeout(() => {
      setShowBubble(false);
      silenceUntilRef.current = Date.now() + 3000;
    }, 5000);
    return () => clearTimeout(timer);
  }, [showBubble, bubbleKey]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!showBubble && Date.now() >= silenceUntilRef.current) {
        showMsg(idleMessages[Math.floor(Math.random() * idleMessages.length)]);
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [showBubble, showMsg]);

  const getS = useCallback((el: HTMLElement): PhysState => {
    let s = stateMap.current.get(el);
    if (!s) {
      s = { tx: 0, ty: 0, vx: 0, vy: 0, rot: 0, vr: 0, kicked: false };
      stateMap.current.set(el, s);
    }
    return s;
  }, []);

  const animateLoop = useCallback(() => {
    if (cacheStale.current) refreshCache();

    const p = catPosRef.current;
    const cx = p.x + CAT_W / 2;
    const cy = p.y + CAT_H / 2;
    const velX = p.x - prevCatPos.current.x;
    const velY = p.y - prevCatPos.current.y;
    const speed = Math.sqrt(velX * velX + velY * velY);
    const vh = window.innerHeight;
    let anyMoving = false;
    const dragging = isDraggingRef.current;

    const titleEls = cachedTitleEls.current;
    const len = titleEls.length;
    for (let i = 0; i < len; i++) {
      const ch = titleEls[i];
      const s = getS(ch);

      const rect = ch.getBoundingClientRect();
      const outOfView = rect.bottom < -200 || rect.top > vh + 200;
      if (outOfView) {
        if (s.kicked || Math.abs(s.tx) > 0.1) {
          s.tx *= 0.95; s.ty *= 0.95; s.rot *= 0.95;
          s.vx = 0; s.vy = 0; s.vr = 0;
          if (Math.abs(s.tx) < 0.3) {
            s.tx = 0; s.ty = 0; s.rot = 0; s.kicked = false;
            ch.style.transform = "";
          } else {
            ch.style.transform = `translate3d(${s.tx}px,${s.ty}px,0) rotate(${s.rot}deg)`;
            anyMoving = true;
          }
        }
        continue;
      }

      const ex = rect.left + rect.width * 0.5;
      const ey = rect.top + rect.height * 0.5;
      const dx = ex - cx;
      const dy = ey - cy;
      const distSq = dx * dx + dy * dy;
      const pushRSq = TITLE_PUSH_R * TITLE_PUSH_R;

      if (dragging && distSq < pushRSq && distSq > 1) {
        const dist = Math.sqrt(distSq);
        const ratio = 1 - dist / TITLE_PUSH_R;
        const speedBonus = Math.min(speed * 0.8, 40);
        const force = ratio * ratio * Math.sqrt(ratio) * TITLE_FORCE + speedBonus;
        const invD = 1 / dist;
        s.vx += dx * invD * force * 0.3;
        s.vy += dy * invD * force * 0.3;
        s.vr += (Math.random() - 0.5) * force * 0.7;
        s.kicked = true;
      }

      s.vx *= FRICTION;
      s.vy *= FRICTION;
      s.vr *= 0.89;
      s.tx += s.vx;
      s.ty += s.vy;
      s.rot += s.vr;

      const restoreRSq = (TITLE_PUSH_R + 40) * (TITLE_PUSH_R + 40);
      if (distSq > restoreRSq && s.kicked) {
        s.tx -= s.tx * LERP_RESTORE;
        s.ty -= s.ty * LERP_RESTORE;
        s.rot -= s.rot * LERP_RESTORE;
        if (Math.abs(s.tx) < 0.3 && Math.abs(s.ty) < 0.3 && Math.abs(s.rot) < 0.3 &&
            Math.abs(s.vx) < 0.05 && Math.abs(s.vy) < 0.05) {
          s.kicked = false; s.tx = 0; s.ty = 0; s.rot = 0;
          ch.style.transform = "";
          continue;
        }
      }

      if (Math.abs(s.tx) > 0.1 || Math.abs(s.ty) > 0.1 || Math.abs(s.rot) > 0.2 ||
          Math.abs(s.vx) > 0.05 || Math.abs(s.vy) > 0.05) {
        anyMoving = true;
        ch.style.transform = `translate3d(${s.tx}px,${s.ty}px,0) rotate(${s.rot}deg)`;
      } else if (!s.kicked) {
        ch.style.transform = "";
      }
    }

    const textEls = cachedTextEls.current;
    const tLen = textEls.length;
    const textPushRSq = TEXT_PUSH_R * TEXT_PUSH_R;
    for (let i = 0; i < tLen; i++) {
      const el = textEls[i];
      const s = getS(el);

      const rect = el.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > vh + 100) {
        if (Math.abs(s.tx) > 0.05) {
          s.tx *= 0.9; s.ty *= 0.9;
          if (Math.abs(s.tx) < 0.15) { s.tx = 0; s.ty = 0; el.style.transform = ""; }
          else { el.style.transform = `translate3d(${s.tx}px,${s.ty}px,0)`; anyMoving = true; }
        }
        continue;
      }

      const ex = rect.left + rect.width * 0.5;
      const ey = rect.top + rect.height * 0.5;
      const ddx = ex - cx;
      const ddy = ey - cy;
      const dSq = ddx * ddx + ddy * ddy;

      let tgtX = 0, tgtY = 0;
      if (dSq < textPushRSq && dSq > 1) {
        const d = Math.sqrt(dSq);
        const f = (1 - d / TEXT_PUSH_R) * (1 - d / TEXT_PUSH_R) * TEXT_FORCE;
        tgtX = (ddx / d) * f;
        tgtY = (ddy / d) * f;
      }

      const lrp = dSq < textPushRSq ? TEXT_LERP : TEXT_LERP_BACK;
      s.tx += (tgtX - s.tx) * lrp;
      s.ty += (tgtY - s.ty) * lrp;

      if (Math.abs(s.tx) < 0.05 && Math.abs(s.ty) < 0.05 && tgtX === 0 && tgtY === 0) {
        s.tx = 0; s.ty = 0;
        el.style.transform = "";
      } else {
        anyMoving = true;
        el.style.transform = `translate3d(${s.tx}px,${s.ty}px,0)`;
      }
    }

    prevCatPos.current = { x: p.x, y: p.y };

    if (anyMoving || dragging) {
      requestAnimationFrame(animateLoop);
    } else {
      animatingRef.current = false;
    }
  }, [getS, refreshCache]);

  const ensureAnimLoop = useCallback(() => {
    if (!animatingRef.current) {
      animatingRef.current = true;
      requestAnimationFrame(animateLoop);
    }
  }, [animateLoop]);

  const checkIfOffscreen = useCallback(() => {
    if (isDraggingRef.current || isHomeRef.current) return;
    const p = catPosRef.current;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const offscreen = p.x + CAT_W < -10 || p.x > vw + 10 ||
                      p.y + CAT_H < -10 || p.y > vh + 10;
    if (offscreen) {
      isHomeRef.current = true;
      const home = getHomePos();
      catPosRef.current = home;
      prevCatPos.current = home;
      setCatPos(home);
      window.dispatchEvent(new Event("cat-home"));
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (!isDraggingRef.current && !isHomeRef.current) {
        if (viewCheckTimer.current) clearTimeout(viewCheckTimer.current);
        viewCheckTimer.current = setTimeout(checkIfOffscreen, 300);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [checkIfOffscreen]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    isDraggingRef.current = true;
    isHomeRef.current = false;
    if (!hasEverDragged.current) {
      hasEverDragged.current = true;
      setShowDragHint(false);
    }
    dragOffset.current = {
      x: e.clientX - catPosRef.current.x,
      y: e.clientY - catPosRef.current.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    refreshCache();
    ensureAnimLoop();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const nx = e.clientX - dragOffset.current.x;
    const ny = e.clientY - dragOffset.current.y;
    catPosRef.current = { x: nx, y: ny };
    setCatPos({ x: nx, y: ny });
    window.dispatchEvent(new CustomEvent("cat-move", { detail: { x: nx, y: ny } }));
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    isDraggingRef.current = false;
    const p = catPosRef.current;
    window.dispatchEvent(new CustomEvent("cat-move", { detail: { x: p.x, y: p.y } }));
    setTimeout(checkIfOffscreen, 2000);
  };

  if (!ready) return null;

  return (
    <>
      <AnimatePresence>
        {showBubble && (
          <motion.div key={bubbleKey}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[60] max-w-[200px] sm:max-w-[240px] px-3 py-2 rounded-2xl rounded-bl-sm text-[12px] leading-relaxed font-medium pointer-events-none"
            style={{
              left: catPos.x,
              top: catPos.y - 44,
              background: "var(--bg-elevated)",
              color: "var(--fg)",
              boxShadow: "var(--shadow-md)",
              border: "1px solid var(--border)",
            }}>
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDragHint && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.5, delay: 2.5 }}
            className="fixed z-[60] text-[11px] font-medium pointer-events-none px-2.5 py-1 rounded-full"
            style={{
              left: catPos.x + CAT_W + 8,
              top: catPos.y + CAT_H / 2 - 10,
              background: "var(--bg-elevated)",
              color: "var(--fg-muted)",
              boxShadow: "var(--shadow-sm)",
              border: "1px solid var(--border)",
            }}>
            嘿，拖我试试 ✨
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        ref={catElRef}
        className="fixed z-50 touch-none select-none"
        style={{ left: 0, top: 0, width: CAT_W, height: CAT_H, cursor: isDragging ? "grabbing" : "grab" }}
        animate={{ x: catPos.x, y: catPos.y, scale: isDragging ? 1.1 : 1 }}
        transition={isDragging
          ? { x: { duration: 0 }, y: { duration: 0 }, scale: { duration: 0.15 } }
          : { type: "spring", damping: 25, stiffness: 120, mass: 0.8 }
        }
        whileHover={isDragging ? {} : { scale: 1.12 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <Image
          src="/mascot-cat.png"
          alt="Cat mascot"
          width={CAT_W * 2}
          height={CAT_H * 2}
          className="w-full h-full object-contain pointer-events-none"
          style={{
            filter: isDragging
              ? "drop-shadow(0 8px 20px rgba(0,0,0,0.25))"
              : "drop-shadow(0 3px 8px rgba(0,0,0,0.15))",
          }}
          draggable={false}
          priority
        />
      </motion.div>
    </>
  );
}
