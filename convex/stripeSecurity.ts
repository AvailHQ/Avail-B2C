export interface CheckoutSessionForValidation {
  id?: unknown;
  payment_status?: unknown;
  amount_total?: unknown;
  currency?: unknown;
  payment_link?: unknown;
  livemode?: unknown;
}

export interface StripePaymentPolicy {
  amount: number;
  currency: string;
  paymentLinkId: string;
  livemode: boolean;
}

export type CheckoutValidationResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "missing_session_id"
        | "payment_not_paid"
        | "wrong_amount"
        | "wrong_currency"
        | "wrong_payment_link"
        | "wrong_environment";
    };

export function loadStripePaymentPolicy(
  env: Record<string, string | undefined>,
): StripePaymentPolicy {
  const paymentLinkId = env.STRIPE_PAYMENT_LINK_ID?.trim();
  const livemodeValue = env.STRIPE_EXPECTED_LIVEMODE?.trim().toLowerCase();
  if (!paymentLinkId) {
    throw new Error("STRIPE_PAYMENT_LINK_ID is not configured");
  }
  if (livemodeValue !== "true" && livemodeValue !== "false") {
    throw new Error("STRIPE_EXPECTED_LIVEMODE must be true or false");
  }

  return {
    amount: 500,
    currency: "usd",
    paymentLinkId,
    livemode: livemodeValue === "true",
  };
}

/** Enforce Avail's server-side entitlement policy for a Checkout Session. */
export function validateCheckoutSession(
  session: CheckoutSessionForValidation,
  policy: StripePaymentPolicy,
): CheckoutValidationResult {
  if (typeof session.id !== "string" || session.id.length === 0) {
    return { ok: false, reason: "missing_session_id" };
  }
  if (session.payment_status !== "paid") {
    return { ok: false, reason: "payment_not_paid" };
  }
  if (session.amount_total !== policy.amount) {
    return { ok: false, reason: "wrong_amount" };
  }
  if (
    typeof session.currency !== "string" ||
    session.currency.toLowerCase() !== policy.currency
  ) {
    return { ok: false, reason: "wrong_currency" };
  }
  const paymentLinkId =
    typeof session.payment_link === "string"
      ? session.payment_link
      : session.payment_link &&
          typeof session.payment_link === "object" &&
          "id" in session.payment_link &&
          typeof session.payment_link.id === "string"
        ? session.payment_link.id
        : undefined;
  if (paymentLinkId !== policy.paymentLinkId) {
    return { ok: false, reason: "wrong_payment_link" };
  }
  if (session.livemode !== policy.livemode) {
    return { ok: false, reason: "wrong_environment" };
  }
  return { ok: true };
}
