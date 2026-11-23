"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useQuoteFlowCopy } from "@/widgets/quote/quoteFlowCopy";
import styles from "@/widgets/quote/QuoteFlow.module.css";

type QuoteStepFooterProps = {
  onBack?: () => void;
  nextLabel: string;
  onNext: () => void;
  /** Deshabilita solo mientras se envía; la validación se explica con texto. */
  loading?: boolean;
  nextIcon?: ReactNode;
  className?: string;
};

/**
 * Pie de paso: "Anterior" compacto (solo icono en celular) y la acción
 * principal ocupando el resto del ancho, al alcance del pulgar.
 */
export function QuoteStepFooter({
  onBack,
  nextLabel,
  onNext,
  loading = false,
  nextIcon,
  className = "",
}: QuoteStepFooterProps) {
  const copy = useQuoteFlowCopy();
  return (
    <div className={[styles.footer, className].join(" ")}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className={`${styles.footerBack} focus-ring`}
          aria-label={copy.common.back}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          <span className={styles.footerBackLabel}>{copy.common.back}</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={onNext}
        disabled={loading}
        aria-busy={loading || undefined}
        className={`${styles.footerNext} btn-accent focus-ring typo-cta group`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        <span>{nextLabel}</span>
        {!loading
          ? (nextIcon ?? (
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            ))
          : null}
      </button>
    </div>
  );
}
