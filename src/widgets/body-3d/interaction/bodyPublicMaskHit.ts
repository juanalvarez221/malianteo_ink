/**
 * Client-side categorical mask sampler.
 * Interaction-model UVs share the production atlas — sample R8 index → public target.
 */
"use client";

import {
  BODY_PUBLIC_REGION_MASK_MANIFEST,
  BODY_PUBLIC_REGION_MASK_SRC,
  getMaskIndexForRegionId,
} from "@/widgets/body-3d/domain/bodyPublicRegionMask";
import { resolvePublicTargetHighlightRegions } from "@/widgets/body-3d/domain/bodyPublicHighlightRegions";
import {
  getLogicalRegionForVisualHit,
  normalizeLogicalPublicHit,
} from "@/widgets/body-3d/domain/bodyPublicLogicalRegions";
import { resolveLateralNeckPublicHit } from "@/widgets/body-3d/domain/bodyPublicNeckHit";
import { getPrimaryPublicSelectionTarget } from "@/widgets/body-3d/domain/bodyPublicSelectionRouting";
import { isPublicSelectableBodyTarget } from "@/widgets/body-3d/domain/bodyPublicSelectionTargets";
import { BODY_ZONES_BY_ID } from "@/widgets/body-3d/domain/bodyZones";
import {
  BODY_PUBLIC_SELECTION_CATALOG,
  getPublicCatalogEntry,
  stripCoverageToken,
  type PublicBodySelectionTargetId,
} from "@/widgets/body-3d/domain/bodyPublicSelectionCatalog";

type MaskRaster = {
  width: number;
  height: number;
  /** Solo canal R (índice categórico), 1 byte por texel. */
  data: Uint8Array;
};

let rasterPromise: Promise<MaskRaster | null> | null = null;
/** Raster ya decodificado: permite resolver hits de forma síncrona. */
let rasterReady: MaskRaster | null = null;

function loadMaskRaster(): Promise<MaskRaster | null> {
  if (!rasterPromise) {
    rasterPromise = (async () => {
      try {
        const response = await fetch(BODY_PUBLIC_REGION_MASK_SRC);
        if (!response.ok) return null;
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob, {
          colorSpaceConversion: "none",
          premultiplyAlpha: "none",
        });
        const canvas = document.createElement("canvas");
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(bitmap, 0, 0);
        const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
        bitmap.close();
        // Compacta RGBA → R (4096² = 16 MB en vez de 64 MB retenidos).
        const rgba = image.data;
        const data = new Uint8Array(image.width * image.height);
        for (let i = 0, j = 0; i < data.length; i++, j += 4) {
          data[i] = rgba[j]!;
        }
        canvas.width = 0;
        canvas.height = 0;
        const raster = { width: image.width, height: image.height, data };
        rasterReady = raster;
        return raster;
      } catch {
        return null;
      }
    })();
  }
  return rasterPromise;
}

/** Warm the mask decode so the first click is not cold. */
export function prefetchPublicRegionMaskRaster() {
  void loadMaskRaster();
}

/** Nearest-filter sample matching the runtime mask shader (floor, flipY). */
export function sampleMaskIndexAtUv(
  raster: MaskRaster,
  u: number,
  v: number,
): number {
  const px = Math.min(
    raster.width - 1,
    Math.max(0, Math.floor(u * raster.width)),
  );
  const py = Math.min(
    raster.height - 1,
    Math.max(0, Math.floor((1 - v) * raster.height)),
  );
  return raster.data[py * raster.width + px] ?? 0;
}

/**
 * Radio (texels) para absorber costuras UV: a 4096² un texel ≈ 0,4 mm de piel,
 * así que 2 texels solo cierran el canal sin pintar entre islas/regiones,
 * sin invadir zonas no seleccionables reales.
 */
const SEAM_SNAP_RADIUS = 2;

/**
 * Igual que `sampleMaskIndexAtUv`, pero si el texel cae en una costura sin
 * pintar devuelve el índice pintado más cercano dentro de `SEAM_SNAP_RADIUS`.
 */
export function sampleMaskIndexAtUvSeamSafe(
  raster: MaskRaster,
  u: number,
  v: number,
): number {
  const cx = Math.min(raster.width - 1, Math.max(0, Math.floor(u * raster.width)));
  const cy = Math.min(
    raster.height - 1,
    Math.max(0, Math.floor((1 - v) * raster.height)),
  );
  const center = raster.data[cy * raster.width + cx] ?? 0;
  if (center > 0) return center;

  let best = 0;
  let bestDist = Infinity;
  for (let dy = -SEAM_SNAP_RADIUS; dy <= SEAM_SNAP_RADIUS; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= raster.height) continue;
    for (let dx = -SEAM_SNAP_RADIUS; dx <= SEAM_SNAP_RADIUS; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= raster.width) continue;
      const d = dx * dx + dy * dy;
      if (d === 0 || d > SEAM_SNAP_RADIUS * SEAM_SNAP_RADIUS || d >= bestDist) {
        continue;
      }
      const id = raster.data[y * raster.width + x] ?? 0;
      if (id > 0) {
        best = id;
        bestDist = d;
      }
    }
  }
  return best;
}

const MASK_INDEX_TO_SURFACE: ReadonlyMap<number, string> = (() => {
  const map = new Map<number, string>();
  for (const [id, entry] of Object.entries(
    BODY_PUBLIC_REGION_MASK_MANIFEST.regions,
  )) {
    if (!map.has(entry.maskIndex)) map.set(entry.maskIndex, id);
  }
  return map;
})();

/** Prefer catalog public targets whose highlight region owns this mask index. */
const MASK_INDEX_TO_PUBLIC: ReadonlyMap<number, PublicBodySelectionTargetId> =
  (() => {
    const map = new Map<number, PublicBodySelectionTargetId>();
    for (const entry of BODY_PUBLIC_SELECTION_CATALOG) {
      if (!isPublicSelectableBodyTarget(entry.id)) continue;
      const regions = resolvePublicTargetHighlightRegions(entry.id);
      for (const regionId of regions) {
        const index = getMaskIndexForRegionId(regionId);
        if (index == null || map.has(index)) continue;
        map.set(index, entry.id as PublicBodySelectionTargetId);
      }
    }
    return map;
  })();

/** Active public selection used to normalize logical hits (e.g. full_back). */
let activePublicTargetIdsForHit: readonly string[] = [];

export function setActivePublicTargetsForHit(ids: readonly string[]) {
  activePublicTargetIdsForHit = ids.map(
    (id) => stripCoverageToken(id).regionId,
  );
}

export function getActivePublicTargetsForHit(): readonly string[] {
  return activePublicTargetIdsForHit;
}

/**
 * Canonical routing atomic for a public target so existing option sheets keep working.
 */
const PUBLIC_TO_CANONICAL_ATOMIC: Readonly<Record<string, string>> = {
  full_chest: "sternum",
  full_abdomen: "upper_abdomen",
  left_ribs: "left_ribs",
  right_ribs: "right_ribs",
  upper_back: "upper_back_center",
  lower_back: "mid_back_center",
  full_back: "upper_back_center",
  // Aliases legacy
  upper_back_large: "upper_back_center",
  lower_back_large: "mid_back_center",
  // Hombros: el mesh de interacción es pequeño y el rayo suele ganar
  // pecho/brazo/espalda. La máscara (índices 16/17) es la autoridad de hit.
  right_shoulder: "right_shoulder",
  left_shoulder: "left_shoulder",
  // Laterales de cuello: la máscara (índices 7/8) pinta bandas finas.
  neck_left: "neck_left",
  neck_right: "neck_right",
};

export function getPublicTargetForMaskIndex(
  maskIndex: number,
): PublicBodySelectionTargetId | null {
  if (maskIndex <= 0) return null;
  return MASK_INDEX_TO_PUBLIC.get(maskIndex) ?? null;
}

export function getSurfaceRegionIdForMaskIndex(
  maskIndex: number,
): string | null {
  if (maskIndex <= 0) return null;
  return MASK_INDEX_TO_SURFACE.get(maskIndex) ?? null;
}

export function canonicalAtomicForPublicTarget(
  publicTargetId: string,
): string | null {
  const bare = stripCoverageToken(publicTargetId).regionId;
  if (PUBLIC_TO_CANONICAL_ATOMIC[bare]) {
    return PUBLIC_TO_CANONICAL_ATOMIC[bare];
  }
  const member = getPublicCatalogEntry(bare)?.memberIds[0];
  if (member && BODY_ZONES_BY_ID[member]) return member;
  if (BODY_ZONES_BY_ID[bare]) return bare;
  return null;
}

export type MaskResolvedHit = {
  maskIndex: number;
  surfaceRegionId: string | null;
  publicTargetId: PublicBodySelectionTargetId | null;
  /** Atomic to feed the existing premium option sheet. */
  effectiveAtomicId: string | null;
};

/**
 * Resolve public selection from interaction-mesh UV via the categorical mask.
 * Falls back to atomic routing when the mask is unavailable or empty.
 */
export async function resolvePublicHitFromUv(
  uv: { x: number; y: number } | null | undefined,
  atomicId: string | null,
): Promise<MaskResolvedHit> {
  const raster = uv ? await loadMaskRaster() : null;
  return resolvePublicHitWithRaster(raster, uv, atomicId);
}

/**
 * Variante síncrona: null si la máscara aún no está decodificada
 * (el llamador cae a la ruta async). Evita una promesa por pointermove.
 */
export function resolvePublicHitFromUvSync(
  uv: { x: number; y: number } | null | undefined,
  atomicId: string | null,
): MaskResolvedHit | null {
  if (uv && !rasterReady) return null;
  return resolvePublicHitWithRaster(rasterReady, uv, atomicId);
}

function resolvePublicHitWithRaster(
  raster: MaskRaster | null,
  uv: { x: number; y: number } | null | undefined,
  atomicId: string | null,
): MaskResolvedHit {
  const atomicPublic = atomicId
    ? getPrimaryPublicSelectionTarget(atomicId)
    : null;
  const fallback: MaskResolvedHit = {
    maskIndex: 0,
    surfaceRegionId: null,
    publicTargetId: atomicPublic,
    effectiveAtomicId: atomicId,
  };
  if (!uv || !raster) return fallback;

  const maskIndex = sampleMaskIndexAtUvSeamSafe(raster, uv.x, uv.y);
  if (maskIndex <= 0) {
    // Unpainted atlas texel — categorical mask says non-selectable here.
    // Do not let oversized interaction meshes reclaim abdomen/chest.
    // Lateral neck is an exception: thin bands often sit on empty texels.
    const lateral = resolveLateralNeckPublicHit(atomicId, null);
    return {
      maskIndex: 0,
      surfaceRegionId: null,
      publicTargetId: lateral,
      effectiveAtomicId: lateral ?? atomicId,
    };
  }

  const surfaceRegionId = getSurfaceRegionIdForMaskIndex(maskIndex);
  let publicTargetId = resolveLateralNeckPublicHit(
    atomicId,
    getPublicTargetForMaskIndex(maskIndex),
  );

  // Logical composite: when full_back is active, upper/lower surfaces resolve to it.
  if (surfaceRegionId && publicTargetId) {
    const logical = getLogicalRegionForVisualHit(surfaceRegionId);
    if (logical) {
      const normalized = normalizeLogicalPublicHit(
        surfaceRegionId,
        activePublicTargetIdsForHit,
      );
      if (normalized === logical.regionId) {
        publicTargetId = logical.regionId as PublicBodySelectionTargetId;
      }
    }
  }

  if (!publicTargetId) {
    return {
      maskIndex,
      surfaceRegionId,
      publicTargetId: atomicPublic,
      effectiveAtomicId: atomicId,
    };
  }

  const canonical = canonicalAtomicForPublicTarget(publicTargetId);
  return {
    maskIndex,
    surfaceRegionId,
    publicTargetId,
    effectiveAtomicId: canonical ?? atomicId,
  };
}
