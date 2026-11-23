"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QuoteShell } from "@/widgets/quote/QuoteShell";
import { QuoteStepFooter } from "@/widgets/quote/QuoteStepFooter";
import { useQuoteFlowCopy } from "@/widgets/quote/quoteFlowCopy";
import styles from "@/widgets/quote/QuoteFlow.module.css";
import { QUOTE_FLOW_PATHS } from "@/shared/lib/quoteFlow";
import {
  QuoteBodyLocationSelector,
  getInitialQuoteBodyLocationMode,
  type QuoteBodyLocationMode,
} from "@/widgets/quote/QuoteBodyLocationSelector";
import { useQuoteOnboardingGate } from "@/widgets/quote/useQuoteOnboardingGate";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { getQuoteDraft, saveQuoteDraft } from "@/shared/lib/quoteDraft";
import type { ZoneId } from "@/shared/lib/quoteZones";
import type { HeadPartId } from "@/shared/lib/headZoneParts";
import type { BackPartId } from "@/shared/lib/backZoneParts";
import {
  isArmSelectionComplete,
  type ArmSelection,
} from "@/shared/lib/armZoneParts";
import {
  isLegSelectionComplete,
  type LegSelection,
} from "@/shared/lib/legZoneParts";
import type { BodySelectionTargetId } from "@/widgets/body-3d/ux/bodySelectionSerialization";
import {
  buildLegacyQuoteLocationFromBodyTargets,
  isBody3DLocationComplete,
  normalizeQuoteBodyTargets,
  readBodyTargetsFromDraft,
} from "@/widgets/quote/quoteBodyLocation";

function readInitialTargets(): BodySelectionTargetId[] {
  if (typeof window === "undefined") return [];
  return readBodyTargetsFromDraft(getQuoteDraft());
}

export function QuoteLocationStep({ size }: { size: string }) {
  const router = useRouter();
  const { t } = useSiteLanguage();
  const copy = useQuoteFlowCopy();
  const gateReady = useQuoteOnboardingGate();
  const [showEmptyHint, setShowEmptyHint] = useState(false);

  // Sin tamaño elegido no hay pieza que ubicar.
  useEffect(() => {
    if (gateReady && !getQuoteDraft()?.size) router.replace(QUOTE_FLOW_PATHS.quoteStart);
  }, [gateReady, router]);

  const [selectedBodyTargets, setSelectedBodyTargets] = useState<
    BodySelectionTargetId[]
  >(readInitialTargets);
  const [selectorMode, setSelectorMode] = useState<QuoteBodyLocationMode>(
    getInitialQuoteBodyLocationMode,
  );

  // Estado legacy — solo activo en fallback 2D
  const [zone, setZone] = useState<ZoneId | null>(null);
  const [zoneOther, setZoneOther] = useState("");
  const [headPart, setHeadPart] = useState<HeadPartId | null>(null);
  const [backPart, setBackPart] = useState<BackPartId | null>(null);
  const [armSelection, setArmSelection] = useState<ArmSelection | null>(null);
  const [legSelection, setLegSelection] = useState<LegSelection | null>(null);

  const handleTargetsChange = useCallback((next: BodySelectionTargetId[]) => {
    setSelectedBodyTargets(normalizeQuoteBodyTargets(next));
  }, []);

  const handleFallback = useCallback(() => {
    setSelectorMode("2d-fallback");
  }, []);

  const handleZoneChange = useCallback((next: ZoneId) => {
    setZone(next);
    if (next !== "cabeza") setHeadPart(null);
    if (next !== "espalda") setBackPart(null);
    if (next !== "brazo") setArmSelection(null);
    if (next !== "pierna") setLegSelection(null);
    if (next !== "otro") setZoneOther("");
  }, []);

  const isLegacyComplete = useMemo(() => {
    if (!zone) return false;
    if (zone === "cabeza") return Boolean(headPart);
    if (zone === "espalda") return Boolean(backPart);
    if (zone === "brazo") return isArmSelectionComplete(armSelection);
    if (zone === "pierna") return isLegSelectionComplete(legSelection);
    if (zone === "otro") return zoneOther.trim().length >= 3;
    return true;
  }, [armSelection, backPart, headPart, legSelection, zone, zoneOther]);

  const isLocationComplete =
    selectorMode === "3d"
      ? isBody3DLocationComplete(selectedBodyTargets)
      : isLegacyComplete;

  function handleContinue() {
    if (!isLocationComplete) {
      setShowEmptyHint(true);
      return;
    }

    const base = getQuoteDraft() ?? { size };

    if (selectorMode === "3d") {
      saveQuoteDraft({
        ...base,
        size: base.size || size,
        ...buildLegacyQuoteLocationFromBodyTargets(selectedBodyTargets),
        headPart: undefined,
        backPart: undefined,
        armLaterality: undefined,
        armFaceScope: undefined,
        armPart: undefined,
        legLaterality: undefined,
        legFaceScope: undefined,
        legExtent: undefined,
      });
      router.push(QUOTE_FLOW_PATHS.inspiration);
      return;
    }

    if (!zone) return;

    saveQuoteDraft({
      ...base,
      size: base.size || size,
      zone,
      zoneOther: zoneOther.trim() || undefined,
      headPart: headPart ?? undefined,
      backPart: backPart ?? undefined,
      armLaterality: armSelection?.laterality,
      armFaceScope: armSelection?.faceScope,
      armPart: armSelection?.part ?? undefined,
      legLaterality: legSelection?.laterality,
      legFaceScope: legSelection?.faceScope,
      legExtent: legSelection?.extent,
      selectedBodyTargets: undefined,
    });
    router.push(QUOTE_FLOW_PATHS.inspiration);
  }

  return (
    <QuoteShell showGreeting={false} journey={{ step: "zona" }}>
      <div className={styles.columnWide}>
        <header className={styles.zoneHead}>
          <h1 className="typo-section quote-step-title">{copy.zone.title}</h1>
          <p className={styles.lead}>{copy.zone.body}</p>
        </header>

        {gateReady ? (
          <>
            <QuoteBodyLocationSelector
              value={selectedBodyTargets}
              onChange={handleTargetsChange}
              mode={selectorMode}
              onFallback={handleFallback}
              resetKey={size}
              legacy={{
                zone,
                onZoneChange: handleZoneChange,
                zoneOther,
                onZoneOtherChange: setZoneOther,
                headPart,
                onHeadPartChange: setHeadPart,
                backPart,
                onBackPartChange: setBackPart,
                armSelection,
                onArmSelectionChange: setArmSelection,
                legSelection,
                onLegSelectionChange: setLegSelection,
              }}
            />

            {showEmptyHint && !isLocationComplete ? (
              <p className={styles.fieldError} role="alert">
                {selectorMode === "3d" ? copy.zone.empty : t("quoteRefinementIncomplete")}
              </p>
            ) : null}

            <QuoteStepFooter
              onBack={() => router.push(QUOTE_FLOW_PATHS.quoteStart)}
              nextLabel={copy.common.continue}
              onNext={handleContinue}
              className="!mt-6"
            />
          </>
        ) : null}
      </div>
    </QuoteShell>
  );
}
