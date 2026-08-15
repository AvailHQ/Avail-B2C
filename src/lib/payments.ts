// The Stripe Payment Link for the one-time GBP 10 early access reservation.
// Override per environment with VITE_STRIPE_PAYMENT_LINK; falls back to the
// sandbox test link so the flow is usable in development.
export const STRIPE_PAYMENT_LINK =
  (import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined) ??
  'https://buy.stripe.com/test_bJe5kCbv08qa6RA3Ni6Na00';

/**
 * Build the checkout URL for a given email, prefilling it on the Stripe page so
 * the payer's email matches the record captured on the site — this is what the
 * webhook uses to reconcile the payment.
 */
export function paymentLinkForEmail(email: string): string {
  try {
    const url = new URL(STRIPE_PAYMENT_LINK);
    if (email) url.searchParams.set('prefilled_email', email);
    return url.toString();
  } catch {
    return STRIPE_PAYMENT_LINK;
  }
}
