import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Reservation lifecycle for an early access signup.
 *
 * - email_only:      contact captured, no Stripe checkout started yet
 * - pending_payment: user has been sent to Stripe checkout, not confirmed
 * - paid:            Stripe confirmed the GBP 10 reservation
 * - refunded:        a paid reservation was reversed. Reservations are
 *                    non-refundable by policy, so this only covers exceptional
 *                    cases such as Stripe chargebacks / disputes.
 *
 * This supports both the "collect email first" and "straight to Stripe" flows
 * described in the website proposal.
 */
export const reservationStatus = v.union(
  v.literal("email_only"),
  v.literal("pending_payment"),
  v.literal("paid"),
  v.literal("refunded"),
);

export default defineSchema({
  waitlist: defineTable({
    // --- Identity ---
    name: v.string(),
    email: v.string(),

    // --- Reservation / payment status ---
    // Convex provides `_creationTime`, so signup time is not stored separately.
    status: reservationStatus,

    // --- Stripe linkage (filled in by the checkout flow / webhook) ---
    stripeSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    amountPaid: v.optional(v.number()), // minor units, e.g. pence
    currency: v.optional(v.string()), // e.g. "gbp"
    paidAt: v.optional(v.number()),
    refundedAt: v.optional(v.number()),

    // --- Consent / compliance (UK GDPR) ---
    marketingConsent: v.boolean(),
    consentedAt: v.optional(v.number()),
    privacyPolicyVersion: v.optional(v.string()),

    // --- Attribution / analytics ---
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    referrer: v.optional(v.string()), // document.referrer at signup
    landingVariant: v.optional(v.string()), // for future A/B copy tests

    // --- Email lifecycle ---
    confirmationEmailSentAt: v.optional(v.number()),

    // --- Early access redemption ---
    // Issued once payment is confirmed. Each code is fully random with no shared
    // prefix or structure. Not shown to the user yet; redeemed inside the app
    // after launch for the two months of access already paid for.
    redemptionCode: v.optional(v.string()),
    redemptionCodeIssuedAt: v.optional(v.number()),
    redemptionCodeRedeemedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_stripeSessionId", ["stripeSessionId"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
    .index("by_redemptionCode", ["redemptionCode"]),
});
