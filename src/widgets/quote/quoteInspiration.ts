/**
 * Opciones del paso "Inspiración": qué le gusta del estilo y por qué elige a
 * Malianteo. Son ids estables para medir intereses en el tiempo; las etiquetas
 * visibles viven en quoteFlowCopy.
 */

import { QUOTE_FLOW_COPY_ES } from "@/widgets/quote/quoteFlowCopy";

export const STYLE_LIKES = [
  "realism",
  "contrast",
  "faces",
  "sacred_dark",
  "scale",
  "healed",
] as const;
export type StyleLike = (typeof STYLE_LIKES)[number];

export const ARTIST_REASONS = [
  "style_match",
  "detail",
  "big_projects",
  "custom",
  "trust",
  "follower",
] as const;
export type ArtistReason = (typeof ARTIST_REASONS)[number];

export const ARTIST_REASONS_MAX = 3;

export function sanitizeStyleLikes(values: readonly string[] | undefined): StyleLike[] {
  return (values ?? []).filter((v): v is StyleLike => STYLE_LIKES.includes(v as StyleLike));
}

export function sanitizeArtistReasons(values: readonly string[] | undefined): ArtistReason[] {
  return (values ?? [])
    .filter((v): v is ArtistReason => ARTIST_REASONS.includes(v as ArtistReason))
    .slice(0, ARTIST_REASONS_MAX);
}

/** Texto en español para el brief interno. */
export function describeStyleLikes(values: readonly string[] | undefined) {
  const labels = sanitizeStyleLikes(values).map((id) => QUOTE_FLOW_COPY_ES.inspiration.likes[id]);
  return labels.length ? labels.join(", ") : undefined;
}

export function describeArtistReasons(values: readonly string[] | undefined) {
  const labels = sanitizeArtistReasons(values).map(
    (id) => QUOTE_FLOW_COPY_ES.inspiration.reasons[id],
  );
  return labels.length ? labels.join(", ") : undefined;
}
