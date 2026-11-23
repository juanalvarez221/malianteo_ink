"use client";

/**
 * Tríptico editorial de identidad: tres retratos sin texto encima.
 * Todos llevan la firma del logotipo como marca de agua; los
 * laterales se desplazan en vertical para dar ritmo de revista, no de carrusel.
 */

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { BrandWatermark } from "@/shared/ui/BrandWatermark";

const PORTRAITS = {
  main: { src: "/brand/teo2.png", position: "center 30%" },
  left: { src: "/brand/teo1.png", position: "62% 40%" },
  right: { src: "/brand/teo3.png", position: "center 35%" },
} as const;

function Portrait({
  src,
  alt,
  position,
  className,
  sizes,
  priority = false,
  delay = 0,
  watermark = "md",
}: {
  src: string;
  alt: string;
  position: string;
  className: string;
  sizes: string;
  priority?: boolean;
  delay?: number;
  watermark?: "sm" | "md" | "lg";
}) {
  const reduce = useReducedMotion();
  return (
    <motion.figure
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={[
        "group relative overflow-hidden rounded-[1.35rem] bg-zinc-950 ring-1 ring-white/10",
        className,
      ].join(" ")}
    >
      <Image
        src={src}
        alt={alt}
        fill
        quality={92}
        sizes={sizes}
        priority={priority}
        className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.035]"
        style={{ objectPosition: position }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(5,3,10,0.55),transparent_38%),radial-gradient(120%_80%_at_50%_0%,transparent_60%,rgba(5,3,10,0.45))]"
      />
      <BrandWatermark size={watermark} />
    </motion.figure>
  );
}

export function IdentityPortraits() {
  const { t } = useSiteLanguage();
  const alt = t("identityPortraitAlt");

  return (
    <div className="mt-8 grid grid-cols-2 gap-3 md:mt-10 md:grid-cols-[0.8fr_1.25fr_0.8fr] md:items-start md:gap-4">
      <Portrait
        {...PORTRAITS.main}
        alt={alt}
        priority
        sizes="(min-width: 768px) 42vw, 92vw"
        className="col-span-2 aspect-[4/5] md:order-2 md:col-span-1"
        watermark="lg"
      />
      <Portrait
        {...PORTRAITS.left}
        alt={alt}
        delay={0.08}
        watermark="sm"
        sizes="(min-width: 768px) 26vw, 46vw"
        className="aspect-[3/4] md:order-1 md:mt-16"
      />
      <Portrait
        {...PORTRAITS.right}
        alt={alt}
        delay={0.16}
        watermark="sm"
        sizes="(min-width: 768px) 26vw, 46vw"
        className="aspect-[3/4] md:order-3 md:mt-28"
      />
    </div>
  );
}
