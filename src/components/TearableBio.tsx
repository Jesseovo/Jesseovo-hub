"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GripVertical, RotateCcw } from "lucide-react";
import type {
  LayoutCursor,
  PreparedTextWithSegments,
} from "@chenglou/pretext";

const LINE_HEIGHT = 30;
const CAT_WIDTH = 52;
const CAT_HEIGHT = 52;
const CAT_PADDING = 14;
const DAMPING = 0.97;
const GRAVITY = 0.15;
const ITERATIONS = 12;
const CONSTRAINT_SCALE = 1.2;
const UNLOCK_THRESHOLD = 1;

type PretextApi = Pick<
  typeof import("@chenglou/pretext"),
  "prepareWithSegments" | "layoutNextLine"
>;

interface DisplayLine {
  text: string;
  x: number;
  y: number;
  width: number;
  sourceStart: number;
  lineIndex: number;
}

interface RopeLetter {
  character: string;
  width: number;
  x: number;
  y: number;
  previousX: number;
  previousY: number;
  originX: number;
  originY: number;
  locked: boolean;
  highlighted: boolean;
}

interface RopeModel {
  letters: RopeLetter[];
  restLengths: number[];
  draggedIndex: number;
}

export interface TearableBioProps {
  text: string;
  highlightWords: string[];
  className?: string;
  avoidCenteredAvatar?: boolean;
}

interface TearableParagraphProps {
  paragraph: string;
  highlightWords: string[];
  reducedMotion: boolean;
  resetVersion: number;
  avoidCenteredAvatar: boolean;
}

function graphemes(value: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), (part) => part.segment);
  }
  return Array.from(value);
}

function cursorToOffset(prepared: PreparedTextWithSegments, cursor: LayoutCursor) {
  let offset = 0;
  for (let index = 0; index < cursor.segmentIndex; index += 1) {
    offset += prepared.segments[index]?.length ?? 0;
  }
  const currentSegment = prepared.segments[cursor.segmentIndex] ?? "";
  offset += graphemes(currentSegment).slice(0, cursor.graphemeIndex).join("").length;
  return offset;
}

function getHighlightRanges(text: string, words: string[]) {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const word of words) {
    let start = 0;
    while (word && (start = text.indexOf(word, start)) !== -1) {
      ranges.push({ start, end: start + word.length });
      start += word.length;
    }
  }
  return ranges;
}

function overlapsRange(
  start: number,
  end: number,
  ranges: Array<{ start: number; end: number }>,
) {
  return ranges.some((range) => start < range.end && end > range.start);
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
}

function TearableParagraph({
  paragraph,
  highlightWords,
  reducedMotion,
  resetVersion,
  avoidCenteredAvatar,
}: TearableParagraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pretextRef = useRef<PretextApi | null>(null);
  const preparedRef = useRef<PreparedTextWithSegments | null>(null);
  const modelRef = useRef<RopeModel | null>(null);
  const rafRef = useRef(0);
  const lastFrameRef = useRef(0);
  const lastCatRef = useRef({ x: -9999, y: -9999 });
  const pendingPointerRef = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);
  const observedWidthRef = useRef(0);
  const [lines, setLines] = useState<DisplayLine[]>([]);
  const [layoutHeight, setLayoutHeight] = useState(60);
  const [ropeHeight, setRopeHeight] = useState(60);
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState(false);
  const activeRef = useRef(false);
  const highlightRanges = useMemo(
    () => getHighlightRanges(paragraph, highlightWords),
    [highlightWords, paragraph],
  );

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const layoutText = useCallback((catScreenX: number, catScreenY: number) => {
    const container = containerRef.current;
    const api = pretextRef.current;
    if (!container || !api || activeRef.current) return;

    const width = container.clientWidth;
    if (width <= 0) return;

    const styles = getComputedStyle(container);
    const font = styles.font || `${styles.fontSize} ${styles.fontFamily}`;
    const prepared = api.prepareWithSegments(paragraph, font);
    preparedRef.current = prepared;

    const bounds = container.getBoundingClientRect();
    const mobileScale = window.innerWidth <= 640 ? 0.7875 : 1;
    const sceneHeight = 2 * Math.tan((45 * Math.PI / 180) / 2) * 21;
    const pixelsPerWorldUnit = window.innerHeight / sceneHeight;
    const centeredRadiusX = 3.0596 * mobileScale * pixelsPerWorldUnit;
    const centeredRadiusY = 4.0543 * mobileScale * pixelsPerWorldUnit;
    const obstacleWidth = avoidCenteredAvatar ? centeredRadiusX * 2 : CAT_WIDTH;
    const obstacleHeight = avoidCenteredAvatar ? centeredRadiusY * 2 : CAT_HEIGHT;
    const obstacleScreenX = avoidCenteredAvatar
      ? window.innerWidth / 2 - centeredRadiusX
      : catScreenX;
    const obstacleScreenY = avoidCenteredAvatar
      ? window.innerHeight / 2 - centeredRadiusY
      : catScreenY;
    const obstaclePadding = avoidCenteredAvatar ? 10 : CAT_PADDING;
    const catX = obstacleScreenX - bounds.left;
    const catY = obstacleScreenY - bounds.top;
    const catRight = catX + obstacleWidth + obstaclePadding;
    const catBottom = catY + obstacleHeight + obstaclePadding;
    const catNearby =
      catX > -(obstacleWidth + 100) &&
      catX < width + 100 &&
      catY > -(obstacleHeight + 100) &&
      catY < bounds.height + 100;

    const nextLines: DisplayLine[] = [];
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };
    let y = 0;
    let lineIndex = 0;

    while (true) {
      const intersectsObstacle =
        catNearby &&
        y + LINE_HEIGHT > catY - obstaclePadding &&
        y < catBottom;

      if (avoidCenteredAvatar && intersectsObstacle) {
        const leftWidth = Math.max(0, catX - obstaclePadding);
        const rightX = Math.min(width, catRight);
        const rightWidth = Math.max(0, width - rightX);
        const minimumSegmentWidth = window.innerWidth <= 640 ? 72 : 100;

        if (leftWidth < minimumSegmentWidth && rightWidth < minimumSegmentWidth) {
          y = Math.max(y + LINE_HEIGHT, catBottom);
          continue;
        }

        let addedSegment = false;
        if (leftWidth >= minimumSegmentWidth) {
          const leftLine = api.layoutNextLine(prepared, cursor, leftWidth);
          if (leftLine) {
            nextLines.push({
              text: leftLine.text,
              x: 0,
              y,
              width: leftLine.width,
              sourceStart: cursorToOffset(prepared, leftLine.start),
              lineIndex,
            });
            cursor = leftLine.end;
            lineIndex += 1;
            addedSegment = true;
          }
        }

        if (rightWidth >= minimumSegmentWidth) {
          const rightLine = api.layoutNextLine(prepared, cursor, rightWidth);
          if (rightLine) {
            nextLines.push({
              text: rightLine.text,
              x: rightX,
              y,
              width: rightLine.width,
              sourceStart: cursorToOffset(prepared, rightLine.start),
              lineIndex,
            });
            cursor = rightLine.end;
            lineIndex += 1;
            addedSegment = true;
          }
        }

        if (!addedSegment) break;
        y += LINE_HEIGHT;
        continue;
      }

      let availableWidth = width;
      let x = 0;
      if (
        intersectsObstacle
      ) {
        if (catX < width / 2) {
          x = Math.max(0, catRight);
          availableWidth = width - x;
        } else {
          availableWidth = catX - CAT_PADDING;
        }
        if (availableWidth < 100) {
          x = 0;
          availableWidth = width;
        }
      }

      const line = api.layoutNextLine(prepared, cursor, availableWidth);
      if (!line) break;
      nextLines.push({
        text: line.text,
        x,
        y,
        width: line.width,
        sourceStart: cursorToOffset(prepared, line.start),
        lineIndex,
      });
      cursor = line.end;
      y += LINE_HEIGHT;
      lineIndex += 1;
    }

    setLines(nextLines);
    setLayoutHeight(Math.max(LINE_HEIGHT, y));
  }, [avoidCenteredAvatar, paragraph]);

  const scheduleLayout = useCallback((x: number, y: number) => {
    if (activeRef.current) return;
    if (
      Math.abs(x - lastCatRef.current.x) < 2 &&
      Math.abs(y - lastCatRef.current.y) < 2
    ) {
      return;
    }
    lastCatRef.current = { x, y };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => layoutText(x, y));
  }, [layoutText]);

  useEffect(() => {
    let disposed = false;
    import("@chenglou/pretext").then((api) => {
      if (disposed) return;
      pretextRef.current = api;
      layoutText(lastCatRef.current.x, lastCatRef.current.y);
    });

    const container = containerRef.current;
    if (!container) return;
    observedWidthRef.current = container.clientWidth;
    const observer = new ResizeObserver(() => {
      if (disposed) return;
      const nextWidth = container.clientWidth;
      const widthChanged = Math.abs(nextWidth - observedWidthRef.current) > 1;
      observedWidthRef.current = nextWidth;
      if (activeRef.current && widthChanged) {
        activeRef.current = false;
        draggingRef.current = false;
        modelRef.current = null;
        setDragging(false);
        setActive(false);
        cancelAnimationFrame(rafRef.current);
      }
      if (!activeRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() =>
          layoutText(lastCatRef.current.x, lastCatRef.current.y),
        );
      }
    });
    observer.observe(container);

    const onCatMove = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      if (detail) scheduleLayout(detail.x, detail.y);
    };
    const onCatHome = () => {
      lastCatRef.current = { x: -9999, y: -9999 };
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => layoutText(-9999, -9999));
    };

    const scrollParent = avoidCenteredAvatar
      ? container.closest<HTMLElement>(".about-scroll")
      : null;
    const onAboutScroll = () => {
      if (activeRef.current) return;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => layoutText(-9999, -9999));
    };

    window.addEventListener("cat-move", onCatMove);
    window.addEventListener("cat-home", onCatHome);
    scrollParent?.addEventListener("scroll", onAboutScroll, { passive: true });
    return () => {
      disposed = true;
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("cat-move", onCatMove);
      window.removeEventListener("cat-home", onCatHome);
      scrollParent?.removeEventListener("scroll", onAboutScroll);
    };
  }, [avoidCenteredAvatar, layoutText, scheduleLayout]);

  const buildRope = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || lines.length === 0) return;

    const mobile = container.clientWidth < 520;
    const extraDropSpace = mobile ? 120 : 180;
    const cssWidth = container.clientWidth;
    const cssHeight = layoutHeight + extraDropSpace;
    setRopeHeight(cssHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const styles = getComputedStyle(container);
    context.font = styles.font || `${styles.fontSize} ${styles.fontFamily}`;

    const byLine: RopeLetter[][] = [];
    const lineYPositions: number[] = [];
    for (const line of lines) {
      let x = line.x;
      let sourceOffset = line.sourceStart;
      const lineLetters: RopeLetter[] = [];
      for (const character of graphemes(line.text)) {
        const characterWidth = context.measureText(character).width;
        const start = sourceOffset;
        const end = start + character.length;
        lineLetters.push({
          character,
          width: characterWidth,
          x,
          y: line.y,
          previousX: x,
          previousY: line.y,
          originX: x,
          originY: line.y,
          locked: true,
          highlighted: overlapsRange(start, end, highlightRanges),
        });
        x += characterWidth;
        sourceOffset = end;
      }
      const lastRowIndex = byLine.length - 1;
      if (
        avoidCenteredAvatar &&
        lastRowIndex >= 0 &&
        lineYPositions[lastRowIndex] === line.y
      ) {
        byLine[lastRowIndex].push(...lineLetters);
      } else {
        byLine.push(lineLetters);
        lineYPositions.push(line.y);
      }
    }

    const reverseFirst = (byLine.length - 1) % 2 === 1;
    const letters: RopeLetter[] = [];
    byLine.forEach((lineLetters, index) => {
      const reverse = reverseFirst ? index % 2 === 0 : index % 2 === 1;
      letters.push(...(reverse ? [...lineLetters].reverse() : lineLetters));
    });

    const restLengths: number[] = [];
    for (let index = 0; index < letters.length - 1; index += 1) {
      const a = letters[index];
      const b = letters[index + 1];
      const visualDistance = Math.hypot(
        b.originX + b.width / 2 - (a.originX + a.width / 2),
        b.originY + LINE_HEIGHT / 2 - (a.originY + LINE_HEIGHT / 2),
      );
      const ropeDistance = avoidCenteredAvatar
        ? Math.min(visualDistance, LINE_HEIGHT * 1.5)
        : visualDistance;
      restLengths.push(ropeDistance * CONSTRAINT_SCALE);
    }

    for (let index = Math.max(0, letters.length - 6); index < letters.length; index += 1) {
      letters[index].locked = false;
    }

    const lastIndex = letters.length - 1;
    modelRef.current = { letters, restLengths, draggedIndex: lastIndex };
    draggingRef.current = lastIndex >= 0;
    setDragging(lastIndex >= 0);

    const pointer = pendingPointerRef.current;
    if (pointer && lastIndex >= 0) {
      const bounds = container.getBoundingClientRect();
      const letter = letters[lastIndex];
      letter.x = pointer.x - bounds.left - letter.width / 2;
      letter.y = pointer.y - bounds.top - LINE_HEIGHT / 2;
      letter.previousX = letter.x;
      letter.previousY = letter.y;
    }
  }, [avoidCenteredAvatar, highlightRanges, layoutHeight, lines]);

  const simulate = useCallback((width: number, height: number) => {
    const model = modelRef.current;
    if (!model) return;
    const { letters, restLengths } = model;

    for (let index = letters.length - 2; index >= 0; index -= 1) {
      const current = letters[index];
      const next = letters[index + 1];
      if (!current.locked || next.locked) continue;
      const distance = Math.hypot(
        next.x + next.width / 2 - (current.originX + current.width / 2),
        next.y + LINE_HEIGHT / 2 - (current.originY + LINE_HEIGHT / 2),
      );
      if (distance > restLengths[index] + UNLOCK_THRESHOLD) {
        current.locked = false;
        current.previousX = current.x;
        current.previousY = current.y;
      }
    }

    letters.forEach((letter, index) => {
      if (letter.locked || index === model.draggedIndex) return;
      const velocityX = (letter.x - letter.previousX) * DAMPING;
      const velocityY = (letter.y - letter.previousY) * DAMPING;
      letter.previousX = letter.x;
      letter.previousY = letter.y;
      letter.x += velocityX;
      letter.y += velocityY + GRAVITY;
    });

    for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
      for (let index = 0; index < letters.length - 1; index += 1) {
        const a = letters[index];
        const b = letters[index + 1];
        if (a.locked && b.locked) continue;
        const dx = b.x + b.width / 2 - (a.x + a.width / 2);
        const dy = b.y + LINE_HEIGHT / 2 - (a.y + LINE_HEIGHT / 2);
        const distance = Math.max(0.001, Math.hypot(dx, dy));
        const correction = (distance - restLengths[index]) / distance;
        const aFixed = a.locked || index === model.draggedIndex;
        const bFixed = b.locked || index + 1 === model.draggedIndex;
        if (aFixed && !bFixed) {
          b.x -= dx * correction;
          b.y -= dy * correction;
        } else if (!aFixed && bFixed) {
          a.x += dx * correction;
          a.y += dy * correction;
        } else if (!aFixed && !bFixed) {
          a.x += dx * correction * 0.5;
          a.y += dy * correction * 0.5;
          b.x -= dx * correction * 0.5;
          b.y -= dy * correction * 0.5;
        }
      }
    }

    letters.forEach((letter, index) => {
      if (letter.locked || index === model.draggedIndex) return;
      const maxX = Math.max(0, width - letter.width);
      const maxY = Math.max(0, height - LINE_HEIGHT);
      if (letter.x < 0 || letter.x > maxX) {
        letter.x = Math.min(maxX, Math.max(0, letter.x));
        letter.previousX = letter.x + (letter.x - letter.previousX) * 0.4;
      }
      if (letter.y < 0 || letter.y > maxY) {
        letter.y = Math.min(maxY, Math.max(0, letter.y));
        letter.previousY = letter.y + (letter.y - letter.previousY) * 0.4;
      }
    });
  }, []);

  const drawFrame = useCallback((time: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const model = modelRef.current;
    if (!canvas || !container || !model || !activeRef.current) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const elapsed = lastFrameRef.current ? time - lastFrameRef.current : 1000 / 60;
    lastFrameRef.current = time;
    const steps = Math.min(4, Math.max(1, Math.round(elapsed / (1000 / 120))));
    for (let step = 0; step < steps; step += 1) simulate(width, height);

    const styles = getComputedStyle(container);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    context.font = styles.font || `${styles.fontSize} ${styles.fontFamily}`;
    context.textAlign = "left";
    context.textBaseline = "top";
    for (const letter of model.letters) {
      context.fillStyle = letter.highlighted
        ? styles.getPropertyValue("--accent").trim() || "#ed4857"
        : styles.getPropertyValue("--fg-muted").trim() || "#736b63";
      context.fillText(letter.character, letter.x, letter.y);
    }
    rafRef.current = requestAnimationFrame(drawFrame);
  }, [simulate]);

  useLayoutEffect(() => {
    if (!active || reducedMotion) return;
    buildRope();
    lastFrameRef.current = 0;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, buildRope, drawFrame, reducedMotion]);

  const endDrag = useCallback(() => {
    const model = modelRef.current;
    if (model) model.draggedIndex = -1;
    draggingRef.current = false;
    setDragging(false);
    pendingPointerRef.current = null;
  }, []);

  const updateDrag = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    const model = modelRef.current;
    if (!container || !model || model.draggedIndex < 0) return;
    const bounds = container.getBoundingClientRect();
    const letter = model.letters[model.draggedIndex];
    letter.x = clientX - bounds.left - letter.width / 2;
    letter.y = clientY - bounds.top - LINE_HEIGHT / 2;
    letter.previousX = letter.x;
    letter.previousY = letter.y;
  }, []);

  useEffect(() => {
    if (!active) return;
    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      event.preventDefault();
      updateDrag(event.clientX, event.clientY);
    };
    const onPointerUp = () => endDrag();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") endDrag();
    };
    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active, endDrag, updateDrag]);

  useEffect(() => {
    activeRef.current = false;
    setActive(false);
    endDrag();
    modelRef.current = null;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() =>
      layoutText(lastCatRef.current.x, lastCatRef.current.y),
    );
  }, [endDrag, layoutText, resetVersion]);

  useEffect(() => {
    if (reducedMotion && active) {
      activeRef.current = false;
      setActive(false);
      endDrag();
      modelRef.current = null;
    }
  }, [active, endDrag, reducedMotion]);

  const beginFromTail = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (reducedMotion || lines.length === 0) return;
    event.preventDefault();
    event.stopPropagation();
    pendingPointerRef.current = { x: event.clientX, y: event.clientY };
    draggingRef.current = true;
    activeRef.current = true;
    setActive(true);
    setDragging(true);
  };

  const beginCanvasDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const container = containerRef.current;
    const model = modelRef.current;
    if (!container || !model) return;
    const bounds = container.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    for (let index = model.letters.length - 1; index >= 0; index -= 1) {
      const letter = model.letters[index];
      if (letter.locked) continue;
      if (
        x >= letter.x - 8 &&
        x <= letter.x + letter.width + 8 &&
        y >= letter.y - 8 &&
        y <= letter.y + LINE_HEIGHT + 8
      ) {
        event.preventDefault();
        model.draggedIndex = index;
        draggingRef.current = true;
        setDragging(true);
        updateDrag(event.clientX, event.clientY);
        break;
      }
    }
  };

  const lastLine = lines[lines.length - 1];
  return (
    <div
      ref={containerRef}
      className="relative text-[15px] sm:text-base"
      data-tearable-paragraph
      style={{
        minHeight: active ? ropeHeight : layoutHeight + (reducedMotion ? 0 : 40),
        color: "var(--fg-muted)",
        lineHeight: `${LINE_HEIGHT}px`,
      }}
    >
      {active ? <p className="sr-only">{paragraph}</p> : null}

      <div aria-hidden={active || undefined} style={{ opacity: active ? 0 : 1 }}>
        {lines.length === 0 ? (
          <p>{paragraph}</p>
        ) : (
          lines.map((line) => {
            let offset = line.sourceStart;
            return (
              <div
                key={`${line.lineIndex}-${line.sourceStart}`}
                className="absolute whitespace-pre"
                style={{ left: line.x, top: line.y }}
              >
                {graphemes(line.text).map((character) => {
                  const start = offset;
                  const end = start + character.length;
                  offset = end;
                  const highlighted = overlapsRange(start, end, highlightRanges);
                  return (
                    <span
                      key={`${start}-${character}`}
                      className={highlighted ? "font-semibold" : undefined}
                      style={highlighted ? { color: "var(--accent)" } : undefined}
                    >
                      {character}
                    </span>
                  );
                })}
              </div>
            );
          })
        )}

        {!reducedMotion && lastLine ? (
          <button
            type="button"
            onPointerDown={beginFromTail}
            className="group absolute z-10 grid h-7 w-7 touch-none place-items-center rounded-full border bg-[color:var(--bg)]/80 shadow-[0_3px_14px_rgba(80,58,48,0.08)] backdrop-blur-sm transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-200 hover:scale-105 hover:bg-[var(--accent-soft)] hover:shadow-[0_5px_18px_rgba(255,67,79,0.14)] focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95"
            style={{
              left: `min(calc(100% - 28px), ${lastLine.x + lastLine.width + 10}px)`,
              top: lastLine.y + (LINE_HEIGHT - 28) / 2,
              borderColor: "color-mix(in srgb, var(--border-strong) 72%, transparent)",
              color: "var(--fg-faint)",
              cursor: "grab",
            }}
            aria-label="拖动以扯下这段文字"
            title="拖动末尾，扯下文字"
          >
            <GripVertical
              className="transition-colors duration-200 group-hover:text-[var(--accent)]"
              size={14}
              strokeWidth={1.7}
              aria-hidden="true"
            />
            <span className="sr-only">拖动末尾试试</span>
          </button>
        ) : null}
      </div>

      {active ? (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block max-w-full touch-none"
          style={{ cursor: dragging ? "grabbing" : "grab" }}
          aria-hidden="true"
          onPointerDown={beginCanvasDrag}
        />
      ) : null}
    </div>
  );
}

export default function TearableBio({
  text,
  highlightWords,
  className = "",
  avoidCenteredAvatar = false,
}: TearableBioProps) {
  const reducedMotion = useReducedMotion();
  const [resetVersion, setResetVersion] = useState(0);
  const mergedText = useMemo(
    () => text.replace(/\s*\n\s*\n\s*/g, " ").trim(),
    [text],
  );

  return (
    <div className={`relative ${className}`}>
      {!reducedMotion ? (
        <div className="pointer-events-none absolute -top-14 right-0 z-20">
          <button
            type="button"
            onClick={() => setResetVersion((version) => version + 1)}
            className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border bg-[var(--bg)] transition-transform hover:rotate-[-20deg] focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ borderColor: "var(--border-strong)", color: "var(--fg-muted)" }}
            title="重置文字"
            aria-label="重置所有文字"
          >
            <RotateCcw size={16} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <TearableParagraph
        paragraph={mergedText}
        highlightWords={highlightWords}
        reducedMotion={reducedMotion}
        resetVersion={resetVersion}
        avoidCenteredAvatar={avoidCenteredAvatar}
      />
    </div>
  );
}
