import { describe, expect, it } from "vitest";
import {
  loadStripePaymentPolicy,
  validateCheckoutSession,
  type CheckoutSessionForValidation,
  type StripePaymentPolicy,
} from "../../convex/stripeSecurity";

const policy: StripePaymentPolicy = {
  amount: 350,
  currency: "gbp",
  paymentLinkId: "plink_avail",
  livemode: false,
};

const validSession: CheckoutSessionForValidation = {
  id: "cs_test_avail",
  payment_status: "paid",
  amount_total: 350,
  currency: "gbp",
  payment_link: "plink_avail",
  livemode: false,
};

describe("validateCheckoutSession", () => {
  it("accepts only the configured Avail sandbox purchase", () => {
    expect(validateCheckoutSession(validSession, policy)).toEqual({ ok: true });
  });

  it.each([
    ["missing_session_id", { id: undefined }],
    ["payment_not_paid", { payment_status: "unpaid" }],
    ["wrong_amount", { amount_total: 1 }],
    ["wrong_currency", { currency: "usd" }],
    ["wrong_payment_link", { payment_link: "plink_other" }],
    ["wrong_environment", { livemode: true }],
  ] as const)("rejects %s", (reason, patch) => {
    expect(validateCheckoutSession({ ...validSession, ...patch }, policy)).toEqual({
      ok: false,
      reason,
    });
  });

  it("accepts an expanded Payment Link object and normalizes currency case", () => {
    expect(
      validateCheckoutSession(
        { ...validSession, currency: "GBP", payment_link: { id: "plink_avail" } },
        policy,
      ),
    ).toEqual({ ok: true });
  });
});

describe("loadStripePaymentPolicy", () => {
  it("loads the fixed GBP 3.50 policy with an explicit environment", () => {
    expect(
      loadStripePaymentPolicy({
        STRIPE_PAYMENT_LINK_ID: " plink_avail ",
        STRIPE_EXPECTED_LIVEMODE: "FALSE",
      }),
    ).toEqual(policy);
  });

  it("fails closed when security configuration is absent or invalid", () => {
    expect(() => loadStripePaymentPolicy({})).toThrow("STRIPE_PAYMENT_LINK_ID");
    expect(() =>
      loadStripePaymentPolicy({
        STRIPE_PAYMENT_LINK_ID: "plink_avail",
        STRIPE_EXPECTED_LIVEMODE: "maybe",
      }),
    ).toThrow("STRIPE_EXPECTED_LIVEMODE");
  });
});
