"use client";

/**
 * Proyectos en colaboración: un espacio propio para cada obra hecha junto a
 * otros artistas. Las obras no se numeran; cada una se identifica por su
 * nombre.
 *
 * Mobile first: en celular y en escritorio los paneles se apilan al hacer
 * scroll. Cada panel se fija arriba, el siguiente se desliza encima y el de
 * atrás se reduce y se oscurece (solo transform y opacity, en capas propias).
 * En celular cada panel ocupa la pantalla (y termina por encima del botón
 * flotante de contacto): galería arriba y una ficha compacta abajo (chips de
 * artistas). En escritorio: galería a la izquierda
 * y ficha completa a la derecha. Nunca hay texto sobre la foto.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, Play } from "lucide-react";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { BrandWatermark } from "@/shared/ui/BrandWatermark";
import { Reveal } from "@/shared/ui/Reveal";
import {
  ActiveVideo,
  MediaViewer,
  coverOf,
  pad,
  useSelectedIndex,
  type ViewerState,
} from "@/widgets/home/media/MediaViewer";
import { ArtistChips, ArtistList } from "./collabs/ArtistCredits";
import { COLLABORATIONS, type Collaboration } from "./collabs/data";

const TOTAL = COLLABORATIONS.length;

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/80 active:scale-95 disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
    >
      {children}
    </button>
  );
}

function CollabPanel({
  item,
  index,
  active,
  stacked,
  progress,
  onOpen,
}: {
  item: Collaboration;
  index: number;
  active: boolean;
  stacked: boolean;
  progress: MotionValue<number>;
  onOpen: (startIndex: number) => void;
}) {
  const { t } = useSiteLanguage();
  const [emblaRef, api] = useEmblaCarousel({ duration: 26 });
  const slide = useSelectedIndex(api);
  const title = t(item.titleKey);
  const multiple = item.media.length > 1;

  // Al quedar cubierto por el siguiente panel, este se reduce y se oscurece.
  const start = index / TOTAL;
  const depth = TOTAL - 1 - index;
  const scale = useTransform(progress, [start, 1], [1, 1 - depth * 0.035]);
  const shade = useTransform(progress, [start, 1], [0, depth * 0.22]);

  return (
    <motion.article
      id={`collab-${item.id}`}
      data-collab-panel
      aria-labelledby={`collab-${item.id}-title`}
      style={
        stacked
          ? {
              scale,
              top: `calc(var(--stack-top) + var(--stack-step) * ${index})`,
              transformOrigin: "top center",
            }
          : undefined
      }
      className={[
        "relative flex h-[calc(100svh-7.25rem)] max-h-[52rem] min-h-[26rem] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b0812] p-2 shadow-[0_-24px_60px_-30px_rgba(0,0,0,0.9)] md:grid md:h-[min(calc(100svh-8.5rem),660px)] md:min-h-0 md:grid-cols-12 md:gap-8 md:rounded-[2rem] md:p-4",
        stacked ? "sticky will-change-transform" : "",
      ].join(" ")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_320px_at_100%_0%,rgba(139,92,246,0.16),transparent_60%)]"
      />

      {/* Galería: toca la foto para verla de cerca. */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.35rem] bg-zinc-950 ring-1 ring-white/10 md:col-span-7 md:h-full md:rounded-[1.5rem]">
        <div className="h-full cursor-zoom-in overflow-hidden" ref={emblaRef} onClick={() => onOpen(slide)}>
          <div className="flex h-full touch-pan-y">
            {item.media.map((media, i) => (
              <div
                key={media.src + i}
                className="relative h-full min-w-0 flex-[0_0_100%]"
                aria-roledescription="slide"
                aria-label={`${pad(i + 1)} / ${pad(item.media.length)}`}
              >
                {media.kind === "image" ? (
                  <Image
                    src={media.src}
                    alt={`${title} · ${t("collabPhotoLabel")} ${pad(i + 1)}`}
                    fill
                    quality={90}
                    sizes="(min-width: 1152px) 640px, (min-width: 768px) 56vw, 92vw"
                    draggable={false}
                    className="select-none object-cover"
                    style={{ objectPosition: media.position ?? "center" }}
                  />
                ) : (
                  <ActiveVideo
                    src={media.src}
                    poster={media.poster}
                    active={active && slide === i}
                    label={`${title} · ${t("collabProcessLabel")}`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Segmentos de progreso de la galería */}
        {multiple ? (
          <div aria-hidden className="pointer-events-none absolute inset-x-4 top-4 z-30 flex gap-1.5">
            {item.media.map((_, i) => (
              <span key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
                <span
                  className={[
                    "block h-full rounded-full bg-white transition-transform duration-500 ease-out origin-left",
                    i <= slide ? "scale-x-100" : "scale-x-0",
                  ].join(" ")}
                />
              </span>
            ))}
          </div>
        ) : null}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/55 to-transparent"
        />
        <BrandWatermark />

        <div className="absolute right-3 top-8 z-30 md:right-4 md:top-9">
          <IconButton label={t("collabOpenViewer")} onClick={() => onOpen(slide)}>
            <Expand className="h-4 w-4" />
          </IconButton>
        </div>

        {multiple ? (
          <div className="absolute bottom-3 left-3 z-30 flex gap-2 md:bottom-4 md:left-4">
            <IconButton label={t("collabPrev")} onClick={() => api?.scrollPrev()} disabled={slide === 0}>
              <ChevronLeft className="h-5 w-5" />
            </IconButton>
            <IconButton
              label={t("collabNext")}
              onClick={() => api?.scrollNext()}
              disabled={slide === item.media.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </IconButton>
          </div>
        ) : null}

        {stacked ? (
          <motion.span
            aria-hidden
            style={{ opacity: shade }}
            className="pointer-events-none absolute inset-0 z-40 bg-black will-change-[opacity]"
          />
        ) : null}
      </div>

      {/* Ficha */}
      <div className="relative flex shrink-0 flex-col px-2 pb-1.5 pt-3.5 md:col-span-5 md:px-0 md:py-4 md:pr-4">
        <div className="flex min-h-9 items-center justify-between gap-4 md:min-h-0">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/80">
            {t("collabEyebrow")}
          </span>
          <button
            type="button"
            onClick={() => onOpen(slide)}
            className="btn-accent inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300 md:hidden"
          >
            {t("collabViewWork")}
            <Expand className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>

        <h3
          id={`collab-${item.id}-title`}
          className="mt-1.5 font-[family-name:var(--font-display)] text-[clamp(1rem,4.6vw,1.5rem)] font-bold uppercase leading-[1.2] tracking-[0.08em] text-white [overflow-wrap:anywhere] md:mt-8 md:text-[clamp(1.1rem,1.75vw,1.6rem)]"
        >
          {title}
        </h3>

        <div className="mt-3 md:hidden">
          <ArtistChips artists={item.artists} />
        </div>
        <div className="mt-8 hidden md:block">
          <ArtistList artists={item.artists} />
        </div>

        <div className="mt-auto hidden items-end justify-between gap-4 pt-6 md:flex">
          {multiple ? (
            <div className="flex gap-2" role="group" aria-label={title}>
              {item.media.map((media, i) => (
                <button
                  key={media.src + i}
                  type="button"
                  onClick={() => api?.scrollTo(i)}
                  aria-label={
                    media.kind === "video"
                      ? `${title} · ${t("collabProcessLabel")}`
                      : `${title} · ${t("collabPhotoLabel")} ${pad(i + 1)}`
                  }
                  aria-current={i === slide ? "true" : undefined}
                  className={[
                    "relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-900 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
                    i === slide ? "ring-2 ring-violet-300" : "opacity-55 ring-1 ring-white/10 hover:opacity-90",
                  ].join(" ")}
                >
                  <Image
                    src={coverOf(media)}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-cover"
                    style={{ objectPosition: media.kind === "image" ? media.position ?? "center" : "center" }}
                  />
                  {media.kind === "video" ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="ml-0.5 h-3.5 w-3.5 fill-white text-white" />
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}

          <button
            type="button"
            onClick={() => onOpen(slide)}
            className="btn-accent inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
          >
            {t("collabViewWork")}
            <Expand className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function FourHandsWorks() {
  const { t } = useSiteLanguage();
  const reduce = useReducedMotion();
  const stacked = !reduce;
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(-1);
  const [viewer, setViewer] = useState<ViewerState>(null);
  const closeViewer = useCallback(() => setViewer(null), []);

  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start start", "end end"] });

  // Panel activo: el último que ya entró en la mitad alta de la pantalla.
  // IntersectionObserver en vez de medir en cada frame de scroll.
  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver === "undefined") return;
    const panels = Array.from(list.querySelectorAll<HTMLElement>("[data-collab-panel]"));
    const inUpperHalf = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const i = panels.indexOf(entry.target as HTMLElement);
          if (entry.isIntersecting) inUpperHalf.add(i);
          else inUpperHalf.delete(i);
        }
        setActive(inUpperHalf.size ? Math.max(...inUpperHalf) : -1);
      },
      { rootMargin: "0px 0px -50% 0px" },
    );
    panels.forEach((panel) => observer.observe(panel));
    return () => observer.disconnect();
  }, []);

  /** Lleva al panel i; con paneles fijos se calcula su posición natural. */
  const goTo = (i: number) => {
    const list = listRef.current;
    if (!list) return;
    const panels = Array.from(list.querySelectorAll<HTMLElement>("[data-collab-panel]"));
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    let y = list.getBoundingClientRect().top + window.scrollY;
    for (let j = 0; j < i; j++) y += panels[j].offsetHeight + gap;
    const offset = stacked ? parseFloat(getComputedStyle(panels[i]).top) || 0 : 16;
    window.scrollTo({ top: y - offset, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section
      id="colaboraciones"
      aria-labelledby="four-hands-heading"
      className="relative z-20 mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-14 md:py-24"
    >
      <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl">
          <h2 id="four-hands-heading" className="typo-section">
            {t("collabTitle")}
          </h2>
          <p className="typo-body mt-3 text-zinc-300">{t("collabBody")}</p>
        </div>

        <nav aria-label={t("collabNavLabel")}>
          <ul className="flex flex-wrap gap-2">
            {COLLABORATIONS.map((collab, i) => (
              <li key={collab.id}>
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-current={i === active ? "true" : undefined}
                  className={[
                    "inline-flex h-10 items-center rounded-full border px-4 text-xs font-semibold transition-[color,background-color,border-color,transform] duration-200 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
                    i === active
                      ? "border-violet-300/60 bg-violet-400/15 text-white"
                      : "border-white/10 text-zinc-300 hover:border-white/25 hover:text-zinc-100",
                  ].join(" ")}
                >
                  {t(collab.titleKey)}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </Reveal>

      <div
        ref={listRef}
        className="-mx-2 mt-10 flex flex-col gap-[8svh] pb-[2svh] [--stack-step:0.5rem] [--stack-top:1rem] md:mx-0 md:mt-14 md:gap-[14svh] md:pb-[6svh] md:[--stack-step:1.25rem] md:[--stack-top:5.5rem]"
      >
        {COLLABORATIONS.map((item, index) => (
          <CollabPanel
            key={item.id}
            item={item}
            index={index}
            active={index === active}
            stacked={stacked}
            progress={scrollYProgress}
            onOpen={(startIndex) =>
              setViewer({ media: item.media, title: t(item.titleKey), startIndex })
            }
          />
        ))}
      </div>

      <MediaViewer state={viewer} onClose={closeViewer} />
    </section>
  );
}
