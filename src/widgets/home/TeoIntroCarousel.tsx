"use client";

import Image from "next/image";
import { motion } from "framer-motion";

const PHOTOS = [
  { src: "/brand/teo1.png", alt: "Malianteo retrato 1" },
  { src: "/brand/teo2.png", alt: "Malianteo retrato 2" },
  { src: "/brand/teo3.png", alt: "Malianteo retrato 3" },
];

export function TeoIntroCarousel() {
  const track = [...PHOTOS, ...PHOTOS, ...PHOTOS];

  return (
    <div className="mt-6 space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-2">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black/80 to-transparent" />
        <motion.div
          className="flex w-max gap-2"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 32, ease: "linear", repeat: Infinity }}
        >
          {track.map((item, i) => (
            <article
              key={`${item.src}-up-${i}`}
              className="relative h-44 w-32 overflow-hidden rounded-xl border border-white/10 bg-black/40 sm:h-56 sm:w-40 md:h-64 md:w-44"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                quality={100}
                sizes="(max-width: 768px) 140px, 190px"
                className="object-cover object-center"
              />
            </article>
          ))}
        </motion.div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-2">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black/80 to-transparent" />
        <motion.div
          className="flex w-max gap-2"
          animate={{ x: ["-50%", "0%"] }}
          transition={{ duration: 36, ease: "linear", repeat: Infinity }}
        >
          {track.map((item, i) => (
            <article
              key={`${item.src}-down-${i}`}
              className="relative h-44 w-32 overflow-hidden rounded-xl border border-white/10 bg-black/40 sm:h-56 sm:w-40 md:h-64 md:w-44"
            >
              <Image
                src={item.src}
                alt={item.alt}
                fill
                quality={100}
                sizes="(max-width: 768px) 140px, 190px"
                className="object-cover object-center"
              />
            </article>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

