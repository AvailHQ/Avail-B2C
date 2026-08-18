import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../convex/_generated/api';

// Configured via VITE_CONVEX_URL (set after `npx convex dev`). When it is not
// set, the site still works — the join call is skipped and the Stripe webhook
// records the payer directly if they check out.
const convexUrl = import.meta.env.VITE_CONVEX_URL as string | undefined;
const client = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export const isConvexConfigured = client !== null;

export interface ReservationLookup {
  found: boolean;
  status?: 'email_only' | 'pending_payment' | 'paid' | 'refunded';
  name?: string;
  email?: string;
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
