/**
 * Encuadre inteligente de una zona corporal a partir de su geometría real.
 *
 * Criterios (como un operador de cámara de producto 3D):
 *  1. Dirección: la normal media de la zona si es "plana" (pecho, espalda,
 *     bíceps); si envuelve (manga, cuello completo, pierna) se usa la vista
 *     preferida del catálogo. Si la vista actual ya es parecida, se gira
 *     menos (continuidad, sin giros innecesarios).
 *  2. Elevación acotada: nunca desde debajo ni cenital extremo.
 *  3. Distancia: la zona completa (todos sus puntos, con perspectiva) cabe en
 *     el área libre del visor — descontando panel / hoja móvil — con margen,
 *     pero sin acercarse tanto que se pierda el contexto corporal.
 *  4. La zona queda centrada en el área libre mediante desplazamiento de
 *     proyección (view offset), así la órbita sigue pivotando sobre la zona.
 */

import { Matrix3, Matrix4, Vector3 } from "three";
import type { BodyZoneGeometryStats } from "@/widgets/body-3d/interaction/bodyHitSurface";
import { resolveTargetToAtomicZoneIds } from "@/widgets/body-3d/domain/bodySelectionTargets";
import {
  resolveMemberIdsForCoverage,
  stripCoverageToken,
} from "@/widgets/body-3d/domain/bodyPublicSelectionCatalog";

/** Píxeles del visor tapados por UI (panel, hoja, controles). */
export type FramingInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ZoneFramingResult = {
  position: Vector3;
  target: Vector3;
  /** Desplazamiento de proyección en px (camera.setViewOffset). */
  viewOffset: { x: number; y: number };
};

export type ZoneFramingInput = {
  stats: readonly BodyZoneGeometryStats[];
  /** Local del modelo → mundo (incluye Center, rotación y escala). */
  matrixWorld: Matrix4;
  fovDeg: number;
  viewport: { width: number; height: number };
  insets: FramingInsets;
  currentPosition: Vector3;
  /** Dirección horizontal de la vista preferida (desde la zona hacia cámara). */
  preferredDirection: Vector3;
  limits: { minDistance: number; maxDistance: number };
};

/** Fracción del área libre que ocupa la zona (resto = aire / contexto). */
const FILL = 0.7;
/** Altura mínima visible (m): nunca tan cerca que se pierda el cuerpo. */
const MIN_VISIBLE_SPAN = 0.46;
/** Coherencia de normales: por debajo se considera que la zona envuelve. */
const COHERENCE_LOW = 0.28;
const COHERENCE_HIGH = 0.62;
/** Si la cámara ya mira parecido (< este ángulo), se conserva parte del giro. */
const CONTINUITY_ANGLE = (40 * Math.PI) / 180;
const CONTINUITY_WEIGHT = 0.35;
const MIN_ELEVATION = (-18 * Math.PI) / 180;
const MAX_ELEVATION = (52 * Math.PI) / 180;
const WORLD_UP = new Vector3(0, 1, 0);

function smoothstep(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Atómicas de un target público (respeta la cobertura interna/externa). */
export function resolveFramingAtomicIds(targetToken: string): string[] {
  const { regionId, coverage } = stripCoverageToken(targetToken);
  if (coverage && coverage !== "complete") {
    const out = new Set<string>();
    for (const member of resolveMemberIdsForCoverage(regionId, coverage)) {
      for (const atomic of resolveTargetToAtomicZoneIds(member)) out.add(atomic);
    }
    if (out.size > 0) return [...out];
  }
  return [...resolveTargetToAtomicZoneIds(regionId)];
}

function clampElevation(dir: Vector3, fallback: Vector3) {
  const horizontal = new Vector3(dir.x, 0, dir.z);
  if (horizontal.lengthSq() < 1e-6) {
    horizontal.set(fallback.x, 0, fallback.z);
  }
  if (horizontal.lengthSq() < 1e-6) horizontal.set(0, 0, 1);
  horizontal.normalize();
  const elevation = Math.min(
    MAX_ELEVATION,
    Math.max(MIN_ELEVATION, Math.asin(Math.min(1, Math.max(-1, dir.y)))),
  );
  return horizontal
    .multiplyScalar(Math.cos(elevation))
    .setY(Math.sin(elevation))
    .normalize();
}

export function computeZoneFraming(
  input: ZoneFramingInput,
): ZoneFramingResult | null {
  const { stats, matrixWorld, viewport, insets } = input;
  if (!stats.length || viewport.width <= 0 || viewport.height <= 0) {
    return null;
  }

  const normalMatrix = new Matrix3().getNormalMatrix(matrixWorld);

  // 1) Centroide y normal media (mundo), ponderados por área.
  let totalArea = 0;
  const centroid = new Vector3();
  const localNormalSum = new Vector3();
  const tmp = new Vector3();
  for (const s of stats) {
    totalArea += s.area;
    tmp.set(...s.centroid).applyMatrix4(matrixWorld);
    centroid.addScaledVector(tmp, s.area);
    localNormalSum.add(tmp.set(...s.normal));
  }
  if (totalArea <= 0) return null;
  centroid.divideScalar(totalArea);
  // 1 = la zona mira a un solo lado; ~0 = envuelve (manga, cuello completo).
  const coherence = Math.min(1, localNormalSum.length() / totalArea);
  const normalSum = localNormalSum.applyMatrix3(normalMatrix);

  // 2) Dirección de cámara (desde la zona hacia la cámara).
  const preferred = input.preferredDirection.clone().setY(0);
  if (preferred.lengthSq() < 1e-6) preferred.set(0, 0, 1);
  preferred.normalize();
  const geometric = normalSum.lengthSq() > 1e-12
    ? normalSum.clone().normalize()
    : preferred.clone();
  const w = smoothstep(COHERENCE_LOW, COHERENCE_HIGH, coherence);
  let dir = preferred.clone().lerp(geometric, w);
  if (dir.lengthSq() < 1e-6) dir.copy(preferred);
  dir.normalize();

  const current = input.currentPosition.clone().sub(centroid);
  if (current.lengthSq() > 1e-6) {
    current.normalize();
    if (current.angleTo(dir) < CONTINUITY_ANGLE) {
      dir.lerp(current, CONTINUITY_WEIGHT).normalize();
    }
  }
  dir = clampElevation(dir, preferred);

  // 3) Base de cámara y área libre en NDC.
  const right = new Vector3().crossVectors(WORLD_UP, dir);
  if (right.lengthSq() < 1e-6) right.set(1, 0, 0);
  right.normalize();
  const up = new Vector3().crossVectors(dir, right).normalize();

  const { width: W, height: H } = viewport;
  const safeW = Math.max(W * 0.35, W - insets.left - insets.right);
  const safeH = Math.max(H * 0.35, H - insets.top - insets.bottom);
  const tanV = Math.tan(((input.fovDeg * Math.PI) / 180) / 2);
  const tanH = tanV * (W / H);
  const halfX = (safeW / W) * FILL;
  const halfY = (safeH / H) * FILL;

  // 4) Distancia: cada punto (con su profundidad) dentro del área libre.
  let distance = 0;
  const q = new Vector3();
  for (const s of stats) {
    const pts = s.points;
    for (let i = 0; i < pts.length; i += 3) {
      q.set(pts[i]!, pts[i + 1]!, pts[i + 2]!)
        .applyMatrix4(matrixWorld)
        .sub(centroid);
      const x = Math.abs(q.dot(right));
      const y = Math.abs(q.dot(up));
      const z = q.dot(dir);
      const need = Math.max(z + x / (halfX * tanH), z + y / (halfY * tanV));
      if (need > distance) distance = need;
    }
  }
  const contextDistance = MIN_VISIBLE_SPAN / (2 * tanV * (safeH / H));
  distance = Math.min(
    input.limits.maxDistance,
    Math.max(input.limits.minDistance, contextDistance, distance),
  );

  // 5) Centro del área libre ← eje de cámara (view offset en px).
  const safeCenterX = insets.left + safeW / 2;
  const safeCenterY = insets.top + safeH / 2;

  return {
    position: centroid.clone().addScaledVector(dir, distance),
    target: centroid,
    viewOffset: { x: W / 2 - safeCenterX, y: H / 2 - safeCenterY },
  };
}
