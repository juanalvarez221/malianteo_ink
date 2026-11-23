"use client";

/**
 * Home de Malianteo, pensada primero para celular.
 *
 * Hero: video a pantalla completa con parallax al hacer scroll. Todo lo que
 * se mueve con el scroll anima solo transform y opacity (nada de blur por
 * frame), así se mantiene fluido en teléfonos. Las alturas usan svh/lvh en
 * vez de dvh para que el hero no salte cuando la barra del navegador se
 * esconde o aparece.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { IdentityPortraits } from "@/widgets/home/IdentityPortraits";
import { SelectedWorks } from "@/widgets/home/SelectedWorks";
import { FourHandsWorks } from "@/widgets/home/FourHandsWorks";
import { PresentationCta } from "@/widgets/home/PresentationCta";
import { ContactLauncher } from "@/widgets/home/ContactLauncher";
import { Tour2027 } from "@/widgets/home/Tour2027";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { BRAND } from "@/shared/config/brand";
import { EASE_OUT_EXPO, Reveal } from "@/shared/ui/Reveal";
import { HeroScrollCue } from "@/widgets/home/HeroScrollCue";

/** Primera sección después del hero (destino de la flecha). */
const FIRST_SECTION_ID = "inicio-identidad";

type HeroSplashProps = {
  backgroundImageUrl: string;
  backgroundImageUrls?: string[];
  backgroundVideoUrl?: string;
  artistName: string;
  subtitle: string;
  wordmarkSrc?: string;
};

export function HeroSplash({
  backgroundImageUrl,
  backgroundImageUrls,
  backgroundVideoUrl,
  artistName,
  subtitle,
  wordmarkSrc,
}: HeroSplashProps) {
  const { t } = useSiteLanguage();
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroImages =
    backgroundImageUrls && backgroundImageUrls.length > 0
      ? backgroundImageUrls
      : [backgroundImageUrl];
  const useHeroCarousel = !backgroundVideoUrl && heroImages.length > 1;
  const currentHeroImage = heroImages[heroIndex] ?? backgroundImageUrl;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // Parallax del fondo: solo transform y opacity (compositor, sin repintar).
  const imageY = useTransform(scrollYProgress, [0, 1], [0, -72]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.78, 1], [1, 0.94, 0.72]);

  // La firma crece y se desvanece; el subtítulo se queda atrás.
  const markY = useTransform(scrollYProgress, [0, 1], [0, 14]);
  const markOpacity = useTransform(scrollYProgress, [0, 0.55, 1], [1, 0.76, 0.12]);
  const markScale = useTransform(scrollYProgress, [0, 0.55, 1], [0.92, 1.02, 1.14]);
  const subtitleY = useTransform(scrollYProgress, [0, 1], [0, 52]);
  const subtitleOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.4]);
  // La flecha cumple su función al empezar a bajar: se apaga rápido.
  const cueOpacity = useTransform(scrollYProgress, [0, 0.16], [1, 0]);

  useEffect(() => {
    if (!useHeroCarousel) return;
    const id = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroImages.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [heroImages.length, useHeroCarousel]);

  const enter = (delay: number, y = 14) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y },
          animate: { opacity: 1, y: 0 },
          transition: { delay, duration: 0.9, ease: EASE_OUT_EXPO },
        };

  return (
    <main className="home-page relative overflow-x-clip bg-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1100px_540px_at_8%_-8%,rgba(139,92,246,0.26),transparent_60%),radial-gradient(920px_480px_at_95%_6%,rgba(168,85,247,0.2),transparent_62%),radial-gradient(1200px_600px_at_50%_105%,rgba(91,33,182,0.2),transparent_64%)]" />
      <div className="pointer-events-none absolute -left-24 top-[36%] h-64 w-64 rounded-full bg-violet-500/18 blur-[95px] md:h-96 md:w-96" />
      <div className="pointer-events-none absolute -right-16 top-[58%] h-64 w-64 rounded-full bg-violet-600/16 blur-[95px] md:h-[26rem] md:w-[26rem]" />
      <div className="pointer-events-none absolute left-1/2 top-[74%] h-60 w-[82vw] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.2),transparent_68%)] blur-[46px]" />

      <section ref={sectionRef} className="relative h-[118svh] w-full">
        <motion.div
          className="sticky top-0 h-[100lvh] overflow-hidden will-change-transform"
          style={reduce ? undefined : { y: imageY, scale: imageScale, opacity: heroOpacity }}
        >
          {backgroundVideoUrl ? (
            // Recorte superior: el video es más alto que la pantalla y sobra
            // por arriba, así rostro y mano quedan sobre la firma y el botón
            // sin dejar franjas vacías abajo. En pantallas anchas el video se
            // ajusta por ancho y el mismo recorte lo sube la mitad, por eso
            // el porcentaje es mayor.
            <video
              key={backgroundVideoUrl}
              src={backgroundVideoUrl}
              className="absolute inset-x-0 -top-[18%] h-[118%] w-full object-cover object-center md:-top-[22%] md:h-[122%]"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              poster={backgroundImageUrl}
            />
          ) : (
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
          )}
          {/* Base oscura bajo la firma, el botón y la flecha: limpia el fondo
              (letras de la ropa) y da contraste sin tocar el rostro. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/90 via-black/50 to-transparent"
          />
        </motion.div>

        <div className="absolute inset-0 z-[2] bg-[radial-gradient(900px_500px_at_50%_0%,rgba(168,85,247,0.34),transparent_60%),radial-gradient(560px_280px_at_22%_16%,rgba(147,51,234,0.18),transparent_64%)]" />
        <div className="absolute inset-0 z-[2] bg-gradient-to-b from-transparent via-black/35 to-black/95" />
        <div className="absolute inset-0 z-[2] shadow-[inset_0_0_160px_40px_rgba(0,0,0,0.85)]" />

        {/* pb en celular: la flecha queda por encima del botón flotante de
            contacto y su aviso "Toca aquí" (abajo a la derecha). */}
        <div className="absolute inset-x-0 top-0 z-[4] flex h-[100svh] w-full flex-col items-center justify-end px-6 pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-center md:pb-10">
          {wordmarkSrc ? (
            <motion.div
              style={reduce ? undefined : { y: markY, opacity: markOpacity, scale: markScale }}
              className="z-20 w-[66vw] max-w-[340px] will-change-transform sm:max-w-[400px] md:w-[68vw] md:max-w-[820px]"
            >
              <motion.div
                {...(reduce
                  ? {}
                  : {
                      initial: { opacity: 0, y: 18, filter: "blur(8px)" },
                      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
                      transition: { duration: 1, ease: EASE_OUT_EXPO },
                    })}
                className="drop-shadow-[0_16px_36px_rgba(0,0,0,0.92)]"
              >
                <Image
                  src={wordmarkSrc}
                  alt={artistName}
                  width={BRAND.logo.width}
                  height={BRAND.logo.height}
                  priority
                  className="h-auto w-full object-contain"
                />
              </motion.div>
            </motion.div>
          ) : (
            <motion.h1
              {...enter(0, 12)}
              className="typo-hero text-[2.2rem] drop-shadow-[0_10px_28px_rgba(0,0,0,0.9)] md:text-[5rem]"
            >
              {artistName}
            </motion.h1>
          )}

          <motion.div style={reduce ? undefined : { y: subtitleY, opacity: subtitleOpacity }}>
            <motion.p
              {...enter(0.18, 10)}
              className="mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.26em] text-zinc-100/90 md:text-[0.84rem] md:tracking-[0.28em]"
            >
              {t("heroSubtitle") ?? subtitle}
            </motion.p>
          </motion.div>

          <motion.div {...enter(0.32)} className="mt-7 w-full max-w-[340px] md:mt-8 md:max-w-sm">
            <Link
              href="/cotizacion"
              className="btn-accent focus-ring typo-cta group inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2 rounded-xl px-5 py-3.5 md:py-4"
            >
              {t("heroCta")}
              <span className="transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-1">
                →
              </span>
            </Link>
          </motion.div>

          <motion.div
            style={reduce ? undefined : { opacity: cueOpacity }}
            className="mt-5 md:mt-6"
          >
            <motion.div {...enter(0.6, 8)}>
              <HeroScrollCue targetId={FIRST_SECTION_ID} />
            </motion.div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 z-20 h-1 w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      <section
        id={FIRST_SECTION_ID}
        className="relative z-20 mx-auto w-full max-w-6xl px-6 py-14 md:py-20"
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-[rgba(20,20,20,0.6)] p-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)] md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(520px_220px_at_10%_0%,rgba(168,85,247,0.2),transparent_58%),radial-gradient(620px_260px_at_100%_100%,rgba(124,58,237,0.16),transparent_60%)]" />
          <div className="relative z-10">
            <Reveal>
              <h2 className="typo-section max-w-4xl">{t("identityTitle")}</h2>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="typo-body mt-3 max-w-2xl text-zinc-200">{t("identityP1")}</p>
            </Reveal>

            <IdentityPortraits />
          </div>
        </div>
      </section>

      <Tour2027 />

      <SelectedWorks />
      <FourHandsWorks />
      <PresentationCta />

      <ContactLauncher />
    </main>
  );
}
