import { redirect } from "next/navigation";

/** Paso retirado: el estimado y la asesoría viven ahora en /cotizacion/estimado. */
export default function CotizacionConfirmacionPage() {
  redirect("/cotizacion/estimado");
}
