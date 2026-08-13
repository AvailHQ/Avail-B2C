import { track } from '@vercel/analytics';

export const COOKIE_PREFERENCES_KEY = 'myavail_cookie_preferences';
export const COOKIE_CONSENT_EVENT = 'myavail:cookie-consent';

export interface CookiePreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
}

export function readCookiePreferences(): CookiePreferences | null {
  try {
    const saved = window.localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<CookiePreferences>;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

export function saveCookiePreferences(analytics: boolean, marketing: boolean) {
  const preferences: CookiePreferences = { essential: true, analytics, marketing };
  window.localStorage.setItem(COOKIE_PREFERENCES_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: preferences }));
  return preferences;
}

export function trackIfConsented(name: string, properties?: Record<string, string | number | boolean>) {
  if (!readCookiePreferences()?.analytics) return;
  track(name, properties);
}
