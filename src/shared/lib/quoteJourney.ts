/**
 * Recorrido completo del cotizador: orden de pasos y tiempo aproximado.
 * Fuente única para la barra de progreso global (cuánto falta para terminar).
 */

export const QUOTE_JOURNEY_STEPS = [
  { id: "contacto", seconds: 30 },
  { id: "conexion", seconds: 15 },
  { id: "tamano", seconds: 10 },
  { id: "zona", seconds: 35 },
  { id: "inspiracion", seconds: 45 },
  { id: "estimado", seconds: 15 },
  { id: "agenda", seconds: 30 },
] as const;

export type QuoteJourneyStepId = (typeof QUOTE_JOURNEY_STEPS)[number]["id"];

export type QuoteJourneyPosition = {
  /** Índice 0-based del paso actual. */
  index: number;
  total: number;
  /** Segundos que faltan, contando lo que queda del paso actual. */
  remainingSeconds: number;
  /** Segundos de todo el recorrido. */
  totalSeconds: number;
};

const TOTAL_SECONDS = QUOTE_JOURNEY_STEPS.reduce((sum, step) => sum + step.seconds, 0);

/** `sub` (0–1) = avance dentro del paso (p. ej. pantalla 2 de 2). */
export function getQuoteJourneyPosition(
  step: QuoteJourneyStepId,
  sub = 0,
): QuoteJourneyPosition {
  const index = Math.max(
    0,
    QUOTE_JOURNEY_STEPS.findIndex((item) => item.id === step),
  );
  const progressInStep = Math.min(1, Math.max(0, sub));
  let remaining = 0;
  QUOTE_JOURNEY_STEPS.forEach((item, i) => {
    if (i > index) remaining += item.seconds;
    if (i === index) remaining += item.seconds * (1 - progressInStep);
  });
  return {
    index,
    total: QUOTE_JOURNEY_STEPS.length,
    remainingSeconds: Math.round(remaining),
    totalSeconds: TOTAL_SECONDS,
  };
}
