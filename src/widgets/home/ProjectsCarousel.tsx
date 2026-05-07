"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const REELS = [
  {
    kind: "video" as const,
    src: "/reels/reel-DTlrOHUCbNq.mp4",
  },
  {
    kind: "video" as const,
    src: "/reels/reel-DRCx8l4jTDd.mp4",
  },
  {
    kind: "video" as const,
    src: "/reels/reel-DC-QB2th-3o.mp4",
  },
  {
    kind: "instagram" as const,
    src: "https://www.instagram.com/reel/DW2JpgDKBSZ/embed",
    href: "https://www.instagram.com/p/DW2JpgDKBSZ/",
  },
] as const;

export function ProjectsCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const delay = REELS[index].kind === "instagram" ? 12000 : 7000;
    const id = setTimeout(() => {
      setIndex((prev) => (prev + 1) % REELS.length);
    }, delay);
    return () => clearTimeout(id);
  }, [index]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/65 p-5 md:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(500px_220px_at_15%_0%,rgba(168,85,247,0.28),transparent_58%),radial-gradient(700px_280px_at_95%_100%,rgba(124,58,237,0.2),transparent_60%)]" />

      <div className="relative z-10">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/80">
          Movimiento y detalle
        </p>
        <h3 className="typo-section mt-2 text-[2rem] md:text-[2.5rem]">
          Showreel continuo de Malianteo
        </h3>
        <p className="typo-body mt-3 max-w-3xl">
          Una secuencia automática de piezas reales: composición, contraste y
          técnica en flujo constante, sin intervención manual.
        </p>
      </div>

      <div className="relative mt-6">
        <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black/50">
          <div className="relative mx-auto w-full max-w-[380px] py-2">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/70">
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="aspect-[9/16] w-full">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={REELS[index].src}
                    className="relative h-full w-full"
                    initial={{ opacity: 0, scale: 1.02 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.985 }}
                    transition={{ duration: 1.1, ease: "easeInOut" }}
                  >
                    {REELS[index].kind === "video" ? (
                      <video
                        title="Showreel automático de Malianteo"
                        src={REELS[index].src}
                        className="h-full w-full"
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                      />
                    ) : (
                      <div className="relative h-full w-full bg-black">
                        <iframe
                          src={REELS[index].src}
                          title="Reel de Instagram de Malianteo"
                          className="h-full w-full border-0"
                          loading="eager"
                          allow="autoplay; encrypted-media; clipboard-write; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                        />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-20 flex items-center px-3 pb-3">
            <div className="typo-tech rounded-full border border-white/15 bg-black/45 px-3 py-1 text-zinc-200">
              {REELS[index].kind === "instagram" ? "Reel oficial en Instagram" : "Reproducción automática en bucle"}
            </div>
            {REELS[index].kind === "instagram" ? (
              <a
                href={REELS[index].href}
                target="_blank"
                rel="noreferrer"
                className="typo-tech ml-2 rounded-full border border-violet-400/35 bg-violet-500/20 px-3 py-1 text-violet-100 transition hover:bg-violet-500/30"
              >
                Abrir reel
              </a>
            ) : null}
          </div>
        </article>

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

