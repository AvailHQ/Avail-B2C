/**
 * Size limits for the public signup payload (ABUSE-03).
 *
 * These are checked before any expensive work — no database reads, no DNS/MX
 * lookup, no email — so an oversized request is rejected cheaply.
 */

// RFC 5321 caps an address at 254 characters; the rest are product limits.
export const INPUT_LIMITS = {
  name: 100,
  email: 254,
  utmSource: 200,
  utmMedium: 200,
  utmCampaign: 200,
  referrer: 500,
  landingVariant: 100,
  privacyPolicyVersion: 50,
} as const;

export interface SignupInput {
  name?: unknown;
  email?: unknown;
  utmSource?: unknown;
  utmMedium?: unknown;
  utmCampaign?: unknown;
  referrer?: unknown;
  landingVariant?: unknown;
  privacyPolicyVersion?: unknown;
}

/**
 * Returns an error message when the payload is unacceptable, or null when it is
 * within limits. The message for attribution fields is deliberately generic:
 * those are not user-entered, so there is nothing useful to tell the visitor.
 */
export function validateInputSizes(input: SignupInput): string | null {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length === 0) {
    return "Please enter your name.";
  }
  if (name.length > INPUT_LIMITS.name) {
    return `Please use a name of ${INPUT_LIMITS.name} characters or fewer.`;
  }

  const email = typeof input.email === "string" ? input.email.trim() : "";
  if (email.length === 0) {
    return "Please enter a valid email address.";
  }
  if (email.length > INPUT_LIMITS.email) {
    return "Please enter a valid email address.";
  }

  const optionalFields = [
    "utmSource",
    "utmMedium",
    "utmCampaign",
    "referrer",
    "landingVariant",
    "privacyPolicyVersion",
  ] as const;

  for (const field of optionalFields) {
    const value = input[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" || value.length > INPUT_LIMITS[field]) {
      return "That request could not be processed.";
    }
  }

  return null;
}
