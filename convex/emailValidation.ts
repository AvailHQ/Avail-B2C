// Lightweight email validation to keep obviously fake addresses out of the
// early access list. This is NOT ownership verification (no double opt-in) —
// it checks that the address is well-formed, is not a known disposable/temp
// domain, and that the domain can actually receive mail.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Common disposable / throwaway email domains. Not exhaustive, but blocks the
// providers people reach for when farming signups.
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '20minutemail.com',
  'dispostable.com',
  'fakeinbox.com',
  'getairmail.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.info',
  'grr.la',
  'inboxbear.com',
  'maildrop.cc',
  'maildrop.io',
  'mailinator.com',
  'mintemail.com',
  'moakt.com',
  'mohmal.com',
  'mytemp.email',
  'sharklasers.com',
  'spam4.me',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.dev',
  'tempmailo.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
  'yopmail.net',
  'emailondeck.com',
  'fakemail.net',
  'discard.email',
  'mailnesia.com',
  'nada.email',
]);

export function emailDomain(email: string): string {
  return email.trim().toLowerCase().split('@')[1] ?? '';
}

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isDisposableDomain(email: string): boolean {
  return DISPOSABLE_DOMAINS.has(emailDomain(email));
}

// Upper bound for each DNS-over-HTTPS lookup. Without it a slow resolver would
// hold the signup action open indefinitely (ABUSE-04).
export const DNS_LOOKUP_TIMEOUT_MS = 3000;

/**
 * Check that the domain can receive mail, via DNS-over-HTTPS. Rejects only when
 * the domain clearly does not exist or has no MX and no A record. Any network
 * error — including the lookup timing out — fails open (returns true) so a DNS
 * hiccup never blocks a real user.
 */
export async function domainCanReceiveMail(domain: string): Promise<boolean> {
  const query = async (type: 'MX' | 'A') => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DNS_LOOKUP_TIMEOUT_MS);
    try {
      const res = await fetch(
        `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
        { headers: { accept: 'application/dns-json' }, signal: controller.signal },
      );
      if (!res.ok) return null;
      return (await res.json()) as { Status: number; Answer?: { type: number }[] };
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const mx = await query('MX');
    if (mx === null) return true; // fail open
    if (mx.Status === 3) return false; // NXDOMAIN — domain does not exist
    if (mx.Answer?.some((a) => a.type === 15)) return true; // has MX records

    // No MX: mail can still be delivered to an A record (RFC 5321 fallback).
    const a = await query('A');
    if (a === null) return true;
    if (a.Status === 3) return false;
    return Boolean(a.Answer?.some((ans) => ans.type === 1));
  } catch {
    return true; // fail open on any network/parse error
  }
}

/**
 * Full server-side validation. Returns an error string when the email should be
 * rejected, or null when it passes.
 */
export async function validateEmail(email: string): Promise<string | null> {
  const trimmed = email.trim().toLowerCase();
  if (!isValidEmailFormat(trimmed)) {
    return 'Please enter a valid email address.';
  }
  if (isDisposableDomain(trimmed)) {
    return 'Please use a permanent email address, not a temporary one.';
  }
  if (!(await domainCanReceiveMail(emailDomain(trimmed)))) {
    return "That email domain can't receive mail. Please check the spelling.";
  }
  return null;
}
