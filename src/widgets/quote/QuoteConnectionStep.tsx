"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { QuoteShell } from "@/widgets/quote/QuoteShell";
import { QuoteStepFooter } from "@/widgets/quote/QuoteStepFooter";
import { ConnectionChoiceOption } from "@/widgets/quote/ConnectionChoiceOption";
import { useQuoteFlowCopy } from "@/widgets/quote/quoteFlowCopy";
import styles from "@/widgets/quote/QuoteFlow.module.css";
import {
  ADJUSTMENT_OPTIONS,
  getQuoteConnection,
  REFERRAL_SOURCES,
  saveQuoteConnection,
  type AdjustmentOption,
  type ReferralSource,
} from "@/shared/lib/quoteConnection";
import { getQuoteProfile } from "@/shared/lib/quoteProfile";
import { useHydrated } from "@/shared/lib/useHydrated";
import { getQuoteDraft } from "@/shared/lib/quoteDraft";
import { QUOTE_FLOW_PATHS, startNewQuoteSession } from "@/shared/lib/quoteFlow";

/**
 * Paso 2: dos preguntas rápidas en una sola pantalla.
 * ¿Dónde me conociste? + ¿Cómo te gustaría trabajar tu pieza?
 */
export function QuoteConnectionStep() {
  const router = useRouter();
  const copy = useQuoteFlowCopy();
  const c = copy.connection;
  const otherId = useId();
  const hydrated = useHydrated();
  // Respuestas guardadas (si vuelve atrás): estado inicial perezoso.
  const [referral, setReferral] = useState<ReferralSource | null>(
    () => getQuoteConnection()?.referralSources[0] ?? null,
  );
  const [referralOther, setReferralOther] = useState(
    () => getQuoteConnection()?.referralOther ?? "",
  );
  const [adjustment, setAdjustment] = useState<AdjustmentOption | null>(
    () => getQuoteConnection()?.adjustments[0] ?? null,
  );
  const [error, setError] = useState("");
  const hasProfile = hydrated && getQuoteProfile() !== null;

  useEffect(() => {
    if (hydrated && !getQuoteProfile()) router.replace(QUOTE_FLOW_PATHS.profile);
  }, [hydrated, router]);

  const onNext = () => {
    if (!referral || !adjustment) {
      setError(c.errorBoth);
      return;
    }
    if (referral === "other" && !referralOther.trim()) {
      setError(c.errorOther);
      return;
    }
    setError("");
    saveQuoteConnection({
      referralSources: [referral],
      referralOther: referral === "other" ? referralOther.trim() : undefined,
      adjustments: [adjustment],
    });
    // Pieza nueva solo si no hay una en curso (volver atrás no borra nada).
    if (!getQuoteDraft()) startNewQuoteSession();
    router.push(QUOTE_FLOW_PATHS.quoteStart);
  };

  return (
    <QuoteShell showGreeting={false} journey={{ step: "conexion" }}>
      <div className={styles.column}>
        <header className={styles.head}>
          <h1 className="typo-section quote-step-title">{c.title}</h1>
          <p className={styles.lead}>{c.body}</p>
        </header>

        {hasProfile ? (
          <>
            <fieldset className={styles.block}>
              <legend className={styles.question}>{c.referralQuestion}</legend>
              <div className={styles.chips} role="radiogroup" aria-label={c.referralQuestion}>
                {REFERRAL_SOURCES.map((source) => {
                  const selected = referral === source;
                  return (
                    <button
                      key={source}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setReferral(source);
                        setError("");
                      }}
                      className={`${styles.chip} focus-ring`}
                    >
                      {selected ? <Check className={styles.chipIcon} aria-hidden /> : null}
                      {c.referral[source]}
                    </button>
                  );
                })}
              </div>
              {referral === "other" ? (
                <div>
                  <label htmlFor={otherId} className={styles.fieldLabel}>
                    {c.referralOtherLabel}
                  </label>
                  <input
                    id={otherId}
                    type="text"
                    value={referralOther}
                    onChange={(event) => setReferralOther(event.target.value)}
                    maxLength={80}
                    autoFocus
                    placeholder={c.referralOtherPlaceholder}
                    className={styles.input}
                  />
                </div>
              ) : null}
            </fieldset>

            <fieldset className={styles.block}>
              <legend className={styles.question}>{c.workQuestion}</legend>
              <p className={styles.hint}>{c.workHint}</p>
              <div className={styles.options} role="radiogroup" aria-label={c.workQuestion}>
                {ADJUSTMENT_OPTIONS.map((option) => (
                  <ConnectionChoiceOption
                    key={option}
                    mode="single"
                    selected={adjustment === option}
                    label={c.work[option].label}
                    detail={c.work[option].detail}
                    onClick={() => {
                      setAdjustment(option);
                      setError("");
                    }}
                  />
                ))}
              </div>
            </fieldset>

            {error ? (
              <p className={styles.fieldError} role="alert">
                {error}
              </p>
            ) : null}

            <QuoteStepFooter
              onBack={() => router.push(QUOTE_FLOW_PATHS.profileEdit)}
              nextLabel={copy.common.continue}
              onNext={onNext}
            />
          </>
        ) : null}
      </div>
    </QuoteShell>
  );
}
