import type { AdvisoryStore } from "@/shared/lib/advisoryTypes";

const PRESENCIAL_WEEKDAY = ["10:00", "11:00", "14:00", "15:00", "16:00"];
const VIRTUAL_WEEKDAY = ["11:30", "15:30", "17:00"];

/**
 * Agenda base de asesorías (lunes a sábado, hora de Bogotá).
 * Se usa cuando aún no existe una agenda guardada; ajústala aquí
 * o desde el almacenamiento configurado (Postgres / Redis / data/).
 */
export function createDefaultAdvisoryStore(): AdvisoryStore {
  return {
    timezone: "America/Bogota",
    horizonDays: 21,
    presencial: {
      durationMin: 30,
      weekly: {
        "1": PRESENCIAL_WEEKDAY,
        "2": PRESENCIAL_WEEKDAY,
        "3": PRESENCIAL_WEEKDAY,
        "4": PRESENCIAL_WEEKDAY,
        "5": PRESENCIAL_WEEKDAY,
        "6": ["10:00", "11:00"],
      },
    },
    virtual: {
      durationMin: 15,
      weekly: {
        "1": VIRTUAL_WEEKDAY,
        "2": VIRTUAL_WEEKDAY,
        "3": VIRTUAL_WEEKDAY,
        "4": VIRTUAL_WEEKDAY,
        "5": VIRTUAL_WEEKDAY,
        "6": ["11:00"],
      },
    },
    blockedDates: [],
    bookings: [],
  };
}
