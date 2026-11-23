"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";

export function PresentationCta() {
  const { t } = useSiteLanguage();

  return (
    <section className="relative z-20 mx-auto w-full max-w-6xl px-6 pb-16 pt-4 md:pb-24">
      <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-[radial-gradient(560px_220px_at_8%_0%,rgba(168,85,247,0.24),transparent_62%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_30%),#0d0d10] p-5 md:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(420px_180px_at_100%_100%,rgba(124,58,237,0.18),transparent_64%)]" />
        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-200/80">
            {t("projectsCtaTag")}
          </p>
          <h4 className="typo-section mt-2 text-[1.6rem] md:text-[2rem]">
            {t("projectsCtaTitle")}
          </h4>
          <p className="typo-body mt-3 max-w-2xl">
            {t("projectsCtaBody")}
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="typo-tech text-zinc-200">Estimación por sesiones</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="typo-tech text-zinc-200">Rango de inversión claro</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              <p className="typo-tech text-zinc-200">Respuesta personalizada</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/cotizacion"
              className="typo-cta inline-flex items-center justify-center rounded-xl border border-violet-500/35 bg-gradient-to-r from-violet-700 to-fuchsia-600 px-5 py-3.5 text-white transition hover:-translate-y-0.5 hover:shadow-[0_0_22px_rgba(139,92,246,0.35)]"
            >
              {t("projectsCta1")}
            </Link>
            <Link
              href="/contacto"
              className="typo-cta inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-zinc-100 transition hover:bg-white/10"
            >
              {t("projectsCta2")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
