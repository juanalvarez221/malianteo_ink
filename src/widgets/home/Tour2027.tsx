"use client";

/**
 * TOUR 2027 en la home: banda en movimiento y las banderas de los cuatro
 * países. Las banderas son los diseños oficiales renderizados como tela
 * (public/flags/*.webp, 1800 px); next/image entrega el tamaño justo.
 * Fechas y ciudades aún sin publicar: no se inventan.
 * Estilos y tiempos en Tour2027.module.css.
 */

import { Fragment, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Image from "next/image";
import { WHATSAPP_MESSAGES, whatsappUrl } from "@/shared/config/brand";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import type { SiteCopyKey } from "@/shared/i18n/siteLanguage";
import { emitirHechoAnalitica } from "@/shared/lib/analitica/emitirCliente";
import { WhatsAppMark } from "@/shared/ui/SocialBrandIcon";
import styles from "./Tour2027.module.css";

type Country = {
  id: "nl" | "es" | "it" | "de";
  nameKey: SiteCopyKey;
  /** Bandera oficial ondeando (render 1800 px con transparencia). */
  flag: { src: string; width: number; height: number };
  /** Bandera oficial plana y pequeña (franja e insignia). */
  mini: { src: string; width: number; height: number };
};

/** Proporciones oficiales: 2:3, salvo Alemania (3:5). España con escudo. */
const COUNTRIES: readonly Country[] = [
  {
    id: "nl",
    nameKey: "tourCountryNl",
    flag: { src: "/flags/nl.webp", width: 1800, height: 1380 },
    mini: { src: "/flags/nl-mini.webp", width: 120, height: 80 },
  },
  {
    id: "es",
    nameKey: "tourCountryEs",
    flag: { src: "/flags/es.webp", width: 1800, height: 1380 },
    mini: { src: "/flags/es-mini.webp", width: 120, height: 80 },
  },
  {
    id: "it",
    nameKey: "tourCountryIt",
    flag: { src: "/flags/it.webp", width: 1800, height: 1380 },
    mini: { src: "/flags/it-mini.webp", width: 120, height: 80 },
  },
  {
    id: "de",
    nameKey: "tourCountryDe",
    flag: { src: "/flags/de.webp", width: 1800, height: 1242 },
    mini: { src: "/flags/de-mini.webp", width: 120, height: 72 },
  },
];

function MiniFlag({ country, width, className }: { country: Country; width: number; className: string }) {
  const height = Math.round((width * country.mini.height) / country.mini.width);
  return (
    <Image
      src={country.mini.src}
      alt=""
      width={width}
      height={height}
      sizes={`${width}px`}
      className={className}
    />
  );
}

/** Insignia del hero: lleva al tour y muestra las cuatro banderas. */
export function TourBadge() {
  const { t } = useSiteLanguage();
  return (
    <a href="#tour-2027" className={styles.badge}>
      <span className={styles.badgeFlags} aria-hidden="true">
        {COUNTRIES.map((country) => (
          <MiniFlag key={country.id} country={country} width={18} className={styles.badgeFlag} />
        ))}
      </span>
      <span>{t("heroTourBadge")}</span>
    </a>
  );
}

export function Tour2027() {
  const { t } = useSiteLanguage();
  const sectionRef = useRef<HTMLElement>(null);
  const [armed, setArmed] = useState(false);
  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);

  // Revela al entrar en pantalla y solo anima mientras se ve.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => {
        setVisible(true);
        setActive(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }
    const frame = window.requestAnimationFrame(() => setArmed(true));
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  const run = (
    <>
      <span className={styles.bandItem}>
        <span className={styles.bandWord}>{t("tourTitle")}</span>
      </span>
      <span className={styles.bandDot} />
      {COUNTRIES.map((country) => (
        <Fragment key={country.id}>
          <span className={styles.bandItem}>
            <MiniFlag country={country} width={30} className={styles.miniFlag} />
            <span className={styles.bandWord}>{t(country.nameKey)}</span>
          </span>
          <span className={styles.bandDot} />
        </Fragment>
      ))}
    </>
  );

  return (
    <section
      ref={sectionRef}
      id="tour-2027"
      aria-labelledby="tour-2027-titulo"
      className={styles.section}
      data-armed={armed ? "true" : "false"}
      data-visible={visible ? "true" : "false"}
      data-active={active ? "true" : "false"}
    >
      <div className={styles.band} aria-hidden="true">
        <div className={styles.track}>
          <div className={styles.group}>
            {run}
            {run}
          </div>
          <div className={styles.group}>
            {run}
            {run}
          </div>
        </div>
      </div>

      <div className={styles.inner}>
        <div>
          <h2 id="tour-2027-titulo" className={styles.title}>
            {t("tourTitle")}
          </h2>
          <p className={styles.body}>{t("tourBody")}</p>
          <p className={styles.note}>{t("tourNote")}</p>
          <a
            href={whatsappUrl(WHATSAPP_MESSAGES.tour2027)}
            target="_blank"
            rel="noopener noreferrer"
            className={`btn-accent focus-ring ${styles.cta}`}
            onClick={() =>
              emitirHechoAnalitica({
                tipo_evento: "interaccion",
                seccion: "tour_2027",
                etiqueta: "pieza_unica",
              })
            }
          >
            {t("tourCta")}
            <WhatsAppMark className={styles.ctaIcon} />
          </a>
        </div>

        <ul className={styles.flags} aria-label={t("tourListLabel")}>
          {COUNTRIES.map((country, index) => (
            <li
              key={country.id}
              className={styles.country}
              style={{ "--i": index } as CSSProperties}
            >
              <span className={styles.mast}>
                <span className={styles.pole} aria-hidden="true" />
                <span className={styles.flagFrame} aria-hidden="true">
                  <Image
                    src={country.flag.src}
                    alt=""
                    width={country.flag.width}
                    height={country.flag.height}
                    sizes="(min-width: 900px) 260px, 45vw"
                    className={styles.flagImage}
                  />
                </span>
              </span>
              <span className={styles.name}>{t(country.nameKey)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
