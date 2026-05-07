"use client";

import { HeroSplash } from "@/widgets/home/HeroSplash";

export default function Home() {
  return (
    <HeroSplash
      artistName="MALIANTEO"
      subtitle="Tattoo Artist"
      backgroundImageUrl="/brand/teo1.png"
      backgroundImageUrls={[
        "/brand/teo1.png",
        "/brand/teo2.png",
        "/brand/teo3.png",
        "/brand/malianteo.png",
      ]}
      wordmarkSrc="/brand/wordmark-malianteo-clean.png"
    />
  );
}
