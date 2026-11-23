"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";

/** Cierre de la home: una invitación directa a cotizar, sin relleno. */
export function PresentationCta() {
  const { t } = useSiteLanguage();

  return (
    <section
      aria-labelledby="siguiente-paso"
      className="relative z-20 mx-auto w-full max-w-6xl px-6 pb-24 pt-6 md:pb-32 md:pt-10"
    >
      <div className="border-t border-white/10 pt-12 md:pt-16">
        <h2
          id="siguiente-paso"
          className="max-w-4xl font-[family-name:var(--font-display)] text-[clamp(1.9rem,7vw,3.4rem)] font-bold uppercase leading-[1.06] tracking-[0.06em] text-white [text-wrap:balance]"
        >
          {t("projectsCtaTitle")}
        </h2>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-zinc-300 md:mt-6 md:text-xl">
          {t("projectsCtaBody")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center md:mt-10">
          <Link
            href="/cotizacion"
            className="btn-accent focus-ring typo-cta inline-flex items-center justify-center rounded-xl px-6 py-4"
          >
            {t("projectsCta1")}
          </Link>
          <Link
            href="/contacto"
            className="btn-outline-violet focus-ring typo-cta inline-flex items-center justify-center rounded-xl px-6 py-4"
          >
            {t("projectsCta2")}
          </Link>
        </div>
      </div>
    </section>
  );
}
