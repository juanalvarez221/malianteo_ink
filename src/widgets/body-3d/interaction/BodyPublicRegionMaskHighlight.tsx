"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import {
  BufferAttribute,
  Color,
  DataTexture,
  FrontSide,
  DoubleSide,
  NearestFilter,
  NoColorSpace,
  NormalBlending,
  RGBAFormat,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  type BufferGeometry,
  type Mesh,
  type Object3D,
  type Texture,
} from "three";
import { MALIANTEO_BODY_V1_MODEL } from "@/widgets/body-3d/bodyModelDefinition";
import {
  BODY_PUBLIC_REGION_MASK_MANIFEST,
  BODY_PUBLIC_REGION_MASK_RESOLUTION,
  BODY_PUBLIC_REGION_MASK_SRC,
  getMaskIndexForRegionId,
} from "@/widgets/body-3d/domain/bodyPublicRegionMask";
import {
  resolvePublicTargetHighlightRegions,
  type PublicHighlightRegionId,
} from "@/widgets/body-3d/domain/bodyPublicHighlightRegions";
import { REGION_MASK_COVERAGE_GLSL } from "@/widgets/body-3d/interaction/regionMaskCoverage";
import { resolveGeometryFieldCandidateIds } from "@/widgets/body-3d/domain/bodyPublicLogicalRegions";
import {
  loadRegionGeometryField,
  prefetchNeckRegionGeometryFields,
} from "@/widgets/body-3d/interaction/bodyRegionGeometryFieldLoader";

const LUT_SIZE = 256;

/**
 * Distancia firmada por vértice, una por estado (seleccionado / vista previa /
 * hover). Cada una es la UNIÓN (max) de los campos de todas las regiones de
 * ese estado: antes solo cabía un campo y, con el antebrazo ya elegido, el
 * bíceps (también por campo) nunca llegaba a pintarse.
 */
const FIELD_ATTRIBUTE = "aSelectedDistance";
const FIELD_ATTRIBUTE_PREVIEW = "aPreviewDistance";
const FIELD_ATTRIBUTE_HOVER = "aHoverDistance";
const FIELD_ATTRIBUTES = [
  FIELD_ATTRIBUTE,
  FIELD_ATTRIBUTE_PREVIEW,
  FIELD_ATTRIBUTE_HOVER,
] as const;
type FieldState = "selected" | "preview" | "hover";
const FIELD_ATTRIBUTE_BY_STATE: Record<FieldState, string> = {
  selected: FIELD_ATTRIBUTE,
  preview: FIELD_ATTRIBUTE_PREVIEW,
  hover: FIELD_ATTRIBUTE_HOVER,
};
/** Neutral value: fully outside, so an unloaded field renders nothing. */
const FIELD_NEUTRAL = -1;
const FIELD_MIN_AA_METERS = 0.0004;
const FIELD_MAX_AA_METERS = 0.0028;

/** Amarillo de senalizacion — solo sobre la zona activa. */
const HOVER_COLOR = "#a855f7";
const PREVIEW_COLOR = "#b57bff";
const SELECTED_COLOR = "#c084fc";
/** Contorno suave del perimetro. */
const EDGE_COLOR = "#f0e7ff";
/** Unused dim (kept for uniform ABI / tests). Body dimming is HumanBodyModel. */
const DIM_COLOR = "#07060b";

const HOVER_OPACITY = 0.78;
const PREVIEW_OPACITY = 0.84;
const SELECTED_OPACITY = 0.9;
const EDGE_OPACITY = 0.95;
const DIM_OPACITY = 0.0;
/**
 * Separación del overlay sobre la piel (unidades de modelo = metros).
 * Se desplaza a lo largo de la normal, no escalando desde el origen: un
 * escalado uniforme ×1.006 movía el resaltado ~1 cm en la cabeza (y=1,73 m)
 * y lo despegaba de la zona real.
 */
const OVERLAY_NORMAL_OFFSET = 0.0009;
const OPACITY_FADE_MS = 70;
/**
 * Product paint: categorical UV mask (dense torso) + geometry field on the
 * base overlay mesh for sparse regions (neck/arms). Never swap refined
 * geometry — that broke zone visibility.
 */
const ENABLE_GEOMETRY_FIELD_PAINT = true;

const VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const HIGHLIGHT_VERTEX_SHADER = /* glsl */ `
attribute float ${FIELD_ATTRIBUTE};
attribute float ${FIELD_ATTRIBUTE_PREVIEW};
attribute float ${FIELD_ATTRIBUTE_HOVER};

uniform float uNormalOffset;

varying vec2 vUv;
varying float vSelectedDistance;
varying float vPreviewDistance;
varying float vHoverDistance;

void main() {
  vUv = uv;
  vSelectedDistance = ${FIELD_ATTRIBUTE};
  vPreviewDistance = ${FIELD_ATTRIBUTE_PREVIEW};
  vHoverDistance = ${FIELD_ATTRIBUTE_HOVER};
  vec3 displaced = position + normalize(normal) * uNormalOffset;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;

const FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uMask;
uniform sampler2D uSelectedLut;
uniform sampler2D uPreviewLut;
uniform sampler2D uHoverLut;
uniform vec2 uTexel;
uniform vec3 uSelectedColor;
uniform vec3 uPreviewColor;
uniform vec3 uHoverColor;
uniform vec3 uEdgeColor;
uniform vec3 uDimColor;
uniform float uSelectedOpacity;
uniform float uPreviewOpacity;
uniform float uHoverOpacity;
uniform float uEdgeOpacity;
uniform float uDimOpacity;
uniform float uFocusActive;
uniform float uFade;
uniform float uFieldSelected;
uniform float uFieldPreview;
uniform float uFieldHover;
uniform float uMinimumAaWidth;
uniform float uMaximumAaWidth;
/** Pull field isoline inward (m) — used for tighter neck paint. */
uniform float uFieldShrinkMeters;
/** Minimum field coverage to accept a field-only fragment. */
uniform float uFieldMinCoverage;
/** Scales field-only opacity (neck is less invasive). */
uniform float uFieldOpacityScale;

varying vec2 vUv;
varying float vSelectedDistance;
varying float vPreviewDistance;
varying float vHoverDistance;

${REGION_MASK_COVERAGE_GLSL}

float fieldCoverage(float distanceMeters) {
  float d = distanceMeters - uFieldShrinkMeters;
  float aaWidth = clamp(fwidth(d), uMinimumAaWidth, uMaximumAaWidth);
  return smoothstep(-aaWidth, aaWidth, d);
}

void main() {
  // 1) Hard categorical membership (torso etc. — dense mask texels).
  float id = maskIdAt(uMask, vUv);
  float lutU = (id + 0.5) / 256.0;
  float selectedMem = texture2D(uSelectedLut, vec2(lutU, 0.5)).r;
  float previewMem = texture2D(uPreviewLut, vec2(lutU, 0.5)).r;
  float hoverMem = texture2D(uHoverLut, vec2(lutU, 0.5)).r;

  // 2) Geometry fields (neck/arms), uno por estado. Shrink opcional.
  float fieldSelected = fieldCoverage(vSelectedDistance) * uFieldSelected;
  float fieldPreview = fieldCoverage(vPreviewDistance) * uFieldPreview;
  float fieldHover = fieldCoverage(vHoverDistance) * uFieldHover;
  float fieldGate = uFieldMinCoverage;

  bool hasMask =
    selectedMem > 0.5 || previewMem > 0.5 || hoverMem > 0.5;
  bool hasField =
    fieldSelected > fieldGate ||
    fieldPreview > fieldGate ||
    fieldHover > fieldGate;
  if (!hasMask && !hasField) discard;

  vec3 color = uHoverColor;
  float opacity = uHoverOpacity;
  float coverage = 0.0;
  bool fieldOnly = false;

  if (selectedMem > 0.5 || fieldSelected > fieldGate) {
    color = uSelectedColor;
    opacity = uSelectedOpacity;
    float maskCov =
      selectedMem > 0.5
        ? sampleLutCoverage(uMask, uSelectedLut, uTexel, vUv)
        : 0.0;
    coverage = max(maskCov, fieldSelected);
    fieldOnly = selectedMem <= 0.5 && fieldSelected > fieldGate;
  } else if (previewMem > 0.5 || fieldPreview > fieldGate) {
    color = uPreviewColor;
    opacity = uPreviewOpacity;
    float maskCov =
      previewMem > 0.5
        ? sampleLutCoverage(uMask, uPreviewLut, uTexel, vUv)
        : 0.0;
    coverage = max(maskCov, fieldPreview);
    fieldOnly = previewMem <= 0.5 && fieldPreview > fieldGate;
  } else {
    color = uHoverColor;
    opacity = uHoverOpacity;
    float maskCov =
      hoverMem > 0.5
        ? sampleLutCoverage(uMask, uHoverLut, uTexel, vUv)
        : 0.0;
    coverage = max(maskCov, fieldHover);
    fieldOnly = hoverMem <= 0.5 && fieldHover > fieldGate;
  }

  if (hasMask) coverage = max(coverage, 0.85);
  if (fieldOnly) {
    opacity *= uFieldOpacityScale;
    // Prefer solid interior; soften fringe so neck feels less invasive.
    coverage = smoothstep(fieldGate, 0.92, coverage);
  }
  if (coverage < 0.22) discard;

  float fw = max(fwidth(coverage), 1e-4);
  float rim =
    smoothstep(0.0, fw * (fieldOnly ? 2.2 : 1.8), coverage) *
    (1.0 - smoothstep(fw * (fieldOnly ? 1.4 : 1.1), fw * (fieldOnly ? 8.0 : 6.5), coverage));

  float fillAlpha = opacity * coverage * uFade;
  float rimAlpha = uEdgeOpacity * rim * uFade * (fieldOnly ? 0.65 : 1.0);
  vec3 highlightColor = mix(color, uEdgeColor, clamp(rim * 1.15, 0.0, 1.0));
  float highlightAlpha = max(fillAlpha, rimAlpha);
  if (highlightAlpha < 0.02) discard;

  gl_FragColor = vec4(highlightColor, highlightAlpha);
}
`;

function createMembershipLut(): DataTexture {
  const data = new Uint8Array(LUT_SIZE * 4);
  const texture = new DataTexture(
    data,
    LUT_SIZE,
    1,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = NoColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

function writeMembershipLut(
  texture: DataTexture,
  maskIndices: readonly number[],
) {
  const data = texture.image.data as Uint8Array;
  data.fill(0);
  for (const index of maskIndices) {
    if (index < 0 || index >= LUT_SIZE) continue;
    const offset = index * 4;
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = 255;
  }
  texture.needsUpdate = true;
}

function regionIdsToMaskIndices(ids: readonly string[]): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  for (const id of ids) {
    const index = getMaskIndexForRegionId(id);
    if (index === null || seen.has(index)) continue;
    seen.add(index);
    out.push(index);
  }
  return out;
}

function createMaskOverlayMaterial(
  maskTexture: Texture,
  selectedLut: DataTexture,
  previewLut: DataTexture,
  hoverLut: DataTexture,
) {
  const texel = 1 / BODY_PUBLIC_REGION_MASK_RESOLUTION;
  const material = new ShaderMaterial({
    uniforms: {
      uMask: { value: maskTexture },
      uSelectedLut: { value: selectedLut },
      uPreviewLut: { value: previewLut },
      uHoverLut: { value: hoverLut },
      uTexel: { value: new Vector2(texel, texel) },
      uSelectedColor: { value: new Color(SELECTED_COLOR) },
      uPreviewColor: { value: new Color(PREVIEW_COLOR) },
      uHoverColor: { value: new Color(HOVER_COLOR) },
      uEdgeColor: { value: new Color(EDGE_COLOR) },
      uDimColor: { value: new Color(DIM_COLOR) },
      uSelectedOpacity: { value: SELECTED_OPACITY },
      uPreviewOpacity: { value: PREVIEW_OPACITY },
      uHoverOpacity: { value: HOVER_OPACITY },
      uEdgeOpacity: { value: EDGE_OPACITY },
      uDimOpacity: { value: DIM_OPACITY },
      uFocusActive: { value: 0 },
      uFade: { value: 1 },
      uFieldSelected: { value: 0 },
      uFieldPreview: { value: 0 },
      uFieldHover: { value: 0 },
      uMinimumAaWidth: { value: FIELD_MIN_AA_METERS },
      uMaximumAaWidth: { value: FIELD_MAX_AA_METERS },
      uFieldShrinkMeters: { value: 0 },
      uFieldMinCoverage: { value: 0.32 },
      uFieldOpacityScale: { value: 1 },
      uNormalOffset: { value: OVERLAY_NORMAL_OFFSET },
    },
    vertexShader: HIGHLIGHT_VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    // Respeta la oclusión: un brazo delante del costado tapa el resaltado
    // de las costillas (antes se pintaba encima del brazo).
    depthTest: true,
    side: FrontSide,
    toneMapped: false,
    blending: NormalBlending,
  });
  material.polygonOffset = true;
  material.polygonOffsetFactor = -1;
  material.polygonOffsetUnits = -2;
  return material;
}

function prepareOverlayScene(
  scene: Object3D,
  material: ShaderMaterial,
): Object3D {
  const cloned = scene.clone(true);
  cloned.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    mesh.material = material;
    mesh.frustumCulled = false;
    mesh.renderOrder = 20;
    mesh.raycast = () => undefined;
  });
  return cloned;
}

/**
 * Overlay copy that owns its geometry, so the per-vertex distance attribute
 * never leaks into the shared BodyVisual used by other viewers.
 */
type FieldOverlayTarget = { mesh: Mesh; base: BufferGeometry };

function prepareFieldOverlayScene(scene: Object3D, material: ShaderMaterial) {
  const cloned = prepareOverlayScene(scene, material);
  const targets: FieldOverlayTarget[] = [];
  cloned.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const geometry = mesh.geometry.clone();
    const count = geometry.getAttribute("position")?.count ?? 0;
    for (const name of FIELD_ATTRIBUTES) {
      const values = new Float32Array(count).fill(FIELD_NEUTRAL);
      geometry.setAttribute(name, new BufferAttribute(values, 1));
    }
    mesh.geometry = geometry;
    targets.push({ mesh, base: geometry });
  });
  return { scene: cloned, targets };
}

function writeFieldAttribute(
  geometry: BufferGeometry,
  values: Float32Array | null,
  name: string = FIELD_ATTRIBUTE,
) {
  const attribute = geometry.getAttribute(name) as BufferAttribute | undefined;
  if (!attribute) return false;
  const target = attribute.array as Float32Array;
  if (!values) {
    target.fill(FIELD_NEUTRAL);
  } else if (values.length === target.length) {
    target.set(values);
  } else {
    return false;
  }
  attribute.needsUpdate = true;
  return true;
}

const FIELD_STATES: readonly FieldState[] = ["selected", "preview", "hover"];

/** Escribe el campo de un estado en todos los meshes y activa su uniform. */
function installStateField(
  targets: readonly FieldOverlayTarget[],
  material: ShaderMaterial | null,
  state: FieldState,
  values: Float32Array | null,
) {
  const name = FIELD_ATTRIBUTE_BY_STATE[state];
  let ok = false;
  for (const target of targets) {
    target.mesh.geometry = target.base;
    if (writeFieldAttribute(target.base, values, name)) ok = true;
  }
  const uniform =
    state === "selected"
      ? material?.uniforms.uFieldSelected
      : state === "preview"
        ? material?.uniforms.uFieldPreview
        : material?.uniforms.uFieldHover;
  if (uniform) uniform.value = ok && values ? 1 : 0;
}

/** Isolínea algo hacia dentro en el cuello (anatomía fina). */
function applyNeckTuning(material: ShaderMaterial | null, neck: boolean) {
  if (!material) return;
  const u = material.uniforms;
  if (u.uFieldShrinkMeters) u.uFieldShrinkMeters.value = neck ? 0.0015 : 0;
  if (u.uFieldMinCoverage) u.uFieldMinCoverage.value = neck ? 0.4 : 0.32;
  if (u.uFieldOpacityScale) u.uFieldOpacityScale.value = neck ? 0.92 : 1;
}

/** Carga los campos de varias regiones y devuelve su unión (max por vértice). */
async function loadFieldUnion(
  candidates: readonly string[],
  identity: ReturnType<typeof geometryIdentityOf>,
): Promise<{ union: Float32Array | null; neck: boolean }> {
  let union: Float32Array | null = null;
  let neck = false;
  for (const regionId of candidates) {
    const started = now();
    const result = await loadRegionGeometryField(regionId, identity);
    if (result.status !== "ok") {
      reportFieldTiming({
        regionId,
        status: result.status,
        reason: "reason" in result ? result.reason : undefined,
        loadSource:
          result.status === "mismatch"
            ? "mismatch"
            : result.status === "error"
              ? "error"
              : "unavailable",
        resolveMs: now() - started,
        installMs: 0,
        totalMs: now() - started,
      });
      continue;
    }
    const values = result.values;
    if (values.length !== identity.vertexCount) continue;
    if (!union) {
      union = new Float32Array(values);
    } else {
      for (let i = 0; i < union.length; i++) {
        if (values[i]! > union[i]!) union[i] = values[i]!;
      }
    }
    if (
      regionId.includes("neck") ||
      result.entry.surfaceRegionId?.includes("neck") === true
    ) {
      neck = true;
    }
    reportFieldTiming({
      regionId,
      status: "ok",
      candidateId: result.entry.candidateId,
      fieldHash: result.entry.fieldHash,
      loadSource: "official",
      resolveMs: now() - started,
      installMs: 0,
      totalMs: now() - started,
    });
  }
  return { union, neck };
}

function geometryIdentityOf(geometry: BufferGeometry) {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex();
  return {
    positions: position.array as ArrayLike<number>,
    indices: index ? (index.array as ArrayLike<number>) : null,
    vertexCount: position.count,
  };
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

type FieldTiming = {
  regionId: string;
  status: string;
  reason?: string;
  candidateId?: string;
  fieldHash?: string;
  refinementHash?: string;
  loadSource?: "official" | "unavailable" | "error" | "mismatch";
  resolveMs: number;
  installMs: number;
  totalMs: number;
  /** Micro path: cache lookup + geometry restore + attribute/uniforms. */
  microCachedMs?: number;
  geometryCacheHit?: boolean;
  stages?: {
    manifestMs: number;
    lookupMs: number;
    validateMs: number;
    fieldFetchMs: number;
    decodeMs: number;
    refineFetchMs: number;
    refineDecodeMs: number;
    cacheHit: boolean;
    geometryRetrieveMs: number;
    attributeInstallMs: number;
    uniformUpdateMs: number;
  };
};

/** Diagnostics hook consumed by the V2.5 browser evidence run. */
function reportFieldTiming(timing: FieldTiming) {
  if (typeof window === "undefined") return;
  (
    window as unknown as { __malianteoRegionField?: FieldTiming }
  ).__malianteoRegionField = timing;
}

export type BodyPublicRegionMaskHighlightProps = {
  rotation?: [number, number, number];
  scale?: number;
  /** Región pública en hover (raro; suele usarse preview). */
  hoveredPublicRegionId?: string | null;
  previewPublicRegionIds?:
    | readonly PublicHighlightRegionId[]
    | readonly string[];
  selectedPublicRegionIds?:
    | readonly PublicHighlightRegionId[]
    | readonly string[];
};

/**
 * Overlay premium por máscara UV (Region ID) sobre BodyVisual.
 * SELECTED > PREVIEW > HOVER. Geometry distance field when the region tiene sidecar.
 * No hace raycast. No altera la piel base.
 */
export function BodyPublicRegionMaskHighlight({
  rotation = [0, 0, 0],
  scale = 1,
  hoveredPublicRegionId = null,
  previewPublicRegionIds = [],
  selectedPublicRegionIds = [],
}: BodyPublicRegionMaskHighlightProps) {
  const { scene } = useGLTF(MALIANTEO_BODY_V1_MODEL.src);
  const loadedMask = useTexture(BODY_PUBLIC_REGION_MASK_SRC);
  const fadeTarget = useRef(1);
  const reducedMotionRef = useRef(false);
  const materialRef = useRef<ShaderMaterial | null>(null);

  const maskTexture = useMemo(() => {
    const texture = loadedMask.clone();
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = NoColorSpace;
    texture.flipY = true;
    texture.needsUpdate = true;
    return texture;
  }, [loadedMask]);

  const selectedLut = useMemo(() => createMembershipLut(), []);
  const previewLut = useMemo(() => createMembershipLut(), []);
  const hoverLut = useMemo(() => createMembershipLut(), []);

  const material = useMemo(
    () =>
      createMaskOverlayMaterial(maskTexture, selectedLut, previewLut, hoverLut),
    [maskTexture, selectedLut, previewLut, hoverLut],
  );

  const overlay = useMemo(
    () => prepareFieldOverlayScene(scene, material),
    [scene, material],
  );
  const overlayScene = overlay.scene;

  useLayoutEffect(() => {
    materialRef.current = material;
  }, [material]);

  useLayoutEffect(() => {
    if (!overlay.targets[0]) return;
    prefetchNeckRegionGeometryFields(
      geometryIdentityOf(overlay.targets[0].base),
    );
  }, [overlay.targets]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reducedMotionRef.current = mq.matches;
      const mat = materialRef.current;
      if (mq.matches && mat?.uniforms.uFade) {
        mat.uniforms.uFade.value = 1;
      }
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  /** Candidatos de campo instalados por estado (evita recargas y restos). */
  const fieldKeysRef = useRef<Record<FieldState, string>>({
    selected: "",
    preview: "",
    hover: "",
  });
  const neckByStateRef = useRef<Record<FieldState, boolean>>({
    selected: false,
    preview: false,
    hover: false,
  });

  const selectedKey = selectedPublicRegionIds.join("|");
  const previewKey = previewPublicRegionIds.join("|");
  const hoverKey = hoveredPublicRegionId ?? "";

  useLayoutEffect(() => {
    const selectedIds = selectedKey ? selectedKey.split("|") : [];
    const previewIds = previewKey ? previewKey.split("|") : [];
    const hoverIds = hoverKey
      ? (() => {
          const expanded = resolvePublicTargetHighlightRegions(hoverKey);
          return expanded.length > 0 ? [...expanded] : [hoverKey];
        })()
      : [];
    const targets = overlay.targets;

    // 1) LUTs categóricas: síncronas, siempre activas.
    writeMembershipLut(selectedLut, regionIdsToMaskIndices(selectedIds));
    writeMembershipLut(previewLut, regionIdsToMaskIndices(previewIds));
    writeMembershipLut(hoverLut, regionIdsToMaskIndices(hoverIds));

    // 2) Campos geométricos: unión por estado (zonas finas: cuello/brazos).
    const mat = materialRef.current;
    if (!ENABLE_GEOMETRY_FIELD_PAINT || !targets.length) {
      for (const state of FIELD_STATES) {
        installStateField(targets, mat, state, null);
      }
      applyNeckTuning(mat, false);
    } else {
      const identity = geometryIdentityOf(targets[0]!.base);
      const idsByState: Record<FieldState, readonly string[]> = {
        selected: selectedIds,
        preview: previewIds,
        hover: hoverIds,
      };
      const fieldKeys = fieldKeysRef.current;
      const neckByState = neckByStateRef.current;
      for (const state of FIELD_STATES) {
        const candidates = resolveGeometryFieldCandidateIds(idsByState[state]);
        const key = candidates.join("|");
        if (fieldKeys[state] === key) continue;
        fieldKeys[state] = key;
        // El campo anterior de este estado se retira ya: si el nuevo tarda
        // en cargar no queda pintada la zona vieja.
        installStateField(targets, mat, state, null);
        neckByState[state] = false;
        if (!candidates.length) continue;
        // Cada estado se instala por su cuenta (uno lento no bloquea a otros).
        void loadFieldUnion(candidates, identity).then((r) => {
          // Solo la carga vigente de ese estado se instala.
          if (fieldKeys[state] !== key) return;
          installStateField(targets, mat, state, r.union);
          neckByState[state] = r.neck;
          applyNeckTuning(
            mat,
            FIELD_STATES.some((st) => neckByState[st]),
          );
        });
      }
      applyNeckTuning(mat, FIELD_STATES.some((st) => neckByState[st]));
    }

    fadeTarget.current = 1;
    if (mat?.uniforms.uFocusActive) {
      const hasFocus =
        selectedIds.length > 0 || previewIds.length > 0 || hoverIds.length > 0;
      mat.uniforms.uFocusActive.value = hasFocus ? 1 : 0;
    }
    if (mat?.uniforms.uFade) {
      mat.uniforms.uFade.value = 1;
    }

  }, [
    selectedLut,
    previewLut,
    hoverLut,
    overlay,
    selectedKey,
    previewKey,
    hoverKey,
  ]);

  useFrame((_, delta) => {
    const mat = materialRef.current;
    if (!mat?.uniforms.uFade) return;
    if (reducedMotionRef.current) {
      mat.uniforms.uFade.value = 1;
      return;
    }
    const current = mat.uniforms.uFade.value as number;
    const target = fadeTarget.current;
    const speed = 1000 / OPACITY_FADE_MS;
    const next = current + (target - current) * Math.min(1, delta * speed);
    mat.uniforms.uFade.value = next;
  });

  useLayoutEffect(() => {
    const targets = overlay.targets;
    const fieldKeys = fieldKeysRef.current;
    return () => {
      // Overlay nuevo = geometría con campos neutros: forzar recarga.
      fieldKeys.selected = "";
      fieldKeys.preview = "";
      fieldKeys.hover = "";
      material.dispose();
      selectedLut.dispose();
      previewLut.dispose();
      hoverLut.dispose();
      maskTexture.dispose();
      for (const target of targets) target.base.dispose();
    };
  }, [material, selectedLut, previewLut, hoverLut, maskTexture, overlay]);

  return (
    <group rotation={rotation} scale={[scale, scale, scale]}>
      <primitive object={overlayScene} />
    </group>
  );
}

useGLTF.preload(MALIANTEO_BODY_V1_MODEL.src);
useTexture.preload(BODY_PUBLIC_REGION_MASK_SRC);

// --- Debug overlay (rainbow de todas las regiones) ---

const DEBUG_FRAGMENT_SHADER = /* glsl */ `
uniform sampler2D uMask;
uniform sampler2D uColorLut;
uniform vec2 uTexel;
uniform float uOpacity;

varying vec2 vUv;

vec4 lutColor(float id) {
  return texture2D(uColorLut, vec2((id + 0.5) / 256.0, 0.5));
}

void main() {
  float alphaSum = 0.0;
  vec3 colorAcc = vec3(0.0);

  for (int dy = -1; dy <= 1; dy++) {
    for (int dx = -1; dx <= 1; dx++) {
      vec2 sampleUv = vUv + vec2(float(dx), float(dy)) * uTexel;
      float id = floor(texture2D(uMask, sampleUv).r * 255.0 + 0.5);
      vec4 sample = lutColor(id);
      alphaSum += sample.a;
      colorAcc += sample.rgb * sample.a;
    }
  }

  float membership = alphaSum / 9.0;
  if (membership < 0.02) discard;
  vec3 color = colorAcc / max(alphaSum, 0.001);

  gl_FragColor = vec4(color, uOpacity * membership);
}
`;

function hueToRgb(h: number): [number, number, number] {
  const s = 0.72;
  const l = 0.55;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  };
  return [f(0), f(8), f(4)];
}

function createRainbowColorLut(): DataTexture {
  const data = new Uint8Array(LUT_SIZE * 4);
  const entries = Object.entries(BODY_PUBLIC_REGION_MASK_MANIFEST.regions);
  const count = Math.max(entries.length, 1);

  for (let i = 0; i < entries.length; i++) {
    const [, entry] = entries[i]!;
    const index = entry.maskIndex;
    if (index < 0 || index >= LUT_SIZE) continue;
    const [r, g, b] = hueToRgb(i / count);
    const offset = index * 4;
    data[offset] = Math.round(r * 255);
    data[offset + 1] = Math.round(g * 255);
    data[offset + 2] = Math.round(b * 255);
    data[offset + 3] = 255;
  }

  const texture = new DataTexture(
    data,
    LUT_SIZE,
    1,
    RGBAFormat,
    UnsignedByteType,
  );
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export type BodyPublicRegionMaskDebugProps = {
  rotation?: [number, number, number];
  scale?: number;
};

/**
 * Lab: pinta todas las regiones de la máscara UV con tonos distintos.
 */
export function BodyPublicRegionMaskDebug({
  rotation = [0, 0, 0],
  scale = 1,
}: BodyPublicRegionMaskDebugProps) {
  const { scene } = useGLTF(MALIANTEO_BODY_V1_MODEL.src);
  const loadedMask = useTexture(BODY_PUBLIC_REGION_MASK_SRC);
  const colorLut = useMemo(() => createRainbowColorLut(), []);

  const maskTexture = useMemo(() => {
    const texture = loadedMask.clone();
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = NoColorSpace;
    // PNG authoring uses OpenGL V (row0 = V=1); drei default flipY matches GLB UVs.
    texture.flipY = true;
    texture.needsUpdate = true;
    return texture;
  }, [loadedMask]);

  const material = useMemo(() => {
    const texel = 1 / BODY_PUBLIC_REGION_MASK_RESOLUTION;
    const mat = new ShaderMaterial({
      uniforms: {
        uMask: { value: maskTexture },
        uColorLut: { value: colorLut },
        uTexel: { value: new Vector2(texel, texel) },
        uOpacity: { value: 0.55 },
      },
      vertexShader: VERTEX_SHADER,
      fragmentShader: DEBUG_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: DoubleSide,
      toneMapped: false,
    });
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -4;
    mat.polygonOffsetUnits = -4;
    return mat;
  }, [maskTexture, colorLut]);

  const overlayScene = useMemo(
    () => prepareOverlayScene(scene, material),
    [scene, material],
  );

  useLayoutEffect(() => {
    return () => {
      material.dispose();
      colorLut.dispose();
      maskTexture.dispose();
    };
  }, [material, colorLut, maskTexture]);

  return (
    <group rotation={rotation} scale={[scale, scale, scale]}>
      <primitive object={overlayScene} />
    </group>
  );
}
