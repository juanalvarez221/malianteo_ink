"use client";

import { ChevronDown } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import styles from "@/widgets/home/HeroScrollCue.module.css";

/**
 * Invita a seguir bajando y, al tocarla, lleva a la primera sección.
 * Solo icono (el texto "Mira trabajos reales" se retiró a pedido del cliente).
 */
export function HeroScrollCue({ targetId }: { targetId: string }) {
  const { language } = useSiteLanguage();
  const reduce = useReducedMotion();

  const goToTarget = () => {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <button
      type="button"
      onClick={goToTarget}
      aria-label={language === "en" ? "Scroll to the next section" : "Ir a la siguiente sección"}
      className={`${styles.cue} focus-ring`}
    >
      <ChevronDown className={styles.icon} strokeWidth={2} aria-hidden />
    </button>
  );
}
