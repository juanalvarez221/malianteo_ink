import { QuoteAdvisoryBookingStep } from "@/widgets/quote/QuoteAdvisoryBookingStep";
import type { AdvisoryMode } from "@/shared/lib/advisoryTypes";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CotizacionAsesoriaAgendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.mode) ? params.mode[0] : params.mode;
  const mode: AdvisoryMode = raw === "virtual" ? "virtual" : "presencial";
  return <QuoteAdvisoryBookingStep mode={mode} />;
}
