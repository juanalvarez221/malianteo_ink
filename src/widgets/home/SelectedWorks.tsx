"use client";

/**
 * Portafolio en movimiento — carrusel coverflow 3D (Embla + tween por
 * progreso de scroll). Solo imágenes y video: sin nombres, números ni textos.
 *
 * - Cada slide es una obra (nunca se repite; las colaboraciones viven en
 *   "Proyectos en colaboración"). La obra centrada recorre sus propias fotos y su
 *   video con fundido; al terminar, el carrusel avanza solo.
 * - Arrastre con inercia, bucle infinito, flechas, teclado y puntos.
 * - Se pausa al interactuar, fuera de pantalla o con el visor abierto.
 * - Clic en la obra central: visor a pantalla completa.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import type { EmblaCarouselType } from "embla-carousel";
import { useInView, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { BrandWatermark } from "@/shared/ui/BrandWatermark";
import { Reveal } from "@/shared/ui/Reveal";
import {
  ActiveVideo,
  MediaViewer,
  type ViewerMedia,
  type ViewerState,
} from "@/widgets/home/media/MediaViewer";

/** Una entrada por obra: fotos y videos de la misma pieza van juntos. */
const WORKS: readonly (readonly ViewerMedia[])[] = [
  [
    { kind: "image", src: "/reels/shot-2.jpg", position: "center 30%" },
    { kind: "image", src: "/reels/shot-3.jpg", position: "center 30%" },
    { kind: "video", src: "/reels/reel-saveclip-2.mp4", poster: "/reels/shot-2.jpg" },
  ],
  [
    { kind: "video", src: "/reels/reel-DTlrOHUCbNq.mp4", poster: "/works/reel-DTlrOHUCbNq-poster.jpg" },
    { kind: "video", src: "/reels/reel-DRCx8l4jTDd.mp4", poster: "/works/reel-DRCx8l4jTDd-poster.jpg" },
  ],
  [
    { kind: "image", src: "/reels/shot-8.jpg" },
    { kind: "image", src: "/reels/shot-7.jpg" },
    { kind: "image", src: "/reels/shot-6.jpg" },
  ],
  [{ kind: "video", src: "/reels/reel-saveclip-1.mp4", poster: "/works/reel-saveclip-1-poster.jpg" }],
  [
    { kind: "image", src: "/reels/shot-1.jpg" },
    { kind: "image", src: "/reels/shot-4.jpg" },
  ],
  [{ kind: "video", src: "/reels/reel-saveclip-4.mp4", poster: "/works/reel-saveclip-4-poster.jpg" }],
];

const IMAGE_MS = 3200;
const VIDEO_MS = 6500;

/** Coverflow: rotación, escala, acercamiento al centro y sombreado. */
function applyCoverflow(api: EmblaCarouselType, nodes: HTMLElement[], flat: boolean) {
  const engine = api.internalEngine();
  const progress = api.scrollProgress();
  const snaps = api.scrollSnapList();
  const count = snaps.length;

  snaps.forEach((snap, snapIndex) => {
    engine.slideRegistry[snapIndex].forEach((slideIndex) => {
      let diff = snap - progress;
      if (engine.options.loop) {
        engine.slideLooper.loopPoints.forEach((loopItem) => {
          const target = loopItem.target();
          if (slideIndex === loopItem.index && target !== 0) {
            diff = Math.sign(target) === -1 ? snap - (1 + progress) : snap + (1 - progress);
          }
        });
      }
      const node = nodes[slideIndex];
      if (!node) return;
      const d = Math.max(-3, Math.min(3, diff * count)); // distancia en "slides"
      const abs = Math.min(Math.abs(d), 2);
      const shade = node.querySelector<HTMLElement>("[data-shade]");
      if (flat) {
        node.style.transform = `scale(${1 - abs * 0.08})`;
      } else {
        const rotate = Math.max(-48, Math.min(48, -d * 32));
        node.style.transform = `perspective(1400px) translateX(${-d * 9}%) rotateY(${rotate}deg) scale(${1 - abs * 0.14})`;
      }
      node.style.zIndex = String(100 - Math.round(abs * 10));
      if (shade) shade.style.opacity = String(Math.min(0.7, abs * 0.42));
    });
  });
}

function WorkSlide({
  media,
  active,
  step,
}: {
  media: readonly ViewerMedia[];
  active: boolean;
  step: number;
}) {
  const shown = active ? step : 0;

  return (
    <>
      {media.map((item, i) => {
        const visible = i === shown;
        return (
          <div
            key={item.src + i}
            aria-hidden={!visible}
            className={[
              "absolute inset-0 transition-opacity duration-700 ease-out",
              visible ? "opacity-100" : "opacity-0",
            ].join(" ")}
          >
            {item.kind === "image" ? (
              <Image
                src={item.src}
                alt=""
                fill
                quality={88}
                sizes="(min-width: 1024px) 26vw, (min-width: 768px) 32vw, (min-width: 640px) 44vw, 74vw"
                draggable={false}
                className={[
                  "select-none object-cover transition-transform ease-out",
                  active && visible ? "scale-[1.08] duration-[4000ms]" : "scale-100 duration-700",
                ].join(" ")}
                style={{ objectPosition: item.position ?? "center" }}
              />
            ) : (
              <ActiveVideo src={item.src} poster={item.poster} active={active && visible} label="" />
            )}
          </div>
        );
      })}
    </>
  );
}

export function SelectedWorks() {
  const { t } = useSiteLanguage();
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.35 });
  const [emblaRef, api] = useEmblaCarousel({ loop: true, align: "center", duration: 32 });
  const [selected, setSelected] = useState(0);
  const [step, setStep] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [viewer, setViewer] = useState<ViewerState>(null);
  const closeViewer = useCallback(() => setViewer(null), []);
  const paused = hovering || dragging || !inView || viewer !== null;

  // Tween coverflow + estado de selección.
  useEffect(() => {
    if (!api) return;
    const nodes = api.slideNodes().map((n) => n.querySelector<HTMLElement>("[data-tween]")!);
    const tween = () => applyCoverflow(api, nodes, Boolean(reduce));
    const onSelect = () => {
      setSelected(api.selectedScrollSnap());
      setStep(0);
    };
    const onDown = () => setDragging(true);
    const onSettle = () => setDragging(false);
    tween();
    onSelect();
    api
      .on("scroll", tween)
      .on("reInit", tween)
      .on("slideFocus", tween)
      .on("select", onSelect)
      .on("pointerDown", onDown)
      .on("settle", onSettle);
    return () => {
      api
        .off("scroll", tween)
        .off("reInit", tween)
        .off("slideFocus", tween)
        .off("select", onSelect)
        .off("pointerDown", onDown)
        .off("settle", onSettle);
    };
  }, [api, reduce]);

  // La obra central recorre su media; al terminar, pasa a la siguiente obra.
  useEffect(() => {
    if (!api || paused) return;
    const media = WORKS[selected];
    const current = media[step];
    const id = window.setTimeout(
      () => {
        if (step < media.length - 1) setStep(step + 1);
        else api.scrollNext();
      },
      current?.kind === "video" ? VIDEO_MS : IMAGE_MS,
    );
    return () => window.clearTimeout(id);
  }, [api, paused, selected, step]);

  const onSlideClick = (index: number) => {
    if (!api) return;
    if (index !== selected) {
      api.scrollTo(index);
      return;
    }
    setViewer({ media: WORKS[index], title: t("worksTitle"), startIndex: step });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") api?.scrollPrev();
    if (e.key === "ArrowRight") api?.scrollNext();
  };

  const media = WORKS[selected];

  return (
    <section
      ref={sectionRef}
      id="obra"
      aria-labelledby="selected-works-heading"
      aria-roledescription="carousel"
      className="relative z-20 w-full scroll-mt-20 py-14 md:py-20"
    >
      <header className="mx-auto flex w-full max-w-6xl items-end justify-between gap-6 px-6">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/80">
            {t("worksTag")}
          </p>
          <h2 id="selected-works-heading" className="typo-section mt-2">
            {t("worksTitle")}
          </h2>
        </Reveal>
        <div className="hidden shrink-0 gap-2 md:flex">
          <NavButton label={t("collabPrev")} onClick={() => api?.scrollPrev()}>
            <ChevronLeft className="h-5 w-5" />
          </NavButton>
          <NavButton label={t("collabNext")} onClick={() => api?.scrollNext()}>
            <ChevronRight className="h-5 w-5" />
          </NavButton>
        </div>
      </header>

      <div
        className="relative mt-8 md:mt-12"
        onPointerEnter={(e) => e.pointerType === "mouse" && setHovering(true)}
        onPointerLeave={() => setHovering(false)}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-[90px]"
        />
        <div
          ref={emblaRef}
          tabIndex={0}
          onKeyDown={onKeyDown}
          className="relative overflow-hidden py-6 outline-none [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)] focus-visible:ring-2 focus-visible:ring-violet-400/60"
        >
          <div className="flex touch-pan-y">
            {WORKS.map((work, index) => (
              <div
                key={index}
                className="min-w-0 flex-[0_0_74%] px-2 sm:flex-[0_0_44%] md:flex-[0_0_32%] md:px-3 lg:flex-[0_0_26%]"
                aria-roledescription="slide"
              >
                <div data-tween className="relative will-change-transform">
                  <button
                    type="button"
                    onClick={() => onSlideClick(index)}
                    aria-label={index === selected ? t("collabOpenViewer") : t("collabNext")}
                    tabIndex={index === selected ? 0 : -1}
                    className="relative block aspect-[4/5] w-full cursor-pointer overflow-hidden rounded-[1.75rem] bg-zinc-950 ring-1 ring-white/10 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.95)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400"
                  >
                    <WorkSlide media={work} active={index === selected} step={step} />
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/4 bg-gradient-to-t from-black/50 to-transparent"
                    />
                    <BrandWatermark size="sm" />
                    <span
                      aria-hidden
                      data-shade
                      className="pointer-events-none absolute inset-0 z-30 bg-black"
                      style={{ opacity: 0 }}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Avance: segmentos de la obra central + puntos de obra (sin números). */}
      <div className="mx-auto mt-6 flex w-full max-w-6xl flex-col items-center gap-5 px-6">
        <div aria-hidden className="flex w-40 gap-1.5">
          {media.map((item, i) => (
            <span key={`${selected}-${i}`} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/15">
              <span
                className="block h-full origin-left rounded-full bg-gradient-to-r from-violet-300 to-violet-500"
                style={
                  i < step
                    ? { transform: "scaleX(1)" }
                    : i === step && !reduce
                      ? {
                          animation: `worksSegment ${item.kind === "video" ? VIDEO_MS : IMAGE_MS}ms linear forwards`,
                          animationPlayState: paused ? "paused" : "running",
                        }
                      : { transform: "scaleX(0)" }
                }
              />
            </span>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <NavButton label={t("collabPrev")} onClick={() => api?.scrollPrev()} className="md:hidden">
            <ChevronLeft className="h-5 w-5" />
          </NavButton>
          <div className="flex items-center gap-1" role="group" aria-label={t("worksTitle")}>
            {WORKS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => api?.scrollTo(i)}
                aria-label={`${i + 1} / ${WORKS.length}`}
                aria-current={i === selected ? "true" : undefined}
                className="group/dot flex h-8 items-center px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
              >
                <span
                  className={[
                    "block h-1.5 rounded-full transition-all duration-500",
                    i === selected ? "w-6 bg-white" : "w-1.5 bg-white/30 group-hover/dot:bg-white/60",
                  ].join(" ")}
                />
              </button>
            ))}
          </div>
          <NavButton label={t("collabNext")} onClick={() => api?.scrollNext()} className="md:hidden">
            <ChevronRight className="h-5 w-5" />
          </NavButton>
        </div>
      </div>

      <MediaViewer state={viewer} onClose={closeViewer} />
    </section>
  );
}

function NavButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-white transition hover:border-violet-300/60 hover:bg-violet-400/15 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}
