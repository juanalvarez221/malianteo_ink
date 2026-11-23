"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, MapPin, Video } from "lucide-react";
import { QuoteShell } from "@/widgets/quote/QuoteShell";
import { QuoteStepFooter } from "@/widgets/quote/QuoteStepFooter";
import { fillCopy, useQuoteFlowCopy } from "@/widgets/quote/quoteFlowCopy";
import styles from "@/widgets/quote/QuoteFlow.module.css";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { getQuoteDraft, setQuoteCompletionType } from "@/shared/lib/quoteDraft";
import { getQuoteProfile } from "@/shared/lib/quoteProfile";
import { QUOTE_FLOW_PATHS } from "@/shared/lib/quoteFlow";
import { useQuoteOnboardingGate } from "@/widgets/quote/useQuoteOnboardingGate";
import { getAdvisoryDurationMin } from "@/shared/lib/advisoryConfig";
import type { AdvisoryMode, AdvisorySlot } from "@/shared/lib/advisoryTypes";
import {
  buildAdvisoryWhatsAppMessage,
  WHATSAPP_MESSAGES,
  whatsappUrl,
} from "@/shared/config/brand";
import { draftHasLocation } from "@/widgets/quote/quoteBodyLocation";
import {
  buildQuoteBrief,
  describeEstimateEs,
  registerQuoteRequest,
} from "@/widgets/quote/quoteSubmission";

type DaySlots = { date: string; slots: AdvisorySlot[] };

function dayParts(dateKey: string, locale: string) {
  // Mediodía UTC del día pedido: evita saltos de fecha por zona horaria.
  const date = new Date(`${dateKey}T12:00:00Z`);
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" })
      .format(date)
      .replace(".", "");
  return {
    week: format({ weekday: "short" }),
    day: format({ day: "numeric" }),
    month: format({ month: "short" }),
  };
}

export function QuoteAdvisoryBookingStep({ mode: initialMode }: { mode: AdvisoryMode }) {
  const router = useRouter();
  const copy = useQuoteFlowCopy();
  const b = copy.booking;
  const { language, t } = useSiteLanguage();
  const locale = language === "en" ? "en-US" : "es-CO";
  const gateReady = useQuoteOnboardingGate();

  const [mode, setMode] = useState<AdvisoryMode>(initialMode);
  const [days, setDays] = useState<DaySlots[]>([]);
  const [durationMin, setDurationMin] = useState(getAdvisoryDurationMin(initialMode));
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [slots, setSlots] = useState<AdvisorySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<AdvisorySlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const slotsRequestRef = useRef(0);

  useEffect(() => {
    if (!gateReady) return;
    const draft = getQuoteDraft();
    if (!draft?.size || !draftHasLocation(draft)) {
      router.replace(QUOTE_FLOW_PATHS.quoteStart);
      return;
    }
    if (!draft.styleLikes?.length || !draft.artistReasons?.length) {
      router.replace(QUOTE_FLOW_PATHS.inspiration);
    }
  }, [gateReady, router]);

  const loadSlotsForDate = useCallback(
    async (dateKey: string, forMode: AdvisoryMode) => {
      const requestId = ++slotsRequestRef.current;
      setSelectedDate(dateKey);
      setSelectedSlot(null);
      setLoadingSlots(true);
      try {
        const response = await fetch(
          `/api/advisory/slots?mode=${forMode}&date=${encodeURIComponent(dateKey)}`,
          { cache: "no-store" },
        );
        const payload = (await response.json()) as { slots?: AdvisorySlot[] };
        if (!response.ok) throw new Error("slots");
        if (requestId === slotsRequestRef.current) setSlots(payload.slots ?? []);
      } catch {
        if (requestId === slotsRequestRef.current) setSlots([]);
      } finally {
        if (requestId === slotsRequestRef.current) setLoadingSlots(false);
      }
    },
    [],
  );

  /** Vacía la agenda antes de pedir otra modalidad o reintentar. */
  const resetSchedule = () => {
    slotsRequestRef.current += 1;
    setLoading(true);
    setLoadError(false);
    setDays([]);
    setSlots([]);
    setLoadingSlots(false);
    setSelectedDate("");
    setSelectedSlot(null);
  };

  // Días disponibles de la modalidad; se abre el primero para ahorrar un toque.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/advisory/slots?mode=${mode}`, { cache: "no-store" });
        const payload = (await response.json()) as { days?: DaySlots[]; durationMin?: number };
        if (!response.ok) throw new Error("days");
        if (cancelled) return;
        const nextDays = (payload.days ?? []).filter((day) => Boolean(day.date));
        setDurationMin(payload.durationMin ?? getAdvisoryDurationMin(mode));
        setDays(nextDays);
        if (nextDays[0]) void loadSlotsForDate(nextDays[0].date, mode);
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, reloadToken, loadSlotsForDate]);

  const switchMode = (next: AdvisoryMode) => {
    if (next === mode) return;
    resetSchedule();
    setMode(next);
    setSubmitError("");
    router.replace(`${QUOTE_FLOW_PATHS.booking}?mode=${next}`, { scroll: false });
  };

  const profileName = useMemo(() => getQuoteProfile()?.name ?? "", []);

  const confirmBooking = async () => {
    const profile = getQuoteProfile();
    const draft = getQuoteDraft();
    if (!profile || !draft) return;
    if (!selectedSlot) {
      setSubmitError(selectedDate ? b.pickTime : b.pickDay);
      return;
    }
    setSubmitting(true);
    setSubmitError("");
    try {
      const brief = buildQuoteBrief(draft, t);
      const estimate = describeEstimateEs(brief.estimate);
      const response = await fetch("/api/advisory/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          startsAt: selectedSlot.startsAt,
          clientName: profile.name,
          phone: profile.phone,
          email: profile.email,
          projectNotes: brief.notes,
          size: brief.sizeLabelEs,
          brief: {
            bodyZone: brief.zoneLabel,
            referral: brief.referral,
            collaborationMode: brief.collaboration,
            styleLikes: brief.styleLikes,
            artistReasons: brief.artistReasons,
            estimate: `${estimate.total} · ${estimate.sessions}`,
            references: brief.referenceCount
              ? `${brief.referenceCount} imagen(es), adjuntas en el correo del brief`
              : undefined,
          },
        }),
      });
      const payload = (await response.json()) as {
        booking?: { id: string; label: string; startsAt: string; meetingLink?: string };
        error?: string;
      };
      if (!response.ok || !payload.booking) {
        throw new Error(payload.error ?? b.submitError);
      }

      void registerQuoteRequest(brief, {
        status: "Asesoría Agendada",
        advisory: {
          advisoryMode: mode,
          advisoryScheduledAt: payload.booking.startsAt,
          advisoryBookingId: payload.booking.id,
        },
      });

      try {
        sessionStorage.setItem(
          "quote_advisory_confirmation",
          JSON.stringify({
            label: payload.booking.label,
            mode,
            whatsappUrl: whatsappUrl(
              buildAdvisoryWhatsAppMessage({
                mode,
                slotLabel: payload.booking.label,
                clientName: profile.name,
              }),
            ),
            meetingLink: payload.booking.meetingLink,
          }),
        );
      } catch {
        /* la página de gracias funciona sin este resumen */
      }
      setQuoteCompletionType("asesoria");
      router.push("/cotizacion/gracias");
    } catch (error) {
      setSubmitError(error instanceof Error && error.message ? error.message : b.submitError);
      setSubmitting(false);
    }
  };

  const whatsappHref = whatsappUrl(
    profileName
      ? WHATSAPP_MESSAGES.quoteInProgressNamed.replace("{name}", profileName)
      : WHATSAPP_MESSAGES.quoteInProgress,
  );

  return (
    <QuoteShell showGreeting={false} journey={{ step: "agenda" }}>
      <div className={styles.column}>
        <header className={styles.head}>
          <h1 className="typo-section quote-step-title">{b.title}</h1>
          <p className={styles.lead}>{fillCopy(b.body, { minutes: durationMin })}</p>
        </header>

        <div className={styles.segmented} role="radiogroup" aria-label={b.modeLabel}>
          {(["presencial", "virtual"] as const).map((option) => {
            const Icon = option === "presencial" ? MapPin : Video;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={mode === option}
                onClick={() => switchMode(option)}
                className={`${styles.segment} focus-ring`}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {b[option]}
              </button>
            );
          })}
        </div>
        <p className={`${styles.hint} mt-2`}>
          {mode === "presencial" ? copy.estimate.presencial.meta : copy.estimate.virtual.meta}
        </p>

        {loading ? (
          <div className={`${styles.notice} mt-6`} role="status">
            <Loader2 className="h-4 w-4 animate-spin text-violet-300" aria-hidden />
            {copy.common.loading}
          </div>
        ) : loadError ? (
          <div className={`${styles.notice} ${styles.noticeError} mt-6`} role="alert">
            <span>{b.loadError}</span>
            <button
              type="button"
              onClick={() => {
                resetSchedule();
                setReloadToken((n) => n + 1);
              }}
              className={`${styles.noticeAction} focus-ring`}
            >
              {b.retry}
            </button>
          </div>
        ) : days.length === 0 ? (
          <div className={`${styles.notice} mt-6 flex-col !items-start`}>
            <span>{b.empty}</span>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className={`${styles.noticeAction} !ml-0 focus-ring`}
            >
              {b.emptyCta}
            </a>
          </div>
        ) : (
          <>
            <h2 className={styles.sectionLabel}>{b.dayLabel}</h2>
            <div className={styles.dayRow}>
              {days.map((day) => {
                const parts = dayParts(day.date, locale);
                const selected = selectedDate === day.date;
                return (
                  <button
                    key={day.date}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => void loadSlotsForDate(day.date, mode)}
                    className={`${styles.day} focus-ring`}
                  >
                    <span className={styles.dayWeek}>{parts.week}</span>
                    <span className={styles.dayNum}>{parts.day}</span>
                    <span className={styles.dayMonth}>{parts.month}</span>
                  </button>
                );
              })}
            </div>

            <h2 className={styles.sectionLabel}>{b.timeLabel}</h2>
            {!selectedDate ? (
              <p className={styles.notice}>{b.pickDay}</p>
            ) : loadingSlots ? (
              <p className={styles.notice} role="status">
                <Loader2 className="h-4 w-4 animate-spin text-violet-300" aria-hidden />
                {b.loadingTimes}
              </p>
            ) : slots.length === 0 ? (
              <p className={styles.notice}>{b.noTimes}</p>
            ) : (
              <div className={styles.times}>
                {slots.map((slot) => (
                  <button
                    key={slot.startsAt}
                    type="button"
                    aria-pressed={selectedSlot?.startsAt === slot.startsAt}
                    onClick={() => {
                      setSelectedSlot(slot);
                      setSubmitError("");
                    }}
                    className={`${styles.time} focus-ring`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}

            {selectedSlot ? (
              <div className={styles.summary} aria-live="polite">
                <p className={styles.summaryLabel}>{b.summary}</p>
                <p className={styles.summaryValue}>{selectedSlot.label}</p>
                <p className={styles.summaryMeta}>
                  {fillCopy(b.summaryMeta, { mode: b[mode], minutes: durationMin })}
                </p>
              </div>
            ) : null}
          </>
        )}

        {submitError ? (
          <p className={styles.fieldError} role="alert">
            {submitError}
          </p>
        ) : null}

        <QuoteStepFooter
          onBack={() => router.push(QUOTE_FLOW_PATHS.estimate)}
          nextLabel={b.confirm}
          onNext={() => void confirmBooking()}
          loading={submitting}
          nextIcon={<Check className="h-4 w-4" aria-hidden />}
        />
      </div>
    </QuoteShell>
  );
}
