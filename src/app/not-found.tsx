"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

const ease = [0.16, 1, 0.3, 1] as const;

const text404 = "找不到你要的页面";

export default function NotFound() {
  return (
    <div
      className="min-h-[100svh] flex flex-col items-center justify-center px-4 sm:px-6"
      style={{ background: "var(--bg)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease }}
        className="relative w-40 h-40 sm:w-52 sm:h-52 md:w-64 md:h-64 mb-8"
      >
        <Image
          src="/not-found.png"
          alt="404"
          fill
          className="object-contain"
          priority
        />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease }}
        className="text-[clamp(3rem,10vw,7rem)] font-bold tracking-tighter"
        style={{ color: "var(--fg)" }}
      >
        {"404".split("").map((char, i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ opacity: 0, y: 30, rotateX: -90 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.6, delay: 0.4 + i * 0.08, ease }}
            whileHover={{
              y: -6,
              color: "var(--accent)",
              transition: { duration: 0.2 },
            }}
            style={{ perspective: "400px" }}
          >
            {char}
          </motion.span>
        ))}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, clipPath: "inset(0 100% 0 0)" }}
        animate={{ opacity: 1, clipPath: "inset(0 0% 0 0)" }}
        transition={{ duration: 0.8, delay: 0.8, ease }}
        className="text-lg sm:text-xl mt-3 mb-10"
        style={{ color: "var(--fg-muted)" }}
      >
        {text404}
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 1.2, ease }}
      >
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 hover:scale-105"
          style={{
            background: "var(--accent)",
            color: "#fff",
            boxShadow: "var(--shadow-md)",
          }}
        >
          回到首页
        </Link>
      </motion.div>
    </div>
  );
}
