import { QuoteLocationStep } from "@/widgets/quote/QuoteLocationStep";
import { resolveQuoteSizeParam } from "@/shared/lib/quoteDraft";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function CotizacionUbicacionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.size) ? params.size[0] : params.size;
  return <QuoteLocationStep size={resolveQuoteSizeParam(raw)} />;
}
