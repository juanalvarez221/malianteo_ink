import Image from "next/image";
import { BRAND } from "@/shared/config/brand";

/**
 * Firma de Malianteo como marca de agua en la esquina inferior derecha.
 * El contenedor padre debe ser `relative` (u otro posicionado).
 */
export function BrandWatermark({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeClass = {
    sm: "bottom-2.5 right-2.5 w-16 md:bottom-3 md:right-3 md:w-20",
    md: "bottom-3 right-3 w-20 md:bottom-4 md:right-4 md:w-24",
    lg: "bottom-4 right-4 w-28 md:bottom-5 md:right-5 md:w-36",
  }[size];

  return (
    <Image
      src={BRAND.logo.src}
      alt=""
      aria-hidden
      width={BRAND.logo.width}
      height={BRAND.logo.height}
      sizes="160px"
      draggable={false}
      className={[
        "pointer-events-none absolute z-20 h-auto select-none opacity-80 drop-shadow-[0_4px_12px_rgba(0,0,0,0.75)]",
        sizeClass,
        className,
      ].join(" ")}
    />
  );
}
