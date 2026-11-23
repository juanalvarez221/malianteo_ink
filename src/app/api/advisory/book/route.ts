import { NextResponse } from "next/server";
import { createConfirmationToken } from "@/shared/lib/advisoryBookingLifecycle";
import { sendAdvisoryBookingConfirmationEmail } from "@/shared/lib/advisoryNotifications.server";
import { sendNewAdvisoryInternalEmail } from "@/shared/lib/notifications/internalArtistNotifications.server";
import { resolveVirtualMeetingLink } from "@/shared/lib/advisoryConfig";
import { isCalendarSlotOpen, syncOnReserved } from "@/shared/lib/googleCalendar/advisoryCalendarSync.server";
import {
  addAdvisoryBooking,
  loadAdvisoryStore,
  updateAdvisoryBooking,
} from "@/shared/lib/advisoryStore.server";
import { formatSlotLabel, isSlotTaken } from "@/shared/lib/advisorySlots";
import type { AdvisoryBooking, AdvisoryClientBrief, AdvisoryMode } from "@/shared/lib/advisoryTypes";
import { enforcePublicWrite } from "@/shared/lib/security/guardRequest.server";
import { acquireLock } from "@/shared/lib/storage/distributedLock.server";
import { registrarHechoCrm } from "@/shared/lib/crm/personas.server";

export const dynamic = "force-dynamic";

type BookBody = {
  mode?: AdvisoryMode;
  startsAt?: string;
  clientName?: string;
  phone?: string;
  email?: string;
  projectNotes?: string;
  size?: string;
  brief?: AdvisoryClientBrief;
};

const BRIEF_FIELDS = [
  "bodyZone",
  "referral",
  "personalValues",
  "collaborationMode",
  "openNote",
  "styleLikes",
  "artistReasons",
  "estimate",
  "references",
] as const satisfies ReadonlyArray<keyof AdvisoryClientBrief>;

function sanitizeBrief(brief?: AdvisoryClientBrief): AdvisoryClientBrief | undefined {
  if (!brief || typeof brief !== "object") return undefined;
  const clean: AdvisoryClientBrief = {};
  for (const field of BRIEF_FIELDS) {
    const value = brief[field];
    if (typeof value === "string" && value.trim()) clean[field] = value.trim().slice(0, 600);
  }
  return Object.keys(clean).length ? clean : undefined;
}

export async function POST(request: Request) {
  const limited = await enforcePublicWrite(request, "book");
  if (limited) return limited;

  try {
    const body = (await request.json()) as BookBody;
    const mode = body.mode;
    const startsAt = body.startsAt?.trim();
    const clientName = body.clientName?.trim();
    const phone = body.phone?.trim();
    const email = body.email?.trim();

    if (mode !== "presencial" && mode !== "virtual") {
      return NextResponse.json({ error: "Modo inválido." }, { status: 400 });
    }
    if (!startsAt || !clientName || !phone || !email) {
      return NextResponse.json({ error: "Faltan datos para reservar." }, { status: 400 });
    }

    const lock = await acquireLock(`malianteo:lock:slot:${startsAt}`, 10);
    if (!lock.ok) {
      return NextResponse.json(
        { error: "Ese horario se está reservando. Elige otro o reintenta." },
        { status: 409 },
      );
    }

    try {
      const store = await loadAdvisoryStore();
      const durationMin = store[mode].durationMin;

      if (isSlotTaken(store, startsAt, durationMin) || !(await isCalendarSlotOpen(startsAt, durationMin))) {
        return NextResponse.json(
          { error: "Ese horario ya no está disponible. Elige otro." },
          { status: 409 },
        );
      }

      const booking: AdvisoryBooking = {
        id: `AS-${Date.now()}`,
        mode,
        startsAt,
        durationMin,
        clientName,
        phone,
        email,
        projectNotes: body.projectNotes?.trim() || undefined,
        size: body.size?.trim() || undefined,
        brief: sanitizeBrief(body.brief),
        createdAt: new Date().toISOString(),
        status: "reserved",
        confirmationToken: createConfirmationToken(),
      };

      await addAdvisoryBooking(booking);

      try {
        await registrarHechoCrm({
          nombre: clientName,
          whatsapp: phone,
          email,
          evento: "asesoria_agendada",
          origen: "asesoria",
          referencia_id: booking.id,
        });
      } catch (crmError) {
        console.error("[crm:sync-asesoria]", crmError);
      }

      const googleSync = await syncOnReserved(booking);
      if (googleSync) {
        booking.googleCalendarEventId = googleSync.eventId;
        booking.meetingLink = googleSync.meetingLink;
        booking.googleMeetEventId = googleSync.meetEventId;
      }
      booking.meetingLink = resolveVirtualMeetingLink(booking.mode, booking.id, booking.meetingLink);
      if (googleSync || booking.meetingLink) {
        await updateAdvisoryBooking(booking.id, {
          ...(googleSync ? { googleCalendarEventId: googleSync.eventId } : {}),
          ...(googleSync?.meetEventId ? { googleMeetEventId: googleSync.meetEventId } : {}),
          ...(booking.meetingLink ? { meetingLink: booking.meetingLink } : {}),
        });
      }

      await sendNewAdvisoryInternalEmail(booking);

      const emailResult = await sendAdvisoryBookingConfirmationEmail(booking);
      if (emailResult.ok) {
        await updateAdvisoryBooking(booking.id, {
          bookingEmailSentAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        ok: true,
        booking: {
          id: booking.id,
          startsAt: booking.startsAt,
          label: formatSlotLabel(booking.startsAt, "es-CO"),
          meetingLink: booking.meetingLink,
        },
      });
    } finally {
      await lock.release();
    }
  } catch (error) {
    console.error("[advisory:book]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "No se pudo completar la reserva." }, { status: 500 });
  }
}
