/**
 * Selector corporal 3D premium — API lista para integración.
 * Soporte controlled (`value` + `onChange`) y uncontrolled (estado interno).
 *
 * Flujo: tocar zona → el área tocada queda pre-elegida y resaltada →
 * (opcional) ampliar / cobertura → "Añadir a mi selección" → aviso con Deshacer.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Rotate3d } from "lucide-react";
import { Body3DViewer } from "@/widgets/body-3d/Body3DViewer";
import type { BodyModelDefinition } from "@/widgets/body-3d/bodyModelDefinition";
import type { BodyCameraView } from "@/widgets/body-3d/bodyViewerTypes";
import {
  filterContextualOptionsToContiguous,
  normalizeConnectedBodySelection,
  tryAddContiguousPublicTarget,
} from "@/widgets/body-3d/domain/bodyPublicAdjacency";
import {
  clearSelectionTargets,
  removeSelectionTarget,
  resolveSelectedAtomicZoneIds,
} from "@/widgets/body-3d/interaction";
import { setActivePublicTargetsForHit } from "@/widgets/body-3d/interaction/bodyPublicMaskHit";
import {
  getPrimaryPublicSelectionTarget,
  getPublicSelectionOptionsForAtomicZone,
  isNonSelectableSurfaceAtomic,
  NON_SELECTABLE_SURFACE_NOTICE,
  upgradeBodySelectionToPublicTargets,
} from "@/widgets/body-3d/domain/bodyPublicSelectionRouting";
import { isPublicSelectableBodyTarget } from "@/widgets/body-3d/domain/bodyPublicSelectionTargets";
import {
  resolvePublicTargetHighlightRegions,
  resolvePublicTargetsHighlightRegions,
} from "@/widgets/body-3d/domain/bodyPublicHighlightRegions";
import {
  getPublicDescription,
  getPublicShortLabel,
} from "@/widgets/body-3d/domain/bodyPublicRegionMeta";
import {
  serializeBodyPlacement,
  type BodyCoverage,
} from "@/widgets/body-3d/domain/bodyPublicSelectionCatalog";
import { resolveTargetToAtomicZoneIds } from "@/widgets/body-3d/domain/bodySelectionTargets";
import { getSelectionDisplayLabel } from "@/widgets/body-3d/interaction/bodyInteractionLabels";
import { emitirHechoAnalitica } from "@/shared/lib/analitica/emitirCliente";
import {
  getCameraFocusForAtomicZone,
  getFullBodyCameraPose,
  type CameraFocusPose,
} from "@/widgets/body-3d/ux/bodyCameraFocus";
import {
  getCameraPoseForPublicTarget,
  getPreferredBodyView,
  preferredViewToCanonical,
  toCardinalCameraView,
} from "@/widgets/body-3d/ux/bodyPreferredCamera";
import { resolveCanonicalAzimuth } from "@/widgets/body-3d/domain/bodyModelCoordinateSystem";
import type { ZoneFocusRequest } from "@/widgets/body-3d/BodyCameraController";
import {
  resolveFramingAtomicIds,
  type FramingInsets,
} from "@/widgets/body-3d/ux/bodyZoneFraming";
import type { FittedBodyFraming } from "@/widgets/body-3d/ux/bodyFitFraming";
import {
  getCameraLookTarget,
  getCameraPositionForView,
  type BodyCameraFraming,
} from "@/widgets/body-3d/cameraViewHelpers";
import {
  findContainingSelections,
  replaceContainingSelection,
} from "@/widgets/body-3d/ux/bodyContainedSelection";
import {
  applySelectionChange,
  isControlledSelection,
  resolveControlledTargets,
} from "@/widgets/body-3d/ux/bodyControlledSelection";
import { BodyContextOptions } from "@/widgets/body-3d/ux/BodyContextOptions";
import { BodyHoverTooltip } from "@/widgets/body-3d/ux/BodyHoverTooltip";
import {
  BodyMobileSheet,
  type MobileSheetState,
} from "@/widgets/body-3d/ux/BodyMobileSheet";
import { BodySelectionSummary } from "@/widgets/body-3d/ux/BodySelectionSummary";
import type { BodySelectionTargetId } from "@/widgets/body-3d/ux/bodySelectionSerialization";
import {
  buildBodySelectionSnapshot,
  serializeConceptualBodySelection,
} from "@/widgets/body-3d/ux/bodySelectionSerialization";
import {
  resolveContextualPanelSide,
  resolveDesktopPanelMaxWidth,
  resolveSelectorLayoutMode,
  type SelectorLayoutMode,
} from "@/widgets/body-3d/ux/bodySelectorLayout";
import { BodyViewControls } from "@/widgets/body-3d/ux/BodyViewControls";

/** Sheet / panel flotante a partir de 900px (modelo primero en tablet estrecha). */
export const BODY_SELECTOR_DESKTOP_MIN_PX = 900;

/** Duración del aviso "añadido · Deshacer". */
const TOAST_MS = 4200;

export type BodyPremiumSelectorProps = {
  model: BodyModelDefinition;
  /** Modo controlado: targets conceptuales seleccionados. */
  value?: readonly BodySelectionTargetId[];
  /** Valor inicial en modo no controlado. */
  defaultValue?: readonly BodySelectionTargetId[];
  onChange?: (nextTargets: BodySelectionTargetId[]) => void;
  onContinue?: (targets: BodySelectionTargetId[]) => void;
  initialView?: BodyCameraView;
  className?: string;
  /** Altura del marco del visor (CSS). Default producción responsive. */
  frameHeight?: string;
  /** Muestra botón Continuar + payload demo (solo laboratorio). */
  showLabContinue?: boolean;
  /**
   * Tarjeta intro dentro del canvas. Si es false se muestra solo una pista
   * compacta de gesto hasta la primera interacción.
   */
  showIntroOverlay?: boolean;
  loadingLabel?: string;
  introTitle?: string;
  introBody?: string;
  introHintDesktop?: string;
};

type SelectionToast = {
  key: number;
  label: string;
  verb: "añadida" | "reemplazada" | "quitada";
  /** Selección previa para Deshacer. */
  previous: BodySelectionTargetId[];
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

/** Área pre-elegida al tocar una zona: la primaria si es contigua. */
function resolveDefaultStaging(
  atomicId: string,
  selectedTargetIds: readonly string[],
): string | null {
  const options = filterContextualOptionsToContiguous(
    getPublicSelectionOptionsForAtomicZone(atomicId),
    selectedTargetIds,
  );
  const primary = getPrimaryPublicSelectionTarget(atomicId);
  if (primary && options.some((o) => o.targetId === primary)) return primary;
  return options[0]?.targetId ?? primary ?? null;
}

export function BodyPremiumSelector({
  model,
  value,
  defaultValue,
  onChange,
  onContinue,
  initialView = "front",
  className = "",
  frameHeight = "clamp(420px, 64dvh, 680px)",
  showLabContinue = false,
  showIntroOverlay = true,
  loadingLabel = "Preparando el modelo…",
  introTitle = "¿Dónde quieres tatuarte?",
  introBody = "Gira el modelo y toca una zona del cuerpo.",
  introHintDesktop = "Puedes elegir una zona específica o una región completa.",
}: BodyPremiumSelectorProps) {
  const controlled = isControlledSelection(value);
  const [internalTargets, setInternalTargets] = useState<
    BodySelectionTargetId[]
  >(() => [...(defaultValue ?? [])]);

  const selectedTargetIds = useMemo(
    () =>
      upgradeBodySelectionToPublicTargets(
        resolveControlledTargets(value, internalTargets),
      ).filter(isPublicSelectableBodyTarget),
    [value, internalTargets],
  );

  const [cameraView, setCameraView] = useState<BodyCameraView>(initialView);
  const [cameraViewToken, setCameraViewToken] = useState(0);
  /** Botón de vista resaltado (sigue a la zona encuadrada). */
  const [activeViewHint, setActiveViewHint] =
    useState<BodyCameraView>(initialView);
  const [zoneFocus, setZoneFocus] = useState<ZoneFocusRequest | null>(null);
  const [zoneFocusToken, setZoneFocusToken] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const [hoveredAtomicZoneId, setHoveredAtomicZoneId] = useState<string | null>(
    null,
  );
  const [activeAtomicZoneId, setActiveAtomicZoneId] = useState<string | null>(
    null,
  );
  /** Opción del panel bajo el puntero (vista previa transitoria). */
  const [optionHoverId, setOptionHoverId] = useState<string | null>(null);
  const [hoverPointer, setHoverPointer] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [sheetState, setSheetState] = useState<MobileSheetState>("closed");
  const [sheetMode, setSheetMode] = useState<"zone" | "selection">("zone");
  const [focusPose, setFocusPose] = useState<CameraFocusPose | null>(null);
  const [focusToken, setFocusToken] = useState(0);
  const [cameraFocused, setCameraFocused] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [showContainedOverride, setShowContainedOverride] = useState(false);
  const [replacingTargetId, setReplacingTargetId] = useState<string | null>(
    null,
  );
  const [isOrbitDragging, setIsOrbitDragging] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState<string | null>(null);
  const [interactionReady, setInteractionReady] = useState(false);
  const [fitFraming, setFitFraming] = useState<FittedBodyFraming | null>(null);
  const [surfaceNotice, setSurfaceNotice] = useState<string | null>(null);
  const [distantCandidateId, setDistantCandidateId] = useState<string | null>(
    null,
  );
  const surfaceNoticeTimerRef = useRef<number | null>(null);
  const [toast, setToast] = useState<SelectionToast | null>(null);
  const [stagingRegionId, setStagingRegionId] = useState<string | null>(null);
  const [stagingCoverage, setStagingCoverage] =
    useState<BodyCoverage>("complete");
  const [layoutMode, setLayoutMode] =
    useState<SelectorLayoutMode>("desktop-medium");
  const [viewportWidth, setViewportWidth] = useState(1280);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  /** Último alto medido de la hoja móvil (se conserva entre aperturas). */
  const lastSheetHeightRef = useRef(0);
  /** Alto de hoja con el que se pidió el último encuadre. */
  const framedSheetHeightRef = useRef<number | null>(null);
  /** Re-encuadre con el estado más reciente (se asigna en cada render). */
  const reframeForSheetRef = useRef<() => void>(() => undefined);

  const handleSheetHeight = useCallback((height: number) => {
    if (height <= 0) return;
    lastSheetHeightRef.current = height;
    reframeForSheetRef.current();
  }, []);

  const handleInteractionReady = useCallback(() => {
    setInteractionReady(true);
  }, []);

  const handleFitFraming = useCallback((framing: FittedBodyFraming) => {
    setFitFraming(framing);
  }, []);

  const activeFraming: BodyCameraFraming = fitFraming ?? model.camera;

  // Failsafe: no dejar el overlay bloqueado si el callback no llega
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setInteractionReady(true);
    }, 2500);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (surfaceNoticeTimerRef.current != null) {
        window.clearTimeout(surfaceNoticeTimerRef.current);
      }
    };
  }, []);

  // Auto-cierre del aviso "añadida · Deshacer".
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const sync = () => {
      const w = window.innerWidth;
      setViewportWidth(w);
      setLayoutMode(resolveSelectorLayoutMode(w));
    };
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setIsCoarsePointer(mq.matches);
      setReducedMotion(rm.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    rm.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      rm.removeEventListener("change", sync);
    };
  }, []);

  const resolvedSelectedAtomicZoneIds = useMemo(
    () => resolveSelectedAtomicZoneIds(selectedTargetIds),
    [selectedTargetIds],
  );

  const selectedPublicRegionIds = useMemo(
    () => resolvePublicTargetsHighlightRegions(selectedTargetIds),
    [selectedTargetIds],
  );

  useEffect(() => {
    setActivePublicTargetsForHit(selectedTargetIds);
    return () => setActivePublicTargetsForHit([]);
  }, [selectedTargetIds]);

  const stagedToken = useMemo(
    () =>
      stagingRegionId && isPublicSelectableBodyTarget(stagingRegionId)
        ? serializeBodyPlacement({
            regionId: stagingRegionId,
            coverage: stagingCoverage,
          })
        : null,
    [stagingCoverage, stagingRegionId],
  );

  const previewPublicRegionIds = useMemo(() => {
    // Prioridad: opción bajo el puntero → área en staging → zona explorada.
    const sourceId = optionHoverId ?? stagedToken;
    if (sourceId && isPublicSelectableBodyTarget(sourceId)) {
      return [...resolvePublicTargetHighlightRegions(sourceId)];
    }
    // Con el panel abierto, la zona bajo el cursor sigue mostrando señal
    // para explorar otra área.
    const hoveringOther =
      hoveredAtomicZoneId != null &&
      hoveredAtomicZoneId !== activeAtomicZoneId &&
      !isNonSelectableSurfaceAtomic(hoveredAtomicZoneId);
    const source = hoveringOther
      ? hoveredAtomicZoneId
      : (activeAtomicZoneId ?? hoveredAtomicZoneId);
    if (!source) return [];
    const primary = getPrimaryPublicSelectionTarget(source);
    return primary ? [...resolvePublicTargetHighlightRegions(primary)] : [];
  }, [activeAtomicZoneId, hoveredAtomicZoneId, optionHoverId, stagedToken]);

  // Ruta de highlight atómica legacy (solo helpers de selección contenida).
  const regionHighlightIds = useMemo(() => {
    const sourceId = optionHoverId ?? stagingRegionId;
    if (sourceId && isPublicSelectableBodyTarget(sourceId)) {
      return resolveTargetToAtomicZoneIds(sourceId);
    }
    const source = activeAtomicZoneId ?? hoveredAtomicZoneId;
    if (!source || isNonSelectableSurfaceAtomic(source)) return [];
    const primary = getPrimaryPublicSelectionTarget(source);
    return primary ? resolveTargetToAtomicZoneIds(primary) : [];
  }, [activeAtomicZoneId, hoveredAtomicZoneId, optionHoverId, stagingRegionId]);

  const contextualOptions = useMemo(() => {
    if (!activeAtomicZoneId) return [];
    const raw = getPublicSelectionOptionsForAtomicZone(activeAtomicZoneId);
    return filterContextualOptionsToContiguous(raw, selectedTargetIds);
  }, [activeAtomicZoneId, selectedTargetIds]);

  const panelPrimaryLabel = useMemo(() => {
    if (!activeAtomicZoneId) return null;
    const primary = getPrimaryPublicSelectionTarget(activeAtomicZoneId);
    return primary ? getPublicShortLabel(primary) : null;
  }, [activeAtomicZoneId]);

  const panelSubtitle = useMemo(() => {
    const id =
      stagingRegionId ??
      (activeAtomicZoneId
        ? getPrimaryPublicSelectionTarget(activeAtomicZoneId)
        : null);
    return id ? getPublicDescription(id) : null;
  }, [activeAtomicZoneId, stagingRegionId]);

  const ariaZoneAnnouncement = useMemo(() => {
    if (surfaceNotice) return surfaceNotice;
    if (toast) return `Zona ${toast.verb}: ${toast.label}`;
    if (!panelPrimaryLabel) return "";
    return `Zona activa: ${panelPrimaryLabel}`;
  }, [panelPrimaryLabel, surfaceNotice, toast]);

  const panelSide = useMemo(
    () => resolveContextualPanelSide(hoverPointer?.x ?? null, viewportWidth),
    [hoverPointer?.x, viewportWidth],
  );

  const panelMaxWidth = useMemo(
    () => resolveDesktopPanelMaxWidth(layoutMode, viewportWidth),
    [layoutMode, viewportWidth],
  );

  /** El área en staging no conecta con lo ya elegido (regla de contigüidad). */
  const stagedDisconnected = useMemo(() => {
    if (!stagedToken || replacingTargetId || selectedTargetIds.length === 0) {
      return false;
    }
    return !tryAddContiguousPublicTarget(selectedTargetIds, stagedToken).ok;
  }, [replacingTargetId, selectedTargetIds, stagedToken]);

  const contained = useMemo(() => {
    if (!activeAtomicZoneId || showContainedOverride) return [];
    return findContainingSelections(activeAtomicZoneId, selectedTargetIds);
  }, [activeAtomicZoneId, selectedTargetIds, showContainedOverride]);

  function commitTargets(next: BodySelectionTargetId[]) {
    const publicOnly = upgradeBodySelectionToPublicTargets(next).filter(
      isPublicSelectableBodyTarget,
    );
    const normalized = normalizeConnectedBodySelection(publicOnly);
    applySelectionChange(normalized, {
      controlled,
      onChange,
      setInternal: setInternalTargets,
    });
  }

  function markInteracted() {
    setHasInteracted(true);
  }

  function showToast(next: Omit<SelectionToast, "key">) {
    setToast({ ...next, key: Date.now() });
  }

  function handleUndo() {
    if (!toast) return;
    commitTargets(toast.previous);
    setToast(null);
    returnCameraHome();
  }

  /** Quitar zonas: la cámara vuelve a donde estaba antes de seleccionar. */
  function handleRemoveTarget(id: string) {
    commitTargets(removeSelectionTarget(selectedTargetIds, id));
    returnCameraHome();
  }

  function handleClearTargets() {
    commitTargets(clearSelectionTargets());
    returnCameraHome();
  }

  function handleCameraViewChange(view: BodyCameraView) {
    markInteracted();
    setCameraView(view);
    setActiveViewHint(view);
    setCameraViewToken((t) => t + 1);
    // Pose canónica explícita: Frente/Espalda deben orbitar de verdad
    // al hemisferio pedido, no quedarse en un frontal-diagonal.
    setFocusPose({
      position: getCameraPositionForView(view, activeFraming),
      target: getCameraLookTarget(activeFraming),
    });
    setCameraFocused(false);
    setFocusToken((t) => t + 1);
  }

  function handleResetFullBody() {
    setFocusPose(getFullBodyCameraPose(activeFraming));
    setCameraView("front");
    setActiveViewHint("front");
    setCameraViewToken((t) => t + 1);
    setFocusToken((t) => t + 1);
    setCameraFocused(false);
  }

  function showNonSelectableNotice() {
    if (surfaceNoticeTimerRef.current != null) {
      window.clearTimeout(surfaceNoticeTimerRef.current);
    }
    setSurfaceNotice(NON_SELECTABLE_SURFACE_NOTICE);
    surfaceNoticeTimerRef.current = window.setTimeout(() => {
      setSurfaceNotice(null);
      surfaceNoticeTimerRef.current = null;
    }, 2400);
  }

  /** Px del visor tapados por panel / hoja / controles (encuadre "con padding"). */
  function framingInsets(panelOpen: boolean): FramingInsets {
    const frameH = frameRef.current?.clientHeight ?? 600;
    if (viewportWidth >= BODY_SELECTOR_DESKTOP_MIN_PX) {
      const insets = { top: 24, right: 24, bottom: 84, left: 24 };
      if (panelOpen) {
        const side = resolveContextualPanelSide(
          hoverPointer?.x ?? null,
          viewportWidth,
        );
        const occupied = panelMaxWidth + 32;
        if (side === "left") insets.left = occupied;
        else insets.right = occupied;
      }
      return insets;
    }
    if (!panelOpen) {
      framedSheetHeightRef.current = null;
      // Arriba: aviso "zona añadida"; abajo: controles de vista.
      return { top: 60, right: 14, bottom: 76, left: 14 };
    }
    // La hoja tapa la parte baja del visor: la zona se encuadra en lo que
    // queda libre encima. Se usa el alto real medido (o el último conocido).
    const measured = lastSheetHeightRef.current;
    const sheet =
      measured > 0 ? measured : Math.min(window.innerHeight * 0.44, 320, frameH * 0.55);
    framedSheetHeightRef.current = sheet;
    return { top: 18, right: 14, bottom: sheet + 14, left: 14 };
  }

  function requestZoneFraming(
    atomicIds: readonly string[],
    preferredAzimuth: number,
    fallbackPose: CameraFocusPose,
    panelOpen: boolean,
  ) {
    setZoneFocus({
      kind: "zone",
      atomicIds,
      preferredAzimuth,
      insets: framingInsets(panelOpen),
      fallbackPose,
    });
    setZoneFocusToken((t) => t + 1);
    setCameraFocused(true);
    // La cámara se mueve bajo el cursor: el hover anterior ya no es válido.
    setHoveredAtomicZoneId(null);
  }

  /**
   * Encuadra uno o varios targets públicos por su geometría real.
   * `primaryId` decide la vista preferida cuando la zona envuelve el cuerpo.
   */
  function frameTargets(
    targetIds: readonly string[],
    primaryId: string,
    panelOpen: boolean,
  ) {
    const atomicIds = [...new Set(targetIds.flatMap(resolveFramingAtomicIds))];
    const preferred = getPreferredBodyView(primaryId);
    setActiveViewHint(toCardinalCameraView(preferred));
    requestZoneFraming(
      atomicIds,
      resolveCanonicalAzimuth(preferredViewToCanonical(preferred)),
      getCameraPoseForPublicTarget(primaryId, activeFraming),
      panelOpen,
    );
  }

  /** Deseleccionar → la cámara vuelve a la pose previa a la selección. */
  function returnCameraHome() {
    setZoneFocus({ kind: "home" });
    setZoneFocusToken((t) => t + 1);
    setActiveViewHint(cameraView);
    setCameraFocused(false);
    setHoveredAtomicZoneId(null);
  }

  function resetPanelState() {
    setActiveAtomicZoneId(null);
    setOptionHoverId(null);
    setStagingRegionId(null);
    setStagingCoverage("complete");
    setShowContainedOverride(false);
    setReplacingTargetId(null);
    setDistantCandidateId(null);
    setSheetMode("zone");
  }

  // Si la hoja móvil termina con otro alto (más opciones, cobertura,
  // expandida), se vuelve a encuadrar para que la zona quede completa encima.
  useEffect(() => {
    reframeForSheetRef.current = () => {
      const height = lastSheetHeightRef.current;
      if (!activeAtomicZoneId || height <= 0) return;
      if (viewportWidth >= BODY_SELECTOR_DESKTOP_MIN_PX) return;
      const used = framedSheetHeightRef.current;
      if (used != null && Math.abs(used - height) < 20) return;
      if (stagingRegionId) {
        frameTargets([stagingRegionId], stagingRegionId, true);
      } else {
        requestZoneFraming(
          [activeAtomicZoneId],
          0,
          getCameraFocusForAtomicZone(activeAtomicZoneId, activeFraming),
          true,
        );
      }
    };
  });

  function handleActivateZone(atomicId: string) {
    markInteracted();

    if (isNonSelectableSurfaceAtomic(atomicId)) {
      resetPanelState();
      setSheetState("closed");
      showNonSelectableNotice();
      return;
    }

    setSurfaceNotice(null);
    resetPanelState();
    setActiveAtomicZoneId(atomicId);
    // El área tocada queda pre-elegida y pintada: un solo paso para añadir.
    setStagingRegionId(resolveDefaultStaging(atomicId, selectedTargetIds));
    setSheetState("peek");

    const staged = resolveDefaultStaging(atomicId, selectedTargetIds);
    if (staged) {
      frameTargets([staged], staged, true);
    } else {
      requestZoneFraming(
        [atomicId],
        0,
        getCameraFocusForAtomicZone(atomicId, activeFraming),
        true,
      );
    }
  }

  function finishCommit(
    targetToken: string,
    previous: BodySelectionTargetId[],
    verb: SelectionToast["verb"],
    nextSelection: readonly string[],
  ) {
    resetPanelState();
    setSurfaceNotice(null);
    setSheetState("closed");
    // Tras añadir: encuadrar toda el área elegida (puede haberse unido en
    // un grupo mayor, p. ej. antebrazo + brazo → manga).
    frameTargets(
      nextSelection.length ? nextSelection : [targetToken],
      targetToken,
      false,
    );
    showToast({
      label: getSelectionDisplayLabel(targetToken),
      verb,
      previous,
    });
    emitirHechoAnalitica({
      tipo_evento: "zona_corporal",
      etiqueta: getPublicShortLabel(targetToken),
      valor: targetToken,
    });
  }

  function commitStagedSelection(targetToken: string) {
    const previous = [...selectedTargetIds];

    if (replacingTargetId) {
      const next = replaceContainingSelection(
        selectedTargetIds,
        replacingTargetId,
        targetToken,
      );
      const normalized = normalizeConnectedBodySelection(next);
      commitTargets(normalized);
      finishCommit(targetToken, previous, "reemplazada", normalized);
      return;
    }

    const result = tryAddContiguousPublicTarget(selectedTargetIds, targetToken);
    if (!result.ok) {
      setDistantCandidateId(targetToken);
      setSurfaceNotice(result.message);
      return;
    }

    commitTargets(result.next);
    finishCommit(targetToken, previous, "añadida", result.next);
  }

  function handleSelectOption(targetId: string) {
    setStagingRegionId(targetId);
    setStagingCoverage("complete");
    setOptionHoverId(null);
    if (targetId !== stagingRegionId) frameTargets([targetId], targetId, true);
  }

  function handleConfirmStaging() {
    const regionId =
      stagingRegionId ??
      (activeAtomicZoneId
        ? getPrimaryPublicSelectionTarget(activeAtomicZoneId)
        : null);
    if (!regionId) return;
    const token = serializeBodyPlacement({
      regionId,
      coverage: stagingRegionId ? stagingCoverage : "complete",
    });
    if (stagedDisconnected) {
      // Zona separada: sustituye la selección (recuperable con Deshacer).
      const previous = [...selectedTargetIds];
      const next = normalizeConnectedBodySelection([token]);
      commitTargets(next);
      finishCommit(token, previous, "reemplazada", next);
      return;
    }
    commitStagedSelection(token);
  }

  function handleSwitchToDistantZone() {
    if (!distantCandidateId) return;
    const previous = [...selectedTargetIds];
    const target = distantCandidateId;
    const next = normalizeConnectedBodySelection([target]);
    commitTargets(next);
    finishCommit(target, previous, "añadida", next);
  }

  function handleKeepCurrentSelection() {
    setDistantCandidateId(null);
    setSurfaceNotice(null);
  }

  function handleCloseActive() {
    resetPanelState();
    setSheetState("closed");
    returnCameraHome();
  }

  function handleFocusSelected(targetId: string) {
    markInteracted();
    frameTargets([targetId], targetId, false);
  }

  function handleContinue() {
    if (selectedTargetIds.length === 0) return;
    onContinue?.(selectedTargetIds);
    if (showLabContinue) {
      const snap = buildBodySelectionSnapshot(selectedTargetIds);
      setPayloadPreview(
        JSON.stringify(
          {
            ...serializeConceptualBodySelection(selectedTargetIds),
            resolvedAtomicZoneIds: snap.resolvedAtomicZoneIds,
          },
          null,
          2,
        ),
      );
    }
  }

  // Teclado: Esc cierra el panel / aviso, Enter añade el área elegida.
  const keyHandlersRef = useRef({
    close: handleCloseActive,
    confirm: handleConfirmStaging,
    keep: handleKeepCurrentSelection,
  });
  useEffect(() => {
    keyHandlersRef.current = {
      close: handleCloseActive,
      confirm: handleConfirmStaging,
      keep: handleKeepCurrentSelection,
    };
  });
  const panelOpen = activeAtomicZoneId != null;
  const canConfirmByKey = panelOpen && contained.length === 0;
  const distantOpen = distantCandidateId != null;

  useEffect(() => {
    if (!panelOpen && !distantOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (distantOpen) keyHandlersRef.current.keep();
        else keyHandlersRef.current.close();
        return;
      }
      if (
        event.key === "Enter" &&
        canConfirmByKey &&
        !distantOpen &&
        !(event.target instanceof HTMLButtonElement)
      ) {
        event.preventDefault();
        keyHandlersRef.current.confirm();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canConfirmByKey, distantOpen, panelOpen]);

  const selectableHoveredAtomicId =
    hoveredAtomicZoneId && !isNonSelectableSurfaceAtomic(hoveredAtomicZoneId)
      ? hoveredAtomicZoneId
      : null;

  const showDesktopTooltip =
    !isCoarsePointer &&
    !isOrbitDragging &&
    Boolean(selectableHoveredAtomicId) &&
    selectableHoveredAtomicId !== activeAtomicZoneId;

  const sharedOptionProps = activeAtomicZoneId
    ? {
        activeAtomicZoneId,
        options: contextualOptions,
        contained,
        selectedTargetIds,
        onSelectOption: handleSelectOption,
        onPreviewOption: (id: string | null) => {
          setOptionHoverId(id);
        },
        onRemoveContained: (targetId: string) => {
          const previous = [...selectedTargetIds];
          commitTargets(removeSelectionTarget(selectedTargetIds, targetId));
          handleCloseActive();
          showToast({
            label: getSelectionDisplayLabel(targetId),
            verb: "quitada",
            previous,
          });
        },
        onChangeSelection: () => {
          const first = contained[0];
          setReplacingTargetId(first?.targetId ?? null);
          setShowContainedOverride(true);
        },
        replacingTargetId,
        enablePreview: !isCoarsePointer,
        panelTitle: panelPrimaryLabel,
        panelSubtitle,
        stagingRegionId,
        stagingCoverage,
        onStagingCoverageChange: (coverage: BodyCoverage) => {
          setStagingCoverage(coverage);
        },
        onConfirmStaging: handleConfirmStaging,
        onClose: handleCloseActive,
        disconnected: stagedDisconnected,
      }
    : null;

  const floatingPanelClass = [
    "pointer-events-none absolute top-3 z-20 hidden min-[900px]:pointer-events-auto min-[900px]:block",
    panelSide === "left" ? "left-3 lg:left-4" : "right-3 lg:right-4",
  ].join(" ");

  const mobileSheetState: MobileSheetState =
    sheetMode === "selection" && sheetState !== "closed"
      ? "expanded"
      : activeAtomicZoneId
        ? sheetState === "expanded"
          ? "expanded"
          : "peek"
        : "closed";

  const showGestureHint =
    !showIntroOverlay && !hasInteracted && interactionReady;

  return (
    <div
      className={["relative flex flex-col gap-3", className]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="sr-only" aria-live="polite">
        {ariaZoneAnnouncement}
      </div>
      <div
        ref={frameRef}
        className="relative min-h-[380px] overflow-hidden rounded-2xl border border-white/10 bg-[#050508] sm:min-h-[420px]"
        style={{ height: frameHeight }}
        onPointerDown={(e) => {
          dragStartRef.current = { x: e.clientX, y: e.clientY };
          setIsOrbitDragging(false);
        }}
        onPointerMove={(e) => {
          const start = dragStartRef.current;
          if (!start) return;
          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          if (dx * dx + dy * dy > 64) {
            setIsOrbitDragging(true);
            markInteracted();
          }
        }}
        onPointerUp={() => {
          dragStartRef.current = null;
          setIsOrbitDragging(false);
        }}
        onPointerLeave={() => {
          dragStartRef.current = null;
          setIsOrbitDragging(false);
        }}
      >
        <Body3DViewer
          model={model}
          appearance="original"
          wireframe={false}
          cameraView={cameraView}
          cameraViewToken={cameraViewToken}
          labInteractionMode="premium"
          hoveredAtomicZoneId={selectableHoveredAtomicId}
          previewAtomicZoneIds={regionHighlightIds}
          selectedAtomicZoneIds={resolvedSelectedAtomicZoneIds}
          previewPublicRegionIds={previewPublicRegionIds}
          selectedPublicRegionIds={selectedPublicRegionIds}
          onHoverAtomicZone={(id) => {
            if (!interactionReady) return;
            setHoveredAtomicZoneId(id);
          }}
          onHoverPointer={(p) => {
            if (!interactionReady) return;
            setHoverPointer(p);
          }}
          onActivateAtomicZone={(id) => {
            if (!interactionReady) return;
            handleActivateZone(id);
          }}
          onInteractionReady={handleInteractionReady}
          onFitFraming={handleFitFraming}
          autoFit
          focusPose={focusPose}
          focusToken={focusToken}
          zoneFocus={zoneFocus}
          zoneFocusToken={zoneFocusToken}
          reducedMotion={reducedMotion}
          className="!rounded-none !border-0"
          height="100%"
          chrome={false}
          loadingLabel={loadingLabel}
        />

        <style>{`
          @keyframes body-sel-in {
            from { opacity: 0; transform: translateY(-6px) scale(0.98); }
            to { opacity: 1; transform: none; }
          }
          .body-sel-in { animation: body-sel-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both; }
          @media (prefers-reduced-motion: reduce) { .body-sel-in { animation: none; } }
        `}</style>

        {!interactionReady ? (
          <div
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[rgba(5,5,8,0.28)]"
            aria-busy
            aria-live="polite"
          >
            <p className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-sm font-medium tracking-wide text-zinc-300 backdrop-blur-sm">
              <span
                aria-hidden
                className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/15 border-t-[rgba(192,132,252,0.95)] motion-reduce:animate-none"
              />
              {loadingLabel}
            </p>
          </div>
        ) : null}

        {showIntroOverlay && !hasInteracted && interactionReady ? (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4 min-[900px]:top-6 min-[900px]:justify-start min-[900px]:pl-6">
            <div className="max-w-sm rounded-2xl border border-white/10 bg-[rgba(5,5,8,0.72)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
              <p className="text-base font-semibold tracking-tight text-[rgba(245,240,255,0.96)]">
                {introTitle}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                {introBody}
              </p>
              <p className="mt-1.5 hidden text-xs leading-relaxed text-zinc-500 min-[900px]:block">
                {introHintDesktop}
              </p>
            </div>
          </div>
        ) : null}

        <div
          aria-hidden={!showGestureHint}
          className={[
            "pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4 transition-[opacity,transform] duration-300 ease-out",
            showGestureHint
              ? "translate-y-0 opacity-100"
              : "-translate-y-1 opacity-0",
          ].join(" ")}
        >
          <p className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-[rgba(5,5,8,0.78)] py-2 pl-3 pr-4 text-[13px] leading-snug text-zinc-300 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
            <Rotate3d
              className="h-4 w-4 shrink-0 text-[rgba(196,181,253,0.95)]"
              aria-hidden
            />
            <span>{introBody}</span>
          </p>
        </div>

        {toast && !surfaceNotice ? (
          <div
            key={toast.key}
            className="body-sel-in absolute inset-x-0 top-3 z-30 flex justify-center px-4"
            role="status"
          >
            <div className="inline-flex max-w-full items-center gap-3 rounded-full border border-[rgba(168,85,247,0.35)] bg-[rgba(12,8,20,0.94)] py-1.5 pl-2 pr-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgba(168,85,247,0.9)]">
                <Check className="h-3.5 w-3.5 text-white" aria-hidden />
              </span>
              <p className="min-w-0 truncate text-sm text-zinc-400">
                <span className="hidden sm:inline">Zona {toast.verb}: </span>
                <span className="sr-only sm:hidden">Zona {toast.verb}: </span>
                <span className="font-semibold text-white">{toast.label}</span>
              </p>
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-xs font-semibold text-[rgba(216,196,255,0.98)] transition-colors hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(168,85,247,0.7)]"
              >
                Deshacer
              </button>
            </div>
          </div>
        ) : null}

        {surfaceNotice ? (
          <div
            className="body-sel-in absolute inset-x-0 top-3 z-30 flex justify-center px-4"
            role="status"
            aria-live="polite"
          >
            <div className="max-w-sm rounded-2xl border border-white/10 bg-[rgba(5,5,8,0.94)] px-4 py-3 text-center shadow-[0_12px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
              <p className="text-sm leading-snug text-zinc-300">{surfaceNotice}</p>
              {distantCandidateId ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleKeepCurrentSelection}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/12 bg-black/35 px-3 text-xs font-semibold text-zinc-200 transition-colors hover:bg-black/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(168,85,247,0.7)] active:scale-[0.98]"
                  >
                    Mantener selección
                  </button>
                  <button
                    type="button"
                    onClick={handleSwitchToDistantZone}
                    className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.2)] px-3 text-xs font-semibold text-[rgba(240,234,255,0.97)] transition-colors hover:bg-[rgba(168,85,247,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(168,85,247,0.7)] active:scale-[0.98]"
                  >
                    Cambiar a esta zona
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {activeAtomicZoneId && sharedOptionProps ? (
          <aside
            key={activeAtomicZoneId}
            className={floatingPanelClass}
            aria-label="Opciones de zona"
            style={{ width: `min(100%, ${panelMaxWidth}px)` }}
          >
            <div className="body-sel-in rounded-2xl border border-white/12 bg-[rgba(8,7,13,0.94)] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
              <BodyContextOptions {...sharedOptionProps} mode="full" />
            </div>
          </aside>
        ) : null}

        <div
          className={[
            "pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex items-end justify-between gap-3 transition-opacity duration-200 min-[900px]:bottom-4 min-[900px]:left-4 min-[900px]:right-auto",
            activeAtomicZoneId ? "max-[899px]:opacity-0" : "opacity-100",
          ].join(" ")}
          aria-hidden={activeAtomicZoneId && viewportWidth < BODY_SELECTOR_DESKTOP_MIN_PX ? true : undefined}
        >
          <div
            className={
              activeAtomicZoneId && viewportWidth < BODY_SELECTOR_DESKTOP_MIN_PX
                ? "pointer-events-none"
                : "pointer-events-auto"
            }
          >
            <BodyViewControls
              cameraView={activeViewHint}
              onCameraViewChange={handleCameraViewChange}
              focused={cameraFocused}
              onResetFullBody={handleResetFullBody}
              compact
            />
          </div>
        </div>

        <BodyMobileSheet
          state={mobileSheetState}
          showPeekFooter={false}
          onHeightChange={handleSheetHeight}
          onStateChange={(next) => {
            setSheetState(next);
            if (next === "closed") {
              const hadZonePanel = activeAtomicZoneId != null;
              resetPanelState();
              if (hadZonePanel) returnCameraHome();
            }
          }}
          peekContent={
            sharedOptionProps ? (
              <BodyContextOptions {...sharedOptionProps} mode="peek" />
            ) : null
          }
        >
          {sheetMode === "selection" ? (
            <BodySelectionSummary
              selectedTargetIds={selectedTargetIds}
              onRemove={handleRemoveTarget}
              onClear={handleClearTargets}
              onFocusItem={(id) => {
                setSheetState("closed");
                setSheetMode("zone");
                handleFocusSelected(id);
              }}
              variant="stacked"
            />
          ) : sharedOptionProps ? (
            <>
              <BodyContextOptions
                {...sharedOptionProps}
                mode={showContainedOverride ? "full" : "expanded"}
              />
              {selectedTargetIds.length > 0 ? (
                <div className="mt-5 border-t border-white/8 pt-4">
                  <BodySelectionSummary
                    selectedTargetIds={selectedTargetIds}
                    onRemove={handleRemoveTarget}
                    onClear={handleClearTargets}
                    variant="stacked"
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </BodyMobileSheet>
      </div>

      {/* La selección se lista debajo del modelo (nunca encima de la zona). */}
      <div className={selectedTargetIds.length > 0 ? "block" : "hidden min-[900px]:block"}>
        <BodySelectionSummary
          selectedTargetIds={selectedTargetIds}
          onRemove={handleRemoveTarget}
          onClear={handleClearTargets}
          onFocusItem={handleFocusSelected}
          variant="bar"
          emptyHint="Haz clic en una zona del cuerpo para empezar tu selección."
        />
      </div>

      {showLabContinue ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={selectedTargetIds.length === 0}
            onClick={handleContinue}
            className={[
              "inline-flex min-h-12 w-full items-center justify-center rounded-xl text-sm font-semibold tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(168,85,247,0.7)] active:scale-[0.98] sm:w-auto sm:min-w-[12rem] sm:self-end",
              selectedTargetIds.length === 0
                ? "cursor-not-allowed border border-white/8 bg-white/[0.04] text-zinc-600"
                : "border border-[rgba(168,85,247,0.45)] bg-[rgba(168,85,247,0.2)] text-[rgba(243,238,255,0.98)] hover:bg-[rgba(168,85,247,0.28)]",
            ].join(" ")}
          >
            Continuar
          </button>
          {payloadPreview ? (
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                Selection payload preview · solo laboratorio
              </p>
              <pre className="mt-2 max-h-48 overflow-auto font-mono text-[11px] leading-relaxed text-zinc-400">
                {payloadPreview}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}

      <BodyHoverTooltip
        atomicZoneId={selectableHoveredAtomicId}
        pointer={hoverPointer}
        visible={showDesktopTooltip}
        selectedTargetIds={selectedTargetIds}
      />
    </div>
  );
}
