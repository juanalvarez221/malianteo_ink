"use client";

/**
 * Créditos de artistas: lista vertical con avatar, handle enlazado a
 * Instagram e insignia de verificado.
 */

import Image from "next/image";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { instagramProfileUrl, type Artist } from "./data";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ artist, size = 40 }: { artist: Artist; size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-white/15"
      style={{ width: size, height: size }}
    >
      {artist.avatar ? (
        <Image
          src={artist.avatar}
          alt=""
          width={size * 2}
          height={size * 2}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="m-auto text-[11px] font-semibold tracking-wide text-zinc-300">
          {initials(artist.name)}
        </span>
      )}
    </span>
  );
}

export function VerifiedBadge() {
  const { t } = useSiteLanguage();
  return (
    <BadgeCheck
      role="img"
      aria-label={t("collabVerified")}
      className="h-4 w-4 shrink-0 fill-[#0095F6] text-white"
      strokeWidth={2.4}
    />
  );
}

export function ArtistList({ artists }: { artists: readonly Artist[] }) {
  const { t } = useSiteLanguage();

  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
        {t("collabArtistsLabel")}
      </p>
      <ul className="mt-3 divide-y divide-white/[0.07] border-y border-white/[0.07]">
        {artists.map((artist) => {
          const label = artist.handle ?? artist.name;
          const body = (
            <>
              <Avatar artist={artist} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[15px] font-semibold text-white">
                  <span className="truncate">{label}</span>
                  {artist.verified ? <VerifiedBadge /> : null}
                </span>
                {artist.handle ? (
                  <span className="mt-0.5 block truncate text-xs text-zinc-500">{artist.name}</span>
                ) : null}
              </span>
            </>
          );

          return (
            <li key={artist.name}>
              {artist.handle ? (
                <a
                  href={instagramProfileUrl(artist.handle)}
                  target="_blank"
                  rel="noreferrer"
                  className="group/artist -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
                >
                  {body}
                  <ArrowUpRight
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-zinc-500 transition group-hover/artist:-translate-y-0.5 group-hover/artist:translate-x-0.5 group-hover/artist:text-white"
                  />
                </a>
              ) : (
                <div className="flex items-center gap-3 py-2.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
