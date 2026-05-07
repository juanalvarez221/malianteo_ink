import { AppShell } from "@/widgets/layout/AppShell";
import { Card } from "@/shared/ui/Card";

export default function CitasPage() {
  return (
    <AppShell>
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-violet-200/70 uppercase">
          Agenda
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-50">Mis citas</h1>
      </header>

      <div className="mt-4 flex gap-2">
        {["Pendientes", "Confirmadas", "Completadas"].map((t, i) => (
          <button
            key={t}
            className={
              i === 0
                ? "rounded-full border border-violet-500/30 bg-violet-600/15 px-3 py-1 text-xs font-semibold text-violet-100"
                : "rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-200"
            }
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-3">
        <Card>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-50">
                  Cotización #1234
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  23 Mayo 2026 · 6:30 PM
                </p>
              </div>
              <span className="rounded-full border border-violet-500/30 bg-violet-600/15 px-2 py-1 text-[11px] font-semibold text-violet-100">
                Pendiente
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-400">
              Estás en revisión. Te responderé pronto con una propuesta y
              disponibilidad.
            </p>
            <div className="mt-3 h-1 w-14 rounded-full bg-violet-600/60" />
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-50">
                  Cotización #1233
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  18 Mayo 2026 · 4:00 PM
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-zinc-200">
                En revisión
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-400">
              Falta confirmar el diseño final. Esta vista es solo UI demo.
            </p>
            <div className="mt-3 h-1 w-10 rounded-full bg-white/15" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

