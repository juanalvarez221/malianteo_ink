"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { getFirstName } from "@/shared/lib/quoteProfile";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";

export function QuoteShell({
  children,
  brand = "MALIANTEO",
}: {
  children: React.ReactNode;
  brand?: string;
}) {
  const router = useRouter();
  const { t } = useSiteLanguage();
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFirstName(getFirstName());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="relative isolate min-h-dvh overflow-hidden bg-black text-zinc-50">
      <div className="pointer-events-none absolute inset-0">
        <video
          className="h-full w-full object-cover brightness-110 contrast-110"
          src="/brand/cotizacion-bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="absolute inset-0 bg-black/42" />
        <div className="absolute inset-0 bg-[radial-gradient(920px_520px_at_50%_0%,rgba(139,92,246,0.22),transparent_64%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.55)_62%,rgba(0,0,0,0.74)_100%)]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/22 backdrop-blur-md">
        <div className="flex w-full items-center justify-between px-4 py-4 sm:px-6 md:px-10">
          <button
            type="button"
            onClick={() => router.back()}
            className="opacity-80 transition hover:opacity-100 active:scale-[0.98]"
            aria-label="Volver"
          >
            <ArrowLeft className="h-6 w-6 text-zinc-200" />
          </button>
          <h1 className="text-display text-base font-bold uppercase tracking-[0.18em] text-white drop-shadow-md">
            {brand}
          </h1>
          <button
            type="button"
            className="opacity-80 transition hover:opacity-100 active:scale-[0.98]"
            aria-label="Más"
          >
            <MoreVertical className="h-6 w-6 text-zinc-200" />
          </button>
        </div>
      </header>

      <motion.main
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative z-10 w-full px-4 pb-28 pt-8 sm:px-6 md:px-10"
      >
        {firstName ? (
          <p className="typo-body mb-6 max-w-2xl leading-relaxed text-violet-100/95">
            {t("quoteGreeting", { name: firstName })}
          </p>
        ) : null}
        {children}
      </motion.main>
    </div>
  );
}

