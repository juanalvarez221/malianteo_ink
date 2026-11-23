"use client";

import { BRAND } from "@/shared/config/brand";
import { HeroSplash } from "@/widgets/home/HeroSplash";

export default function Home() {
  return (
    <HeroSplash
      artistName="MALIANTEO"
      subtitle="Tattoo Artist Profesional"
      backgroundImageUrl="/brand/teo1.png"
      backgroundVideoUrl="/brand/malianteo_video.mp4"
      wordmarkSrc={BRAND.logo.src}
    />
  );
}
