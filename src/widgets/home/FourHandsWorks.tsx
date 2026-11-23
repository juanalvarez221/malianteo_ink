"use client";

/**
 * Obras a cuatro manos — una sola sección con un espacio propio para cada
 * colaboración. En escritorio los espacios se apilan al hacer scroll (cada
 * panel se fija y el siguiente se desliza encima); un índice arriba permite
 * saltar a cualquiera. Cada panel: galería a la izquierda, ficha a la
 * derecha (título + artistas verificados). Nunca hay texto sobre la foto.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { ChevronLeft, ChevronRight, Expand, Play } from "lucide-react";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { BrandWatermark } from "@/shared/ui/BrandWatermark";
import {
  ActiveVideo,
  MediaViewer,
  coverOf,
  pad,
  useSelectedIndex,
  type ViewerState,
} from "@/widgets/home/media/MediaViewer";
import { ArtistList } from "./collabs/ArtistCredits";
import { COLLABORATIONS, type Collaboration } from "./collabs/data";

const TOTAL = COLLABORATIONS.length;
/** Separación vertical entre paneles apilados (escritorio). */
const STACK_STEP_REM = 1.25;
const STACK_TOP_REM = 5.5;
const DESKTOP_QUERY = "(min-width: 768px)";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

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
          ? { scale, top: `${STACK_TOP_REM + index * STACK_STEP_REM}rem`, transformOrigin: "top center" }
          : undefined
      }
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0812] p-3 shadow-[0_-24px_60px_-30px_rgba(0,0,0,0.9)] md:sticky md:h-[min(calc(100svh-8.5rem),660px)] md:p-4"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(700px_320px_at_100%_0%,rgba(139,92,246,0.16),transparent_60%)]"
      />

      <div className="relative grid h-full gap-5 md:grid-cols-12 md:gap-8">
        {/* Galería */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-zinc-950 ring-1 ring-white/10 md:col-span-7 md:aspect-auto md:h-full">
          <div className="h-full overflow-hidden" ref={emblaRef}>
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

          <div className="absolute right-4 top-9 z-30">
            <IconButton label={t("collabOpenViewer")} onClick={() => onOpen(slide)}>
              <Expand className="h-4 w-4" />
            </IconButton>
          </div>

          {multiple ? (
            <div className="absolute bottom-4 left-4 z-30 flex gap-2">
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
              className="pointer-events-none absolute inset-0 z-40 bg-black"
            />
          ) : null}
        </div>

        {/* Ficha */}
        <div className="flex flex-col px-2 pb-3 md:col-span-5 md:px-0 md:py-4 md:pr-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200/80">
              {t("collabEyebrow")}
            </span>
            <span className="text-xs font-semibold tabular-nums tracking-[0.18em] text-zinc-500">
              <span className="text-white">{pad(index + 1)}</span> / {pad(TOTAL)}
            </span>
          </div>

          <h3
            id={`collab-${item.id}-title`}
            className="mt-5 font-[family-name:var(--font-display)] text-[clamp(1.05rem,4.6vw,1.5rem)] font-bold uppercase leading-[1.2] tracking-[0.08em] text-white [overflow-wrap:anywhere] md:mt-8 md:text-[clamp(1.1rem,1.75vw,1.6rem)]"
          >
            {title}
          </h3>

          <div className="mt-6 md:mt-8">
            <ArtistList artists={item.artists} />
          </div>

          <div className="mt-6 flex items-end justify-between gap-4 md:mt-auto">
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
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-violet-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            >
              {t("collabViewWork")}
              <Expand className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function FourHandsWorks() {
  const { t } = useSiteLanguage();
  const reduce = useReducedMotion();
  const desktop = useMediaQuery(DESKTOP_QUERY);
  const stacked = desktop && !reduce;
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<ViewerState>(null);
  const closeViewer = useCallback(() => setViewer(null), []);

  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start start", "end end"] });

  // Panel activo: el último cuya parte superior ya entró en la mitad alta de la pantalla.
  const syncActive = useCallback(() => {
    const panels = listRef.current?.querySelectorAll<HTMLElement>("[data-collab-panel]");
    if (!panels) return;
    let current = 0;
    panels.forEach((panel, i) => {
      if (panel.getBoundingClientRect().top < window.innerHeight * 0.5) current = i;
    });
    setActive(current);
  }, []);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", syncActive);

  /** Lleva al panel i; con paneles fijos se calcula su posición natural. */
  const goTo = (i: number) => {
    const list = listRef.current;
    if (!list) return;
    const panels = Array.from(list.querySelectorAll<HTMLElement>("[data-collab-panel]"));
    const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
    let y = list.getBoundingClientRect().top + window.scrollY;
    for (let j = 0; j < i; j++) y += panels[j].offsetHeight + gap;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const offset = stacked ? (STACK_TOP_REM + i * STACK_STEP_REM) * rem : 5 * rem;
    window.scrollTo({ top: y - offset, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section
      id="colaboraciones"
      aria-labelledby="four-hands-heading"
      className="relative z-20 mx-auto w-full max-w-6xl scroll-mt-20 px-6 py-14 md:py-24"
    >
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
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
                    "inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
                    i === active
                      ? "border-violet-300/60 bg-violet-400/15 text-white"
                      : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-zinc-100",
                  ].join(" ")}
                >
                  <span className="tabular-nums text-violet-300">{pad(i + 1)}</span>
                  {t(collab.titleKey)}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div ref={listRef} className="mt-10 flex flex-col gap-8 md:mt-14 md:gap-[14svh] md:pb-[6svh]">
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
