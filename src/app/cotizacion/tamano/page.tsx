"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { QuoteShell } from "@/widgets/quote/QuoteShell";
import { QuoteStepFooter } from "@/widgets/quote/QuoteStepFooter";
import { fillCopy, useQuoteFlowCopy } from "@/widgets/quote/quoteFlowCopy";
import styles from "@/widgets/quote/QuoteFlow.module.css";
import {
  getQuoteDraft,
  isQuoteSizeId,
  QUOTE_SIZE_IDS,
  saveQuoteDraft,
  type QuoteSizeId,
} from "@/shared/lib/quoteDraft";
import { QUOTE_FLOW_PATHS } from "@/shared/lib/quoteFlow";
import { useQuoteOnboardingGate } from "@/widgets/quote/useQuoteOnboardingGate";

/** Trabajos reales de Malianteo como referencia de escala. */
const SIZE_PHOTOS: Record<QuoteSizeId, { src: string; position: string }> = {
  mediano: { src: "/quote-sizes/small-reference.png", position: "center 45%" },
  grande: { src: "/quote-sizes/medium-reference.png", position: "center 40%" },
  extra: { src: "/reels/shot-7.jpg", position: "center 35%" },
  proyecto: { src: "/quote-sizes/large-reference.png", position: "center 30%" },
};

function ScaleMeter({ level }: { level: number }) {
  return (
    <span className={styles.scale} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={[styles.scaleBar, i <= level ? styles.scaleBarOn : ""].join(" ")}
          style={{ height: `${40 + i * 20}%` }}
        />
      ))}
    </span>
  );
}

export default function CotizacionTamanoPage() {
  const router = useRouter();
  const copy = useQuoteFlowCopy();
  const s = copy.size;
  const gateReady = useQuoteOnboardingGate();
  const [size, setSize] = useState<QuoteSizeId | null>(() => {
    const saved = getQuoteDraft()?.size;
    return isQuoteSizeId(saved) ? saved : null;
  });
  const [error, setError] = useState("");

  const onNext = () => {
    if (!size) {
      setError(s.error);
      return;
    }
    const current = getQuoteDraft();
    saveQuoteDraft({ ...(current ?? {}), size });
    router.push(QUOTE_FLOW_PATHS.location);
  };

  return (
    <QuoteShell showGreeting={false} journey={{ step: "tamano" }}>
      <div className={styles.columnWide}>
        <header className={styles.head}>
          <h1 className="typo-section quote-step-title">{s.title}</h1>
          <p className={styles.lead}>{s.body}</p>
        </header>

        {gateReady ? (
          <>
            <div className={styles.sizeGrid} role="radiogroup" aria-label={s.title}>
              {QUOTE_SIZE_IDS.map((id, index) => {
                const option = s.options[id];
                const selected = size === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setSize(id);
                      setError("");
                    }}
                    className={`${styles.sizeCard} focus-ring`}
                  >
                    <span className={styles.sizePhoto}>
                      <Image
                        src={SIZE_PHOTOS[id].src}
                        alt={fillCopy(s.photoAlt, { label: option.label })}
                        fill
                        sizes="(max-width: 899px) 50vw, 240px"
                        style={{ objectPosition: SIZE_PHOTOS[id].position }}
                        priority={index < 2}
                      />
                    </span>
                    <span className={styles.sizeBody}>
                      <span className={styles.sizeLabelRow}>
                        <span className={styles.sizeLabel}>{option.label}</span>
                        <ScaleMeter level={index} />
                      </span>
                      <span className={`${styles.sizeRange} block`}>{option.range}</span>
                      <span className={`${styles.sizeHint} block`}>{option.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {error ? (
              <p className={styles.fieldError} role="alert">
                {error}
              </p>
            ) : null}

            <QuoteStepFooter
              onBack={() => router.push(QUOTE_FLOW_PATHS.connection)}
              nextLabel={copy.common.continue}
              onNext={onNext}
            />
          </>
        ) : null}
      </div>
    </QuoteShell>
  );
}
