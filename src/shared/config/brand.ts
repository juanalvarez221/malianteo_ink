/** Identidad y canales oficiales de Malianteo Ink. */
export const BRAND = {
  name: "Malianteo",
  instagramHandle: "malianteo_ink",
  instagramUrl: "https://www.instagram.com/malianteo_ink/",
  whatsappPhone: "573104798643",
  /** Logotipo oficial (wordmark gótico, PNG transparente). */
  logo: {
    src: "/brand/malianteo-logo.png",
    width: 2018,
    height: 688,
  },
} as const;

export function whatsappUrl(message: string): string {
  return `https://wa.me/${BRAND.whatsappPhone}?text=${encodeURIComponent(message)}`;
}

/** Mensajes prearmados para WhatsApp (listos para enviar, origen: sitio web). */
export const WHATSAPP_MESSAGES = {
  contact:
    "Hola Malianteo, te contacto desde la web. Me interesa cotizar un proyecto de tatuaje y conocer disponibilidad.",
  quoteFollowUp:
    "Hola Malianteo, te contacto desde la web. Completé el proceso de cotización y quiero continuar con la revisión de mi proyecto.",
  quoteInProgress:
    "Hola Malianteo, te contacto desde la web. Estoy en medio de una cotización y necesito orientación para continuar.",
  quoteInProgressNamed:
    "Hola Malianteo, soy {name}. Te contacto desde la web: estoy en medio de una cotización y necesito orientación para continuar.",
  tour2027:
    "Hola Malianteo, te contacto desde la web. Quiero hacer una pieza contigo en el tour 2027 por Europa. ¿Me cuentas fechas y ciudades?",
} as const;

export function buildAdvisoryWhatsAppMessage({
  mode,
  slotLabel,
  clientName,
}: {
  mode: "presencial" | "virtual";
  slotLabel: string;
  clientName: string;
}) {
  const modality = mode === "presencial" ? "presencial" : "virtual";
  return `Hola Malianteo, soy ${clientName}. Te contacto desde la web: reservé una asesoría ${modality} para el ${slotLabel}.`;
}
