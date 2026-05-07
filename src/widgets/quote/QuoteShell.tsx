"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { getFirstName } from "@/shared/lib/quoteProfile";

export function QuoteShell({
  children,
  brand = "MALIANTEO",
}: {
  children: React.ReactNode;
  brand?: string;
}) {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setFirstName(getFirstName());
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#26123f] via-[#08070d] to-black text-zinc-50">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/20 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-4">
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
        className="mx-auto w-full max-w-[1280px] px-6 pb-28 pt-8"
      >
        {firstName ? (
          <p className="typo-body mb-4 text-violet-200/95">
            Hola, {firstName}. Gracias por confiar en Malianteo independiente.
          </p>
        ) : null}
        {children}
      </motion.main>
    </div>
  );
}

