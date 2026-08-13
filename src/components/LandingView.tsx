"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

type LandingViewProps = {
  onExplore: () => void;
};

const ease = [0.16, 1, 0.3, 1] as const;
const heroText = "Hi, I'm Jesse.";

export default function LandingView({ onExplore }: LandingViewProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="home"
      className="portal-view relative flex min-h-[100svh] items-center justify-center overflow-hidden px-5 pb-24 pt-32 sm:px-8 sm:pt-28 md:px-24 md:py-20"
      aria-labelledby="landing-title"
    >
      <div className="relative mx-auto flex w-full max-w-6xl items-center justify-center">
        <h1
          id="landing-title"
          className="select-none whitespace-nowrap text-center text-[clamp(2.3rem,10.5vw,8rem)] font-bold tracking-normal"
          style={{ color: "var(--fg)", perspective: "600px" }}
          aria-label={heroText}
          data-cat-title
        >
          {heroText.split("").map((char, index) => (
            <motion.span
              key={`${index}-${char}`}
              className="inline-block"
              data-cat-char
              initial={false}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                duration: reduceMotion ? 0 : 0.8,
                delay: reduceMotion ? 0 : 0.3 + index * 0.05,
                ease,
              }}
              whileHover={
                reduceMotion
                  ? undefined
                  : {
                      y: -8,
                      color: "var(--accent)",
                      transition: { duration: 0.25, ease },
                    }
              }
              style={{ transformOrigin: "bottom center" }}
            >
              {char === " " ? "\u00a0" : char}
            </motion.span>
          ))}
        </h1>

        <motion.div
          className="absolute right-[4%] top-[calc(50%+74px)] z-10 h-20 w-20 overflow-hidden rounded-2xl sm:right-[6%] sm:top-[calc(50%+82px)] sm:h-24 sm:w-24 md:right-[7%] md:top-[calc(50%+94px)] md:h-28 md:w-28 md:rounded-2xl"
          style={{ boxShadow: "var(--shadow-lg)" }}
          initial={false}
          animate={
            reduceMotion
              ? { opacity: 1, scale: 1, rotate: 0, y: 0 }
              : {
                  opacity: 1,
                  scale: 1,
                  rotate: [3, -2, 3],
                  y: [0, -8, 0],
                }
          }
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  opacity: { duration: 1, delay: 1.2 },
                  scale: { duration: 1, delay: 1.2, ease },
                  rotate: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2.2,
                  },
                  y: {
                    duration: 3.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 2.2,
                  },
                }
          }
          whileHover={
            reduceMotion ? undefined : { rotate: 0, scale: 1.08, y: 0 }
          }
        >
          <Image
            src="/hero-avatar.png"
            alt="Jesse"
            fill
            className="object-cover"
            priority
            sizes="(max-width: 640px) 80px, (max-width: 768px) 112px, 144px"
          />
        </motion.div>
      </div>

      <motion.button
        type="button"
        onClick={onExplore}
        className="absolute bottom-7 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 px-4 py-2 sm:bottom-9"
        style={{ color: "var(--fg-faint)" }}
        initial={false}
        animate={{ opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : 2.2, duration: reduceMotion ? 0 : 0.8 }}
        whileHover={reduceMotion ? undefined : { color: "var(--fg)" }}
        aria-label="进入个人介绍"
      >
        <span className="text-[10px] font-medium uppercase tracking-[0.2em]">
          Explore
        </span>
        <motion.span
          className="block h-6 w-px"
          style={{ background: "var(--fg-faint)" }}
          animate={reduceMotion ? undefined : { y: [0, 4, 0] }}
          transition={
            reduceMotion
              ? undefined
              : { duration: 2, repeat: Infinity, ease: "easeInOut" }
          }
          aria-hidden="true"
        />
      </motion.button>
    </section>
  );
}
