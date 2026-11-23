"use client";

/**
 * Botón flotante de contacto (home): la foto de Malianteo con un aro morado.
 * Se abre en tres caminos (cotizar, WhatsApp, Instagram).
 *
 * - Patrón "disclosure": el botón controla la lista; el foco sigue el orden
 *   del DOM (botón → cotizar → WhatsApp → Instagram) y Escape cierra y
 *   devuelve el foco. Cerrada, la lista es `inert` y no se puede tabular.
 * - Cada cierto tiempo aparece un aviso ("Toca aquí", "Cotiza tu tatuaje",
 *   "Escríbeme aquí") con un pulso del aro, hasta que la persona lo abre en
 *   la sesión. No corre con la pestaña oculta.
 * - Colores de botón: tokens --brand-* (globals.css). Tiempos y curvas:
 *   ContactLauncher.module.css.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, FocusEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, X } from "lucide-react";
import { BRAND, WHATSAPP_MESSAGES, whatsappUrl } from "@/shared/config/brand";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import type { SiteCopyKey } from "@/shared/i18n/siteLanguage";
import { emitirHechoAnalitica } from "@/shared/lib/analitica/emitirCliente";
import { safeSessionStorageSet, safeStorageGet } from "@/shared/lib/safeStorage";
import { InstagramMark, WhatsAppMark } from "@/shared/ui/SocialBrandIcon";
import styles from "./ContactLauncher.module.css";

const AVATAR_SRC = "/brand/malianteo-avatar.jpg";
const SEEN_KEY = "malianteo.contacto.abierto";
const ENTRANCE_DELAY_MS = 450;
/** Primer aviso tras la entrada, cuánto dura y cada cuánto vuelve. */
const NUDGE_FIRST_MS = 2200;
const NUDGE_VISIBLE_MS = 3200;
const NUDGE_EVERY_MS = 8500;
const PULSE_MS = 1300;
/** Desplazamiento que cierra las opciones abiertas. */
const CLOSE_ON_SCROLL_PX = 32;

const NUDGES: readonly SiteCopyKey[] = ["fabNudgeTap", "fabNudgeQuote", "fabNudgeWrite"];

type Accion = "abrir" | "cotizar" | "whatsapp" | "instagram";

function registrar(accion: Accion) {
  emitirHechoAnalitica({
    tipo_evento: "interaccion",
    seccion: "boton_flotante",
    etiqueta: accion,
  });
}

function readSession(key: string) {
  try {
    return safeStorageGet(window.sessionStorage, key);
  } catch {
    return null;
  }
}

function optionStyle(index: number) {
  return { "--i": index } as CSSProperties;
}

export function ContactLauncher() {
  const { t } = useSiteLanguage();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [seen, setSeen] = useState(false);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [nudgeIndex, setNudgeIndex] = useState(0);
  const [pulse, setPulse] = useState(false);

  // Entrada tras el primer pintado; si ya lo abrió en esta sesión, sin avisos.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (readSession(SEEN_KEY) === "1") setSeen(true);
    });
    const timer = window.setTimeout(() => setReady(true), ENTRANCE_DELAY_MS);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, []);

  // Aviso periódico con pulso del aro, rotando los mensajes.
  useEffect(() => {
    if (!ready || seen || open) return;
    let count = 0;
    let hideTimer = 0;
    let pulseTimer = 0;
    const show = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(hideTimer);
      window.clearTimeout(pulseTimer);
      setNudgeIndex(count % NUDGES.length);
      count += 1;
      setNudgeVisible(true);
      setPulse(true);
      pulseTimer = window.setTimeout(() => setPulse(false), PULSE_MS);
      hideTimer = window.setTimeout(() => setNudgeVisible(false), NUDGE_VISIBLE_MS);
    };
    const firstTimer = window.setTimeout(show, NUDGE_FIRST_MS);
    const interval = window.setInterval(show, NUDGE_EVERY_MS);
    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(interval);
      window.clearTimeout(hideTimer);
      window.clearTimeout(pulseTimer);
    };
  }, [ready, seen, open]);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Abierto: Escape cierra (y devuelve el foco); desplazarse también cierra.
  useEffect(() => {
    if (!open) return;
    const startY = window.scrollY;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      close(true);
    };
    const onScroll = () => {
      if (Math.abs(window.scrollY - startY) > CLOSE_ON_SCROLL_PX) close();
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [open, close]);

  const toggle = () => {
    setNudgeVisible(false);
    setPulse(false);
    if (open) {
      close();
      return;
    }
    setOpen(true);
    setSeen(true);
    safeSessionStorageSet(SEEN_KEY, "1");
    registrar("abrir");
  };

  // Si el foco sale del componente (Tab hacia afuera), se cierra.
  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!open) return;
    const next = event.relatedTarget as Node | null;
    if (next && !rootRef.current?.contains(next)) close();
  };

  const choose = (accion: Accion) => {
    registrar(accion);
    close();
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      data-open={open ? "true" : "false"}
      data-ready={ready ? "true" : "false"}
      data-pulse={pulse ? "on" : "off"}
      onBlur={onBlur}
    >
      <div className={styles.scrim} aria-hidden="true" onClick={() => close()} />

      <span className={styles.ring} aria-hidden="true" />
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={open ? t("fabClose") : t("fabOpen")}
        onClick={toggle}
      >
        <span className={styles.halo} aria-hidden="true" />
        <span className={styles.face} aria-hidden="true">
          {/* Siempre visible: carga inmediata pero sin competir con el LCP (6 KB). */}
          <Image
            src={AVATAR_SRC}
            alt=""
            fill
            sizes="60px"
            loading="eager"
            fetchPriority="low"
            className="object-cover"
          />
        </span>
        <span className={styles.closeFace} aria-hidden="true">
          <X className={styles.closeIcon} strokeWidth={2.2} />
        </span>
      </button>

      <p className={styles.nudge} data-visible={nudgeVisible ? "true" : "false"} aria-hidden="true">
        <span key={nudgeIndex} className={styles.nudgeText}>
          {t(NUDGES[nudgeIndex])}
        </span>
        <ChevronRight className={styles.nudgeArrow} strokeWidth={2.4} />
      </p>

      <ul id={menuId} className={styles.menu} aria-label={t("fabMenu")} inert={!open}>
        <li className={styles.option} style={optionStyle(0)}>
          <Link
            href="/cotizacion"
            className={`${styles.item} ${styles.itemPrimary}`}
            onClick={() => choose("cotizar")}
          >
            {t("fabQuote")}
            <span className={styles.glyph} aria-hidden="true">
              <ArrowRight strokeWidth={2.2} />
            </span>
          </Link>
        </li>
        <li className={styles.option} style={optionStyle(1)}>
          <a
            href={whatsappUrl(WHATSAPP_MESSAGES.contact)}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.item}
            onClick={() => choose("whatsapp")}
          >
            {t("fabWhatsapp")}
            <span className={styles.glyph} aria-hidden="true">
              <WhatsAppMark />
            </span>
          </a>
        </li>
        <li className={styles.option} style={optionStyle(2)}>
          <a
            href={BRAND.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.item}
            onClick={() => choose("instagram")}
          >
            {t("fabInstagram")}
            <span className={styles.glyph} aria-hidden="true">
              <InstagramMark />
            </span>
          </a>
        </li>
      </ul>
    </div>
  );
}
