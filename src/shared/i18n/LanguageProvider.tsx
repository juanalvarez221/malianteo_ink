"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  detectLanguage,
  LANGUAGE_STORAGE_KEY,
  SITE_COPY,
  type SiteCopyKey,
  type SiteLanguage,
} from "@/shared/i18n/siteLanguage";

type LanguageContextValue = {
  language: SiteLanguage;
  isReady: boolean;
  needsSelection: boolean;
  setLanguage: (lang: SiteLanguage) => void;
  t: (key: SiteCopyKey, vars?: Record<string, string>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<SiteLanguage>("es");
  const [isReady, setIsReady] = useState(false);
  const [needsSelection, setNeedsSelection] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === "es" || saved === "en") {
        setLanguageState(saved);
        setNeedsSelection(false);
      } else {
        setLanguageState(detectLanguage());
        setNeedsSelection(true);
      }
      setIsReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const setLanguage = (lang: SiteLanguage) => {
    setLanguageState(lang);
    setNeedsSelection(false);
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  const t = (key: SiteCopyKey, vars?: Record<string, string>) => {
    const raw: string = SITE_COPY[language][key];
    if (!vars) return raw;
    return Object.entries(vars).reduce(
      (acc, [varKey, varValue]) => acc.replaceAll(`{${varKey}}`, varValue),
      raw,
    );
  };

  const value = { language, isReady, needsSelection, setLanguage, t };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useSiteLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useSiteLanguage must be used inside LanguageProvider");
  }
  return context;
}
