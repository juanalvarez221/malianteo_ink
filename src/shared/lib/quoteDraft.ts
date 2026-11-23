import {
  safeLocalStorageGet,
  safeLocalStorageRemove,
  safeLocalStorageSet,
  safeSessionStorageSet,
  safeStorageGet,
  safeStorageRemove,
} from "@/shared/lib/safeStorage";

/** Tamaños del cotizador (de menor a mayor). */
export const QUOTE_SIZE_IDS = ["mediano", "grande", "extra", "proyecto"] as const;
export type QuoteSizeId = (typeof QUOTE_SIZE_IDS)[number];

export type QuoteDraft = {
  size: string;
  zone?: string;
  zoneOther?: string;
  headPart?: string;
  backPart?: string;
  armLaterality?: string;
  armFaceScope?: string;
  armPart?: string;
  legLaterality?: string;
  legFaceScope?: string;
  legExtent?: string;
  /**
   * Selección conceptual del selector 3D (fuente de verdad de ubicación).
   * Vacío / ausente = sin selección 3D. Nunca guardar atomics aquí.
   */
  selectedBodyTargets?: string[];
  /** @deprecated */
  armSide?: string;
  /** @deprecated */
  legSide?: string;
  /** @deprecated */
  legPart?: string;
  /** Nota libre del cliente ("¿algo más?"). */
  notes?: string;
  /** Lo que más le gusta del estilo (ids de STYLE_LIKES). */
  styleLikes?: string[];
  /** Por qué cree que Malianteo es el artista ideal (ids de ARTIST_REASONS). */
  artistReasons?: string[];
  /** Cantidad de imágenes de referencia adjuntas. */
  referenceCount?: number;
  /** Id de la solicitud registrada al ver el estimado (evita duplicados). */
  quoteRequestId?: string;
};

const QUOTE_DRAFT_KEY = "quote_draft";

export function normalizeQuoteSize(size: string) {
  const normalized = size
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  if (normalized.includes("peque")) return "mediano";
  return normalized;
}

/** Convierte cualquier valor guardado (incluye los antiguos) a un tamaño válido. */
export function resolveQuoteSizeParam(size: string | null | undefined): QuoteSizeId {
  const normalized = normalizeQuoteSize(size ?? "");
  if (normalized.includes("proyecto")) return "proyecto";
  if (normalized.includes("extra")) return "extra";
  if (normalized.includes("gran")) return "grande";
  return "mediano";
}

export function isQuoteSizeId(value: string | null | undefined): value is QuoteSizeId {
  return QUOTE_SIZE_IDS.includes(value as QuoteSizeId);
}

/** Piezas que ya cuentan como proyecto grande (para correos y CRM). */
export function isLargeQuoteSize(size: string) {
  const id = resolveQuoteSizeParam(size);
  return id === "extra" || id === "proyecto";
}

export function saveQuoteDraft(draft: QuoteDraft) {
  if (typeof window === "undefined") return;
  safeLocalStorageSet(QUOTE_DRAFT_KEY, JSON.stringify(draft));
}

export function getQuoteDraft(): QuoteDraft | null {
  if (typeof window === "undefined") return null;
  const raw = safeLocalStorageGet(QUOTE_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QuoteDraft;
    if (!parsed?.size) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearQuoteDraft() {
  if (typeof window === "undefined") return;
  safeLocalStorageRemove(QUOTE_DRAFT_KEY);
}

export const QUOTE_COMPLETION_KEY = "quote_completion_type";

export type QuoteCompletionType = "asesoria" | "cotizacion";

export function setQuoteCompletionType(type: QuoteCompletionType) {
  if (typeof window === "undefined") return;
  safeSessionStorageSet(QUOTE_COMPLETION_KEY, type);
}

export function getQuoteCompletionType(): QuoteCompletionType | null {
  if (typeof window === "undefined") return null;
  const value = safeStorageGet(window.sessionStorage, QUOTE_COMPLETION_KEY);
  if (value === "asesoria" || value === "cotizacion") return value;
  return null;
}

export function clearQuoteCompletionType() {
  if (typeof window === "undefined") return;
  safeStorageRemove(window.sessionStorage, QUOTE_COMPLETION_KEY);
}
