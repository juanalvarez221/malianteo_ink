/**
 * Imágenes de referencia del cliente.
 * Se comprimen en el navegador (JPEG, lado mayor 1280 px) y viven solo en
 * sessionStorage hasta enviarse con el brief a Malianteo. No se guardan en
 * base de datos: llegan como adjunto del correo interno.
 */

import { QUOTE_REFERENCE_IMAGES_KEY } from "@/shared/lib/quoteFlow";
import {
  safeStorageGet,
  safeStorageRemove,
  safeStorageSet,
} from "@/shared/lib/safeStorage";

export const MAX_REFERENCE_IMAGES = 3;
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.8;

export type QuoteReferenceImage = {
  id: string;
  name: string;
  dataUrl: string;
};

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode"));
    };
    img.src = url;
  });
}

export async function compressReferenceImage(file: File): Promise<QuoteReferenceImage> {
  if (!file.type.startsWith("image/")) throw new Error("type");
  const img = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  // Fondo oscuro para PNG con transparencia (JPEG no tiene alfa).
  ctx.fillStyle = "#0b0b0d";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  const baseName = file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "referencia";
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${baseName}.jpg`,
    dataUrl,
  };
}

export function loadReferenceImages(): QuoteReferenceImage[] {
  if (typeof window === "undefined") return [];
  const raw = safeStorageGet(window.sessionStorage, QUOTE_REFERENCE_IMAGES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QuoteReferenceImage[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => typeof item?.dataUrl === "string" && item.dataUrl.startsWith("data:image/"))
      .slice(0, MAX_REFERENCE_IMAGES);
  } catch {
    return [];
  }
}

/** Devuelve false si el navegador no tiene espacio (se avisa al usuario). */
export function saveReferenceImages(images: QuoteReferenceImage[]): boolean {
  if (typeof window === "undefined") return false;
  if (images.length === 0) {
    safeStorageRemove(window.sessionStorage, QUOTE_REFERENCE_IMAGES_KEY);
    return true;
  }
  return safeStorageSet(
    window.sessionStorage,
    QUOTE_REFERENCE_IMAGES_KEY,
    JSON.stringify(images.slice(0, MAX_REFERENCE_IMAGES)),
  );
}
