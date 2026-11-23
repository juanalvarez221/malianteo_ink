"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/shared/config/brand";
import { usePathname } from "next/navigation";
import {
  Home,
  Image as ImageIcon,
  Sparkles,
  MessageCircle,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/shared/lib/cn";

const items = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/admin", label: "Dash", icon: LayoutDashboard },
  { href: "/proyectos", label: "Proyectos", icon: ImageIcon },
  { href: "/cotizacion", label: "Cotización", icon: Sparkles },
  { href: "/contacto", label: "Contacto", icon: MessageCircle },
];

export function SideNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:block lg:sticky lg:top-0 lg:h-dvh">
      <div className="h-full w-[280px] p-6">
        <div className="app-surface noise h-full rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <Image
              src={BRAND.logo.src}
              alt={BRAND.name}
              width={BRAND.logo.width}
              height={BRAND.logo.height}
              sizes="170px"
              className="h-auto w-[170px] drop-shadow-[0_4px_14px_rgba(0,0,0,0.6)]"
            />
            <div className="h-11 w-11 rounded-full border border-white/10 bg-white/5" />
          </div>

          <div className="mt-8 grid gap-1">
            {items.map((it) => {
              const active = pathname === it.href;
              const Icon = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition",
                    active
                      ? "border-violet-500/30 bg-violet-600/10 text-violet-100"
                      : "border-transparent bg-transparent text-zinc-200 hover:border-white/10 hover:bg-white/5",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                      active
                        ? "border-violet-500/30 bg-violet-600/15"
                        : "border-white/10 bg-white/5 group-hover:bg-white/7",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">{it.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="mt-auto pt-6">
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-violet-200/70 uppercase">
                Estilo
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-50">
                Realismo oscuro & blackwork
              </p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Prototipo UI premium. Listo para integrar imágenes reales del
                portafolio.
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

