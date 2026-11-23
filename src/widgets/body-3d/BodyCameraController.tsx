"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Vector3, type Mesh, type PerspectiveCamera } from "three";
import {
  BODY_HIT_SURFACE_NAME,
  type BodyZoneGeometryStats,
} from "@/widgets/body-3d/interaction/bodyHitSurface";
import {
  computeZoneFraming,
  type FramingInsets,
} from "@/widgets/body-3d/ux/bodyZoneFraming";
import type { BodyCameraFraming } from "@/widgets/body-3d/cameraViewHelpers";
import {
  getCameraLookTarget,
  getCameraPositionForView,
} from "@/widgets/body-3d/cameraViewHelpers";
import type { BodyCameraView } from "@/widgets/body-3d/bodyViewerTypes";
import {
  getFullBodyCameraPose,
  type CameraFocusPose,
} from "@/widgets/body-3d/ux/bodyCameraFocus";
import { stepOrbitCamera } from "@/widgets/body-3d/ux/bodyCameraOrbit";

/**
 * Encuadre de zona (geometría real) o regreso a la pose previa a la selección.
 * `zone` guarda la pose actual como "origen" la primera vez de una sesión;
 * `home` vuelve a ese origen y cierra la sesión.
 */
export type ZoneFocusRequest =
  | {
      kind: "zone";
      atomicIds: readonly string[];
      /** Azimuth de la vista preferida del catálogo (rad, frente = 0). */
      preferredAzimuth: number;
      insets: FramingInsets;
      /** Pose heurística si la superficie de geometría aún no está lista. */
      fallbackPose: CameraFocusPose;
    }
  | { kind: "home" };

type BodyCameraControllerProps = {
  view: BodyCameraView;
  framing: BodyCameraFraming;
  viewToken: number;
  orbitRef: RefObject<OrbitControlsImpl | null>;
  /** Focus suave por región (premium UX). null = solo presets de vista. */
  focusPose?: CameraFocusPose | null;
  focusToken?: number;
  reducedMotion?: boolean;
  zoneFocus?: ZoneFocusRequest | null;
  zoneFocusToken?: number;
};

function applyPose(
  camera: { position: Vector3; lookAt: (v: Vector3) => void },
  orbit: OrbitControlsImpl | null,
  position: Vector3,
  look: Vector3,
  enableOrbit: boolean,
) {
  camera.position.copy(position);
  if (orbit) {
    orbit.target.copy(look);
    orbit.enabled = enableOrbit;
    if (enableOrbit) orbit.update();
  } else {
    camera.lookAt(look);
  }
}

/**
 * Interpola cámara hacia presets o focus regional.
 * Tras animar, re-habilita OrbitControls — no lucha con el usuario.
 *
 * Importante: no depender del prop `target` controlado de OrbitControls;
 * este controller es la única autoridad del look-at durante la animación.
 *
 * Frente/Espalda se interpolan en órbita esférica. Un lerp lineal atravesaría
 * el look-at y OrbitControls.update() reconstruiría un azimuth inestable.
 */
export function BodyCameraController({
  view,
  framing,
  viewToken,
  orbitRef,
  focusPose = null,
  focusToken = 0,
  reducedMotion = false,
  zoneFocus = null,
  zoneFocusToken = 0,
}: BodyCameraControllerProps) {
  const { camera, scene, size } = useThree();
  const targetPos = useRef(getCameraPositionForView(view, framing));
  const targetLook = useRef(getCameraLookTarget(framing));
  const animating = useRef(false);
  const animElapsed = useRef(0);
  const currentLook = useRef(getCameraLookTarget(framing));
  const scratchPos = useRef(new Vector3());
  const scratchLook = useRef(new Vector3());
  /** Pose del usuario antes de la sesión de encuadre (para volver). */
  const homePose = useRef<CameraFocusPose | null>(null);
  const targetOffset = useRef({ x: 0, y: 0 });
  const currentOffset = useRef({ x: 0, y: 0 });
  const appliedOffset = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const lastTokens = useRef({ focus: focusToken, view: viewToken });

  // Sembrar look-at inicial cuando OrbitControls monta (sin prop controlado).
  useEffect(() => {
    let frames = 0;
    let raf = 0;
    const seed = () => {
      const orbit = orbitRef.current;
      if (orbit) {
        if (!animating.current) {
          orbit.target.copy(getCameraLookTarget(framing));
          orbit.update();
        }
        return;
      }
      frames += 1;
      if (frames < 30) raf = requestAnimationFrame(seed);
    };
    raf = requestAnimationFrame(seed);
    return () => cancelAnimationFrame(raf);
  }, [framing, orbitRef]);

  useEffect(() => {
    const explicit =
      lastTokens.current.focus !== focusToken ||
      lastTokens.current.view !== viewToken;
    lastTokens.current = { focus: focusToken, view: viewToken };
    // Reencuadre por resize durante una sesión de zona: no pisarla.
    if (!explicit && homePose.current) return;
    // Vista cardinal / cuerpo completo explícito: termina la sesión.
    if (explicit) homePose.current = null;
    targetOffset.current = { x: 0, y: 0 };

    if (focusPose) {
      targetPos.current = focusPose.position.clone();
      targetLook.current = focusPose.target.clone();
    } else {
      targetPos.current = getCameraPositionForView(view, framing);
      targetLook.current = getCameraLookTarget(framing);
    }
    animating.current = true;
    animElapsed.current = 0;

    const orbit = orbitRef.current;
    if (orbit) {
      orbit.enabled = false;
      currentLook.current.copy(orbit.target);
    } else {
      currentLook.current.copy(targetLook.current);
    }

    if (reducedMotion) {
      applyPose(camera, orbit, targetPos.current, targetLook.current, true);
      currentLook.current.copy(targetLook.current);
      animating.current = false;
    }
  }, [
    camera,
    focusPose,
    focusToken,
    framing,
    orbitRef,
    reducedMotion,
    view,
    viewToken,
  ]);

  useEffect(() => {
    if (!zoneFocus) return;
    const orbit = orbitRef.current;
    const persp = camera as PerspectiveCamera;

    let nextPos: Vector3;
    let nextLook: Vector3;
    let nextOffset = { x: 0, y: 0 };

    if (zoneFocus.kind === "home") {
      const home = homePose.current ?? getFullBodyCameraPose(framing);
      nextPos = home.position.clone();
      nextLook = home.target.clone();
      homePose.current = null;
    } else {
      if (!homePose.current) {
        homePose.current = {
          position: camera.position.clone(),
          target: orbit ? orbit.target.clone() : getCameraLookTarget(framing),
        };
      }
      const mesh = scene.getObjectByName(BODY_HIT_SURFACE_NAME) as
        | Mesh
        | undefined;
      const statsMap = mesh?.userData.zoneStats as
        | ReadonlyMap<string, BodyZoneGeometryStats>
        | undefined;
      const stats = statsMap
        ? zoneFocus.atomicIds
            .map((id) => statsMap.get(id))
            .filter((s): s is BodyZoneGeometryStats => Boolean(s))
        : [];
      mesh?.updateWorldMatrix(true, false);
      const result =
        mesh && stats.length
          ? computeZoneFraming({
              stats,
              matrixWorld: mesh.matrixWorld,
              fovDeg: persp.fov ?? 42,
              viewport: { width: size.width, height: size.height },
              insets: zoneFocus.insets,
              currentPosition: camera.position,
              preferredDirection: new Vector3(
                Math.sin(zoneFocus.preferredAzimuth),
                0,
                Math.cos(zoneFocus.preferredAzimuth),
              ),
              limits: {
                minDistance: framing.distance * 0.2,
                maxDistance: framing.distance,
              },
            })
          : null;
      if (result) {
        nextPos = result.position;
        nextLook = result.target;
        nextOffset = result.viewOffset;
      } else {
        nextPos = zoneFocus.fallbackPose.position.clone();
        nextLook = zoneFocus.fallbackPose.target.clone();
      }
    }

    targetPos.current = nextPos;
    targetLook.current = nextLook;
    targetOffset.current = nextOffset;
    animating.current = true;
    animElapsed.current = 0;
    if (orbit) {
      orbit.enabled = false;
      currentLook.current.copy(orbit.target);
    } else {
      currentLook.current.copy(nextLook);
    }
    if (reducedMotion) {
      applyPose(camera, orbit, nextPos, nextLook, true);
      currentLook.current.copy(nextLook);
      currentOffset.current = { ...nextOffset };
      animating.current = false;
    }
    // Solo el token dispara: el resto se lee en el momento de la petición.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneFocusToken]);

  useFrame((_, delta) => {
    // Desplazamiento de proyección: la zona queda centrada en el área libre
    // (fuera del panel / hoja) y la órbita sigue pivotando sobre ella.
    const persp = camera as PerspectiveCamera;
    if (persp.isPerspectiveCamera) {
      const k = reducedMotion ? 1 : 1 - Math.exp(-9 * delta);
      const cur = currentOffset.current;
      const tgt = targetOffset.current;
      cur.x += (tgt.x - cur.x) * k;
      cur.y += (tgt.y - cur.y) * k;
      if (Math.abs(tgt.x - cur.x) < 0.25) cur.x = tgt.x;
      if (Math.abs(tgt.y - cur.y) < 0.25) cur.y = tgt.y;
      const applied = appliedOffset.current;
      if (
        applied.x !== cur.x ||
        applied.y !== cur.y ||
        applied.w !== size.width ||
        applied.h !== size.height
      ) {
        if (Math.abs(cur.x) < 0.5 && Math.abs(cur.y) < 0.5) {
          persp.clearViewOffset();
        } else {
          persp.setViewOffset(
            size.width,
            size.height,
            cur.x,
            cur.y,
            size.width,
            size.height,
          );
        }
        appliedOffset.current = {
          x: cur.x,
          y: cur.y,
          w: size.width,
          h: size.height,
        };
      }
    }

    if (!animating.current) return;

    const orbit = orbitRef.current;
    animElapsed.current += delta;
    // Órbita agresiva: Frente↔Espalda es 180° y debe llegar al hemisferio real.
    const alpha = 1 - Math.exp(-10.5 * delta);
    const forceSnap = animElapsed.current > 1.15;

    const settled =
      forceSnap ||
      stepOrbitCamera(
        camera.position,
        currentLook.current,
        targetPos.current,
        targetLook.current,
        alpha,
        scratchPos.current,
        scratchLook.current,
      );

    if (!forceSnap) {
      // No llamar orbit.update() a mitad de órbita: reconstruye spherical
      // y puede clavar la cámara en un frontal-diagonal.
      camera.position.copy(scratchPos.current);
      currentLook.current.copy(scratchLook.current);
      if (orbit) {
        orbit.target.copy(scratchLook.current);
      }
      camera.lookAt(currentLook.current);
    }

    if (settled) {
      applyPose(camera, orbit, targetPos.current, targetLook.current, true);
      currentLook.current.copy(targetLook.current);
      animating.current = false;
    }
  });

  return null;
}

/** Helper para comparar poses sin recrear refs innecesarias en padres. */
export function poseKey(pose: CameraFocusPose | null | undefined): string {
  if (!pose) return "none";
  const p = pose.position;
  const t = pose.target;
  return `${p.x.toFixed(3)},${p.y.toFixed(3)},${p.z.toFixed(3)}|${t.x.toFixed(3)},${t.y.toFixed(3)},${t.z.toFixed(3)}`;
}

export function clonePose(pose: CameraFocusPose): CameraFocusPose {
  return {
    position: new Vector3().copy(pose.position),
    target: new Vector3().copy(pose.target),
  };
}
