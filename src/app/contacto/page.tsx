import { AppShell } from "@/widgets/layout/AppShell";
import { Card } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";

export default function ContactoPage() {
  return (
    <AppShell>
      <header>
        <p className="text-xs font-semibold tracking-[0.18em] text-violet-200/70 uppercase">
          Contacto
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-zinc-50">Hablemos</h1>
      </header>

      <div className="mt-5 grid gap-3">
        <Card>
          <div className="p-4">
            <p className="text-sm font-semibold text-zinc-50">WhatsApp</p>
            <p className="mt-1 text-xs text-zinc-400">
              Respuesta rápida para agenda y dudas.
            </p>
            <div className="mt-3">
              <Button className="w-full" href="/">
                Abrir chat (demo)
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <p className="text-sm font-semibold text-zinc-50">Instagram</p>
            <p className="mt-1 text-xs text-zinc-400">@malianteo_ink</p>
            <div className="mt-3">
              <Button
                className="w-full"
                href="https://www.instagram.com/malianteo_ink/"
              >
                Abrir Instagram
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <p className="text-sm font-semibold text-zinc-50">Ubicación</p>
            <p className="mt-1 text-xs text-zinc-400">Medellín, Colombia</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

