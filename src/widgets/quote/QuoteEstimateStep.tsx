"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { CheckCircle2, ChevronRight, MapPin, Video } from "lucide-react";
import { QuoteShell } from "@/widgets/quote/QuoteShell";
import { useQuoteFlowCopy } from "@/widgets/quote/quoteFlowCopy";
import styles from "@/widgets/quote/QuoteFlow.module.css";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { getQuoteDraft, type QuoteDraft } from "@/shared/lib/quoteDraft";
import { QUOTE_FLOW_PATHS } from "@/shared/lib/quoteFlow";
import { getFirstName } from "@/shared/lib/quoteProfile";
import { safeStorageGet, safeStorageSet } from "@/shared/lib/safeStorage";
import { useQuoteOnboardingGate } from "@/widgets/quote/useQuoteOnboardingGate";
import { draftHasLocation } from "@/widgets/quote/quoteBodyLocation";
import { formatCop, formatSessionsRange } from "@/widgets/quote/quoteEstimate";
import {
  buildQuoteBrief,
  ensureQuoteRequestId,
  registerQuoteRequest,
  type QuoteBrief,
} from "@/widgets/quote/quoteSubmission";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
/** Momento del "impacto" del BOOOOF (s). */
const IMPACT_AT = 0.5;

const lettersVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};

const letterVariants: Variants = {
  hidden: { opacity: 0, y: "55%", scale: 0.35 },
  show: {
    opacity: 1,
    y: "0%",
    scale: 1,
    transition: { type: "spring", stiffness: 560, damping: 17, mass: 0.7 },
  },
};

/** Cuenta de 0 al total para que el precio "aterrice" en pantalla. */
function useCountUp(target: number, delayMs: number, enabled: boolean) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const duration = 900;
    const start = performance.now() + delayMs;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - t, 4);
      setValue(Math.round((target * eased) / 10_000) * 10_000);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, delayMs, enabled]);
  return enabled ? value : target;
}

function isDraftReady(draft: QuoteDraft | null): boolean {
  return Boolean(
    draft?.size &&
      draftHasLocation(draft) &&
      draft.styleLikes?.length &&
      draft.artistReasons?.length,
  );
}

function syncedKey(id: string) {
  return `quote_lead_synced:${id}`;
}

export function QuoteEstimateStep() {
  const router = useRouter();
  const copy = useQuoteFlowCopy();
  const e = copy.estimate;
  const { language, t } = useSiteLanguage();
  const reduceMotion = Boolean(useReducedMotion());
  const gateReady = useQuoteOnboardingGate();
  const [draft] = useState<QuoteDraft | null>(getQuoteDraft);
  const [firstName] = useState<string | null>(getFirstName);
  const sentRef = useRef(false);

  // Falta algún paso: volver al primero incompleto.
  useEffect(() => {
    if (!gateReady || isDraftReady(draft)) return;
    if (!draft?.size) router.replace(QUOTE_FLOW_PATHS.quoteStart);
    else if (!draftHasLocation(draft)) router.replace(QUOTE_FLOW_PATHS.location);
    else router.replace(QUOTE_FLOW_PATHS.inspiration);
  }, [draft, gateReady, router]);

  const brief: QuoteBrief | null = useMemo(
    () => (gateReady && draft && isDraftReady(draft) ? buildQuoteBrief(draft, t) : null),
    [draft, gateReady, t],
  );

  // Registrar el lead al ver el estimado: Malianteo recibe el brief aunque
  // la persona no agende. Las imágenes viajan solo la primera vez.
  useEffect(() => {
    if (!brief || sentRef.current) return;
    sentRef.current = true;
    const id = ensureQuoteRequestId();
    const firstTime = !safeStorageGet(window.sessionStorage, syncedKey(id));
    void registerQuoteRequest(brief, {
      status: "Pendiente de Ajuste",
      withImages: firstTime,
    }).then((ok) => {
      if (ok) safeStorageSet(window.sessionStorage, syncedKey(id), "1");
    });
  }, [brief]);

  // Pequeña vibración en el impacto (Android); iOS la ignora.
  useEffect(() => {
    if (!brief || reduceMotion) return;
    const timer = window.setTimeout(() => {
      try {
        navigator.vibrate?.(28);
      } catch {
        /* sin soporte */
      }
    }, IMPACT_AT * 1000);
    return () => window.clearTimeout(timer);
  }, [brief, reduceMotion]);

  const animate = !reduceMotion;
  const minTotal = useCountUp(brief?.estimate.minTotal ?? 0, 1050, animate && Boolean(brief));
  const maxTotal = useCountUp(brief?.estimate.maxTotal ?? 0, 1050, animate && Boolean(brief));

  if (!brief || !draft) {
    return (
      <QuoteShell showGreeting={false} journey={{ step: "estimado" }}>
        <div className="flex min-h-[40svh] items-center justify-center">
          <p className="text-sm text-zinc-400">{copy.common.loading}</p>
        </div>
      </QuoteShell>
    );
  }

  const reactionIndex = (brief.zoneLabel.length + brief.size.length) % e.reactions.length;
  const reaction = firstName
    ? `${firstName}, ${e.reactions[reactionIndex]}`
    : e.reactionNoName[reactionIndex];
  const sizeOption = copy.size.options[brief.size];
  const sameTotal = brief.estimate.minTotal === brief.estimate.maxTotal;
  const totalText = sameTotal
    ? formatCop(maxTotal, language === "en" ? "en" : "es")
    : `${formatCop(minTotal, language === "en" ? "en" : "es")} – ${formatCop(maxTotal, language === "en" ? "en" : "es")}`;

  const reveal = (delay: number) =>
    animate
      ? {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, ease: EASE_OUT, delay },
        }
      : {};

  const goToBooking = (mode: "presencial" | "virtual") => {
    router.push(`${QUOTE_FLOW_PATHS.booking}?mode=${mode}`);
  };

  return (
    <QuoteShell showGreeting={false} journey={{ step: "estimado" }}>
      <div className={styles.column}>
        <section className={styles.boomStage} aria-live="polite">
          {animate ? (
            <>
              <motion.span
                aria-hidden
                className={styles.glow}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: EASE_OUT, delay: IMPACT_AT - 0.1 }}
              />
              <motion.span
                aria-hidden
                className={styles.shock}
                initial={{ opacity: 0, scale: 0.2 }}
                animate={{ opacity: [0, 0.85, 0], scale: [0.2, 1, 2.3] }}
                transition={{ duration: 0.95, ease: "easeOut", delay: IMPACT_AT, times: [0, 0.2, 1] }}
              />
            </>
          ) : (
            <span aria-hidden className={styles.glow} />
          )}

          <motion.h1
            className={styles.boom}
            aria-label={`${e.boom}. ${reaction}`}
            initial={animate ? { scale: 1 } : false}
            animate={animate ? { scale: [1, 1.09, 1] } : undefined}
            transition={{ duration: 0.42, delay: IMPACT_AT, times: [0, 0.3, 1], ease: "easeOut" }}
          >
            <motion.span
              className="inline-flex"
              variants={lettersVariants}
              initial={animate ? "hidden" : false}
              animate="show"
              aria-hidden
            >
              {e.boom.split("").map((letter, i) => (
                <motion.span key={i} className={styles.boomLetter} variants={letterVariants}>
                  {letter}
                </motion.span>
              ))}
            </motion.span>
          </motion.h1>

          <motion.p
            className={styles.reaction}
            aria-hidden
            {...(animate
              ? {
                  initial: { opacity: 0, y: 10, filter: "blur(6px)" },
                  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
                  transition: { duration: 0.55, ease: EASE_OUT, delay: 0.78 },
                }
              : {})}
          >
            {reaction}
          </motion.p>
        </section>

        <motion.section className={styles.ticket} aria-labelledby="quote-ticket" {...reveal(1)}>
          <div className={styles.ticketHead}>
            <h2 id="quote-ticket" className={styles.ticketTitle}>
              {e.ticketTitle}
            </h2>
          </div>
          <dl className={styles.rows}>
            <div className={styles.row}>
              <dt className={styles.rowLabel}>{e.sizeLabel}</dt>
              <dd className={styles.rowValue}>
                {sizeOption.label} · {sizeOption.range}
              </dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.rowLabel}>{e.zoneLabel}</dt>
              <dd className={styles.rowValue}>{brief.zoneLabel}</dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.rowLabel}>{e.sessionsLabel}</dt>
              <dd className={styles.rowValue}>
                {formatSessionsRange(brief.estimate, language === "en" ? "en" : "es")}
              </dd>
            </div>
            <div className={styles.row}>
              <dt className={styles.rowLabel}>{e.perSessionLabel}</dt>
              <dd className={styles.rowValue}>
                {formatCop(brief.estimate.sessionPrice, language === "en" ? "en" : "es")}
              </dd>
            </div>
          </dl>
          <div className={styles.perforation} aria-hidden />
          <div className={styles.total}>
            <p className={styles.totalLabel}>{e.totalLabel}</p>
            <p className={styles.totalValue}>{totalText}</p>
            <p className={styles.currencyNote}>{e.currencyNote}</p>
            <p className={styles.disclaimer}>{e.disclaimer}</p>
          </div>
        </motion.section>

        <motion.section
          className={styles.advisory}
          aria-labelledby="quote-advisory"
          {...reveal(1.25)}
        >
          <div className={styles.advisoryTitleRow}>
            <h2 id="quote-advisory" className={styles.advisoryTitle}>
              {e.advisoryTitle}
            </h2>
            <span className={styles.freeBadge}>{e.free}</span>
          </div>
          <p className={styles.advisoryLead}>{e.advisoryLead}</p>
          <ul className={styles.points}>
            {e.advisoryPoints.map((point) => (
              <li key={point} className={styles.point}>
                <CheckCircle2 className={styles.pointIcon} aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <p className={styles.modalityQuestion}>{e.modalityQuestion}</p>
          <div className={styles.modalities}>
            {(["presencial", "virtual"] as const).map((mode) => {
              const Icon = mode === "presencial" ? MapPin : Video;
              const option = e[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => goToBooking(mode)}
                  className={`${styles.modality} focus-ring`}
                >
                  <span className={styles.modalityIcon}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className={styles.modalityText}>
                    <span className={styles.modalityTitle}>{option.title}</span>
                    <span className={styles.modalityMeta}>{option.meta}</span>
                  </span>
                  <span className={styles.modalityCta}>
                    <span className={styles.modalityCtaText}>{e.seeTimes}</span>
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                </button>
              );
            })}
          </div>
        </motion.section>

        <div className="mt-8">
          <button
            type="button"
            onClick={() => router.push(QUOTE_FLOW_PATHS.inspiration)}
            className="focus-ring rounded-lg px-1 py-2 text-sm font-medium text-zinc-400 underline decoration-zinc-600 underline-offset-4 transition-colors hover:text-zinc-200"
          >
            {copy.common.back}
          </button>
        </div>
      </div>
    </QuoteShell>
  );
}
