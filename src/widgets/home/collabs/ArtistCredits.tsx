"use client";

/**
 * Créditos de artistas: foto en círculo con aro, nombre real, @usuario y un
 * acceso claro a su Instagram. Toda la fila es el enlace.
 */

import Image from "next/image";
import { ArrowUpRight, BadgeCheck } from "lucide-react";
import { useSiteLanguage } from "@/shared/i18n/LanguageProvider";
import { InstagramMark } from "@/shared/ui/SocialBrandIcon";
import { instagramProfileUrl, type Artist } from "./data";

/** Diámetro de la foto (sin contar el aro). */
const AVATAR_PX = 52;

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Foto circular con aro en morados y un hueco del color del panel. */
function Avatar({ artist }: { artist: Artist }) {
  return (
    <span className="inline-flex shrink-0 rounded-full bg-[linear-gradient(140deg,#c4b5fd_0%,#7c3aed_42%,#4c1d95_72%,#a78bfa_100%)] p-[2px] shadow-[0_0_18px_rgba(124,58,237,0.35)] transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/artist:scale-[1.04]">
      <span className="inline-flex rounded-full bg-[#0b0812] p-[2px]">
        <span
          className="relative inline-flex overflow-hidden rounded-full bg-zinc-800"
          style={{ width: AVATAR_PX, height: AVATAR_PX }}
        >
          {artist.avatar ? (
            <Image
              src={artist.avatar}
              alt=""
              fill
              sizes={`${AVATAR_PX}px`}
              className="object-cover"
            />
          ) : (
            <span className="m-auto text-xs font-semibold tracking-wide text-zinc-300">
              {initials(artist.name)}
            </span>
          )}
        </span>
      </span>
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

function ArtistIdentity({ artist }: { artist: Artist }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1.5 text-[15px] font-semibold leading-tight text-white">
        <span className="truncate">{artist.name}</span>
        {artist.verified ? <VerifiedBadge /> : null}
      </span>
      {artist.handle ? (
        <span className="mt-1.5 flex items-center gap-1.5 text-[13px] leading-none text-zinc-400">
          <InstagramMark className="h-3.5 w-3.5 shrink-0" />
          <span className="sr-only">Instagram</span>
          <span className="truncate">@{artist.handle}</span>
        </span>
      ) : null}
    </span>
  );
}

export function ArtistList({ artists }: { artists: readonly Artist[] }) {
  const { t } = useSiteLanguage();

  return (
    <div>
      <p className="text-[13px] font-medium text-zinc-400">{t("collabArtistsLabel")}</p>
      <ul className="mt-3 divide-y divide-white/[0.07] border-y border-white/[0.07]">
        {artists.map((artist) => (
          <li key={artist.name}>
            {artist.handle ? (
              <a
                href={instagramProfileUrl(artist.handle)}
                target="_blank"
                rel="noopener noreferrer"
                className="group/artist -mx-2 flex items-center gap-3.5 rounded-2xl px-2 py-3 transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.04] active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
              >
                <Avatar artist={artist} />
                <ArtistIdentity artist={artist} />
                <span className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center gap-1 rounded-full border border-violet-400/40 bg-violet-500/10 text-xs font-semibold text-violet-100 transition-colors duration-200 group-hover/artist:border-violet-300/75 group-hover/artist:bg-violet-500/20 group-hover/artist:text-white sm:px-3.5">
                  <span className="max-sm:sr-only">{t("collabViewProfile")}</span>
                  <ArrowUpRight
                    aria-hidden
                    className="h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover/artist:-translate-y-px group-hover/artist:translate-x-px"
                  />
                </span>
              </a>
            ) : (
              <div className="flex items-center gap-3.5 py-3">
                <Avatar artist={artist} />
                <ArtistIdentity artist={artist} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
