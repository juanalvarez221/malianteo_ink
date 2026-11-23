/**
 * Identidad de correo de Malianteo Ink.
 * - Los clientes reciben correo saliente de la cuenta de marca (GMAIL_SMTP_USER).
 * - El artista recibe avisos internos en ARTIST_NOTIFICATIONS_EMAIL.
 * Todo se configura en .env.local (ver .env.example). Sin credenciales,
 * los correos se registran en consola como vista previa y el flujo sigue.
 */
export const STUDIO_MAIL = {
  fromName: "Malianteo Ink",
  get fromAddress(): string {
    return process.env.GMAIL_SMTP_USER?.trim() || "";
  },
  get artistInbox(): string {
    return process.env.ARTIST_NOTIFICATIONS_EMAIL?.trim() || "";
  },
};

export function getStudioFromHeader(): string {
  const configured =
    process.env.GMAIL_FROM_EMAIL?.trim() || process.env.RESEND_FROM_EMAIL?.trim();
  if (configured) return configured;
  return `${STUDIO_MAIL.fromName} <${STUDIO_MAIL.fromAddress}>`;
}

export function getStudioReplyTo(): string {
  return (
    process.env.GMAIL_REPLY_TO?.trim() ||
    process.env.RESEND_REPLY_TO?.trim() ||
    STUDIO_MAIL.fromAddress
  );
}
