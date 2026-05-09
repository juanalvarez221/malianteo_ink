import { QuoteConfirmationStep } from "@/widgets/quote/QuoteConfirmationStep";

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

function titleCase(text: string) {
  return text
    .split(" ")
    .filter(Boolean)
    .map((chunk) => chunk[0].toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

function getEstimateBySize(size: string) {
  const normalized = size.toLowerCase();
  if (normalized.includes("peque")) {
    return {
      sessions: "1 a 2 sesiones",
      perSession: "$220.000 - $320.000 COP",
      total: "$220.000 - $640.000 COP",
    };
  }

  if (normalized.includes("gran")) {
    return {
      sessions: "4 a 6 sesiones",
      perSession: "$380.000 - $550.000 COP",
      total: "$1.520.000 - $3.300.000 COP",
    };
  }

  return {
    sessions: "2 a 3 sesiones",
    perSession: "$300.000 - $420.000 COP",
    total: "$600.000 - $1.260.000 COP",
  };
}

export default async function CotizacionConfirmacionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const size = titleCase(getParam(params, "size", "mediano"));
  const zone = titleCase(getParam(params, "zone", "brazo"));
  const style = getParam(params, "style", "Realismo oscuro");
  const estimate = getEstimateBySize(size);

  return <QuoteConfirmationStep size={size} zone={zone} style={style} estimate={estimate} />;
}

