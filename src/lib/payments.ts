// The Stripe Payment Link for the one-time GBP 3 paid Founding Waitlist.
// Override per environment with VITE_STRIPE_PAYMENT_LINK; falls back to the
// sandbox test link so the flow is usable in development.
export const STRIPE_PAYMENT_LINK =
  (import.meta.env.VITE_STRIPE_PAYMENT_LINK as string | undefined) ??
  'https://buy.stripe.com/test_bJe5kCbv08qa6RA3Ni6Na00';
