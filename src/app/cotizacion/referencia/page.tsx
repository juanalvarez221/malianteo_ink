import { QuoteReferenceStep } from "@/widgets/quote/QuoteReferenceStep";

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

export default async function CotizacionReferenciaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const size = getParam(params, "size", "mediano");
  const zone = getParam(params, "zone", "pecho");
  const style = getParam(params, "style", "Realismo oscuro");

  return <QuoteReferenceStep size={size} zone={zone} style={style} />;
}

