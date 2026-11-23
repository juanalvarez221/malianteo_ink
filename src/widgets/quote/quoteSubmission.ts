/**
 * Arma el brief de la cotización a partir del borrador y lo registra.
 * Un solo id por pieza (draft.quoteRequestId): el estimado crea la solicitud
 * y la agenda la actualiza, sin duplicados.
 */

import type { SiteCopyKey } from "@/shared/i18n/siteLanguage";
import { describeConnectionForBrief, getQuoteConnection } from "@/shared/lib/quoteConnection";
import {
  getQuoteDraft,
  resolveQuoteSizeParam,
  saveQuoteDraft,
  type QuoteDraft,
  type QuoteSizeId,
} from "@/shared/lib/quoteDraft";
import { getQuoteProfile } from "@/shared/lib/quoteProfile";
import {
  addSmartQuoteRequest,
  persistQuoteRequestToBackend,
  type SmartQuoteRequest,
  type SmartQuoteStatus,
} from "@/shared/lib/smartQuotes";
import { formatQuoteLocationLabel } from "@/widgets/quote/quoteBodyLocation";
import {
  estimateQuote,
  formatCop,
  formatSessionsRange,
  formatTotalRange,
  type QuoteEstimate,
} from "@/widgets/quote/quoteEstimate";
import { QUOTE_FLOW_COPY_ES } from "@/widgets/quote/quoteFlowCopy";
import { describeArtistReasons, describeStyleLikes } from "@/widgets/quote/quoteInspiration";
import { loadReferenceImages } from "@/widgets/quote/quoteReferenceImages";

const QUOTE_STYLE = "Realismo negro y gris (Malianteo)";

export type QuoteBrief = {
  size: QuoteSizeId;
  /** "Grande · 15–25 cm" (español, para Malianteo). */
  sizeLabelEs: string;
  zoneLabel: string;
  estimate: QuoteEstimate;
  styleLikes?: string;
  artistReasons?: string;
  referral?: string;
  collaboration?: string;
  notes: string;
  referenceCount: number;
};

export function sizeLabelEs(size: QuoteSizeId) {
  const option = QUOTE_FLOW_COPY_ES.size.options[size];
  return `${option.label} · ${option.range}`;
}

export function buildQuoteBrief(
  draft: QuoteDraft,
  t: (key: SiteCopyKey) => string,
): QuoteBrief {
  const size = resolveQuoteSizeParam(draft.size);
  const connection = describeConnectionForBrief(getQuoteConnection());
  return {
    size,
    sizeLabelEs: sizeLabelEs(size),
    zoneLabel: formatQuoteLocationLabel(draft, t, { zone: draft.zone, zoneOther: draft.zoneOther }),
    estimate: estimateQuote(size, draft.selectedBodyTargets ?? []),
    styleLikes: describeStyleLikes(draft.styleLikes),
    artistReasons: describeArtistReasons(draft.artistReasons),
    referral: connection.referral,
    collaboration: connection.collaboration,
    notes: draft.notes?.trim() ?? "",
    referenceCount: draft.referenceCount ?? 0,
  };
}

/** Textos del estimado en español (los guarda el admin y el correo). */
export function describeEstimateEs(estimate: QuoteEstimate) {
  return {
    sessions: formatSessionsRange(estimate, "es"),
    perSession: `${formatCop(estimate.sessionPrice, "es")} por sesión`,
    total: formatTotalRange(estimate, "es"),
  };
}

export function ensureQuoteRequestId(): string {
  const draft = getQuoteDraft();
  if (draft?.quoteRequestId) return draft.quoteRequestId;
  const id = `SQ-${Date.now()}`;
  if (draft) saveQuoteDraft({ ...draft, quoteRequestId: id });
  return id;
}

type RegisterOptions = {
  status: SmartQuoteStatus;
  advisory?: Pick<
    SmartQuoteRequest,
    "advisoryMode" | "advisoryScheduledAt" | "advisoryBookingId"
  >;
  /** Adjunta las imágenes de referencia (solo la primera vez). */
  withImages?: boolean;
};

/**
 * Registra (o actualiza) la solicitud en el navegador y en el backend.
 * Nunca rompe el flujo si el backend falla.
 */
export async function registerQuoteRequest(
  brief: QuoteBrief,
  { status, advisory, withImages = false }: RegisterOptions,
): Promise<boolean> {
  const profile = getQuoteProfile();
  if (!profile) return false;
  const id = ensureQuoteRequestId();
  const estimateText = describeEstimateEs(brief.estimate);
  // El id lleva la hora de creación: actualizar no cambia la fecha de entrada.
  const createdMs = Number(id.replace(/^SQ-/, ""));
  const request: SmartQuoteRequest = {
    id,
    createdAt: new Date(Number.isFinite(createdMs) ? createdMs : Date.now()).toISOString(),
    clientName: profile.name,
    phone: profile.phone,
    email: profile.email,
    size: brief.sizeLabelEs,
    zone: brief.zoneLabel,
    style: QUOTE_STYLE,
    notes: brief.notes,
    connectionAftercare: brief.referral,
    connectionCollaboration: brief.collaboration,
    styleLikes: brief.styleLikes,
    artistReasons: brief.artistReasons,
    referenceCount: brief.referenceCount,
    requiresAdvisory: true,
    ...advisory,
    estimateSessions: estimateText.sessions,
    estimatePerSession: estimateText.perSession,
    estimateTotal: estimateText.total,
    status,
  };
  try {
    addSmartQuoteRequest(request);
  } catch {
    /* almacenamiento local lleno: el backend sigue siendo la fuente */
  }
  const images = withImages
    ? loadReferenceImages().map(({ name, dataUrl }) => ({ name, dataUrl }))
    : undefined;
  return persistQuoteRequestToBackend(request, { referenceImages: images });
}
