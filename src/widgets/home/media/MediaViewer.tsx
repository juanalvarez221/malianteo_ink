"use client";

/**
 * Visor a pantalla completa compartido por "Obra seleccionada" y
 * "Obras a cuatro manos": carrusel táctil (Embla), teclado y video de
 * proceso en la misma secuencia. Siempre lleva la firma de la marca.
 */

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { BrandWatermark } from "@/shared/ui/BrandWatermark";
import { MediaLightboxPortal } from "@/shared/ui/MediaLightboxPortal";

export type ViewerMedia =
  | { kind: "image"; src: string; position?: string }
  | { kind: "video"; src: string; poster: string };

export const pad = (n: number) => String(n).padStart(2, "0");

/** Imagen representativa de un medio (el póster si es video). */
export const coverOf = (item: ViewerMedia) => (item.kind === "video" ? item.poster : item.src);

/** Sincroniza el índice seleccionado con Embla. */
export function useSelectedIndex(api: ReturnType<typeof useEmblaCarousel>[1]) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect).on("reInit", onSelect);
    return () => {
      api.off("select", onSelect).off("reInit", onSelect);
    };
  }, [api]);
  return index;
}

/** Video silencioso en bucle que solo reproduce cuando está activo. */
export function ActiveVideo({
  src,
  poster,
  active,
  label,
  controls = false,
  className = "absolute inset-0 h-full w-full object-cover",
}: {
  src: string;
  poster: string;
  active: boolean;
  label: string;
  controls?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (active) void video.play().catch(() => {});
    else video.pause();
  }, [active]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      className={className}
      muted
      loop
      playsInline
      controls={controls}
      preload={active ? "auto" : "none"}
      disablePictureInPicture
      aria-label={label}
    />
  );
}

function ViewerButton({
  label,
  onClick,
  disabled,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md transition hover:bg-black/75 active:scale-95 disabled:pointer-events-none disabled:opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ViewerDialog({
  media,
  title,
  startIndex,
  onClose,
}: {
  media: readonly ViewerMedia[];
  title: string;
  startIndex: number;
  onClose: () => void;
}) {
  const { t } = useSiteLanguage();
  const [emblaRef, api] = useEmblaCarousel({ startIndex, duration: 24 });
  const index = useSelectedIndex(api);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") api?.scrollPrev();
      if (e.key === "ArrowRight") api?.scrollNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [api, onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[120] flex flex-col bg-black/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
          {title}
          <span className="ml-3 tabular-nums text-zinc-500">
            {pad(index + 1)} / {pad(media.length)}
          </span>
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("collabCloseViewer")}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden" ref={emblaRef}>
        <div className="flex h-full">
          {media.map((item, i) => (
            <div key={item.src + i} className="relative h-full min-w-0 flex-[0_0_100%] px-4 pb-6 md:px-16">
              <div className="relative mx-auto h-full max-w-[min(100%,calc((100dvh-7rem)*0.8))]">
                {item.kind === "image" ? (
                  <Image
                    src={item.src}
                    alt={`${title} · ${pad(i + 1)}`}
                    fill
                    quality={92}
                    sizes="(min-width: 768px) 70vw, 100vw"
                    className="object-contain"
                  />
                ) : (
                  <ActiveVideo
                    src={item.src}
                    poster={item.poster}
                    active={i === index}
                    controls
                    className="absolute inset-0 h-full w-full object-contain"
                    label={`${title} · ${t("collabProcessLabel")}`}
                  />
                )}
                <BrandWatermark size="lg" />
              </div>
            </div>
          ))}
        </div>

        {media.length > 1 ? (
          <>
            <ViewerButton
              label={t("collabPrev")}
              onClick={() => api?.scrollPrev()}
              disabled={index === 0}
              className="absolute left-3 top-1/2 z-30 -translate-y-1/2 md:left-6"
            >
              <ChevronLeft className="h-5 w-5" />
            </ViewerButton>
            <ViewerButton
              label={t("collabNext")}
              onClick={() => api?.scrollNext()}
              disabled={index === media.length - 1}
              className="absolute right-3 top-1/2 z-30 -translate-y-1/2 md:right-6"
            >
              <ChevronRight className="h-5 w-5" />
            </ViewerButton>
          </>
        ) : null}
      </div>
    </motion.div>
  );
}

export type ViewerState = { media: readonly ViewerMedia[]; title: string; startIndex: number } | null;

export function MediaViewer({ state, onClose }: { state: ViewerState; onClose: () => void }) {
  return (
    <MediaLightboxPortal>
      <AnimatePresence>
        {state ? (
          <ViewerDialog
            key={state.title}
            media={state.media}
            title={state.title}
            startIndex={state.startIndex}
            onClose={onClose}
          />
        ) : null}
      </AnimatePresence>
    </MediaLightboxPortal>
  );
}
