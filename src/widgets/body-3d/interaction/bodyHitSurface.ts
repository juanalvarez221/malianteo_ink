/**
 * Superficie de impacto exacta para el selector corporal.
 *
 * El raycast se hace contra la MISMA malla que se ve (BodyVisual), no contra
 * el InteractionModel de 81 piezas. Así:
 *  - lo que hay bajo el cursor es exactamente lo que se resalta
 *    (mismas UV que muestrea el overlay de la máscara);
 *  - no hay agujeros: el InteractionModel no incluye 38 triángulos de la
 *    entrepierna y ahí el rayo atravesaba el cuerpo hasta la cara opuesta
 *    (p. ej. abdomen bajo → glúteo derecho).
 *
 * La zona atómica de cada triángulo se deriva una sola vez del
 * InteractionModel (los triángulos son idénticos: misma posición + UV), y los
 * triángulos que faltan heredan la zona de sus vecinos.
 *
 * Todo se hace con arrays tipados y claves SMI (< 2^31): ~10-20 ms en V8.
 */

import {
  BufferGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type BufferAttribute,
  type Face,
  type Intersection,
  type InterleavedBufferAttribute,
  type Object3D,
} from "three";
import { interactionMeshNameToAtomicId } from "@/widgets/body-3d/interaction/bodyInteractionLabels";

export const BODY_HIT_SURFACE_NAME = "MalianteoBodyHitSurface";

/** Cobertura mínima del mapeo para confiar en la superficie exacta. */
const MIN_MAPPED_RATIO = 0.95;
/** Tolerancias de coincidencia de vértices (metros / UV). */
const POS_EPS = 2e-5;
const UV_EPS = 2e-4;
/** Rejilla del hash espacial (0,1 mm). */
const POS_QUANT = 1e4;

/**
 * Geometría de una zona atómica en espacio local del modelo (para encuadre).
 * `normal` es la suma de normales ponderadas por área: |normal| / area mide
 * cuán "plana" es la zona (1 = mira a un solo lado, ~0 = envuelve).
 */
export type BodyZoneGeometryStats = {
  area: number;
  centroid: [number, number, number];
  normal: [number, number, number];
  /** Centroides de triángulos (x,y,z intercalados) para ajustar el encuadre. */
  points: Float32Array;
};

export type BodyHitSurface = {
  mesh: Mesh;
  /** Estadísticas por zona atómica (espacio local). */
  zoneStats: ReadonlyMap<string, BodyZoneGeometryStats>;
  /** Zona atómica del triángulo (por índices de vértice: robusto al BVH). */
  atomicForFace: (face: Pick<Face, "a" | "b" | "c">) => string | null;
  mappedRatio: number;
  dispose: () => void;
};

type AnyAttribute = BufferAttribute | InterleavedBufferAttribute;

function firstMesh(root: Object3D): Mesh | null {
  let found: Mesh | null = null;
  root.traverse((obj) => {
    if (found) return;
    if ((obj as Mesh).isMesh) found = obj as Mesh;
  });
  return found;
}

/** Copia plana de un atributo (vale también para intercalados). */
function readComponents(attr: AnyAttribute, size: 2 | 3): Float32Array {
  const count = attr.count;
  const out = new Float32Array(count * size);
  const plain = attr as BufferAttribute;
  if (
    !(attr as InterleavedBufferAttribute).isInterleavedBufferAttribute &&
    plain.itemSize === size &&
    !plain.normalized &&
    plain.array instanceof Float32Array
  ) {
    out.set(plain.array.subarray(0, count * size));
    return out;
  }
  for (let i = 0; i < count; i++) {
    out[i * size] = attr.getX(i);
    out[i * size + 1] = attr.getY(i);
    if (size === 3) out[i * size + 2] = attr.getZ(i);
  }
  return out;
}

/** Hash espacial 31-bit (SMI) de una posición cuantizada. */
function positionHash(p: Float32Array, i: number): number {
  const qx = Math.round(p[i * 3]! * POS_QUANT);
  const qy = Math.round(p[i * 3 + 1]! * POS_QUANT);
  const qz = Math.round(p[i * 3 + 2]! * POS_QUANT);
  return (
    (Math.imul(qx, 73856093) ^
      Math.imul(qy, 19349663) ^
      Math.imul(qz, 83492791)) >>>
    1
  );
}

/** Adyacencia vértice → triángulos en formato CSR. */
function buildVertexTriangles(idx: Uint32Array, vertexCount: number) {
  const triCount = idx.length / 3;
  const offsets = new Uint32Array(vertexCount + 1);
  for (let k = 0; k < idx.length; k++) offsets[idx[k]! + 1]!++;
  for (let v = 0; v < vertexCount; v++) offsets[v + 1]! += offsets[v]!;
  const cursor = offsets.slice(0, vertexCount);
  const tris = new Uint32Array(idx.length);
  for (let t = 0; t < triCount; t++) {
    for (let k = 0; k < 3; k++) {
      const v = idx[t * 3 + k]!;
      tris[cursor[v]!++] = t;
    }
  }
  return { offsets, tris };
}

/**
 * Construye la superficie de impacto. Devuelve null si la malla visual no
 * coincide con el InteractionModel (el llamador usa el modelo legacy).
 */
export function buildBodyHitSurface(
  visualScene: Object3D,
  interactionScene: Object3D,
): BodyHitSurface | null {
  const visual = firstMesh(visualScene);
  if (!visual) return null;
  const source = visual.geometry;
  const pos = source.getAttribute("position") as AnyAttribute | undefined;
  const uv = source.getAttribute("uv") as AnyAttribute | undefined;
  const index = source.getIndex();
  if (!pos || !uv || !index) return null;

  const vertexCount = pos.count;
  const triCount = index.count / 3;
  const idx = Uint32Array.from(index.array as ArrayLike<number>);
  const vPos = readComponents(pos, 3);
  const vUv = readComponents(uv, 2);
  const adjacency = buildVertexTriangles(idx, vertexCount);

  // 1) Hash espacial de vértices visuales (encadenado en arrays tipados).
  const bucketHead = new Map<number, number>();
  const bucketNext = new Int32Array(vertexCount).fill(-1);
  for (let i = 0; i < vertexCount; i++) {
    const h = positionHash(vPos, i);
    const head = bucketHead.get(h);
    if (head !== undefined) bucketNext[i] = head;
    bucketHead.set(h, i);
  }

  const findVertex = (
    p: Float32Array,
    u: Float32Array | null,
    i: number,
  ): number => {
    let v = bucketHead.get(positionHash(p, i)) ?? -1;
    let positional = -1;
    const px = p[i * 3]!;
    const py = p[i * 3 + 1]!;
    const pz = p[i * 3 + 2]!;
    while (v >= 0) {
      if (
        Math.abs(vPos[v * 3]! - px) < POS_EPS &&
        Math.abs(vPos[v * 3 + 1]! - py) < POS_EPS &&
        Math.abs(vPos[v * 3 + 2]! - pz) < POS_EPS
      ) {
        if (
          !u ||
          (Math.abs(vUv[v * 2]! - u[i * 2]!) < UV_EPS &&
            Math.abs(vUv[v * 2 + 1]! - u[i * 2 + 1]!) < UV_EPS)
        ) {
          return v;
        }
        if (positional < 0) positional = v;
      }
      v = bucketNext[v]!;
    }
    return positional;
  };

  /** Triángulo visual con estos 3 vértices (vía adyacencia del primero). */
  const findTriangle = (a: number, b: number, c: number): number => {
    const { offsets, tris } = adjacency;
    for (let k = offsets[a]!; k < offsets[a + 1]!; k++) {
      const t = tris[k]!;
      const x = idx[t * 3]!;
      const y = idx[t * 3 + 1]!;
      const z = idx[t * 3 + 2]!;
      if (
        (x === b || y === b || z === b) &&
        (x === c || y === c || z === c)
      ) {
        return t;
      }
    }
    return -1;
  };

  // 2) Zona atómica por triángulo visual desde el InteractionModel.
  const zoneNames: string[] = [];
  const zoneIndexByName = new Map<string, number>();
  const triZone = new Int32Array(triCount).fill(-1);
  let mapped = 0;

  interactionScene.traverse((obj) => {
    const mesh = obj as Mesh;
    if (!mesh.isMesh) return;
    const atomicId = interactionMeshNameToAtomicId(mesh.name);
    if (!atomicId) return;
    const g = mesh.geometry;
    const ipos = g.getAttribute("position") as AnyAttribute | undefined;
    const iuv = g.getAttribute("uv") as AnyAttribute | undefined;
    if (!ipos) return;

    let zone = zoneIndexByName.get(atomicId);
    if (zone === undefined) {
      zone = zoneNames.length;
      zoneNames.push(atomicId);
      zoneIndexByName.set(atomicId, zone);
    }

    const ip = readComponents(ipos, 3);
    const iu = iuv ? readComponents(iuv, 2) : null;
    const local = new Int32Array(ipos.count);
    for (let i = 0; i < ipos.count; i++) local[i] = findVertex(ip, iu, i);

    const iindex = g.getIndex();
    const iidx = iindex
      ? (iindex.array as ArrayLike<number>)
      : Uint32Array.from({ length: ipos.count }, (_, i) => i);
    for (let t = 0; t + 2 < iidx.length; t += 3) {
      const a = local[iidx[t]!]!;
      const b = local[iidx[t + 1]!]!;
      const c = local[iidx[t + 2]!]!;
      if (a < 0 || b < 0 || c < 0) continue;
      const tri = findTriangle(a, b, c);
      if (tri < 0 || triZone[tri]! >= 0) continue;
      triZone[tri] = zone;
      mapped++;
    }
  });

  const mappedRatio = triCount > 0 ? mapped / triCount : 0;
  if (mappedRatio < MIN_MAPPED_RATIO) return null;

  // 3) Huecos del InteractionModel → zona mayoritaria de los vértices vecinos.
  for (let pass = 0; pass < 8 && mapped < triCount; pass++) {
    const vertexZone = new Int32Array(vertexCount).fill(-1);
    for (let t = 0; t < triCount; t++) {
      const z = triZone[t]!;
      if (z < 0) continue;
      for (let k = 0; k < 3; k++) vertexZone[idx[t * 3 + k]!] = z;
    }
    let filled = 0;
    for (let t = 0; t < triCount; t++) {
      if (triZone[t]! >= 0) continue;
      const z0 = vertexZone[idx[t * 3]!]!;
      const z1 = vertexZone[idx[t * 3 + 1]!]!;
      const z2 = vertexZone[idx[t * 3 + 2]!]!;
      const best =
        z0 >= 0 && (z0 === z1 || z0 === z2)
          ? z0
          : z1 >= 0 && z1 === z2
            ? z1
            : z0 >= 0
              ? z0
              : z1 >= 0
                ? z1
                : z2;
      if (best >= 0) {
        triZone[t] = best;
        filled++;
      }
    }
    mapped += filled;
    if (filled === 0) break;
  }

  const zoneStats = computeZoneStats(triZone, idx, vPos, zoneNames);

  // Geometría propia: el BVH reordena el índice y no debe tocar la visual.
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", pos.clone() as BufferAttribute);
  geometry.setAttribute("uv", uv.clone() as BufferAttribute);
  geometry.setIndex(index.clone());
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const material = new MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false,
    side: DoubleSide,
  });

  const mesh = new Mesh(geometry, material);
  mesh.name = BODY_HIT_SURFACE_NAME;
  mesh.frustumCulled = false;
  mesh.position.copy(visual.position);
  mesh.quaternion.copy(visual.quaternion);
  mesh.scale.copy(visual.scale);
  mesh.raycast = Mesh.prototype.raycast;

  const atomicForFace = (face: Pick<Face, "a" | "b" | "c">) => {
    const tri = findTriangle(face.a, face.b, face.c);
    if (tri < 0) return null;
    const z = triZone[tri]!;
    return z < 0 ? null : (zoneNames[z] ?? null);
  };

  mesh.userData.atomicForFace = atomicForFace;
  mesh.userData.zoneStats = zoneStats;

  return {
    mesh,
    zoneStats,
    atomicForFace,
    mappedRatio,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** Área, centroide, normal media y puntos de cada zona atómica. */
function computeZoneStats(
  triZone: Int32Array,
  idx: Uint32Array,
  vPos: Float32Array,
  zoneNames: readonly string[],
): Map<string, BodyZoneGeometryStats> {
  const zoneCount = zoneNames.length;
  const area = new Float64Array(zoneCount);
  const cen = new Float64Array(zoneCount * 3);
  const nrm = new Float64Array(zoneCount * 3);
  const triCount = new Uint32Array(zoneCount);
  for (let t = 0; t < triZone.length; t++) {
    const z = triZone[t]!;
    if (z >= 0) triCount[z]!++;
  }
  const points = Array.from(
    { length: zoneCount },
    (_, z) => new Float32Array(triCount[z]! * 3),
  );
  const cursor = new Uint32Array(zoneCount);

  for (let t = 0; t < triZone.length; t++) {
    const z = triZone[t]!;
    if (z < 0) continue;
    const a = idx[t * 3]! * 3;
    const b = idx[t * 3 + 1]! * 3;
    const c = idx[t * 3 + 2]! * 3;
    const ax = vPos[a]!, ay = vPos[a + 1]!, az = vPos[a + 2]!;
    const e1x = vPos[b]! - ax, e1y = vPos[b + 1]! - ay, e1z = vPos[b + 2]! - az;
    const e2x = vPos[c]! - ax, e2y = vPos[c + 1]! - ay, e2z = vPos[c + 2]! - az;
    // Producto cruz / 2 = normal ponderada por área.
    const nx = (e1y * e2z - e1z * e2y) * 0.5;
    const ny = (e1z * e2x - e1x * e2z) * 0.5;
    const nz = (e1x * e2y - e1y * e2x) * 0.5;
    const triArea = Math.hypot(nx, ny, nz);
    const cx = (ax + vPos[b]! + vPos[c]!) / 3;
    const cy = (ay + vPos[b + 1]! + vPos[c + 1]!) / 3;
    const cz = (az + vPos[b + 2]! + vPos[c + 2]!) / 3;
    area[z]! += triArea;
    cen[z * 3]! += cx * triArea;
    cen[z * 3 + 1]! += cy * triArea;
    cen[z * 3 + 2]! += cz * triArea;
    nrm[z * 3]! += nx;
    nrm[z * 3 + 1]! += ny;
    nrm[z * 3 + 2]! += nz;
    const k = cursor[z]!++ * 3;
    const pts = points[z]!;
    pts[k] = cx;
    pts[k + 1] = cy;
    pts[k + 2] = cz;
  }

  const out = new Map<string, BodyZoneGeometryStats>();
  for (let z = 0; z < zoneCount; z++) {
    const A = area[z]!;
    if (A <= 0) continue;
    out.set(zoneNames[z]!, {
      area: A,
      centroid: [cen[z * 3]! / A, cen[z * 3 + 1]! / A, cen[z * 3 + 2]! / A],
      normal: [nrm[z * 3]!, nrm[z * 3 + 1]!, nrm[z * 3 + 2]!],
      points: points[z]!,
    });
  }
  return out;
}

/** Zona atómica de una intersección (superficie exacta o malla legacy por nombre). */
export function atomicIdFromIntersection(
  hit: Pick<Intersection, "object" | "face">,
): string | null {
  const resolver = hit.object.userData?.atomicForFace as
    | BodyHitSurface["atomicForFace"]
    | undefined;
  if (resolver && hit.face) return resolver(hit.face);
  return interactionMeshNameToAtomicId(hit.object.name);
}
