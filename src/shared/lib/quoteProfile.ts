export type QuoteProfile = {
  name: string;
  phone: string;
  email: string;
};

const QUOTE_PROFILE_KEY = "quote_profile";

export function saveQuoteProfile(profile: QuoteProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUOTE_PROFILE_KEY, JSON.stringify(profile));
}

export function getQuoteProfile(): QuoteProfile | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(QUOTE_PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QuoteProfile;
    if (!parsed?.name || !parsed?.phone || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getFirstName() {
  const p = getQuoteProfile();
  if (!p?.name) return null;
  return p.name.trim().split(/\s+/)[0] ?? null;
}

