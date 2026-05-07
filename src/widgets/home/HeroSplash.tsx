"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { Camera, ChevronDown } from "lucide-react";
import { ProjectsCarousel } from "@/widgets/home/ProjectsCarousel";
import { TeoIntroCarousel } from "@/widgets/home/TeoIntroCarousel";

type HeroSplashProps = {
  backgroundImageUrl: string;
  backgroundImageUrls?: string[];
  artistName: string;
  subtitle: string;
  wordmarkSrc?: string;
};

export function HeroSplash({
  backgroundImageUrl,
  backgroundImageUrls,
  artistName,
  subtitle,
  wordmarkSrc,
}: HeroSplashProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [direction, setDirection] = useState<"up" | "down">("down");
  const [heroIndex, setHeroIndex] = useState(0);
  const heroImages =
    backgroundImageUrls && backgroundImageUrls.length > 0
      ? backgroundImageUrls
      : [backgroundImageUrl];
  const currentHeroImage = heroImages[heroIndex] ?? backgroundImageUrl;

  const { scrollYProgress, scrollY } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  useMotionValueEvent(scrollY, "change", (latest) => {
    const previous = scrollY.getPrevious() ?? latest;
    if (latest > previous) setDirection("down");
    if (latest < previous) setDirection("up");
  });

  // Base parallax that always tracks scroll progress.
  const imageY = useTransform(scrollYProgress, [0, 1], [0, -72]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  const markY = useTransform(scrollYProgress, [0, 1], [28, 88]);
  const markOpacity = useTransform(scrollYProgress, [0, 0.55, 1], [1, 0.72, 0.08]);
  const markScale = useTransform(scrollYProgress, [0, 0.55, 1], [1, 1.08, 1.2]);
  const markBlur = useTransform(scrollYProgress, [0, 0.7, 1], [0, 0.6, 2.8]);
  const markFilter = useMotionTemplate`blur(${markBlur}px)`;
  const subtitleY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const subtitleOpacity = useTransform(scrollYProgress, [0, 1], [0.92, 0.45]);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const id = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [heroImages.length]);

  return (
    <main className="relative overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_540px_at_8%_-8%,rgba(139,92,246,0.26),transparent_60%),radial-gradient(920px_480px_at_95%_6%,rgba(168,85,247,0.2),transparent_62%),radial-gradient(1200px_600px_at_50%_105%,rgba(91,33,182,0.2),transparent_64%)]" />
      <div className="pointer-events-none absolute -left-24 top-[36%] h-64 w-64 rounded-full bg-violet-500/18 blur-[95px] md:h-96 md:w-96" />
      <div className="pointer-events-none absolute -right-16 top-[58%] h-64 w-64 rounded-full bg-fuchsia-500/14 blur-[95px] md:h-[26rem] md:w-[26rem]" />
      <div className="pointer-events-none absolute left-1/2 top-[74%] h-60 w-[82vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.2),transparent_68%)] blur-[46px]" />
      <section ref={sectionRef} className="relative h-[100dvh] w-full overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{ y: imageY, scale: imageScale }}
          animate={
            direction === "down"
              ? { rotateZ: 0.12 }
              : { rotateZ: -0.08 }
          }
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentHeroImage}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.985 }}
              transition={{ duration: 1.1, ease: "easeInOut" }}
              className="absolute inset-0"
            >
              <Image
                src={currentHeroImage}
                alt={`${artistName} Tattoo Artist`}
                fill
                priority
                quality={100}
                sizes="100vw"
                className="object-cover object-center"
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_50%_0%,rgba(168,85,247,0.34),transparent_60%),radial-gradient(560px_280px_at_22%_16%,rgba(147,51,234,0.18),transparent_64%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/35 to-black/95" />
        <div className="absolute inset-0 shadow-[inset_0_0_160px_40px_rgba(0,0,0,0.85)]" />

        <div className="relative z-10 flex h-full w-full flex-col items-center justify-end px-6 pb-20 text-center">
          {wordmarkSrc ? (
            <motion.div
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={
                direction === "down"
                  ? { opacity: 1, y: 0, filter: "blur(0px)" }
                  : { opacity: 0.95, y: -4, filter: "blur(0.2px)" }
              }
              transition={{ duration: 0.45, ease: "easeOut" }}
              style={{
                y: markY,
                opacity: markOpacity,
                scale: markScale,
                filter: markFilter,
              }}
              className="relative z-20 w-[92vw] max-w-[1200px] drop-shadow-[0_16px_36px_rgba(0,0,0,0.92)] will-change-transform"
              aria-label={artistName}
            >
              <Image
                src={wordmarkSrc}
                alt={artistName}
                width={2200}
                height={680}
                priority
                className="h-auto w-full object-contain"
              />
            </motion.div>
          ) : (
            <motion.h1
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ y: markY, opacity: markOpacity }}
              className="typo-hero drop-shadow-[0_10px_28px_rgba(0,0,0,0.9)]"
            >
              {artistName}
            </motion.h1>
          )}

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={
              direction === "down"
                ? { opacity: 0.92, y: 0 }
                : { opacity: 0.85, y: -3 }
            }
            transition={{ delay: 0.05, duration: 0.45, ease: "easeOut" }}
            style={{ y: subtitleY, opacity: subtitleOpacity }}
            className="typo-subtitle mt-2 uppercase tracking-[0.32em] text-zinc-200"
          >
            {subtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.5, ease: "easeOut" }}
            className="mt-6 w-full max-w-sm"
          >
            <Link
              href="/cotizacion"
              className="typo-cta group inline-flex w-full items-center justify-center gap-2 rounded-xl border border-violet-500/35 bg-gradient-to-r from-violet-700 to-fuchsia-600 px-5 py-4 text-white shadow-[0_0_28px_rgba(139,92,246,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgba(139,92,246,0.4)] active:translate-y-0"
            >
              Cotizar ahora
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.45 }}
            className="mt-5 flex flex-col items-center gap-1"
          >
            <motion.span
              animate={{ y: [0, 4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/35"
            >
              <ChevronDown className="h-4 w-4 text-zinc-200" />
            </motion.span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-300/90">
              Desliza hacia abajo
            </p>
          </motion.div>
        </div>

        <div className="absolute bottom-0 z-20 h-1 w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-14 md:py-20">
        <div className="glass-card relative overflow-hidden rounded-3xl p-5 md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_220px_at_10%_0%,rgba(168,85,247,0.2),transparent_58%),radial-gradient(620px_260px_at_100%_100%,rgba(124,58,237,0.16),transparent_60%)]" />
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/80">
              Presentación
            </p>
            <h2 className="typo-section mt-2">
              ¿Quién es Malianteo?
            </h2>
            <p className="typo-body mt-3 max-w-3xl">
              Hey, mucho gusto. Mi nombre es Mateo, artista de la ciudad de
              Medellín y experto en realismo oscuro. Mi enfoque es convertir tu
              idea en una pieza única, con carácter, detalle y una estética
              impecable.
            </p>
            <p className="typo-body mt-2 max-w-3xl">
              Si estás buscando a alguien que haga realidad ese sueño en la piel,
              estás en el lugar correcto.
            </p>

            <TeoIntroCarousel />
          </div>
        </div>

        <div className="relative mt-8 md:mt-10">
          <div className="pointer-events-none absolute -left-8 -top-4 h-24 w-24 rounded-full bg-violet-500/15 blur-[42px]" />
          <div className="pointer-events-none absolute -right-6 bottom-0 h-24 w-24 rounded-full bg-fuchsia-500/12 blur-[42px]" />
          <ProjectsCarousel />
        </div>
      </section>

      <motion.a
        href="https://www.instagram.com/malianteo_ink/"
        target="_blank"
        rel="noreferrer"
        aria-label="Ir al Instagram de Malianteo"
        initial={{ opacity: 0, y: 18, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.5, ease: "easeOut" }}
        whileHover={{ y: -2, scale: 1.03 }}
        className="group fixed bottom-6 right-5 z-[70] inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-black/60 text-zinc-100 backdrop-blur-xl shadow-[0_16px_36px_-18px_rgba(168,85,247,0.72)] transition hover:border-fuchsia-300/45 hover:text-white"
      >
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-[0_0_24px_rgba(168,85,247,0.5)]">
          <Camera className="h-5 w-5" />
        </span>
      </motion.a>
    </main>
  );
}

