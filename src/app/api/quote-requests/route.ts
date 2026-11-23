import { NextResponse } from "next/server";
import {
  upsertQuoteRequest,
  type QuoteRequestInput,
} from "@/shared/lib/storage/quoteRequestStore.server";
import { sendNewQuoteInternalEmail } from "@/shared/lib/notifications/internalArtistNotifications.server";
import type { EmailAttachment } from "@/shared/lib/notifications/emailTransport.server";
import { enforcePublicWrite } from "@/shared/lib/security/guardRequest.server";

export const dynamic = "force-dynamic";

const MAX_REFERENCE_IMAGES = 3;
/** Las imágenes llegan comprimidas (~1280 px); 2 MB por imagen es holgado. */
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

type IncomingImage = { name?: unknown; dataUrl?: unknown };

/**
 * Referencias visuales del cliente → adjuntos del correo interno.
 * No se guardan en la base de datos (el registro sigue siendo liviano).
 */
function parseReferenceImages(raw: unknown): EmailAttachment[] {
  if (!Array.isArray(raw)) return [];
  const attachments: EmailAttachment[] = [];
  for (const item of raw.slice(0, MAX_REFERENCE_IMAGES) as IncomingImage[]) {
    if (typeof item?.dataUrl !== "string") continue;
    const match = DATA_URL_PATTERN.exec(item.dataUrl);
    if (!match) continue;
    const [, contentType, contentBase64] = match;
    const bytes = Math.floor((contentBase64.length * 3) / 4);
    if (bytes > MAX_IMAGE_BYTES) continue;
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const base =
      typeof item.name === "string" && item.name.trim()
        ? item.name.trim().replace(/\.[^.]+$/, "")
        : `referencia-${attachments.length + 1}`;
    attachments.push({
      filename: `${base.slice(0, 60)}.${extension}`,
      contentType,
      contentBase64,
    });
  }
  return attachments;
}

export async function POST(request: Request) {
  const limited = await enforcePublicWrite(request, "quote");
  if (limited) return limited;

  try {
    const { referenceImages, ...body } = (await request.json()) as QuoteRequestInput & {
      referenceImages?: unknown;
    };

    if (!body.clientName?.trim() || (!body.whatsapp?.trim() && !body.email?.trim())) {
      return NextResponse.json(
        { error: "Faltan datos mínimos para registrar la solicitud." },
        { status: 400 },
      );
    }

    const { record, created } = await upsertQuoteRequest(body);

    // Correo interno solo para cotizaciones nuevas no ligadas a una asesoría
    // (las asesorías notifican aparte desde /api/advisory/book para evitar duplicados).
    if (created && !record.advisoryBookingId) {
      await sendNewQuoteInternalEmail(record, parseReferenceImages(referenceImages));
    }

    return NextResponse.json({ ok: true, id: record.id, created });
  } catch {
    return NextResponse.json(
      { error: "No se pudo registrar la solicitud de cotización." },
      { status: 500 },
    );
  }
}
