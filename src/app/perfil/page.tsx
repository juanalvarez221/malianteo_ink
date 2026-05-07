import { AppShell } from "@/widgets/layout/AppShell";
import { Card } from "@/shared/ui/Card";

export default function PerfilPage() {
  return (
    <AppShell>
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-violet-200/70 uppercase">
          Cuenta
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-50">Mi perfil</h1>
      </header>

      <div className="mt-5 grid gap-3">
        <Card>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full border border-white/10 bg-white/5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-50">Juan Pérez</p>
                <p className="mt-0.5 text-xs text-zinc-400">+57 300 123 4567</p>
              </div>
            </div>
          </div>
        </Card>

        {[
          "Mis cotizaciones",
          "Información personal",
          "Preferencias",
          "Notificaciones",
          "Cerrar sesión",
        ].map((t, i) => (
          <Card key={t}>
            <div className="flex items-center justify-between p-4">
              <p
                className={
                  i === 4
                    ? "text-sm font-semibold text-violet-200"
                    : "text-sm font-semibold text-zinc-50"
                }
              >
                {t}
              </p>
              <span className="h-2 w-2 rounded-full bg-white/10" />
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

