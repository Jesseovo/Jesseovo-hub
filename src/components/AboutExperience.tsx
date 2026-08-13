"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

import AboutAvatarCanvas from "@/components/AboutAvatarCanvas";
import TearableBio from "@/components/TearableBio";

const chapters = [
  {
    label: "Ch. One",
    numeral: "I",
    title: "Passion",
    left: "I’ve always believed that passion is where growth begins and what keeps us moving forward. No path is free of setbacks. When difficulty arrives, passion gives me the courage and momentum to keep learning, keep building, and stay the course even when progress feels slow.",
    right: "Passion is what makes a commitment worth keeping. It lets me bring my full attention, energy, and conviction to the work in front of me. When I truly care about something, I’m willing to give it everything I have, push beyond the easy answer, and see it through.",
    leftLines: ["I’ve always believed that passion is", "where growth begins and what keeps us", "moving forward. No path is free of", "setbacks. When difficulty arrives,", "passion gives me the courage and", "momentum to keep learning, keep", "building, and stay the course even when", "progress feels slow."],
    rightLines: ["Passion is what makes a commitment", "worth keeping. It lets me bring my full", "attention, energy, and conviction to the", "work in front of me. When I truly care", "about something, I’m willing to give it", "everything I have, push beyond the easy", "answer, and see it through."],
  },
  {
    label: "Ch. Two",
    numeral: "II",
    title: "Persistence",
    left: "I once came across a line that stayed with me: don’t overestimate the rewards of the short term, and don’t underestimate the power of long-term effort. Persistence may offer little immediate return, but anything truly worth building asks us to think in years, not days.",
    right: "Playing the long game means showing up consistently and having a goal strong enough to keep pulling you forward. Belief in that direction carries you through the quiet stretches. When the work finally comes together, the satisfaction runs deeper because every small step helped earn it.",
    leftLines: ["I once came across a line that stayed", "with me: don’t overestimate the rewards", "of the short term, and don’t", "underestimate the power of long-term", "effort. Persistence may offer little", "immediate return, but anything truly", "worth building asks us to think in years,", "not days."],
    rightLines: ["Playing the long game means showing", "up consistently and having a goal strong", "enough to keep pulling you forward.", "Belief in that direction carries you", "through the quiet stretches. When the", "work finally comes together, the", "satisfaction runs deeper because every", "small step helped earn it."],
  },
  {
    label: "Ch. Three",
    numeral: "III",
    title: "Reflection",
    left: "What matters is not avoiding every mistake, but being able to recognize one. No one is perfect; we all misjudge, overlook, and get things wrong. Reflection helps me uncover blind spots, understand where I fell short, and turn every mistake into a starting point for improvement.",
    right: "After finishing a project — or simply reaching a natural pause — I step back and review the process. I look for what could have been stronger and how I might work more effectively next time. Reflection is a responsibility I owe both to myself and to every product I create.",
    leftLines: ["What matters is not avoiding every", "mistake, but being able to recognize", "one. No one is perfect; we all misjudge,", "overlook, and get things wrong.", "Reflection helps me uncover blind spots,", "understand where I fell short, and turn", "every mistake into a starting point for", "improvement."],
    rightLines: ["After finishing a project — or simply", "reaching a natural pause — I step back", "and review the process. I look for what", "could have been stronger and how I", "might work more effectively next time.", "Reflection is a responsibility I owe both", "to myself and to every product I create."],
  },
  {
    label: "Ch. Four",
    numeral: "IV",
    title: "Love",
    left: "I used to feel isolated from the world and often found myself alone. Today, I see how deeply loved I am. I have a girlfriend who loves and accepts me, close friends who share the journey, and a family that is always there. Whenever I feel lost, they help me find my way again.",
    right: "No person is an island; we are connected to the world through one another. Love lets me feel both my place in it and the bonds I share with the people around me. They are my strongest support, and the reason I have the confidence to keep moving forward without fear.",
    leftLines: ["I used to feel isolated from the world", "and often found myself alone. Today, I", "see how deeply loved I am. I have a", "girlfriend who loves and accepts me,", "close friends who share the journey, and", "a family that is always there. Whenever", "I feel lost, they help me find my way", "again."],
    rightLines: ["No person is an island; we are connected", "to the world through one another. Love", "lets me feel both my place in it and the", "bonds I share with the people around", "me. They are my strongest support, and", "the reason I have the confidence to keep", "moving forward without fear."],
  },
] as const;

const serviceGroups = [
  { title: "Software Testing", side: "left", items: ["Functional Testing", "API Testing", "System Testing", "Test Automation"] },
  { title: "Game Development", side: "right", items: ["Indie Game Development", "Applied AI Engineering", "Digital Art", "AI-Powered Game Creation"] },
  { title: "FDE & Agent Development", side: "left", items: ["Applied AI Engineering", "Workflow Design", "Skill Development", "AI Implementation"] },
] as const;

const contactLinks = [
  { label: "Gmail", href: "mailto:Jesseovo1219@gmail.com" },
  { label: "QQ Mail", href: "mailto:2953825993@qq.com" },
  { label: "WeChat · CHITING0_0", href: undefined },
] as const;

const aboutMe = "Hi, I’m Jesse — you can also call me Jiaxin. I’m always exploring what it takes to turn AI into something real, and what it means to be AI-native in this new era. Curiosity draws me toward unfamiliar ideas, new places, and work across software testing and test development, AI agents, and FDE. I also have a foot in the game industry, building independent games in my spare time. I approach life with energy and love singing, music, and travel. It’s a pleasure to meet you.";

function Hero({ duplicate = false }: { duplicate?: boolean }) {
  return (
    <section className={`about-hero${duplicate ? " about-hero--duplicate" : ""}`} aria-hidden={duplicate || undefined}>
      <div className="about-hero__copy">
        <h1>
          Know the gaps. Move forward.<br className="about-hero__desktop-break" /> Fueled by a boundless love for AI.<br className="about-hero__desktop-break" /> Always learning. Always evolving.
        </h1>
        <p>
          <a href="https://github.com/Jesseovo" target="_blank" rel="noreferrer">Jesse的AI小角落</a>
        </p>
      </div>
    </section>
  );
}

export default function AboutExperience() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [wrappedChapters, setWrappedChapters] = useState<Array<{ left: string[]; right: string[] }>>(() =>
    chapters.map((chapter) => ({
      left: [...chapter.leftLines],
      right: [...chapter.rightLines],
    })),
  );

  useEffect(() => {
    let disposed = false;

    const wrapLine = (text: string, maxWidth: number, context: CanvasRenderingContext2D) => {
      const words = text.split(/\s+/).filter(Boolean);
      const lines: string[] = [];
      let current = "";

      words.forEach((word) => {
        const candidate = current ? `${current} ${word}` : word;
        if (current && context.measureText(candidate).width > maxWidth) {
          lines.push(current);
          current = word;
        } else {
          current = candidate;
        }
      });

      if (current) lines.push(current);
      return lines.length ? lines : [""];
    };

    const updateWrapping = () => {
      const context = document.createElement("canvas").getContext("2d");
      if (!context || disposed) return;
      context.font = '400 16px "Teodor", serif';
      const maxWidth = window.innerWidth <= 640
        ? window.innerWidth / 2 - 14
        : window.innerWidth <= 1024
          ? window.innerWidth / 2 - 20
          : 250;

      setWrappedChapters(chapters.map((chapter) => ({
        left: wrapLine(chapter.left, maxWidth, context),
        right: wrapLine(chapter.right, maxWidth, context),
      })));
    };

    updateWrapping();
    document.fonts.ready.then(updateWrapping);
    window.addEventListener("resize", updateWrapping);
    return () => {
      disposed = true;
      window.removeEventListener("resize", updateWrapping);
    };
  }, []);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const currentShifts = new WeakMap<HTMLElement, number>();
    let frame = 0;
    let active = true;

    const updateTextWrap = () => {
      if (!active) return;
      const centerY = window.innerHeight / 2;
      const mobileScale = window.innerWidth <= 640 ? 0.7875 : 1;
      const sceneHeight = 2 * Math.tan((45 * Math.PI / 180) / 2) * 21;
      const pixelsPerWorldUnit = window.innerHeight / sceneHeight;
      const radiusX = 3.0596 * mobileScale * pixelsPerWorldUnit;
      const radiusY = 4.0543 * mobileScale * pixelsPerWorldUnit;

      scroller.querySelectorAll<HTMLElement>(".about-text-line").forEach((line) => {
        const rect = line.getBoundingClientRect();
        const normalizedY = (rect.top + rect.height / 2 - centerY) / radiusY;
        const ellipseEdge = Math.abs(normalizedY) < 1
          ? radiusX * Math.sqrt(1 - normalizedY * normalizedY)
          : 0;
        const shift = Math.max(ellipseEdge - 6, 0);
        const direction = line.dataset.side === "left" ? -1 : 1;
        const target = direction * shift;
        const current = currentShifts.get(line) ?? 0;
        const next = current + (target - current) * 0.138045;
        currentShifts.set(line, Math.abs(target - next) < 0.01 ? target : next);
        line.style.transform = `translate3d(${next.toFixed(3)}px, 0, 0)`;
      });

      frame = requestAnimationFrame(updateTextWrap);
    };

    frame = requestAnimationFrame(updateTextWrap);
    return () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  }, [wrappedChapters]);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;

    let frame = 0;
    let target = 0;
    let display = 0;
    let lastFrame = performance.now();
    let touchActive = false;
    let touchY = 0;
    let touchTime = 0;
    let touchVelocity = 0;

    const cycleLength = () => Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    const positiveModulo = (value: number, length: number) => ((value % length) + length) % length;

    const animateScroll = (now: number) => {
      const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;

      if (!touchActive && Math.abs(touchVelocity) > 0.01) {
        target += touchVelocity * deltaSeconds * 60;
        touchVelocity *= Math.pow(0.95, deltaSeconds * 60);
      }

      const alpha = 1 - Math.pow(1 - 0.12, deltaSeconds * 60);
      display += (target - display) * alpha;

      const length = cycleLength();
      scroller.scrollTop = positiveModulo(display, length);

      if (Math.abs(display) > length * 8) {
        const completedCycles = Math.trunc(display / length);
        display -= completedCycles * length;
        target -= completedCycles * length;
      }

      frame = requestAnimationFrame(animateScroll);
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      target += event.deltaY;
      touchVelocity = 0;
    };

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      touchActive = true;
      touchVelocity = 0;
      touchY = event.touches[0].clientY;
      touchTime = performance.now();
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!touchActive || event.touches.length !== 1) return;
      if (event.cancelable) event.preventDefault();
      const now = performance.now();
      const nextY = event.touches[0].clientY;
      const delta = touchY - nextY;
      const elapsed = Math.max(1, now - touchTime);
      touchY = nextY;
      touchTime = now;
      target += delta;
      touchVelocity = (delta / elapsed) * 16;
    };

    const onTouchEnd = () => {
      touchActive = false;
    };

    scroller.addEventListener("wheel", onWheel, { passive: false });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: false });
    scroller.addEventListener("touchend", onTouchEnd, { passive: true });
    scroller.addEventListener("touchcancel", onTouchEnd, { passive: true });
    frame = requestAnimationFrame(animateScroll);

    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return (
    <section className="about-experience" aria-label="About Jesse">
      <AboutAvatarCanvas />

      <div className="about-scroll" data-about-scroll ref={scrollRef}>
        <Hero />

        {chapters.map((chapter, chapterIndex) => (
          <article className="about-chapter" key={chapter.numeral}>
            <header className="about-chapter__header">
              <span>{chapter.label}</span>
              <strong>{chapter.numeral}</strong>
              <span>{chapter.title}</span>
            </header>
            <div
              className="about-chapter__copy"
              style={{ "--left-line-count": wrappedChapters[chapterIndex].left.length } as CSSProperties}
            >
              <div className="about-chapter__copy-block about-chapter__copy-block--left">
                <p className="about-text-visual" aria-hidden="true">
                  {wrappedChapters[chapterIndex].left.map((line, lineIndex) => <span className="about-text-line" data-side="left" key={`${line}-${lineIndex}`}>{line}</span>)}
                </p>
                <p className="sr-only">{chapter.left}</p>
              </div>
              <div className="about-chapter__copy-block about-chapter__copy-block--right">
                <p className="about-text-visual" aria-hidden="true">
                  {wrappedChapters[chapterIndex].right.map((line, lineIndex) => <span className="about-text-line" data-side="right" key={`${line}-${lineIndex}`}>{line}</span>)}
                </p>
                <p className="sr-only">{chapter.right}</p>
              </div>
            </div>
          </article>
        ))}

        <section className="about-services" aria-label="Services">
          {serviceGroups.map((group) => (
            <div className={`about-services__group about-services__group--${group.side}`} key={group.title}>
              <h2>{group.title}</h2>
              <ul>{group.items.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          ))}
        </section>

        <section className="about-final">
          <div className="about-final__bio">
            <h2>About Me</h2>
            <TearableBio
              text={aboutMe}
              highlightWords={["Jesse", "AI", "AI-native", "software testing", "test development", "AI agents", "FDE", "independent games"]}
              className="about-final__bio-copy"
            />
          </div>
          <div className="about-final__contact">
            <h2>Contact</h2>
            <ul>
              {contactLinks.map(({ label, href }) => (
                <li key={label}>
                  {href ? <a href={href} target={href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer">{label}</a> : label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Hero duplicate />
      </div>

      <style>{`
        .about-experience {
          position: relative;
          width: 100%;
          height: 100dvh;
          overflow: hidden;
          background: var(--about-bg);
          color: var(--about-ink);
          transition: background-color 420ms ease, color 420ms ease;
        }

        .about-avatar-canvas {
          position: fixed;
          inset: 0;
          z-index: 4;
          pointer-events: none;
        }

        .about-avatar-canvas__element {
          display: block;
          width: 100%;
          height: 100%;
          filter: drop-shadow(0 0 5px rgba(22, 33, 255, .2));
        }

        .about-scroll {
          position: absolute;
          inset: 0;
          z-index: 2;
          height: 100dvh;
          overflow-x: hidden;
          overflow-y: hidden;
          overscroll-behavior: contain;
          scrollbar-width: none;
          touch-action: none;
        }

        .about-scroll::-webkit-scrollbar { display: none; }

        .about-hero {
          position: relative;
          min-height: 100dvh;
        }

        .about-hero__copy {
          position: absolute;
          top: 50%;
          left: 50%;
          width: min(1000px, calc(100vw - 48px));
          transform: translate(-50%, -40%);
          text-align: center;
        }

        .about-hero h1 {
          margin: 0;
          font-family: var(--font-teodor), Georgia, serif;
          font-size: clamp(54px, 5.2vw, 75px);
          font-weight: 300;
          line-height: 1.18;
          letter-spacing: -.01em;
        }

        .about-hero__mark {
          position: relative;
          top: -.55em;
          margin-left: 7px;
          font-family: var(--font-lay), Arial, sans-serif;
          font-size: .22em;
          font-weight: 500;
          letter-spacing: 0;
        }

        .about-hero p {
          margin: 58px 0 0;
          font-family: var(--font-lay), Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 18px;
        }

        .about-hero p a { position: relative; z-index: 6; }

        .about-chapter {
          position: relative;
          min-height: 621px;
          padding-top: 180px;
        }

        .about-chapter__header {
          display: grid;
          grid-template-columns: 1fr 100px 1fr;
          align-items: center;
          width: 330px;
          margin: 0 auto;
          text-align: center;
          font-family: var(--font-lay), Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 18px;
        }

        .about-chapter__header strong {
          font-family: var(--font-teodor), Georgia, serif;
          font-size: 64px;
          font-weight: 400;
          line-height: 1;
        }

        .about-chapter__copy {
          display: grid;
          grid-template-columns: 50% 50%;
          justify-content: center;
          gap: 0;
          width: 100%;
          margin-top: 92px;
          font-family: var(--font-teodor), Georgia, serif;
          font-size: 16px;
          font-weight: 400;
          line-height: 25.6px;
          color: var(--about-ink);
        }

        .about-chapter__copy p { margin: 0; }
        .about-chapter__copy-block--left { padding-right: 6px; text-align: right; }
        .about-chapter__copy-block--right { margin-top: 179.2px; padding-left: 6px; text-align: left; }

        .about-text-line {
          display: block;
          min-height: 25.6px;
          transform: translate3d(0, 0, 0);
          will-change: transform;
        }

        .about-services {
          position: relative;
          min-height: 1180px;
          padding-top: 80px;
          font-family: var(--font-teodor), Georgia, serif;
          font-size: 16px;
          font-weight: 300;
          line-height: 1.45;
        }

        .about-services__group { position: absolute; width: 230px; }
        .about-services__group h2,
        .about-final h2 {
          margin: 0 0 38px;
          font-family: var(--font-lay), Arial, sans-serif;
          font-size: 14px;
          font-weight: 500;
          line-height: 18px;
        }
        .about-services__group ul,
        .about-final ul { margin: 0; padding: 0; list-style: none; }
        .about-services__group--left { right: calc(50% + 150px); text-align: right; }
        .about-services__group--right { left: calc(50% + 150px); text-align: left; }
        .about-services__group:nth-child(1) { top: 130px; }
        .about-services__group:nth-child(2) { top: 400px; }
        .about-services__group:nth-child(3) { top: 730px; }

        .about-final {
          position: relative;
          min-height: 900px;
          padding-top: 130px;
          font-family: var(--font-teodor), Georgia, serif;
          font-size: 16px;
          font-weight: 300;
          line-height: 1.45;
        }

        .about-final__bio {
          position: relative;
          width: min(760px, calc(100vw - 96px));
          margin: 0 auto;
        }
        .about-final__bio h2 { text-align: center; }
        .about-final__bio-copy {
          min-height: 0;
          font-family: var(--font-teodor), Georgia, serif;
        }
        .about-final__contact {
          position: relative;
          width: 230px;
          margin-top: 80px;
          margin-left: calc(50% - 380px);
          text-align: right;
        }
        .about-final a { position: relative; z-index: 6; }

        .about-hero--duplicate { min-height: 100dvh; }

        @media (max-width: 1024px) {
          .about-hero h1 { font-size: clamp(52px, 8vw, 65px); }
          .about-chapter__copy-block--right {
            margin-top: calc((var(--left-line-count) + 1) * 25.6px);
          }
          .about-services__group--left { right: calc(50% + 115px); }
          .about-final__contact { margin-left: calc(50% - 345px); }
          .about-services__group--right { left: calc(50% + 115px); }
          .about-final__bio { width: min(680px, calc(100vw - 96px)); }
        }

        @media (max-width: 640px) {
          .about-hero__copy { width: calc(100vw - 28px); transform: translate(-50%, -44%); }
          .about-hero h1 { font-size: 58px; line-height: 1.25; }
          .about-hero__desktop-break { display: none; }
          .about-hero p { margin-top: 54px; font-size: 12px; line-height: 16px; }

          .about-chapter { min-height: 910px; padding-top: 264px; }
          .about-chapter__header { width: calc(100vw - 56px); grid-template-columns: 1fr 84px 1fr; }
          .about-chapter__copy {
            width: 100%;
            margin: 92px auto 0;
            font-size: 16px;
            line-height: 25.6px;
          }

          .about-services { min-height: 1250px; font-size: 15px; }
          .about-services__group { width: 116px; }
          .about-services__group--left {
            right: auto;
            left: max(16px, env(safe-area-inset-left));
          }
          .about-services__group--right {
            right: max(16px, env(safe-area-inset-right));
            left: auto;
          }
          .about-final { min-height: 1700px; padding-top: 120px; font-size: 17px; }
          .about-final__bio {
            width: calc(100vw - 40px);
          }
          .about-final__contact {
            width: 120px;
            margin-top: 80px;
            margin-left: calc(50% - 185px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .about-scroll { scroll-behavior: auto; }
        }
      `}</style>
    </section>
  );
}
