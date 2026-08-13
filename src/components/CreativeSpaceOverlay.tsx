"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import gsap from "gsap";

import type { CreativeSpaceOverlayProps } from "@/types/creative-runtime";

type MetadataRow = {
  key: number;
  index: number;
};

type OverviewParagraphProps = {
  text: string;
  open: boolean;
  widthPx?: number;
  onReservedHeight?: (height: number, wrap: HTMLDivElement) => void;
};

const ENTER_DELAY_MS = 90;
const CLEAR_DELAY_MS = 200;
const DESKTOP_QUERY = "(min-width: 1025px)";

function sameLines(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((line, index) => line === right[index])
  );
}

function measureVisualLines(node: HTMLParagraphElement, text: string) {
  const textNode = node.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return [text];

  const ranges: Array<[number, number]> = [];
  const range = document.createRange();
  const wordPattern = /\S+/gu;
  let match: RegExpExecArray | null;
  let lineTop: number | null = null;

  while ((match = wordPattern.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    range.setStart(textNode, start);
    range.setEnd(textNode, end);

    const rects = Array.from(range.getClientRects());
    const rect = rects.find((candidate) => candidate.width > 0 && candidate.height > 0);
    if (!rect) continue;

    if (lineTop === null || Math.abs(rect.top - lineTop) > 1) {
      lineTop = rect.top;
      ranges.push([start, end]);
    } else {
      ranges[ranges.length - 1][1] = end;
    }
  }

  range.detach();
  return ranges.length
    ? ranges.map(([start, end]) => text.slice(start, end))
    : [text];
}

function OverviewParagraph({
  text,
  open,
  widthPx,
  onReservedHeight,
}: OverviewParagraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLParagraphElement>(null);
  const lineRefs = useRef<Array<HTMLParagraphElement | null>>([]);
  const [lines, setLines] = useState(() => [text]);

  useLayoutEffect(() => {
    const measureNode = measureRef.current;
    if (!measureNode) return;

    let frame = 0;
    let disposed = false;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed || !measureNode.isConnected) return;
        const nextLines = measureVisualLines(measureNode, text);
        setLines((current) =>
          sameLines(current, nextLines) ? current : nextLines,
        );
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(measureNode);

    if (document.fonts) {
      void document.fonts.ready.then(measure).catch(() => undefined);
    }

    window.addEventListener("resize", measure);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [text]);

  useLayoutEffect(() => {
    lineRefs.current.length = lines.length;
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    const lineNodes = lineRefs.current.filter(
      (line): line is HTMLParagraphElement => Boolean(line),
    );
    if (!wrap || !inner) return;

    gsap.killTweensOf([wrap, ...lineNodes]);

    if (!open) {
      if (lineNodes.length) {
        gsap.to(lineNodes, {
          yPercent: 100,
          opacity: 0,
          duration: 0.4,
          ease: "power4.out",
          stagger: 0.06,
          overwrite: true,
        });
      }
      gsap.to(wrap, {
        height: 0,
        duration: 0.5,
        ease: "power3.inOut",
        overwrite: true,
      });
      return;
    }

    const currentHeight = wrap.offsetHeight;
    gsap.set(wrap, { height: "auto" });
    const targetHeight = wrap.offsetHeight;
    gsap.set(wrap, { height: currentHeight });
    onReservedHeight?.(targetHeight, wrap);
    gsap.to(wrap, {
      height: targetHeight,
      duration: 0.6,
      ease: "power4.out",
      overwrite: true,
      onComplete: () => {
        gsap.set(wrap, { height: "auto" });
      },
    });
    if (lineNodes.length) {
      gsap.fromTo(
        lineNodes,
        { yPercent: 100, opacity: 0 },
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.9,
          ease: "power4.out",
          stagger: 0.1,
          overwrite: true,
        },
      );
    }
  }, [lines, onReservedHeight, open]);

  useEffect(
    () => () => {
      const nodes = [
        wrapRef.current,
        ...lineRefs.current,
      ].filter(Boolean) as Element[];
      if (nodes.length) gsap.killTweensOf(nodes);
    },
    [],
  );

  return (
    <>
      <div
        ref={wrapRef}
        className="creative-overlay__overview-wrap"
        style={widthPx === undefined ? undefined : { width: widthPx }}
      >
        <p
          ref={measureRef}
          className="creative-overlay__overview-measure"
          aria-hidden="true"
        >
          {text}
        </p>
        <div ref={innerRef} className="creative-overlay__overview-inner">
          {lines.map((line, index) => (
            <div className="creative-overlay__line-mask" key={`${index}-${line}`}>
              <p
                ref={(node) => {
                  lineRefs.current[index] = node;
                }}
                className="creative-overlay__overview-line"
              >
                {line}
              </p>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        .creative-overlay__overview-wrap {
          position: relative;
          width: min(470px, calc(100% - 32px));
          max-width: 470px;
          height: 0;
          overflow: hidden;
        }

        .creative-overlay__overview-inner {
          margin-bottom: 60px;
        }

        .creative-overlay__line-mask {
          display: block;
          overflow: hidden;
        }

        .creative-overlay__overview-line,
        .creative-overlay__overview-measure {
          margin: 0;
          font-family: var(--font-teodor), Georgia, serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.3;
          text-align: center;
        }

        .creative-overlay__overview-line {
          white-space: nowrap;
          will-change: transform, opacity;
        }

        .creative-overlay__overview-measure {
          position: absolute;
          top: 0;
          left: -99999px;
          width: 100%;
          visibility: hidden;
          white-space: normal;
          pointer-events: none;
        }

        @media (max-width: 1024px) {
          .creative-overlay__overview-wrap {
            width: min(390px, calc(100% - 32px));
            max-width: min(390px, calc(100% - 32px));
          }
        }
      `}</style>
    </>
  );
}

export default function CreativeSpaceOverlay({
  items,
  snapshot,
  overviewOpen,
  onNavigateCase,
  onToggleOverview,
  onReservedBottomChange,
}: CreativeSpaceOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const enterTimerRef = useRef<number | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const nextRowKeyRef = useRef(0);
  const currentRowKeyRef = useRef<number | null>(null);
  const shownIndexRef = useRef<number | null>(null);
  const reservedCallbackRef = useRef(onReservedBottomChange);
  const [rows, setRows] = useState<MetadataRow[]>([]);
  const [currentRowKey, setCurrentRowKey] = useState<number | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const preloaderVisible = snapshot.introPhase !== "interactive";

  useLayoutEffect(() => {
    reservedCallbackRef.current = onReservedBottomChange;
  }, [onReservedBottomChange]);

  const clearMetadataTimers = useCallback(() => {
    if (enterTimerRef.current !== null) {
      window.clearTimeout(enterTimerRef.current);
      enterTimerRef.current = null;
    }
    if (clearTimerRef.current !== null) {
      window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = null;
    }
  }, []);

  const showMetadataIndex = useCallback((index: number | null) => {
    if (shownIndexRef.current === index) return;

    shownIndexRef.current = index;
    if (index === null) {
      currentRowKeyRef.current = null;
      setCurrentRowKey(null);
      setRows([]);
      return;
    }

    const key = ++nextRowKeyRef.current;
    currentRowKeyRef.current = key;
    setCurrentRowKey(key);
    setRows([{ key, index }]);
  }, []);

  useEffect(() => {
    clearMetadataTimers();

    if (snapshot.expandedIndex !== null) {
      enterTimerRef.current = window.setTimeout(() => {
        enterTimerRef.current = null;
        showMetadataIndex(snapshot.expandedIndex);
      }, 0);
      return;
    }

    if (snapshot.hoveredIndex === null) {
      clearTimerRef.current = window.setTimeout(() => {
        clearTimerRef.current = null;
        showMetadataIndex(null);
      }, CLEAR_DELAY_MS);
      return;
    }

    if (shownIndexRef.current === snapshot.hoveredIndex) return;
    enterTimerRef.current = window.setTimeout(() => {
      enterTimerRef.current = null;
      showMetadataIndex(snapshot.hoveredIndex);
    }, ENTER_DELAY_MS);
  }, [
    clearMetadataTimers,
    showMetadataIndex,
    snapshot.expandedIndex,
    snapshot.hoveredIndex,
  ]);

  useEffect(() => {
    const desktopMedia = window.matchMedia(DESKTOP_QUERY);
    const mobileMedia = window.matchMedia("(max-width: 640px)");
    const update = () => {
      setIsDesktop(desktopMedia.matches);
      setIsMobile(mobileMedia.matches);
    };
    update();
    desktopMedia.addEventListener("change", update);
    mobileMedia.addEventListener("change", update);
    return () => {
      desktopMedia.removeEventListener("change", update);
      mobileMedia.removeEventListener("change", update);
    };
  }, []);

  useLayoutEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;

    gsap.set(cursor, {
      x: 0,
      y: 0,
      xPercent: -50,
      yPercent: -50,
      scale: 0.6,
      opacity: 0,
    });
    const moveX = gsap.quickTo(cursor, "x", {
      duration: 0.5,
      ease: "power3.out",
    });
    const moveY = gsap.quickTo(cursor, "y", {
      duration: 0.5,
      ease: "power3.out",
    });
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      moveX(event.clientX);
      moveY(event.clientY);
    };

    window.addEventListener("pointermove", onPointerMove);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      gsap.killTweensOf(cursor);
    };
  }, []);

  useEffect(() => {
    const cursor = cursorRef.current;
    if (!cursor) return;
    const visible = isDesktop && snapshot.expandedIndex !== null;
    gsap.killTweensOf(cursor, "opacity,scale");
    gsap.to(cursor, {
      opacity: visible ? 1 : 0,
      scale: visible ? 1 : 0.6,
      duration: 0.45,
      ease: "power3.out",
      overwrite: true,
    });
  }, [isDesktop, snapshot.expandedIndex]);

  const expandedItem =
    snapshot.expandedIndex === null
      ? null
      : (items[snapshot.expandedIndex] ?? null);
  const overviewVisible = Boolean(
    expandedItem && !expandedItem.caseStudy && overviewOpen,
  );

  const reportReservedHeight = useCallback(
    (paragraphHeight: number, wrap: HTMLDivElement) => {
      const overlay = overlayRef.current;
      const trailingSpace = overlay
        ? overlay.getBoundingClientRect().bottom -
          wrap.getBoundingClientRect().bottom
        : 0;
      reservedCallbackRef.current(
        Math.max(0, Math.ceil(paragraphHeight + trailingSpace)),
      );
    },
    [],
  );

  useEffect(() => {
    if (!overviewVisible) reservedCallbackRef.current(0);
  }, [overviewVisible, snapshot.expandedIndex]);

  const cursorLabel = useMemo(() => {
    if (!expandedItem || !snapshot.overExpandedPlane) return "Close";
    if (expandedItem.caseStudy) return "View";
    return overviewOpen ? "Close Overview" : "Overview";
  }, [expandedItem, overviewOpen, snapshot.overExpandedPlane]);

  const mobileActionLabel = expandedItem
    ? expandedItem.caseStudy
      ? "View Case"
      : overviewOpen
        ? "Close Overview"
        : "Overview"
    : "";
  const mobileParagraphWidth = useMemo(() => {
    if (!isMobile) return undefined;
    const viewportWidth = window.innerWidth;
    const maximum = Math.min(390, viewportWidth - 32);
    const minimum = viewportWidth <= 350 ? 260 : 320;
    return snapshot.openPlaneWidthPx === null
      ? maximum
      : Math.min(Math.max(snapshot.openPlaneWidthPx, minimum), maximum);
  }, [isMobile, snapshot.openPlaneWidthPx]);

  const onMobileAction = () => {
    if (!expandedItem) return;
    if (expandedItem.caseStudy) onNavigateCase(expandedItem.slug);
    else onToggleOverview();
  };

  useEffect(
    () => () => {
      clearMetadataTimers();
      reservedCallbackRef.current(0);
    },
    [clearMetadataTimers],
  );

  return (
    <div ref={overlayRef} className="creative-overlay">
      {preloaderVisible ? (
        <div className="creative-overlay__preloader" aria-hidden="true" />
      ) : null}

      <div
        className={`creative-overlay__metadata${
          snapshot.expandedIndex !== null
            ? " creative-overlay__metadata--expanded"
            : ""
        }`}
        aria-live="polite"
      >
        <div className="creative-overlay__metadata-stack">
          {rows.map((row) => {
            const item = items[row.index];
            if (!item) return null;
            const isCurrent = row.key === currentRowKey;
            const paragraphOpen = Boolean(
              isCurrent &&
                snapshot.expandedIndex === row.index &&
                !item.caseStudy &&
                overviewOpen,
            );

            return (
              <div className="creative-overlay__metadata-row" key={row.key}>
                {!item.caseStudy && item.paragraph ? (
                  <OverviewParagraph
                    text={item.paragraph}
                    open={paragraphOpen}
                    widthPx={mobileParagraphWidth}
                    onReservedHeight={
                      isCurrent ? reportReservedHeight : undefined
                    }
                  />
                ) : null}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="creative-overlay__mobile-action"
          onClick={onMobileAction}
          aria-hidden={expandedItem ? undefined : true}
          tabIndex={expandedItem ? 0 : -1}
        >
          {mobileActionLabel}
        </button>
      </div>

      {expandedItem?.href ? (
        <a
          className="creative-overlay__external-link"
          href={expandedItem.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          Messenger
        </a>
      ) : null}

      <div ref={cursorRef} className="creative-overlay__cursor" aria-hidden="true">
        {snapshot.expandedIndex === null ? cursorLabel : null}
      </div>

      <style jsx global>{`
        .creative-overlay {
          position: absolute;
          inset: 0;
          z-index: 100;
          overflow: hidden;
          pointer-events: none;
        }

        .creative-overlay__preloader {
          position: absolute;
          inset: 0;
          z-index: 600;
          overflow: hidden;
          pointer-events: none;
        }

        .creative-overlay__metadata {
          position: absolute;
          bottom: 20px;
          left: 0;
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          pointer-events: none;
        }

        .creative-overlay__metadata-stack {
          position: relative;
          width: 100%;
        }

        .creative-overlay__metadata--expanded
          .creative-overlay__metadata-stack {
          display: none;
        }

        .creative-overlay__metadata-row {
          position: absolute;
          bottom: 0;
          left: 50%;
          display: flex;
          width: 100%;
          flex-direction: column;
          align-items: center;
          transform: translateX(-50%);
        }

        .creative-overlay__line-mask {
          display: block;
          overflow: hidden;
        }

        .creative-overlay__overview-line,
        .creative-overlay__overview-measure {
          margin: 0;
          font-weight: 400;
        }

        .creative-overlay__overview-wrap {
          position: relative;
          width: min(470px, calc(100% - 32px));
          max-width: 470px;
          height: 0;
          overflow: hidden;
        }

        .creative-overlay__overview-inner {
          margin-bottom: 60px;
        }

        .creative-overlay__overview-line,
        .creative-overlay__overview-measure {
          font-family: var(--font-teodor), Georgia, serif;
          font-size: 14px;
          line-height: 1.3;
          text-align: center;
        }

        .creative-overlay__overview-line {
          white-space: nowrap;
          will-change: transform, opacity;
        }

        .creative-overlay__overview-measure {
          position: absolute;
          top: 0;
          left: -99999px;
          width: 100%;
          visibility: hidden;
          white-space: normal;
          pointer-events: none;
        }

        .creative-overlay__cursor {
          position: fixed;
          top: 32px;
          left: 32px;
          z-index: 2150;
          color: #fff;
          font-family: var(--font-lay), Arial, sans-serif;
          font-size: 13px;
          font-weight: 400;
          line-height: 1.2;
          white-space: nowrap;
          opacity: 0;
          mix-blend-mode: difference;
          pointer-events: none;
          will-change: transform, opacity;
        }

        .creative-overlay__external-link {
          position: absolute;
          bottom: calc(2rem + env(safe-area-inset-bottom));
          left: 50%;
          z-index: 9999;
          color: var(--creative-ink);
          font-family: var(--font-lay), Arial, sans-serif;
          font-size: 12px;
          font-weight: 400;
          line-height: 1.4;
          text-decoration: underline;
          text-underline-offset: 3px;
          transform: translateX(-50%);
          pointer-events: auto;
        }

        .creative-overlay__mobile-action {
          position: relative;
          z-index: 9999;
          display: none;
          width: 100%;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--creative-ink);
          font-family: var(--font-lay), Arial, sans-serif;
          font-size: 12px;
          font-weight: 400;
          line-height: 1.4;
          text-align: center;
          cursor: pointer;
          opacity: 0;
          pointer-events: none;
        }

        @media (max-width: 1025px) {
          .creative-overlay__cursor {
            display: none;
          }
        }

        @media (max-width: 1024px) {
          .creative-overlay__metadata {
            bottom: calc(2rem + env(safe-area-inset-bottom));
          }

          .creative-overlay__mobile-action {
            display: none;
          }

          .creative-overlay__mobile-action:not(:empty) {
            opacity: 1;
            pointer-events: auto;
          }

        }

        @media (prefers-reduced-motion: reduce) {
          .creative-overlay__cursor,
          .creative-overlay__overview-line {
            will-change: auto;
          }
        }
      `}</style>
    </div>
  );
}
