// Client-side lightweight email check for instant feedback. The authoritative
// check (including MX lookup) runs server-side in the submitEarlyAccess action.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  'dispostable.com',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'grr.la',
  'maildrop.cc',
  'mailinator.com',
  'sharklasers.com',
  'temp-mail.org',
  'tempmail.com',
  'throwawaymail.com',
  'trashmail.com',
  'yopmail.com',
]);

/**
 * Returns an error string when the email is obviously invalid, or null when it
 * passes the quick client-side checks.
 */
export function quickValidateEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!EMAIL_RE.test(trimmed)) {
    return 'Enter a valid email address.';
  }
  const domain = trimmed.split('@')[1] ?? '';
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return 'Please use a permanent email address, not a temporary one.';
  }
  return null;
}
