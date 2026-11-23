/**
 * Lab/E2E bridge: project model-local landmark points to canvas client coords
 * and perform a real Three.js raycast against the InteractionModel meshes.
 * Public target authority: categorical UV mask (same as product clicks).
 */
"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Raycaster, Vector2, Vector3, type Object3D } from "three";
import { atomicIdFromIntersection } from "@/widgets/body-3d/interaction/bodyHitSurface";
import { resolvePublicHitFromUv } from "@/widgets/body-3d/interaction/bodyPublicMaskHit";

export type MalianteoRaycastHit = {
  atomicId: string | null;
  publicTargetId: string | null;
  point: [number, number, number] | null;
  clientX: number;
  clientY: number;
  maskIndex?: number;
};

type BridgeApi = {
  /** Model-local landmark → canvas client. */
  worldToClient: (
    x: number,
    y: number,
    z: number,
  ) => { clientX: number; clientY: number; visible: boolean } | null;
  raycastClient: (clientX: number, clientY: number) => MalianteoRaycastHit;
  /** Model-local landmark → raycast through projected client coords. */
  raycastWorld: (x: number, y: number, z: number) => MalianteoRaycastHit | null;
  /** Async mask-authoritative variant used by Playwright. */
  raycastWorldAsync: (
    x: number,
    y: number,
    z: number,
  ) => Promise<MalianteoRaycastHit | null>;
};

declare global {
  interface Window {
    __malianteoHitBridge?: BridgeApi;
    __malianteoLastHit?: MalianteoRaycastHit & { via: "pointer" | "bridge" };
  }
}

const INTERACTION_ROOT_NAME = "MalianteoInteractionRoot";

function findNamed(scene: Object3D, name: string): Object3D | null {
  let found: Object3D | null = null;
  scene.traverse((obj) => {
    if (found) return;
    if (obj.name === name) found = obj;
  });
  return found;
}

export function BodyHitTestBridge() {
  const { camera, scene, gl, size } = useThree();
  const raycaster = useRef(new Raycaster());
  const ndc = useRef(new Vector2());
  const local = useRef(new Vector3());
  const world = useRef(new Vector3());

  useFrame(() => {
    const rect = gl.domElement.getBoundingClientRect();
    const api: BridgeApi = {
      worldToClient(x, y, z) {
        local.current.set(x, y, z);
        const root = findNamed(scene, INTERACTION_ROOT_NAME);
        if (root) {
          root.localToWorld(world.current.copy(local.current));
        } else {
          world.current.copy(local.current);
        }
        const projected = world.current.clone().project(camera);
        if (projected.z > 1) return { clientX: 0, clientY: 0, visible: false };
        const clientX = rect.left + ((projected.x + 1) / 2) * rect.width;
        const clientY = rect.top + ((1 - projected.y) / 2) * rect.height;
        return { clientX, clientY, visible: true };
      },
      raycastClient(clientX, clientY) {
        const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
        ndc.current.set(nx, ny);
        raycaster.current.setFromCamera(ndc.current, camera);
        const root = findNamed(scene, INTERACTION_ROOT_NAME) ?? scene;
        const hits = raycaster.current.intersectObject(root, true);
        const hit = hits[0];
        const atomicId = hit
          ? atomicIdFromIntersection(hit)
          : null;
        // Sync path keeps atomic routing for immediate callers; async prefers mask.
        const result: MalianteoRaycastHit = {
          atomicId,
          publicTargetId: null,
          point: hit ? [hit.point.x, hit.point.y, hit.point.z] : null,
          clientX,
          clientY,
        };
        if (typeof window !== "undefined") {
          window.__malianteoLastHit = { ...result, via: "bridge" };
        }
        return result;
      },
      raycastWorld(x, y, z) {
        const scr = api.worldToClient(x, y, z);
        if (!scr?.visible) return null;
        return api.raycastClient(scr.clientX, scr.clientY);
      },
      async raycastWorldAsync(x, y, z) {
        const scr = api.worldToClient(x, y, z);
        if (!scr?.visible) return null;
        const nx = ((scr.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = -(((scr.clientY - rect.top) / rect.height) * 2 - 1);
        ndc.current.set(nx, ny);
        raycaster.current.setFromCamera(ndc.current, camera);
        const root = findNamed(scene, INTERACTION_ROOT_NAME) ?? scene;
        const hits = raycaster.current.intersectObject(root, true);
        const hit = hits[0];
        const atomicId = hit
          ? atomicIdFromIntersection(hit)
          : null;
        const uv = hit?.uv ? { x: hit.uv.x, y: hit.uv.y } : null;
        const resolved = await resolvePublicHitFromUv(uv, atomicId);
        const result: MalianteoRaycastHit = {
          atomicId: resolved.effectiveAtomicId ?? atomicId,
          publicTargetId: resolved.publicTargetId,
          point: hit ? [hit.point.x, hit.point.y, hit.point.z] : null,
          clientX: scr.clientX,
          clientY: scr.clientY,
          maskIndex: resolved.maskIndex,
        };
        if (typeof window !== "undefined") {
          window.__malianteoLastHit = { ...result, via: "bridge" };
        }
        return result;
      },
    };
    if (typeof window !== "undefined") {
      window.__malianteoHitBridge = api;
    }
    void size;
  });

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        delete window.__malianteoHitBridge;
      }
    };
  }, []);

  return null;
}
