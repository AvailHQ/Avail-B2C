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

/**
 * Record an early access signup in Convex. Returns null when Convex is not
 * configured so callers can fall back to their local-only behaviour.
 */
export async function joinWaitlist(args: JoinArgs) {
  if (!client) return null;
  return client.mutation(api.waitlist.join, args);
}
