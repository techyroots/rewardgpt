"use client";

import { useEffect, useRef, useState } from "react";
import { ChatGptMark, ClaudeMark, GrokMark, RewardGptMark } from "./logos";

/**
 * The hero visual: a cashback receipt sitting above a soft aurora, with the
 * supported services stacked beside it.
 *
 * The whole group tilts very slightly towards the pointer. The effect is
 * deliberately small — enough to feel like the card has depth, not enough to
 * become the thing you look at — and it is skipped entirely on touch devices
 * and under prefers-reduced-motion.
 */
export function HeroArt() {
  const frame = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const node = frame.current;
    if (!node) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    if (reduced || coarse) return;

    let raf = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const box = node.getBoundingClientRect();
        // -1..1 from the centre of the art, then scaled down hard.
        const x = (event.clientX - (box.left + box.width / 2)) / box.width;
        const y = (event.clientY - (box.top + box.height / 2)) / box.height;
        setTilt({ x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)) });
      });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={frame}
      className="relative hidden h-[21rem] lg:block [perspective:1200px]"
      aria-hidden="true"
    >
      <div className="aurora" />

      <div
        className="absolute inset-0 transition-transform duration-300 ease-out [transform-style:preserve-3d]"
        style={{
          transform: `rotateX(${(-tilt.y * 5).toFixed(2)}deg) rotateY(${(tilt.x * 7).toFixed(2)}deg)`,
        }}
      >
        <RewardCard />
        <ServiceStack />
        <CashbackBadge />
      </div>
    </div>
  );
}

function RewardCard() {
  return (
    <div
      className="sheen absolute top-2 left-0 w-[21.5rem] -rotate-3 overflow-hidden rounded-3xl border border-line bg-surface p-5 card-float"
      style={{ transform: "translateZ(42px) rotate(-3deg)" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RewardGptMark className="size-5" />
          <span className="text-sm font-semibold tracking-tight">RewardGPT</span>
        </div>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-soft">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-accent" />
          </span>
          live
        </span>
      </div>

      <p className="mt-7 text-2xl leading-tight font-medium tracking-tight">
        Same AI tools.
        <br />
        More for you.
      </p>

      {/* A worked example, so the card shows the product rather than a slogan. */}
      <div className="mt-6 rounded-2xl border border-line bg-background p-3.5">
        <div className="flex items-center gap-2.5">
          <ChatGptMark className="size-7" />
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-medium">ChatGPT Plus</p>
            <p className="text-[11px] text-muted-soft">Verified · monthly</p>
          </div>
          <div className="text-right">
            <p className="text-[13px] font-semibold text-accent">+0.0087 SOL</p>
            <p className="text-[10.5px] text-muted-soft">≈ $1.00</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ServiceStack() {
  return (
    <div
      className="absolute top-9 right-0 flex flex-col gap-2.5"
      style={{ transform: "translateZ(78px) rotate(-6deg)" }}
    >
      {[ChatGptMark, ClaudeMark, GrokMark].map((Mark, index) => (
        <div
          key={index}
          className="float-soft rounded-2xl border border-line bg-surface p-2 card-float"
          style={{
            marginRight: `${(2 - index) * 16}px`,
            animationDelay: `${index * 0.55}s`,
          }}
        >
          <Mark className="size-8" />
        </div>
      ))}
    </div>
  );
}

function CashbackBadge() {
  return (
    <div
      className="float-soft absolute bottom-3 left-10 flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 card-float"
      style={{ transform: "translateZ(96px)", animationDelay: "1.1s" }}
    >
      <span className="text-base font-semibold tracking-tight text-accent">5%</span>
      <span className="text-[11.5px] leading-tight text-muted">
        back, every
        <br />
        month
      </span>
    </div>
  );
}
