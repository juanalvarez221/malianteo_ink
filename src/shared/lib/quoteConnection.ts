import { markQuoteOnboardingComplete } from "@/shared/lib/quoteFlow";
import {
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "@/shared/lib/safeStorage";

export type ReferralSource = "instagram" | "tiktok" | "acquaintance" | "google" | "other";

/** Cómo quiere trabajar la pieza el cliente. */
export type AdjustmentOption =
  | "trust_artist"
  | "open_composition"
  | "fixed_idea_only";

export type QuoteConnection = {
  referralSources: ReferralSource[];
  referralOther?: string;
  adjustments: AdjustmentOption[];
  /** @deprecated Pregunta retirada; se conserva para leer registros antiguos. */
  personalValues?: string[];
  /** @deprecated Pregunta retirada ("¿Qué te trajo hasta aquí?"). */
  openNote?: string;
};

export const REFERRAL_SOURCES: ReferralSource[] = [
  "instagram",
  "tiktok",
  "acquaintance",
  "google",
  "other",
];

export const ADJUSTMENT_OPTIONS: AdjustmentOption[] = [
  "trust_artist",
  "open_composition",
  "fixed_idea_only",
];

const QUOTE_CONNECTION_KEY = "quote_connection";

function isValidConnection(parsed: unknown): parsed is QuoteConnection {
  if (!parsed || typeof parsed !== "object") return false;
  const data = parsed as QuoteConnection;
  return (
    Array.isArray(data.referralSources) &&
    data.referralSources.length > 0 &&
    data.referralSources.every((source) => REFERRAL_SOURCES.includes(source)) &&
    Array.isArray(data.adjustments) &&
    data.adjustments.length > 0 &&
    data.adjustments.every((option) => ADJUSTMENT_OPTIONS.includes(option))
  );
}

export function saveQuoteConnection(connection: QuoteConnection) {
  if (typeof window === "undefined") return;
  safeLocalStorageSet(QUOTE_CONNECTION_KEY, JSON.stringify(connection));
  markQuoteOnboardingComplete();
}

export function getQuoteConnection(): QuoteConnection | null {
  if (typeof window === "undefined") return null;
  const raw = safeLocalStorageGet(QUOTE_CONNECTION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidConnection(parsed)) return null;
    if (parsed.referralSources.includes("other") && !parsed.referralOther?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Etiquetas en español para el brief de Malianteo (correo, agenda, admin). */
const REFERRAL_BRIEF_LABELS: Record<ReferralSource, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  acquaintance: "Recomendación",
  google: "Google",
  other: "Otro",
};

const ADJUSTMENT_BRIEF_LABELS: Record<AdjustmentOption, string> = {
  trust_artist: "Libertad creativa total",
  open_composition: "Definir la dirección juntos",
  fixed_idea_only: "Quiere su idea tal cual (sin cambios)",
};

export function describeConnectionForBrief(connection: QuoteConnection | null) {
  if (!connection) return { referral: undefined, collaboration: undefined };
  const referral = connection.referralSources
    .map((source) =>
      source === "other"
        ? `Otro (${connection.referralOther?.trim() ?? ""})`
        : REFERRAL_BRIEF_LABELS[source],
    )
    .join(", ");
  const collaboration = connection.adjustments
    .map((option) => ADJUSTMENT_BRIEF_LABELS[option])
    .join(", ");
  return { referral: referral || undefined, collaboration: collaboration || undefined };
}
