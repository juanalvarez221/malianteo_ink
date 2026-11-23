"use client";

import Image from "next/image";
import { BRAND } from "@/shared/config/brand";
import { cn } from "@/shared/lib/cn";

type HeroBrandTitleProps = {
  name?: string;
  tagline?: string;
  variant?: "hero" | "watermark" | "header";
  align?: "left" | "center";
  className?: string;
};

export function HeroBrandTitle({
  name = "Malianteo",
  tagline = "Tattoo Artist",
  variant = "hero",
  align = "center",
  className,
}: HeroBrandTitleProps) {
  const isWatermark = variant === "watermark";
  const isHeader = variant === "header";
  const textAlign = align === "left" ? "text-left" : "text-center";

  if (isHeader) {
    return (
      <h1
        className={cn(
          "flex leading-none",
          align === "left" ? "justify-start" : "justify-center",
          className,
        )}
      >
        <Image
          src={BRAND.logo.src}
          alt={name}
          width={BRAND.logo.width}
          height={BRAND.logo.height}
          priority
          sizes="(min-width: 640px) 132px, 112px"
          className="h-[38px] w-auto drop-shadow-[0_4px_14px_rgba(0,0,0,0.7)] sm:h-[45px]"
        />
      </h1>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col",
        isWatermark
          ? "items-center opacity-30 md:items-start"
          : align === "left"
            ? "items-start gap-3 md:gap-4"
            : "items-center gap-3 md:gap-4",
        className,
      )}
      aria-label={`${name}, ${tagline}`}
    >
      <h1
        className={cn(
          "hero-brand-name leading-[0.9]",
          variant === "hero" && "hero-brand-name--banner",
          textAlign,
          isWatermark
            ? "text-[3rem] md:text-[5.5rem]"
            : "text-[clamp(2.25rem,10vw,6rem)]",
        )}
      >
        {name}
      </h1>

      <p className={cn("hero-brand-tagline", textAlign)}>
        {tagline}
      </p>

      {!isWatermark ? (
        <span
          className="mt-1 h-[2px] w-20 rounded-full bg-gradient-to-r from-transparent via-honey to-transparent md:w-28"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
