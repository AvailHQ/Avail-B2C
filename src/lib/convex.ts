import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

// Configured via VITE_CONVEX_URL (set after `npx convex dev`). When it is not
// set, the site still works — the join call is skipped and the Stripe webhook
// records the payer directly if they check out.
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const client = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export const isConvexConfigured = client !== null;

export interface JoinArgs {
  name: string;
  email: string;
  marketingConsent?: boolean;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  referrer?: string;
}

export interface JoinResult {
  success: boolean;
  error?: string;
  alreadyJoined?: boolean;
  publicWaitlistCount?: number;
}

/** Read the server-owned social-proof count. The browser never derives it. */
export async function getPublicWaitlistCount(): Promise<number | null> {
  if (!client) return null;
  const result = await client.query(api.waitlist.getPublicWaitlistCount, {});
  return result.count;
}

/**
 * Record an early access signup in Convex via the validating action. Returns
 * null when Convex is not configured so callers can fall back to local-only
 * behaviour; otherwise returns the action result (which may carry a validation
 * error to show the user).
 */
export async function joinWaitlist(args: JoinArgs): Promise<JoinResult | null> {
  if (!client) return null;
  return client.action(api.waitlist.submitEarlyAccess, args);
}

export interface ReservationLookup {
  found: boolean;
  status?: 'email_only' | 'pending_payment' | 'paid' | 'refunded';
  name?: string;
  email?: string;
  redemptionCode?: string;
  confirmationEmailSent?: boolean;
}

/**
 * Look up a reservation by its Stripe Checkout Session id for the success page.
 * Returns null when Convex is not configured. The record only appears once the
 * webhook has confirmed the payment, so callers should poll until `found` is
 * true (or give up and show a generic confirmation).
 */
export async function getReservationBySession(
  stripeSessionId: string,
): Promise<ReservationLookup | null> {
  if (!client) return null;
  return client.query(api.waitlist.getBySessionId, { stripeSessionId });
}
