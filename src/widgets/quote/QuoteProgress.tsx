"use client";

import {
  getQuoteJourneyPosition,
  QUOTE_JOURNEY_STEPS,
  type QuoteJourneyStepId,
} from "@/shared/lib/quoteJourney";
import { fillCopy, useQuoteFlowCopy } from "@/widgets/quote/quoteFlowCopy";
import styles from "@/widgets/quote/QuoteFlow.module.css";

export type QuoteJourneyState = {
  step: QuoteJourneyStepId;
  /** Avance dentro del paso (0–1), p. ej. pantalla 2 de 2. */
  sub?: number;
};

/**
 * Progreso global del cotizador: paso actual, cuánto falta y una barra por
 * paso. Vive en el header fijo para que siempre se vea, sin robar altura.
 */
export function QuoteProgress({ step, sub = 0 }: QuoteJourneyState) {
  const copy = useQuoteFlowCopy();
  const { index, total, remainingSeconds, totalSeconds } = getQuoteJourneyPosition(step, sub);
  const label = copy.journey.steps[step];
  const stepOf = fillCopy(copy.journey.stepOf, { current: index + 1, total });

  let timeText: string;
  if (index === 0 && sub === 0) {
    timeText = fillCopy(copy.journey.totalTime, { min: Math.ceil(totalSeconds / 60) });
  } else if (index === total - 1) {
    timeText = copy.journey.lastStep;
  } else if (remainingSeconds < 60) {
    timeText = copy.journey.remainingLess;
  } else {
    timeText = fillCopy(copy.journey.remaining, { min: Math.round(remainingSeconds / 60) });
  }

  return (
    <div className={styles.progress}>
      <div className={styles.progressMeta}>
        <p className={styles.progressStep}>
          <span className={styles.progressCount}>{stepOf}</span>
          <span aria-hidden className={styles.progressDot}>
            ·
          </span>
          <span>{label}</span>
        </p>
        <p className={styles.progressTime}>{timeText}</p>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
        aria-valuetext={`${stepOf}: ${label}`}
      >
        {QUOTE_JOURNEY_STEPS.map((item, i) => {
          const fill = i < index ? 1 : i === index ? Math.max(0.18, sub) : 0;
          return (
            <span key={item.id} className={styles.progressSegment}>
              <span
                className={[
                  styles.progressFill,
                  i === index ? styles.progressFillCurrent : "",
                ].join(" ")}
                style={{ transform: `scaleX(${fill})` }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
