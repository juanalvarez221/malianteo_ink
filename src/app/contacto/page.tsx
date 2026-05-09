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
              Canal principal para cotizaciones y agenda.
            </p>
            <div className="mt-3">
              <Button
                className="w-full"
                href="https://wa.me/573104798643?text=Hola%20Malianteo%2C%20quiero%20continuar%20mi%20cotizacion."
              >
                Continuar por WhatsApp
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

