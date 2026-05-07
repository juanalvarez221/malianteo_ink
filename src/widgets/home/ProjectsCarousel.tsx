"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ReelItem = {
  title: string;
  src: string;
};

const REELS: ReelItem[] = [
  {
    title: "Reel 01",
    src: "/reels/reel-DTlrOHUCbNq.mp4",
  },
  {
    title: "Reel 02",
    src: "/reels/reel-DRCx8l4jTDd.mp4",
  },
  {
    title: "Reel 03",
    src: "/reels/reel-DC-QB2th-3o.mp4",
  },
];

export function ProjectsCarousel() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = () => {
    setIndex((prev) => (prev + 1) % REELS.length);
  };

  const prev = () => {
    setIndex((prev) => (prev - 1 + REELS.length) % REELS.length);
  };

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(next, 7000);
    return () => clearInterval(id);
  }, [isPaused]);

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/65 p-5 md:p-8"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_220px_at_15%_0%,rgba(168,85,247,0.28),transparent_58%),radial-gradient(700px_280px_at_95%_100%,rgba(124,58,237,0.2),transparent_60%)]" />

      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/80">
          Proyectos destacados
        </p>
        <h3 className="typo-section mt-2 text-[2rem] md:text-[2.5rem]">
          Galería en video de Malianteo
        </h3>
        <p className="typo-body mt-3 max-w-3xl">
          Selección de videos de Malianteo independiente en reproducción automática, con una
          experiencia limpia, dinámica y profesional.
        </p>
      </div>

      <div className="relative mt-6">
        <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/50">
          <div className="relative mx-auto w-full max-w-[380px] py-2">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/70">
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="aspect-[9/16] w-full">
                <AnimatePresence mode="wait">
                  <motion.video
                    key={REELS[index].src}
                    title={REELS[index].title}
                    src={REELS[index].src}
                    className="h-full w-full"
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.985 }}
                    transition={{ duration: 1.1, ease: "easeInOut" }}
                  />
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-3 pb-3">
            <div className="typo-tech rounded-full border border-white/15 bg-black/45 px-3 py-1 text-zinc-200">
              {index + 1} / {REELS.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={prev}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-zinc-100 transition hover:bg-black/70"
                aria-label="Proyecto anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={next}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-zinc-100 transition hover:bg-black/70"
                aria-label="Proyecto siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </article>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {REELS.map((item, i) => (
            <button
              key={`${item.title}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                i === index
                  ? "border-violet-500/35 bg-violet-600/20 text-violet-100"
                  : "border-white/10 bg-white/5 text-zinc-200",
              ].join(" ")}
            >
              {item.title}
            </button>
          ))}
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full border border-white/10 bg-white/5">
          <motion.div
            key={index}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{
              duration: 7,
              ease: "linear",
            }}
            className="h-full rounded-full bg-gradient-to-r from-violet-400/80 to-fuchsia-300/80"
          />
        </div>
      </div>
    </section>
  );
}

