export type AdvisoryMode = "presencial" | "virtual";

/** reserved = cupo apartado, falta confirmar asistencia · confirmed = asistencia confirmada */
export type AdvisoryBookingStatus = "reserved" | "confirmed" | "released" | "cancelled";

/**
 * Brief liviano del cliente capturado en el cotizador.
 * Solo metadata textual: nada de imágenes ni base64.
 */
export type AdvisoryClientBrief = {
  bodyZone?: string;
  referral?: string;
  /** @deprecated pregunta retirada; solo reservas antiguas. */
  personalValues?: string;
  collaborationMode?: string;
  /** @deprecated pregunta retirada; solo reservas antiguas. */
  openNote?: string;
  /** Lo que más le gusta del estilo de Malianteo. */
  styleLikes?: string;
  /** Por qué cree que Malianteo es el artista ideal. */
  artistReasons?: string;
  /** Estimado orientativo que vio el cliente. */
  estimate?: string;
  /** Referencias visuales (cuántas y dónde llegaron). */
  references?: string;
};

export type AdvisoryBooking = {
  id: string;
  mode: AdvisoryMode;
  startsAt: string;
  durationMin: number;
  clientName: string;
  phone: string;
  email: string;
  projectNotes?: string;
  size?: string;
  createdAt: string;
  status: AdvisoryBookingStatus;
  confirmationToken: string;
  bookingEmailSentAt?: string;
  reminderSentAt?: string;
  attendanceConfirmedAt?: string;
  releasedAt?: string;
  previousStartsAt?: string;
  googleCalendarEventId?: string;
  /** Evento de Meet en el Calendar de Malianteo (distinto al de la agenda del artista). */
  googleMeetEventId?: string;
  brief?: AdvisoryClientBrief;
  meetingLink?: string;
};

export type ModeAvailability = {
  durationMin: number;
  weekly: Record<string, string[]>;
};

export type AdvisoryStore = {
  timezone: string;
  horizonDays: number;
  presencial: ModeAvailability;
  virtual: ModeAvailability;
  blockedDates: string[];
  bookings: AdvisoryBooking[];
};

export type AdvisorySlot = {
  startsAt: string;
  label: string;
  dateKey: string;
  time: string;
};
