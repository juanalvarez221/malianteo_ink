"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuoteShell } from "@/widgets/quote/QuoteShell";
import { ArrowRight, UserRound, Mail, Phone } from "lucide-react";
import { getQuoteProfile, saveQuoteProfile } from "@/shared/lib/quoteProfile";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";

export default function CotizacionPage() {
  const router = useRouter();
  const { language, t } = useSiteLanguage();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const profile = getQuoteProfile();
      if (!profile) return;
      setName(profile.name);
      setPhone(profile.phone);
      setEmail(profile.email);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const onNext = () => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();
    if (!cleanName || !cleanPhone || !cleanEmail) {
      setError(
        language === "en"
          ? "Complete name, phone, and email."
          : "Completa nombre, celular y correo.",
      );
      return;
    }
    saveQuoteProfile({ name: cleanName, phone: cleanPhone, email: cleanEmail });
    router.push("/cotizacion/tamano");
  };

  return (
    <QuoteShell brand="MALIANTEO">
      <section className="relative mb-8">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-violet-600/15 blur-[60px]" />
        <p className="typo-tech mb-2 uppercase tracking-[0.16em] text-violet-200/85">
          {t("quoteContactStep")}
        </p>
        <h2 className="typo-section text-[2.2rem] leading-[1.05] md:text-[3.2rem]">
          {t("quoteContactTitle")}
          <br />
          <span className="bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            {t("quoteContactTitle2")}
          </span>
        </h2>
        <p className="typo-body mt-4 max-w-2xl leading-relaxed">
          {t("quoteContactBody")}
        </p>
      </section>

      <section className="mb-8">
        <div className="glass-card rounded-2xl p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-violet-500/30 bg-violet-600/10">
              <span className="text-[10px] font-bold text-white">1</span>
            </div>
            <h3 className="typo-subtitle text-sm uppercase tracking-[0.14em] text-zinc-200">
              {t("quoteContactCard")}
            </h3>
          </div>

          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                <UserRound className="h-4 w-4 text-violet-300" />
                {language === "en" ? "Full name" : "Nombre completo"}
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === "en" ? "Ex: John Doe" : "Ej: Mateo Pérez"}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500/50"
              />
            </label>

            <label className="space-y-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                <Phone className="h-4 w-4 text-violet-300" />
                {language === "en" ? "Phone" : "Celular"}
              </span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={language === "en" ? "Ex: +1 555 000 1234" : "Ej: +57 300 123 4567"}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500/50"
              />
            </label>

            <label className="space-y-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                <Mail className="h-4 w-4 text-violet-300" />
                {language === "en" ? "Email" : "Correo"}
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={language === "en" ? "Ex: mail@example.com" : "Ej: correo@ejemplo.com"}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500/50"
              />
            </label>
          </div>

          {error ? (
            <p className="mt-3 text-sm font-semibold text-violet-200">{error}</p>
          ) : null}
        </div>
      </section>

      <div className="mt-auto pt-6">
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 translate-y-10 h-32 w-3/4 bg-violet-600/20 blur-[80px]" />
        <button
          type="button"
          onClick={onNext}
          className="typo-cta group inline-flex w-full items-center justify-center gap-2 rounded-lg border border-violet-500/35 bg-gradient-to-r from-violet-700 to-fuchsia-600 py-5 text-white transition hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)] active:translate-y-0"
        >
          {t("quoteContinue")}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </QuoteShell>
  );
}

