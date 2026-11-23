"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Bvh, useGLTF } from "@react-three/drei";
import type { ThreeEvent } from "@react-three/fiber";
import {
  DoubleSide,
  Mesh,
  type Material,
  type Mesh as ThreeMesh,
  type MeshStandardMaterial,
  type Object3D,
} from "three";
import { MALIANTEO_BODY_V1_MODEL } from "@/widgets/body-3d/bodyModelDefinition";
import { BODY_81_INTERACTION_MODEL_SRC } from "@/widgets/body-3d/domain/bodyZones";
import { CLICK_DRAG_THRESHOLD_PX } from "@/widgets/body-3d/interaction/bodyInteractionTypes";
import {
  atomicIdFromIntersection,
  buildBodyHitSurface,
} from "@/widgets/body-3d/interaction/bodyHitSurface";
import {
  prefetchPublicRegionMaskRaster,
  resolvePublicHitFromUv,
  resolvePublicHitFromUvSync,
  type MaskResolvedHit,
} from "@/widgets/body-3d/interaction/bodyPublicMaskHit";

function disposeMaterial(material: Material | Material[]) {
  if (Array.isArray(material)) {
    for (const m of material) m.dispose();
  } else {
    material.dispose();
  }
}

/** Legacy: 81 mallas invisibles (solo si la superficie exacta no cuadra). */
function prepareInvisibleRaycastScene(scene: Object3D) {
  const cloned = scene.clone(true);
  const materials: Material[] = [];

  cloned.traverse((obj) => {
    const mesh = obj as ThreeMesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    mesh.visible = true;

    const mats = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];

    const next = mats.map((mat) => {
      const std = (mat as MeshStandardMaterial).clone() as MeshStandardMaterial;
      std.transparent = true;
      std.opacity = 0;
      std.depthWrite = false;
      std.colorWrite = false;
      std.side = DoubleSide;
      std.toneMapped = false;
      std.needsUpdate = true;
      materials.push(std);
      return std;
    });

    mesh.material = next.length === 1 ? next[0]! : next;
    mesh.raycast = Mesh.prototype.raycast;
  });

  return {
    object: cloned as Object3D,
    dispose: () => {
      for (const mat of materials) disposeMaterial(mat);
    },
  };
}

type PointerSession = {
  x: number;
  y: number;
  pointerId: number;
  atomicId: string | null;
  uv: { x: number; y: number } | null;
  dragging: boolean;
};

export type BodyInteractionModelProps = {
  rotation?: [number, number, number];
  scale?: number;
  enabled?: boolean;
  onHoverAtomicZone: (atomicId: string | null) => void;
  onActivateAtomicZone: (atomicId: string) => void;
  /** Coordenadas de pantalla para tooltip (desktop). */
  onHoverPointer?: (point: { x: number; y: number } | null) => void;
  /** Se dispara cuando la superficie de interacción está preparada. */
  onReady?: () => void;
};

function publishLastHit(hit: MaskResolvedHit, atomicId: string) {
  if (typeof window === "undefined") return;
  (
    window as unknown as {
      __malianteoLastHit?: {
        atomicId: string | null;
        publicTargetId: string | null;
        maskIndex?: number;
        via: string;
      };
    }
  ).__malianteoLastHit = {
    atomicId,
    publicTargetId: hit.publicTargetId,
    maskIndex: hit.maskIndex,
    via: "pointer",
  };
}

/**
 * Capa invisible raycasteable.
 * Usa la malla visual exacta (con BVH) para que el punto bajo el cursor y el
 * resaltado coincidan al texel; la zona atómica sale del InteractionModel.
 * Autoridad pública: máscara UV categórica.
 */
export function BodyInteractionModel({
  rotation = [0, 0, 0],
  scale = 1,
  enabled = true,
  onHoverAtomicZone,
  onActivateAtomicZone,
  onHoverPointer,
  onReady,
}: BodyInteractionModelProps) {
  const { scene: interactionScene } = useGLTF(BODY_81_INTERACTION_MODEL_SRC);
  const { scene: visualScene } = useGLTF(MALIANTEO_BODY_V1_MODEL.src);

  const prepared = useMemo(() => {
    const surface = buildBodyHitSurface(visualScene, interactionScene);
    if (surface) {
      return {
        object: surface.mesh as Object3D,
        exact: true,
        dispose: surface.dispose,
      };
    }
    return { ...prepareInvisibleRaycastScene(interactionScene), exact: false };
  }, [interactionScene, visualScene]);

  const sessionRef = useRef<PointerSession | null>(null);
  const onReadyRef = useRef(onReady);
  const hoverSeq = useRef(0);

  useLayoutEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useLayoutEffect(() => {
    prefetchPublicRegionMaskRaster();
    onReadyRef.current?.();
    return () => prepared.dispose();
  }, [prepared]);

  function atomicFromEvent(event: ThreeEvent<PointerEvent>) {
    return atomicIdFromIntersection(event);
  }

  function uvFromEvent(event: ThreeEvent<PointerEvent>) {
    const uv = event.uv;
    return uv ? { x: uv.x, y: uv.y } : null;
  }

  function emitHover(atomicId: string | null) {
    // Sin deduplicar: el padre puede haber limpiado el hover al mover la
    // cámara y necesita recibir de nuevo la misma zona.
    onHoverAtomicZone(atomicId);
  }

  function clearHover() {
    hoverSeq.current += 1;
    emitHover(null);
    onHoverPointer?.(null);
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!enabled) return;
    event.stopPropagation();

    // Táctil: no hay hover real; un pointermove es un arrastre de órbita.
    if (event.pointerType === "touch") return;

    // Arrastrando para girar: no perseguir zonas (evita parpadeo del resaltado).
    const session = sessionRef.current;
    if (session) {
      if (!session.dragging) {
        const moved = Math.hypot(
          event.clientX - session.x,
          event.clientY - session.y,
        );
        if (moved >= CLICK_DRAG_THRESHOLD_PX) session.dragging = true;
      }
      if (session.dragging) {
        clearHover();
        return;
      }
    }

    const atomicId = atomicFromEvent(event);
    const uv = uvFromEvent(event);
    onHoverPointer?.({ x: event.clientX, y: event.clientY });

    const seq = ++hoverSeq.current;
    const sync = resolvePublicHitFromUvSync(uv, atomicId);
    if (sync) {
      emitHover(sync.effectiveAtomicId);
      return;
    }
    void resolvePublicHitFromUv(uv, atomicId).then((hit) => {
      if (seq !== hoverSeq.current) return;
      emitHover(hit.effectiveAtomicId);
    });
  }

  function handlePointerOut() {
    if (!enabled) return;
    clearHover();
  }

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    if (!enabled) return;
    if (event.button !== undefined && event.button !== 0) return;
    event.stopPropagation();
    sessionRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      atomicId: atomicFromEvent(event),
      uv: uvFromEvent(event),
      dragging: false,
    };
  }

  function handlePointerUp(event: ThreeEvent<PointerEvent>) {
    if (!enabled) return;
    const start = sessionRef.current;
    sessionRef.current = null;
    if (!start?.atomicId) return;
    if (event.button !== undefined && event.button !== 0) return;
    if (start.dragging) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.hypot(dx, dy) >= CLICK_DRAG_THRESHOLD_PX) return;

    // El punto de pulsación es el que el usuario apuntó (el de soltar puede
    // haberse desplazado unos px por el temblor del dedo).
    const atomicId = start.atomicId ?? atomicFromEvent(event);
    const uv = start.uv ?? uvFromEvent(event);
    if (!atomicId) return;
    event.stopPropagation();

    const sync = resolvePublicHitFromUvSync(uv, atomicId);
    if (sync) {
      const effective = sync.effectiveAtomicId ?? atomicId;
      publishLastHit(sync, effective);
      onActivateAtomicZone(effective);
      return;
    }
    void resolvePublicHitFromUv(uv, atomicId).then((hit) => {
      const effective = hit.effectiveAtomicId ?? atomicId;
      publishLastHit(hit, effective);
      onActivateAtomicZone(effective);
    });
  }

  const primitive = (
    <primitive
      object={prepared.object}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        sessionRef.current = null;
      }}
    />
  );

  return (
    <group
      name="MalianteoInteractionRoot"
      rotation={rotation}
      scale={[scale, scale, scale]}
    >
      {prepared.exact ? (
        <Bvh key={prepared.object.uuid} firstHitOnly>
          {primitive}
        </Bvh>
      ) : (
        primitive
      )}
    </group>
  );
}

useGLTF.preload(BODY_81_INTERACTION_MODEL_SRC);
