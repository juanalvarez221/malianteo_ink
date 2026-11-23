/**
 * Textos del cotizador (pasos 2–7). Voz natural y profesional: frases cortas,
 * beneficio para el cliente, nada de jerga.
 */

import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import type { QuoteJourneyStepId } from "@/shared/lib/quoteJourney";
import type { QuoteSizeId } from "@/shared/lib/quoteDraft";

type Option = { label: string; detail?: string };

const es = {
  common: {
    continue: "Continuar",
    back: "Anterior",
    optional: "Opcional",
    loading: "Cargando…",
  },
  journey: {
    steps: {
      contacto: "Contacto",
      conexion: "Sobre ti",
      tamano: "Tamaño",
      zona: "Zona",
      inspiracion: "Inspiración",
      estimado: "Estimado",
      agenda: "Agenda",
    } satisfies Record<QuoteJourneyStepId, string>,
    stepOf: "Paso {current} de {total}",
    totalTime: "Toma unos {min} min",
    remaining: "Faltan ≈ {min} min",
    remainingLess: "Falta menos de 1 min",
    lastStep: "Último paso",
  },
  connection: {
    title: "Dos preguntas rápidas",
    body: "Así llego a tu asesoría sabiendo qué buscas.",
    referralQuestion: "¿Dónde me conociste?",
    referral: {
      instagram: "Instagram",
      tiktok: "TikTok",
      acquaintance: "Me lo recomendaron",
      google: "Google",
      other: "Otro",
    },
    referralOtherLabel: "¿Dónde?",
    referralOtherPlaceholder: "Ej: un evento, otro artista…",
    workQuestion: "¿Cómo te gustaría trabajar tu pieza?",
    workHint: "Tú pones la idea; yo me encargo de que el diseño funcione en tu piel.",
    work: {
      trust_artist: {
        label: "Libertad creativa total",
        detail: "Me cuentas la idea y la llevo a mi estilo. Así nacen las piezas que ves en Instagram.",
      },
      open_composition: {
        label: "Definimos la dirección juntos",
        detail: "Partimos de tu idea y la afinamos en la asesoría.",
      },
      fixed_idea_only: {
        label: "Quiero mi idea tal cual",
        detail: "Sin cambios en el diseño ni en la temática.",
      },
    } satisfies Record<string, Option>,
    errorBoth: "Responde las dos preguntas para seguir.",
    errorOther: "Cuéntame dónde me conociste.",
  },
  size: {
    title: "¿De qué tamaño la imaginas?",
    body: "Cada foto es un trabajo real como referencia. La medida exacta la ajustamos juntos.",
    options: {
      mediano: { label: "Mediana", range: "10–15 cm", hint: "Del tamaño de tu palma" },
      grande: { label: "Grande", range: "15–25 cm", hint: "Medio brazo o la pantorrilla" },
      extra: { label: "Extra grande", range: "25–40 cm", hint: "Antebrazo completo, muslo o pecho" },
      proyecto: { label: "Proyecto completo", range: "+40 cm", hint: "Manga, pierna, espalda o cabeza" },
    } satisfies Record<QuoteSizeId, { label: string; range: string; hint: string }>,
    photoAlt: "Trabajo real de Malianteo, referencia de tamaño {label}",
    error: "Elige un tamaño para seguir.",
  },
  zone: {
    title: "¿Dónde va tu pieza?",
    body: "Gira el modelo y toca la zona. Puedes unir zonas vecinas.",
    empty: "Toca una zona del cuerpo para continuar.",
  },
  inspiration: {
    titleA: "Tu inspiración",
    bodyA: "Una imagen ayuda mucho a entender tu idea.",
    uploadTitle: "Imágenes de referencia",
    uploadHint: "Hasta 3 · JPG, PNG o WEBP",
    uploadCta: "Subir imagen",
    uploadMore: "Añadir otra",
    uploadProcessing: "Preparando imagen…",
    uploadError: "No pudimos leer esa imagen. Prueba con otra en JPG o PNG.",
    uploadLimit: "Puedes adjuntar hasta 3 imágenes.",
    removeImage: "Quitar imagen",
    likesQuestion: "¿Qué es lo que más te gusta del estilo de Malianteo?",
    likesHint: "Elige todas las que quieras.",
    likes: {
      realism: "El realismo en negro y gris",
      contrast: "El contraste y las sombras",
      faces: "Los rostros y su expresión",
      sacred_dark: "Lo sagrado y lo oscuro",
      scale: "Las piezas a gran escala",
      healed: "Cómo lucen ya cicatrizadas",
    },
    titleB: "¿Por qué Malianteo?",
    reasonsQuestion: "¿Por qué crees que sería el artista ideal para plasmar tu obra?",
    reasonsHint: "Elige hasta 3.",
    reasons: {
      style_match: "Su estilo es justo lo que busco",
      detail: "El nivel de detalle de su trabajo",
      big_projects: "Su experiencia en proyectos grandes",
      custom: "Diseña cada pieza desde cero",
      trust: "Confío en su criterio creativo",
      follower: "Llevo tiempo siguiendo su trabajo",
    },
    extraLabel: "¿Quieres añadir algo más?",
    extraPlaceholder: "Ej: el significado de la pieza, una fecha especial, si es un cover…",
    errorLikes: "Elige al menos una opción.",
    errorReasons: "Elige al menos una razón.",
    reasonsMax: "Máximo 3. Quita una para elegir otra.",
    ctaEstimate: "Ver mi estimado",
  },
  estimate: {
    boom: "BOOOOF",
    reactions: ["esa idea está brutal.", "esa idea suena increíble.", "esto va a quedar brutal."],
    reactionNoName: ["Esa idea está brutal.", "Esa idea suena increíble.", "Esto va a quedar brutal."],
    ticketTitle: "Tu estimado",
    sizeLabel: "Tamaño",
    zoneLabel: "Zona",
    sessionsLabel: "Sesiones",
    perSessionLabel: "Por sesión",
    totalLabel: "Total estimado",
    currencyNote: "Valores en pesos colombianos (COP).",
    disclaimer:
      "Es un estimado orientativo según el tamaño y la zona. El valor final lo definimos juntos en la asesoría.",
    advisoryTitle: "Agendemos tu asesoría personalizada",
    free: "Gratis",
    advisoryLead: "Ahí cerramos todo contigo, sin costo y sin compromiso:",
    advisoryPoints: [
      "Precio final y número de sesiones",
      "El diseño ajustado a tu identidad",
      "Fechas, cuidados y todas tus dudas",
    ],
    modalityQuestion: "¿Cómo prefieres hablar?",
    presencial: { title: "Presencial", meta: "Estudio Emerald · Medellín · 30 min aprox." },
    virtual: { title: "Virtual", meta: "Videollamada · 15 min aprox." },
    seeTimes: "Ver horarios",
  },
  booking: {
    title: "Elige tu horario",
    body: "Asesoría gratis de {minutes} min aprox. Tu proyecto ya quedó guardado.",
    modeLabel: "Modalidad",
    presencial: "Presencial",
    virtual: "Virtual",
    dayLabel: "Día",
    timeLabel: "Hora",
    pickDay: "Elige un día para ver las horas libres.",
    pickTime: "Elige una hora para confirmar.",
    summaryMeta: "{mode} · Gratis · {minutes} min aprox.",
    loadingTimes: "Buscando horas libres…",
    noTimes: "Ese día ya no tiene horas libres. Prueba otro.",
    empty: "Todavía no hay cupos publicados para esta modalidad. Prueba la otra o escríbeme por WhatsApp.",
    emptyCta: "Escribir por WhatsApp",
    summary: "Tu asesoría",
    confirm: "Confirmar asesoría",
    loadError: "No pudimos cargar los horarios. Revisa tu conexión e inténtalo de nuevo.",
    retry: "Reintentar",
    submitError: "No pudimos confirmar la reserva. Inténtalo de nuevo.",
    studio: "Estudio Emerald",
  },
};

export type QuoteFlowCopy = typeof es;

const en: QuoteFlowCopy = {
  common: {
    continue: "Continue",
    back: "Back",
    optional: "Optional",
    loading: "Loading…",
  },
  journey: {
    steps: {
      contacto: "Contact",
      conexion: "About you",
      tamano: "Size",
      zona: "Placement",
      inspiracion: "Inspiration",
      estimado: "Estimate",
      agenda: "Booking",
    },
    stepOf: "Step {current} of {total}",
    totalTime: "Takes about {min} min",
    remaining: "≈ {min} min left",
    remainingLess: "Less than 1 min left",
    lastStep: "Last step",
  },
  connection: {
    title: "Two quick questions",
    body: "So I come to your consultation knowing what you want.",
    referralQuestion: "Where did you find me?",
    referral: {
      instagram: "Instagram",
      tiktok: "TikTok",
      acquaintance: "Someone recommended you",
      google: "Google",
      other: "Other",
    },
    referralOtherLabel: "Where?",
    referralOtherPlaceholder: "E.g. an event, another artist…",
    workQuestion: "How would you like to work on your piece?",
    workHint: "You bring the idea; I make sure the design works on your skin.",
    work: {
      trust_artist: {
        label: "Full creative freedom",
        detail: "Tell me the idea and I take it into my style. That's how the pieces on my Instagram are made.",
      },
      open_composition: {
        label: "We set the direction together",
        detail: "We start from your idea and refine it in the consultation.",
      },
      fixed_idea_only: {
        label: "I want my idea exactly as it is",
        detail: "No changes to the design or the theme.",
      },
    },
    errorBoth: "Answer both questions to continue.",
    errorOther: "Tell me where you found me.",
  },
  size: {
    title: "How big do you picture it?",
    body: "Each photo is a real piece for reference. We'll fine-tune the exact size together.",
    options: {
      mediano: { label: "Medium", range: "10–15 cm", hint: "About the size of your palm" },
      grande: { label: "Large", range: "15–25 cm", hint: "Half an arm or the calf" },
      extra: { label: "Extra large", range: "25–40 cm", hint: "Full forearm, thigh or chest" },
      proyecto: { label: "Full project", range: "40+ cm", hint: "Sleeve, leg, back or head" },
    },
    photoAlt: "Real Malianteo piece, {label} size reference",
    error: "Choose a size to continue.",
  },
  zone: {
    title: "Where does your piece go?",
    body: "Rotate the model and tap the area. You can join neighboring areas.",
    empty: "Tap a body area to continue.",
  },
  inspiration: {
    titleA: "Your inspiration",
    bodyA: "An image goes a long way to understand your idea.",
    uploadTitle: "Reference images",
    uploadHint: "Up to 3 · JPG, PNG or WEBP",
    uploadCta: "Upload image",
    uploadMore: "Add another",
    uploadProcessing: "Preparing image…",
    uploadError: "We couldn't read that image. Try another JPG or PNG.",
    uploadLimit: "You can attach up to 3 images.",
    removeImage: "Remove image",
    likesQuestion: "What do you like most about Malianteo's style?",
    likesHint: "Pick as many as you like.",
    likes: {
      realism: "Black and grey realism",
      contrast: "The contrast and shadows",
      faces: "Faces and their expression",
      sacred_dark: "The sacred and the dark",
      scale: "Large-scale pieces",
      healed: "How they look once healed",
    },
    titleB: "Why Malianteo?",
    reasonsQuestion: "Why do you think he's the right artist to bring your piece to life?",
    reasonsHint: "Pick up to 3.",
    reasons: {
      style_match: "His style is exactly what I want",
      detail: "The level of detail in his work",
      big_projects: "His experience with large projects",
      custom: "He designs every piece from scratch",
      trust: "I trust his creative judgment",
      follower: "I've followed his work for a while",
    },
    extraLabel: "Anything else you'd like to add?",
    extraPlaceholder: "E.g. what the piece means, a special date, whether it's a cover-up…",
    errorLikes: "Pick at least one option.",
    errorReasons: "Pick at least one reason.",
    reasonsMax: "Up to 3. Remove one to choose another.",
    ctaEstimate: "See my estimate",
  },
  estimate: {
    boom: "BOOOOF",
    reactions: ["that idea is wild.", "that idea sounds amazing.", "this is going to look insane."],
    reactionNoName: ["That idea is wild.", "That idea sounds amazing.", "This is going to look insane."],
    ticketTitle: "Your estimate",
    sizeLabel: "Size",
    zoneLabel: "Placement",
    sessionsLabel: "Sessions",
    perSessionLabel: "Per session",
    totalLabel: "Estimated total",
    currencyNote: "Prices in Colombian pesos (COP).",
    disclaimer:
      "This is a guide based on size and placement. We set the final price together in the consultation.",
    advisoryTitle: "Let's book your personal consultation",
    free: "Free",
    advisoryLead: "That's where we close everything with you, free and with no commitment:",
    advisoryPoints: [
      "Final price and number of sessions",
      "The design tailored to who you are",
      "Dates, aftercare and all your questions",
    ],
    modalityQuestion: "How would you like to meet?",
    presencial: { title: "In person", meta: "Estudio Emerald · Medellín · about 30 min" },
    virtual: { title: "Virtual", meta: "Video call · about 15 min" },
    seeTimes: "See times",
  },
  booking: {
    title: "Pick your time",
    body: "Free consultation, about {minutes} min. Your project is already saved.",
    modeLabel: "Format",
    presencial: "In person",
    virtual: "Virtual",
    dayLabel: "Day",
    timeLabel: "Time",
    pickDay: "Pick a day to see open times.",
    pickTime: "Pick a time to confirm.",
    summaryMeta: "{mode} · Free · about {minutes} min",
    loadingTimes: "Looking for open times…",
    noTimes: "That day is fully booked. Try another one.",
    empty: "No slots published for this format yet. Try the other one or message me on WhatsApp.",
    emptyCta: "Message on WhatsApp",
    summary: "Your consultation",
    confirm: "Confirm consultation",
    loadError: "We couldn't load the times. Check your connection and try again.",
    retry: "Try again",
    submitError: "We couldn't confirm the booking. Please try again.",
    studio: "Estudio Emerald",
  },
};

const COPY = { es, en } as const;

export function useQuoteFlowCopy(): QuoteFlowCopy {
  const { language } = useSiteLanguage();
  return COPY[language === "en" ? "en" : "es"];
}

export function fillCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in values ? String(values[key]) : `{${key}}`,
  );
}

/** Textos en español para el brief interno (correo y admin siempre en español). */
export const QUOTE_FLOW_COPY_ES = es;
