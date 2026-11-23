/**
 * Estimado orientativo de sesiones y precio para realismo en negro y gris.
 *
 * Criterio (como lo calcula un tatuador al cotizar):
 *  1. El tamaño elegido marca cuántas sesiones pide la pieza.
 *  2. La zona pone el techo: una pieza no puede ocupar más que la zona, y
 *     "Proyecto completo" significa cubrir toda la zona elegida.
 *  3. Cada zona tiene una dificultad: costillas, cuello, cabeza, manos o
 *     abdomen piden más pasadas y pausas que un antebrazo externo.
 *
 * El valor final siempre se define en la asesoría.
 */

import { stripCoverageToken } from "@/widgets/body-3d/domain/bodyPublicSelectionCatalog";
import type { QuoteSizeId } from "@/shared/lib/quoteDraft";

/** Tarifa por sesión vigente (COP). */
export const SESSION_PRICE_COP = 1_200_000;

type Range = readonly [number, number];

/** Sesiones típicas según el tamaño de la pieza. */
const SIZE_SESSIONS: Record<QuoteSizeId, Range> = {
  mediano: [1, 1],
  grande: [1, 2],
  extra: [2, 3],
  proyecto: [4, 6],
};

type ZoneProfile = {
  /** Sesiones para cubrir la zona completa en realismo. */
  capacity: Range;
  /** Multiplicador de dificultad (piel, sensibilidad, pausas). */
  factor: number;
};

/** Perfil por zona pública (lado izquierdo/derecho comparten perfil). */
const ZONE_RULES: ReadonlyArray<{ test: RegExp; profile: ZoneProfile }> = [
  // Brazos
  { test: /_full_sleeve$/, profile: { capacity: [5, 7], factor: 1 } },
  { test: /_upper_arm$/, profile: { capacity: [2, 3], factor: 1 } },
  { test: /_forearm$/, profile: { capacity: [2, 3], factor: 1 } },
  { test: /_forearm_inner_region$/, profile: { capacity: [1, 2], factor: 1.1 } },
  { test: /_forearm_outer_region$/, profile: { capacity: [1, 2], factor: 1 } },
  { test: /_(biceps|triceps)_region$/, profile: { capacity: [1, 2], factor: 1 } },
  { test: /_shoulder$/, profile: { capacity: [1, 2], factor: 1 } },
  { test: /_hand$/, profile: { capacity: [1, 1], factor: 1.25 } },
  // Torso
  { test: /^full_chest$/, profile: { capacity: [3, 4], factor: 1.1 } },
  { test: /^(left|right)_chest$/, profile: { capacity: [1, 2], factor: 1.1 } },
  { test: /^full_abdomen$/, profile: { capacity: [3, 4], factor: 1.2 } },
  { test: /_ribs$/, profile: { capacity: [2, 3], factor: 1.3 } },
  { test: /_flank$/, profile: { capacity: [1, 2], factor: 1.2 } },
  // Espalda
  { test: /^full_back$/, profile: { capacity: [7, 10], factor: 1 } },
  { test: /^upper_back$/, profile: { capacity: [3, 4], factor: 1 } },
  { test: /^lower_back$/, profile: { capacity: [2, 3], factor: 1.05 } },
  // Piernas
  { test: /_full_leg$/, profile: { capacity: [6, 8], factor: 1 } },
  { test: /_thigh$/, profile: { capacity: [3, 4], factor: 1 } },
  { test: /_thigh_(front|back|outer)$/, profile: { capacity: [1, 2], factor: 1 } },
  { test: /_thigh_inner$/, profile: { capacity: [1, 2], factor: 1.15 } },
  { test: /_lower_leg$/, profile: { capacity: [2, 3], factor: 1.05 } },
  { test: /_lower_leg_front$/, profile: { capacity: [1, 2], factor: 1.15 } },
  { test: /_lower_leg_back$/, profile: { capacity: [1, 2], factor: 1 } },
  { test: /_foot$/, profile: { capacity: [1, 1], factor: 1.25 } },
  // Cadera y glúteos
  { test: /^full_glutes$/, profile: { capacity: [2, 3], factor: 1.05 } },
  { test: /_(glute|hip)$/, profile: { capacity: [1, 2], factor: 1.05 } },
  // Cabeza y cuello
  { test: /^full_head$/, profile: { capacity: [3, 5], factor: 1.2 } },
  { test: /^full_face$/, profile: { capacity: [2, 3], factor: 1.3 } },
  { test: /^full_scalp$/, profile: { capacity: [2, 3], factor: 1.2 } },
  { test: /^head_/, profile: { capacity: [1, 2], factor: 1.2 } },
  { test: /^full_neck$/, profile: { capacity: [2, 3], factor: 1.25 } },
  { test: /^neck_/, profile: { capacity: [1, 2], factor: 1.25 } },
];

const DEFAULT_ZONE: ZoneProfile = { capacity: [1, 3], factor: 1 };

function profileForTarget(token: string): ZoneProfile {
  const { regionId, coverage } = stripCoverageToken(token);
  const base = ZONE_RULES.find((rule) => rule.test.test(regionId))?.profile ?? DEFAULT_ZONE;
  // Solo cara interna o externa ≈ un poco más de la mitad de la zona.
  if (coverage && coverage !== "complete") {
    return {
      factor: base.factor,
      capacity: [
        Math.max(1, Math.ceil(base.capacity[0] * 0.6)),
        Math.max(1, Math.ceil(base.capacity[1] * 0.6)),
      ],
    };
  }
  return base;
}

/** Perfil combinado de todas las zonas elegidas (son contiguas). */
function combineZones(targets: readonly string[]): ZoneProfile | null {
  if (targets.length === 0) return null;
  const profiles = targets.map(profileForTarget);
  const min = profiles.reduce((sum, p) => sum + p.capacity[0], 0);
  const max = profiles.reduce((sum, p) => sum + p.capacity[1], 0);
  const weight = profiles.reduce((sum, p) => sum + p.capacity[1], 0);
  const factor =
    profiles.reduce((sum, p) => sum + p.factor * p.capacity[1], 0) / Math.max(1, weight);
  return { capacity: [min, max], factor };
}

export type QuoteEstimate = {
  minSessions: number;
  maxSessions: number;
  sessionPrice: number;
  minTotal: number;
  maxTotal: number;
};

export function estimateQuote(
  size: QuoteSizeId,
  bodyTargets: readonly string[],
): QuoteEstimate {
  const sizeRange = SIZE_SESSIONS[size];
  const zone = combineZones(bodyTargets);

  let min: number = sizeRange[0];
  let max: number = sizeRange[1];
  let factor = 1;

  if (zone) {
    factor = zone.factor;
    if (size === "proyecto") {
      // Proyecto completo = cubrir la zona elegida.
      [min, max] = zone.capacity;
    } else {
      // La pieza no puede superar lo que cabe en la zona.
      max = Math.min(max, zone.capacity[1]);
      min = Math.min(min, max);
    }
  }

  const minSessions = Math.max(1, Math.round(min * factor));
  const maxSessions = Math.max(minSessions, Math.ceil(max * factor - 0.15));

  return {
    minSessions,
    maxSessions,
    sessionPrice: SESSION_PRICE_COP,
    minTotal: minSessions * SESSION_PRICE_COP,
    maxTotal: maxSessions * SESSION_PRICE_COP,
  };
}

export function formatCop(value: number, locale: "es" | "en" = "es") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatSessionsRange(
  estimate: Pick<QuoteEstimate, "minSessions" | "maxSessions">,
  locale: "es" | "en" = "es",
) {
  const { minSessions: min, maxSessions: max } = estimate;
  if (locale === "en") {
    if (min === max) return `${min} session${min === 1 ? "" : "s"}`;
    return `${min} to ${max} sessions`;
  }
  if (min === max) return `${min} sesión${min === 1 ? "" : "es"}`;
  return `${min} a ${max} sesiones`;
}

export function formatTotalRange(estimate: QuoteEstimate, locale: "es" | "en" = "es") {
  if (estimate.minTotal === estimate.maxTotal) return formatCop(estimate.minTotal, locale);
  return `${formatCop(estimate.minTotal, locale)} – ${formatCop(estimate.maxTotal, locale)}`;
}
