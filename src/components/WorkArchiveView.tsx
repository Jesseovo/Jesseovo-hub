"use client";

import Lenis from "lenis";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import AsciiHandCanvas from "./AsciiHandCanvas";
import styles from "./WorkArchiveView.module.css";

type Work = { title: string; image: string; href: string };

const works: Work[] = [
  {
    title: "last30days-cn / 中国平台深度研究引擎",
    image: "/projects/archive/last30days-cn.png",
    href: "https://github.com/Jesseovo/last30days-skill-cn",
  },
  {
    title: "PaperCash / 论文全流程辅助 AI Skill",
    image: "/projects/archive/papercash.png",
    href: "https://github.com/Jesseovo/PaperCash",
  },
  {
    title: "Piano Room / 高校琴房预约系统",
    image: "/projects/archive/piano-room.png",
    href: "https://github.com/Jesseovo/Piano-room",
  },
  {
    title: "AgentNexus / AI Agent 理解力传递协议",
    image: "/projects/archive/agentnexus.png",
    href: "https://github.com/Jesseovo/agentnexus",
  },
  {
    title: "亲人.skill / 会说话的温暖回忆录",
    image: "/projects/archive/miss-skill.png",
    href: "https://github.com/Jesseovo/Miss-Skill",
  },
  {
    title: "Doro / Jesse 的个人 AI 编程助手",
    image: "/projects/archive/doro.png",
    href: "https://github.com/Jesseovo/doro",
  },
];

const loopedWorks = Array.from({ length: 3 }, (_, copyIndex) =>
  works.map((work, workIndex) => ({ work, workIndex, copyIndex })),
).flat();

export default function WorkArchiveView() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [index, setIndex] = useState(0);
  const current = works[index] ?? works[0];

  useEffect(() => {
    const wrapper = scrollRef.current;
    const content = wrapper?.firstElementChild as HTMLElement | null;
    if (!wrapper || !content) return;

    const mobileQuery = window.matchMedia("(max-width: 750px)");
    let lenis: Lenis | null = null;
    let loopReady = false;

    const itemPosition = (item: HTMLAnchorElement) => {
      const itemRect = item.getBoundingClientRect();
      const wrapperRect = wrapper.getBoundingClientRect();
      return mobileQuery.matches
        ? wrapper.scrollLeft + itemRect.left - wrapperRect.left
        : wrapper.scrollTop + itemRect.top - wrapperRect.top;
    };

    const jumpToPosition = (position: number) => {
      if (mobileQuery.matches) {
        wrapper.scrollLeft = position;
      } else if (lenis) {
        lenis.scrollTo(position, { immediate: true, force: true });
      } else {
        wrapper.scrollTop = position;
      }
    };

    const moveToMiddleCopy = () => {
      if (loopReady) return;
      const middleFirst = itemRefs.current[works.length];
      if (!middleFirst) return;
      const viewportOffset = mobileQuery.matches
        ? wrapper.clientWidth * 0.05
        : wrapper.clientHeight * 0.12;
      jumpToPosition(Math.max(0, itemPosition(middleFirst) - viewportOffset));
      loopReady = true;
    };

    const scheduleMiddleCopy = () => {
      requestAnimationFrame(() => requestAnimationFrame(moveToMiddleCopy));
    };

    const syncScrollingMode = () => {
      loopReady = false;
      if (mobileQuery.matches) {
        lenis?.destroy();
        lenis = null;
      } else if (!lenis) {
        lenis = new Lenis({ wrapper, content, eventsTarget: wrapper, autoRaf: true, smoothWheel: true, syncTouch: true, lerp: 0.1, overscroll: false });
      }
      scheduleMiddleCopy();
    };

    const onScroll = () => {
      const wrapperRect = wrapper.getBoundingClientRect();
      const mobile = mobileQuery.matches;

      if (loopReady) {
        const middleFirst = itemRefs.current[works.length];
        const finalFirst = itemRefs.current[works.length * 2];
        if (middleFirst && finalFirst) {
          const middleStart = itemPosition(middleFirst);
          const loopSpan = itemPosition(finalFirst) - middleStart;
          const startBoundary = middleStart - loopSpan * 0.5;
          const endBoundary = middleStart + loopSpan * 1.5;
          const currentPosition = mobile ? wrapper.scrollLeft : wrapper.scrollTop;

          if (currentPosition < startBoundary) {
            jumpToPosition(currentPosition + loopSpan);
          } else if (currentPosition > endBoundary) {
            jumpToPosition(currentPosition - loopSpan);
          }
        }
      }

      const viewportAnchor = mobile
        ? wrapperRect.left + wrapper.clientWidth * 0.43
        : wrapperRect.top + wrapper.clientHeight * 0.36;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;

      itemRefs.current.forEach((item, itemIndex) => {
        if (!item) return;
        const rect = item.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const itemAnchor = mobile
          ? rect.left + rect.width / 2
          : rect.top + rect.height / 2;
        const distance = Math.abs(itemAnchor - viewportAnchor);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = itemIndex % works.length;
        }
      });

      setIndex(nearestIndex);
    };

    syncScrollingMode();
    wrapper.addEventListener("scroll", onScroll, { passive: true });
    mobileQuery.addEventListener("change", syncScrollingMode);
    onScroll();
    return () => {
      wrapper.removeEventListener("scroll", onScroll);
      mobileQuery.removeEventListener("change", syncScrollingMode);
      lenis?.destroy();
    };
  }, []);

  const scrollToWork = (nextIndex: number, direction: -1 | 1) => {
    const wrapper = scrollRef.current;
    if (!wrapper) return;

    const mobile = window.matchMedia("(max-width: 750px)").matches;
    const wrapperRect = wrapper.getBoundingClientRect();
    const viewportAnchor = mobile
      ? wrapperRect.left + wrapper.clientWidth * 0.43
      : wrapperRect.top + wrapper.clientHeight * 0.36;
    let nearestPhysicalIndex = works.length;
    let nearestDistance = Number.POSITIVE_INFINITY;

    itemRefs.current.forEach((candidate, candidateIndex) => {
      if (!candidate) return;
      const rect = candidate.getBoundingClientRect();
      const candidateAnchor = mobile
        ? rect.left + rect.width / 2
        : rect.top + rect.height / 2;
      const distance = Math.abs(candidateAnchor - viewportAnchor);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPhysicalIndex = candidateIndex;
      }
    });

    const item =
      itemRefs.current[nearestPhysicalIndex + direction] ??
      itemRefs.current[works.length + nextIndex];

    if (!item) return;

    const itemRect = item.getBoundingClientRect();

    if (mobile) {
      const targetLeft =
        wrapper.scrollLeft + itemRect.left - wrapperRect.left - wrapper.clientWidth * 0.05;
      wrapper.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
      setIndex(nextIndex);
      return;
    }

    const targetTop =
      wrapper.scrollTop + itemRect.top - wrapperRect.top - wrapper.clientHeight * 0.12;

    wrapper.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    setIndex(nextIndex);
  };

  const previousIndex = (index - 1 + works.length) % works.length;
  const nextIndex = (index + 1) % works.length;

  return (
    <section className={styles.archive} aria-label="Jesse 的精选项目" data-hand-works>
      <AsciiHandCanvas text={current.title} />
      <div className={styles.pattern} aria-hidden="true"><span /><span /><span /><span /><span /></div>
      <div ref={scrollRef} className={styles.scrollArea} data-archive-scroll>
        <div className={styles.contents}>
          <div className={styles.list}>
            {loopedWorks.map(({ work, workIndex, copyIndex }, itemIndex) => (
              <a
                className={`${styles.item} ${copyIndex === 1 ? "" : styles.loopClone}`}
                href={work.href}
                key={`${copyIndex}-${work.href}`}
                ref={(element) => { itemRefs.current[itemIndex] = element; }}
                target="_blank"
                rel="noreferrer"
                aria-hidden={copyIndex === 1 ? undefined : true}
                tabIndex={copyIndex === 1 ? undefined : -1}
                aria-label={`在 GitHub 查看 ${work.title}`}
              >
                <Image src={work.image} alt={copyIndex === 1 ? `${work.title} 项目封面` : ""} fill sizes="(max-width: 750px) 70vw, 300px" className={styles.thumbnail} priority={copyIndex === 1 && workIndex < 2} />
                <p className={styles.itemTitle}><span>Current :&nbsp; {work.title}</span></p>
              </a>
            ))}
          </div>
          <button type="button" className={styles.prev} onClick={() => scrollToWork(previousIndex, -1)}>Prev : {works[previousIndex].title}</button>
          <button type="button" className={styles.next} onClick={() => scrollToWork(nextIndex, 1)}>Next : {works[nextIndex].title}</button>
        </div>
      </div>
      <div className={styles.contact} aria-hidden="true">問</div>
      <div className={styles.sounds} aria-label="声音控制"><button type="button">音</button><button type="button">有 / 無</button></div>
    </section>
  );
}
