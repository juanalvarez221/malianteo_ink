/**
 * Datos de las obras a cuatro manos. Para sumar una colaboración nueva basta
 * con registrar a los artistas (si no existen) y añadir una entrada a
 * COLLABORATIONS: la sección se arma sola.
 */

import { BRAND } from "@/shared/config/brand";
import type { SiteCopyKey } from "@/shared/i18n/siteLanguage";
import type { ViewerMedia } from "@/widgets/home/media/MediaViewer";

export type Artist = {
  /** Nombre visible cuando no hay cuenta de Instagram. */
  name: string;
  handle?: string;
  avatar?: string;
  verified?: boolean;
};

export const ARTISTS = {
  malianteo: {
    name: "Malianteo",
    handle: BRAND.instagramHandle,
    avatar: "/artists/malianteo.jpg",
    verified: true,
  },
  neutrottt: {
    name: "Neutrottt",
    handle: "neutrottt",
    avatar: "/artists/neutrottt.jpg",
    verified: true,
  },
  dannielCuervo: {
    name: "Danniel Cuervo",
    handle: "dannielcuervo",
    // Pendiente: añadir "/artists/dannielcuervo.jpg" cuando llegue la foto.
    verified: true,
  },
} as const satisfies Record<string, Artist>;

export function instagramProfileUrl(handle: string) {
  return `https://www.instagram.com/${handle}/`;
}

export type CollabMedia = ViewerMedia;

export type Collaboration = {
  id: string;
  titleKey: SiteCopyKey;
  artists: readonly Artist[];
  media: readonly CollabMedia[];
};

export const COLLABORATIONS: readonly Collaboration[] = [
  {
    id: "redemption",
    titleKey: "collabRedemptionTitle",
    artists: [ARTISTS.malianteo, ARTISTS.neutrottt],
    media: [
      { kind: "image", src: "/collabs/redemption-espalda.jpg", position: "center 40%" },
      { kind: "image", src: "/collabs/redemption-artistas.jpg", position: "center 45%" },
      {
        kind: "video",
        src: "/collabs/redemption-proceso.mp4",
        poster: "/collabs/redemption-espalda.jpg",
      },
    ],
  },
  {
    id: "espalda-colectiva",
    titleKey: "collabColectivaTitle",
    artists: [ARTISTS.malianteo, ARTISTS.neutrottt, ARTISTS.dannielCuervo],
    media: [
      { kind: "image", src: "/collabs/espalda-colectiva.jpg", position: "center 35%" },
      {
        kind: "video",
        src: "/collabs/espalda-colectiva-proceso-mxnxd.mp4",
        poster: "/collabs/espalda-colectiva.jpg",
      },
    ],
  },
  {
    id: "neutroxmalianteo",
    titleKey: "collabNxmTitle",
    artists: [ARTISTS.malianteo, ARTISTS.neutrottt],
    media: [
      { kind: "image", src: "/collabs/neutroxmalianteo-pierna.jpg", position: "center 40%" },
      { kind: "image", src: "/collabs/neutroxmalianteo-artistas.jpg", position: "center 25%" },
      {
        kind: "video",
        src: "/collabs/neutroxmalianteo-proceso.mp4",
        poster: "/collabs/neutroxmalianteo-pierna.jpg",
      },
    ],
  },
];
