import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Unambiguous alphabet (no 0/O/1/I) so codes are easy to read out if ever needed.
const REDEMPTION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REDEMPTION_CODE_LENGTH = 16;

/**
 * Generate a fully random redemption code with no shared prefix or structure,
 * checking the index so it is unique across all issued codes.
 *
 * Note: this uses Math.random(), which is not cryptographically strong. For a
 * value-bearing code at larger scale, generate it with crypto in the webhook
 * HTTP action and pass it in instead.
 */
async function generateUniqueRedemptionCode(ctx: any): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < REDEMPTION_CODE_LENGTH; i++) {
      code += REDEMPTION_ALPHABET[Math.floor(Math.random() * REDEMPTION_ALPHABET.length)];
    }

    const dup = await ctx.db
      .query("waitlist")
      .withIndex("by_redemptionCode", (q: any) => q.eq("redemptionCode", code))
      .unique();

    if (dup === null) {
      return code;
    }
  }

  throw new Error("Could not generate a unique redemption code after 10 attempts");
}

/**
 * Join the early access list, or return the user details if they have already joined.
 *
 * A new signup starts in the `email_only` status. The Stripe checkout flow later
 * moves it to `pending_payment` / `paid` via the mutations below.
 */
export const join = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    marketingConsent: v.optional(v.boolean()),
    privacyPolicyVersion: v.optional(v.string()),
    // Attribution captured from the landing page (all optional).
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    referrer: v.optional(v.string()),
    landingVariant: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();
    const marketingConsent = args.marketingConsent === true;

    // Check if email already exists
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .unique();

    if (existing !== null) {
      return {
        success: true,
        alreadyJoined: true,
        user: existing,
      };
    }

    const userId = await ctx.db.insert("waitlist", {
      name,
      email,
      status: "email_only",
      marketingConsent,
      consentedAt: marketingConsent ? Date.now() : undefined,
      privacyPolicyVersion: args.privacyPolicyVersion,
      utmSource: args.utmSource,
      utmMedium: args.utmMedium,
      utmCampaign: args.utmCampaign,
      referrer: args.referrer,
      landingVariant: args.landingVariant,
    });

    const newUser = await ctx.db.get(userId);

    return {
      success: true,
      alreadyJoined: false,
      user: newUser,
    };
  },
});

/**
 * Mark that a user has been sent to Stripe checkout.
 * Stores the Checkout Session id so the webhook can reconcile the payment later.
 *
 * Internal: only server code may call this. It changes payment state, so it must
 * never be callable directly from the browser.
 */
export const markPendingPayment = internalMutation({
  args: {
    email: v.string(),
    stripeSessionId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .unique();

    if (user === null) {
      return { success: false, reason: "not_found" };
    }

    await ctx.db.patch(user._id, {
      status: "pending_payment",
      stripeSessionId: args.stripeSessionId,
    });
    return { success: true };
  },
});

/**
 * Confirm a paid reservation. Called from the Stripe webhook on
 * checkout.session.completed.
 *
 * With a Stripe Payment Link there is no server step before payment, so the
 * record is matched first by Checkout Session id (custom-checkout flow) and then
 * by email (Payment Link flow). If the payer has no matching record at all, a
 * new paid record is created so a paying customer is never dropped.
 *
 * Internal: only server code may call this — it is what issues the redemption
 * code, so it must never be reachable from the browser.
 */
export const markPaid = internalMutation({
  args: {
    stripeSessionId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    amountPaid: v.optional(v.number()),
    currency: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const email = args.email ? args.email.trim().toLowerCase() : undefined;

    // 1. Match by Checkout Session id (custom-checkout flow set it beforehand).
    let user = await ctx.db
      .query("waitlist")
      .withIndex("by_stripeSessionId", (q: any) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .unique();

    // 2. Otherwise match by email (Payment Link flow).
    if (user === null && email) {
      user = await ctx.db
        .query("waitlist")
        .withIndex("by_email", (q: any) => q.eq("email", email))
        .unique();
    }

    const paymentFields = {
      status: "paid",
      stripeSessionId: args.stripeSessionId,
      stripePaymentIntentId: args.stripePaymentIntentId,
      stripeCustomerId: args.stripeCustomerId,
      amountPaid: args.amountPaid,
      currency: args.currency,
      paidAt: Date.now(),
    };

    // 3. Paid without any matching record: create one so we don't drop a payer.
    if (user === null) {
      if (!email) {
        return { success: false, reason: "no_match_no_email" };
      }
      const redemptionCode = await generateUniqueRedemptionCode(ctx);
      await ctx.db.insert("waitlist", {
        name: args.name?.trim() || email.split("@")[0],
        email,
        ...paymentFields,
        marketingConsent: false,
        redemptionCode,
        redemptionCodeIssuedAt: Date.now(),
      });
      return { success: true, created: true };
    }

    // Idempotent: a webhook may be delivered more than once. Return early so we
    // do not overwrite the timestamp or issue a second redemption code.
    if (user.status === "paid") {
      return { success: true, alreadyPaid: true };
    }

    // Issue the early access redemption code now that payment is confirmed.
    const redemptionCode = user.redemptionCode ?? (await generateUniqueRedemptionCode(ctx));

    await ctx.db.patch(user._id, {
      ...paymentFields,
      redemptionCode,
      redemptionCodeIssuedAt: user.redemptionCodeIssuedAt ?? Date.now(),
    });
    return { success: true };
  },
});

/**
 * Mark a paid reservation as refunded. Reservations are non-refundable by
 * policy, so this is only for exceptional cases (Stripe chargebacks / disputes).
 *
 * Refund events carry the PaymentIntent id (charge.refunded), so the record is
 * matched by PaymentIntent first, then by Checkout Session id as a fallback.
 *
 * Internal: only server code may call this.
 */
export const markRefunded = internalMutation({
  args: {
    stripePaymentIntentId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    let user = null;

    if (args.stripePaymentIntentId) {
      user = await ctx.db
        .query("waitlist")
        .withIndex("by_stripePaymentIntentId", (q: any) =>
          q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
        )
        .unique();
    }

    if (user === null && args.stripeSessionId) {
      user = await ctx.db
        .query("waitlist")
        .withIndex("by_stripeSessionId", (q: any) =>
          q.eq("stripeSessionId", args.stripeSessionId),
        )
        .unique();
    }

    if (user === null) {
      return { success: false, reason: "not_found" };
    }

    await ctx.db.patch(user._id, {
      status: "refunded",
      refundedAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Record that the confirmation email has been sent (avoids double-sending).
 *
 * Internal: only server code may call this.
 */
export const markConfirmationEmailSent = internalMutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .unique();

    if (user === null) {
      return { success: false, reason: "not_found" };
    }

    await ctx.db.patch(user._id, {
      confirmationEmailSentAt: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Check the registration status of an existing user by email.
 */
export const checkPosition = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q: any) => q.eq("email", email))
      .unique();

    if (user === null) {
      return { found: false };
    }

    return {
      found: true,
      user,
    };
  },
});

/**
 * Reservation funnel stats: total signups plus a breakdown by status and
 * total amount reserved (in minor units, e.g. pence).
 */
export const getStats = query({
  args: {},
  handler: async (ctx: any) => {
    const all = await ctx.db.query("waitlist").collect();

    const byStatus = {
      email_only: 0,
      pending_payment: 0,
      paid: 0,
      refunded: 0,
    };
    let amountReserved = 0;

    for (const user of all) {
      if (user.status in byStatus) {
        byStatus[user.status as keyof typeof byStatus] += 1;
      }
      if (user.status === "paid") {
        amountReserved += user.amountPaid ?? 0;
      }
    }

    return {
      totalSignups: all.length,
      byStatus,
      amountReserved,
    };
  },
});
