import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  COOKIE_CONSENT_EVENT,
  readCookiePreferences,
  type CookiePreferences,
} from '../lib/analytics';

export function ConsentAwareAnalytics() {
  const [enabled, setEnabled] = useState(() => Boolean(readCookiePreferences()?.analytics));

  useEffect(() => {
    const handleConsent = (event: Event) => {
      setEnabled(Boolean((event as CustomEvent<CookiePreferences>).detail.analytics));
    };

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsent);
  }, []);

  if (!enabled) return null;

  return (
    <Analytics
      beforeSend={(event) => (readCookiePreferences()?.analytics ? event : null)}
    />
  );
}
