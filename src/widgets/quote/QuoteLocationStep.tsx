"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QuoteShell } from "@/widgets/quote/QuoteShell";
import { ArrowRight } from "lucide-react";
import { BodyAreaSelector, type ZoneId } from "@/widgets/quote/BodyAreaSelector";

export function QuoteLocationStep({ size }: { size: string }) {
  const router = useRouter();
  const [zone, setZone] = useState<ZoneId>("brazo");

  const nextHref = useMemo(
    () =>
      `/cotizacion/estilo?size=${encodeURIComponent(size)}&zone=${encodeURIComponent(zone)}`,
    [size, zone],
  );

  return (
    <QuoteShell brand="MALIANTEO">
      <section className="relative mb-8">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-violet-600/15 blur-[60px]" />
        <p className="max-w-xl text-sm text-zinc-300/90 md:text-base">
          Queremos que este paso sea claro y rápido. Selecciona la zona y
          continuamos con el estilo de tu diseño.
        </p>
      </section>

      <section className="mb-8">
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-violet-500/30 bg-violet-600/10">
              <span className="text-[10px] font-bold text-white">2</span>
            </div>
            <h3 className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-200">
              Ubicación en el cuerpo
            </h3>
          </div>
          <BodyAreaSelector zone={zone} onZoneChange={setZone} />
        </div>
      </section>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push("/cotizacion/tamano")}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-white/8"
        >
          Anterior
        </button>

        <button
          type="button"
          onClick={() => router.push(nextHref)}
          className="group inline-flex items-center justify-center gap-2 rounded-xl border border-violet-500/35 bg-gradient-to-r from-violet-700 to-fuchsia-600 px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]"
        >
          Siguiente
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </QuoteShell>
  );
}

