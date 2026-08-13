"use client";

import { useEffect, useRef } from "react";
import styles from "./AsciiHandCanvas.module.css";

type AsciiHandCanvasProps = {
  text: string;
  className?: string;
};

const FONT_STACK =
  '"MS Gothic", "ＭＳ ゴシック", "Osaka-Mono", "Hiragino Kaku Gothic ProN", Consolas, "Courier New", monospace';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export default function AsciiHandCanvas({ text, className = "" }: AsciiHandCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
  }, [text]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let instance: import("p5").default | null = null;

    void import("p5").then(({ default: P5 }) => {
      if (disposed) return;

      instance = new P5((p) => {
        let hand: Awaited<ReturnType<typeof p.loadImage>> | null = null;
        const sampleCanvas = document.createElement("canvas");
        const sampleContext = sampleCanvas.getContext("2d", { willReadFrequently: true });
        const densityCanvas = document.createElement("canvas");
        const densityContext = densityCanvas.getContext("2d", { willReadFrequently: true });

        let scale = 1;
        let fontSize = 14;
        let charWidth = 8;
        let charHeight = 14;
        let imageScale = 1;
        let ramp = "JESSE ";
        let previousText = "";
        let hasPointer = false;
        let repelX = 0;
        let currentAngle = 0;
        let targetAngle = 0;
        let angleFrom = 0;
        let angleTweenStarted = 0;
        let breathStarted = 0;
        let mobilePointerX = 0;
        let mobilePointerY = 0;
        let mobileFollowX = 0;
        let mobileFollowY = 0;
        let mobilePointerAt = Number.NEGATIVE_INFINITY;

        const sourceCanvas = () =>
          (hand as unknown as { canvas?: HTMLCanvasElement } | null)?.canvas ?? null;

        const buildRamp = (value: string) => {
          const unique = [...new Set(value)];
          if (!densityContext) return `${unique.join("")} `;

          densityCanvas.width = 20;
          densityCanvas.height = 20;
          densityContext.font = `${fontSize}px "Courier New", monospace`;
          densityContext.textBaseline = "top";

          return `${unique
            .map((glyph) => {
              densityContext.clearRect(0, 0, 20, 20);
              densityContext.fillStyle = "#000";
              densityContext.fillText(glyph, 0, 0);
              const pixels = densityContext.getImageData(0, 0, 20, 20).data;
              let density = 0;
              for (let index = 0; index < pixels.length; index += 4) {
                if (pixels[index] < 128) density += 1;
              }
              return { glyph, density };
            })
            .sort((left, right) => left.density - right.density)
            .map(({ glyph }) => glyph)
            .join("")} `;
        };

        const rebuildRamp = () => {
          const nextText = textRef.current.trim() ? textRef.current : "JESSE";
          if (nextText === previousText) return;
          previousText = nextText;
          ramp = buildRamp(nextText);
        };

        const updateMetrics = () => {
          const mobile = p.width < 700;
          scale = p.width / 1440;
          fontSize = (mobile ? 10 : 14) * scale;
          charHeight = fontSize;
          p.textSize(fontSize);
          charWidth = Math.max(0.5, p.textWidth("M"));

          const source = sourceCanvas();
          if (source?.width) imageScale = (1500 * scale) / source.width;
          previousText = "";
          rebuildRamp();
        };

        const updateAngle = (nextTarget: number) => {
          if (Math.abs(nextTarget - targetAngle) > 0.5) {
            angleFrom = currentAngle;
            targetAngle = nextTarget;
            angleTweenStarted = p.millis();
          }
          const progress = clamp((p.millis() - angleTweenStarted) / 200, 0, 1);
          const eased = 1 - (1 - progress) ** 2;
          currentAngle = angleFrom + (targetAngle - angleFrom) * eased;
        };

        const resize = () => {
          const rect = host.getBoundingClientRect();
          p.resizeCanvas(Math.max(1, rect.width), Math.max(1, rect.height));
          updateMetrics();
        };

        const enablePointer = () => {
          hasPointer = true;
        };

        const updateMobilePointer = (clientX: number, clientY: number) => {
          if (p.width >= 700) return;
          const rect = host.getBoundingClientRect();
          mobilePointerX = clamp(clientX - rect.left, 0, rect.width);
          mobilePointerY = clamp(clientY - rect.top, 0, rect.height);
          mobilePointerAt = performance.now();
          hasPointer = true;
        };

        const trackPointer = (event: PointerEvent) => {
          updateMobilePointer(event.clientX, event.clientY);
        };

        const trackTouch = (event: TouchEvent) => {
          const touch = event.touches[0] ?? event.changedTouches[0];
          if (touch) updateMobilePointer(touch.clientX, touch.clientY);
        };

        p.setup = () => {
          const rect = host.getBoundingClientRect();
          const canvas = p.createCanvas(Math.max(1, rect.width), Math.max(1, rect.height));
          canvas.parent(host);
          p.frameRate(24);
          p.noStroke();
          p.textFont(FONT_STACK);
          p.textAlign(p.LEFT, p.TOP);
          hasPointer = p.width < 700;
          mobilePointerX = p.width / 2;
          mobilePointerY = p.height * 0.45;
          mobileFollowX = p.width / 2;
          mobileFollowY = p.height - 100 * (p.width / 1440);
          updateMetrics();

          void p.loadImage("/hand.png").then((image) => {
            if (disposed) return;
            hand = image;
            updateMetrics();
            breathStarted = p.millis();
          });

          window.addEventListener("mousemove", enablePointer, { once: true });
          window.addEventListener("pointerdown", trackPointer, { passive: true });
          window.addEventListener("pointermove", trackPointer, { passive: true });
          window.addEventListener("touchstart", trackTouch, { passive: true });
          window.addEventListener("touchmove", trackTouch, { passive: true });
          window.addEventListener("touchend", trackTouch, { passive: true });
          window.addEventListener("resize", resize);
        };

        p.draw = () => {
          p.clear();
          rebuildRamp();

          const source = sourceCanvas();
          if (!source || !sampleContext || !ramp || !hasPointer) return;

          const mobile = p.width < 700;
          const cycle = ((((p.millis() - breathStarted) % 4000) + 4000) % 4000 / 4000) * Math.PI * 2;
          const breathProgress = (1 - Math.cos(cycle)) / 2;
          let fixedX = p.width + 87 * scale;
          let fixedY = p.height / 2 + breathProgress * 40 * scale;

          if (mobile) {
            const recentlyTouched = performance.now() - mobilePointerAt < 1600;
            const homeX = p.width / 2 + breathProgress * 10;
            const homeY = p.height - 100 * scale;
            const followTargetX = recentlyTouched
              ? clamp(mobilePointerX, p.width * 0.12, p.width * 0.88)
              : homeX;
            const followTargetY = recentlyTouched
              ? clamp(mobilePointerY + p.height * 0.52, p.height * 0.68, p.height * 1.02)
              : homeY;

            mobileFollowX += (followTargetX - mobileFollowX) * 0.16;
            mobileFollowY += (followTargetY - mobileFollowY) * 0.14;
            fixedX = mobileFollowX;
            fixedY = mobileFollowY;
            repelX = 0;
            const horizontalBias = (mobilePointerX - p.width / 2) / Math.max(1, p.width / 2);
            updateAngle(-85 + clamp(horizontalBias, -1, 1) * 14);
          } else {
            const boundary = fixedX - 1000;
            const beyondBoundary = p.mouseX - boundary;
            const targetRepel = beyondBoundary > 10 ? beyondBoundary - 10 : 0;
            repelX += (targetRepel - repelX) * 0.15;

            const deltaX = p.mouseX - (fixedX + repelX);
            const deltaY = p.mouseY - fixedY;
            let desired = ((Math.atan2(deltaY, deltaX) + Math.PI) * 180) / Math.PI + 8;
            while (desired > 180) desired -= 360;
            while (desired < -180) desired += 360;
            desired = clamp(desired, -5, 25);
            updateAngle(desired);
          }

          const imageWidth = source.width * imageScale;
          const imageHeight = source.height * imageScale;
          const columns = Math.ceil(p.width / charWidth);
          const rows = Math.ceil(p.height / charHeight);
          if (sampleCanvas.width !== columns || sampleCanvas.height !== rows) {
            sampleCanvas.width = columns;
            sampleCanvas.height = rows;
          }
          sampleContext.clearRect(0, 0, columns, rows);

          const anchorX = 0.7 * (imageWidth / charWidth);
          const anchorY = (mobile ? 0.55 : 0.32) * (imageHeight / charHeight);
          const drawX = (fixedX + repelX) / charWidth - anchorX;
          const drawY = fixedY / charHeight - anchorY;
          const pivotX = drawX + anchorX;
          const pivotY = drawY + anchorY;

          sampleContext.save();
          sampleContext.translate(pivotX, pivotY);
          sampleContext.rotate((currentAngle * Math.PI) / 180 + (mobile ? Math.PI : 0));
          sampleContext.translate(-pivotX, -pivotY);
          sampleContext.drawImage(
            source,
            0,
            0,
            source.width,
            source.height,
            drawX,
            drawY,
            imageWidth / charWidth,
            imageHeight / charHeight,
          );
          sampleContext.restore();

          const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
          const rampScale = (ramp.length - 1) / 255;
          p.textSize(fontSize);

          for (let row = 0; row < rows; row += 1) {
            for (let column = 0; column < columns; column += 1) {
              const pixel = (row * columns + column) * 4;
              if (pixels[pixel + 3] < 10) continue;

              const red = pixels[pixel];
              const green = pixels[pixel + 1];
              const blue = pixels[pixel + 2];
              const average = (red + green + blue) / 3;
              if (average >= 240) continue;

              const glyph = ramp[Math.floor(average * rampScale)];
              if (!glyph || glyph === " ") continue;
              const darkTheme = document.documentElement.getAttribute("data-theme") === "dark";
              if (darkTheme) {
                p.fill(
                  242 - red * 0.45,
                  238 - green * 0.4,
                  232 - blue * 0.38,
                );
              } else {
                p.fill(red, green, blue);
              }
              p.text(glyph, column * charWidth, row * charHeight);
            }
          }
        };

        const originalRemove = p.remove.bind(p);
        p.remove = () => {
          window.removeEventListener("mousemove", enablePointer);
          window.removeEventListener("pointerdown", trackPointer);
          window.removeEventListener("pointermove", trackPointer);
          window.removeEventListener("touchstart", trackTouch);
          window.removeEventListener("touchmove", trackTouch);
          window.removeEventListener("touchend", trackTouch);
          window.removeEventListener("resize", resize);
          originalRemove();
        };
      }, host);
    });

    return () => {
      disposed = true;
      instance?.remove();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={`${styles.canvas} ${className}`}
      aria-hidden="true"
    />
  );
}
