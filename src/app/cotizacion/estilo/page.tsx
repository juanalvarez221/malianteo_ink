import { QuoteStyleStep } from "@/widgets/quote/QuoteStyleStep";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function getParam(
  source: { [key: string]: string | string[] | undefined },
  key: string,
  fallback: string,
) {
  const value = source[key];
  if (Array.isArray(value)) return value[0] ?? fallback;
  return value ?? fallback;
}

export default async function CotizacionEstiloPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const size = getParam(params, "size", "mediano");
  const zone = getParam(params, "zone", "pecho");
  return <QuoteStyleStep size={size} zone={zone} />;
}

