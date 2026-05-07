"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const PHOTOS = [
  { src: "/brand/teo1.png", alt: "Malianteo retrato 1" },
  { src: "/brand/teo2.png", alt: "Malianteo retrato 2" },
  { src: "/brand/teo3.png", alt: "Malianteo retrato 3" },
];

export function TeoIntroCarousel() {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = () => {
    setIndex((prev) => (prev + 1) % PHOTOS.length);
  };

  const prev = () => {
    setIndex((prev) => (prev - 1 + PHOTOS.length) % PHOTOS.length);
  };

  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      next();
    }, 6200);
    return () => clearInterval(id);
  }, [isPaused]);

  return (
    <div
      className="mt-6 grid items-start gap-4 lg:grid-cols-[1fr_auto]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
        <div className="relative h-[340px] sm:h-[420px] md:h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={PHOTOS[index].src}
              initial={{ opacity: 0, x: 16, scale: 1.01 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -16, scale: 0.99 }}
              transition={{ duration: 0.95, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Image
                src={PHOTOS[index].src}
                alt={PHOTOS[index].alt}
                fill
                quality={100}
                sizes="(max-width: 1024px) 100vw, 70vw"
                className="object-cover object-center"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-3 pb-3">
          <div className="typo-tech rounded-full border border-white/15 bg-black/45 px-3 py-1 text-zinc-200">
            {index + 1} / {PHOTOS.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-zinc-100 transition hover:bg-black/70"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-zinc-100 transition hover:bg-black/70"
              aria-label="Foto siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:flex-col lg:pt-4">
        {PHOTOS.map((item, i) => (
          <button
            key={item.src}
            type="button"
            onClick={() => setIndex(i)}
            className={[
              "relative h-16 w-16 overflow-hidden rounded-xl border transition md:h-18 md:w-18",
              i === index
                ? "border-violet-400/60 shadow-[0_0_18px_rgba(139,92,246,0.35)]"
                : "border-white/15 opacity-70 hover:opacity-100",
            ].join(" ")}
            aria-label={`Ver foto ${i + 1}`}
          >
            <Image
              src={item.src}
              alt={item.alt}
              fill
              quality={100}
              sizes="72px"
              className="object-cover bg-black/70"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

