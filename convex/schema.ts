import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Reservation lifecycle for an early access signup.
 *
 * - email_only:      contact captured, no Stripe checkout started yet
 * - pending_payment: user has been sent to Stripe checkout, not confirmed
 * - paid:            Stripe confirmed the GBP 3 reservation
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
    // Total refunded so far, in minor units. Policy is that any refund revokes
    // the reservation, so this is recorded for visibility (e.g. spotting a
    // partial refund) rather than to decide the status.
    amountRefunded: v.optional(v.number()),

    // Extra PaymentIntents seen for an already-paid reservation. Policy is one
    // reservation per email, so a genuine second payment is recorded here (not
    // silently dropped and not granted a second code) for manual refund.
    duplicatePaymentIntents: v.optional(v.array(v.string())),

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
    confirmationEmailAttempts: v.optional(v.number()),
    confirmationEmailLastAttemptAt: v.optional(v.number()),

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

  /**
   * Server-owned public counters. The founding-athlete count is initialized
   * lazily from its launch baseline and updated in the same transaction as a
   * new waitlist insert, so browser state can never inflate it.
   */
  publicCounters: defineTable({
    key: v.string(),
    value: v.number(),
  }).index("by_key", ["key"]),

  /**
   * Processed Stripe webhook events, keyed by the top-level `event.id`. The
   * webhook claims an event here inside the same transaction as its business
   * mutation, so a redelivered or concurrent duplicate of the same event is a
   * no-op (Convex serializes the conflicting writes). If the business mutation
   * throws, the whole transaction — including this claim — rolls back, so the
   * event can be retried.
   */
  stripeEvents: defineTable({
    eventId: v.string(),
    type: v.string(),
    processedAt: v.number(),
  }).index("by_eventId", ["eventId"]),

  /**
   * Extra PaymentIntents charged against an already-paid reservation, indexed so
   * a refund of one can be matched. Policy is one reservation per email, so the
   * operator is expected to refund these manually — without this index the
   * refund event would match no reservation and the webhook would fail and be
   * retried forever.
   */
  duplicatePayments: defineTable({
    stripePaymentIntentId: v.string(),
    waitlistId: v.id("waitlist"),
    recordedAt: v.number(),
  }).index("by_stripePaymentIntentId", ["stripePaymentIntentId"]),

  /**
   * Fixed-window counters protecting expensive public actions (ABUSE-05).
   * `key` identifies the bucket (e.g. one email, or the global signup bucket);
   * the window resets once `windowStart` is older than the configured window.
   */
  rateLimits: defineTable({
    key: v.string(),
    windowStart: v.number(),
    count: v.number(),
  })
    .index("by_key", ["key"])
    // Supports the scheduled cleanup that stops this table growing without
    // bound (one row per distinct email would otherwise persist forever).
    .index("by_windowStart", ["windowStart"]),
});
