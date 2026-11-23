"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuoteShell } from "@/widgets/quote/QuoteShell";
import { ArrowRight, UserRound, Mail, Phone } from "lucide-react";
import { getQuoteProfile, saveQuoteProfile } from "@/shared/lib/quoteProfile";
import { emitirCapturaCrm } from "@/shared/lib/crm/capturaCliente";
import {
  QUOTE_FLOW_PATHS,
  getQuoteResumePath,
  resolveQuoteResumePath,
} from "@/shared/lib/quoteFlow";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { PhoneCountryField } from "@/widgets/quote/PhoneCountryField";
import { matchPhoneCountryFromRaw } from "@/shared/config/phoneCountries";

export default function CotizacionPage() {
  const router = useRouter();
  const { language, t } = useSiteLanguage();
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+57");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isEditing = params.get("edit") === "1";
    setEditing(isEditing);

    if (!isEditing) {
      const destination = resolveQuoteResumePath();
      if (destination !== QUOTE_FLOW_PATHS.profile) {
        router.replace(destination);
        return;
      }
    }

    const frame = window.requestAnimationFrame(() => {
      const profile = getQuoteProfile();
      if (!profile) {
        setReady(true);
        return;
      }
      setName(profile.name);
      const rawPhone = profile.phone.trim();
      const matchedCountry = matchPhoneCountryFromRaw(rawPhone);
      if (matchedCountry) {
        setCountryCode(matchedCountry.dial);
        setPhone(rawPhone.replace(matchedCountry.dial, "").replace(/^[\s-]+/, "").trim());
      } else {
        setPhone(rawPhone);
      }
      setEmail(profile.email);
      setReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [router]);

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
    const fullPhone = `${countryCode} ${cleanPhone}`.replace(/\s+/g, " ").trim();
    const profile = { name: cleanName, phone: fullPhone, email: cleanEmail };
    saveQuoteProfile(profile);
    emitirCapturaCrm(profile);

    if (editing) {
      const resume = getQuoteResumePath() || QUOTE_FLOW_PATHS.quoteStart;
      router.push(resume);
      return;
    }

    router.push(QUOTE_FLOW_PATHS.connection);
  };

  if (!ready) {
    return (
      <QuoteShell showGreeting={false} journey={{ step: "contacto" }}>
        <div className="flex min-h-[40svh] items-center justify-center">
          <p className="typo-tech text-sm uppercase tracking-[0.18em] text-zinc-400">
            {language === "en" ? "Loading…" : "Cargando…"}
          </p>
        </div>
      </QuoteShell>
    );
  }

  return (
    <QuoteShell journey={{ step: "contacto" }}>
      <section className="relative mb-8">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-violet-600/15 blur-[60px]" />
        <h1 className="typo-section quote-step-title">
          {t("quoteContactTitle")} {t("quoteContactTitle2")}
        </h1>
        <p className="typo-body mt-4 max-w-2xl leading-relaxed">
          {t("quoteContactBody")}
        </p>
      </section>

      <section className="mb-8">
        <div className="glass-card rounded-2xl p-5">
          <div className="grid gap-4">
            <label className="space-y-2">
              <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">
                <UserRound className="h-4 w-4 text-violet-300" />
                {language === "en" ? "Full name" : "Nombre completo"}
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={language === "en" ? "Ex: Mateo Rivas" : "Ej: Mateo Pérez"}
                className="w-full rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-violet-500/50"
              />
            </label>

            <div>
              <PhoneCountryField
                dial={countryCode}
                localNumber={phone}
                onDialChange={setCountryCode}
                onLocalNumberChange={setPhone}
                language={language}
                label={
                  <>
                    <Phone className="h-4 w-4 text-violet-300" />
                    {language === "en" ? "Phone" : "Celular"}
                  </>
                }
                numberLabel={language === "en" ? "Phone number" : "Número"}
                numberPlaceholder={
                  language === "en" ? "Ex: 555 000 1234" : "Ej: 300 123 4567"
                }
                helperText={
                  language === "en"
                    ? "Choose your country flag and enter your WhatsApp number."
                    : "Elige la bandera de tu país e ingresa tu número de WhatsApp."
                }
              />
            </div>

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
          className="btn-accent focus-ring typo-cta group inline-flex w-full items-center justify-center gap-2 rounded-lg py-5 active:scale-[0.98]"
        >
          {editing ? t("quoteContactSaveContinue") : t("quoteContinue")}
          <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </QuoteShell>
  );
}
