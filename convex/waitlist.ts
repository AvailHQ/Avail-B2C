import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { validateEmail } from "./emailValidation";
import { sendEmail, welcomeEmail } from "./email";
import { isValidRedemptionCode } from "./redemptionCode";

/**
 * Select the first secure candidate not already present in the database. The
 * candidates are generated with Web Crypto by the webhook HTTP action because
 * Convex mutations must remain deterministic.
 */
async function selectUniqueRedemptionCode(ctx: any, candidates: string[]): Promise<string> {
  for (const code of candidates) {
    if (!isValidRedemptionCode(code)) continue;
    const dup = await ctx.db
      .query("waitlist")
      .withIndex("by_redemptionCode", (q: any) => q.eq("redemptionCode", code))
      .unique();

    if (dup === null) {
      return code;
    }
  }

  throw new Error("No valid unique redemption code candidate was provided");
}

/**
 * Public entry point for the signup form. Validates the email (format,
 * disposable domains, MX) in an action — which can do network I/O — then writes
 * the record and sends the welcome email. Returns a validation error instead of
 * writing when the email looks fake.
 */
export const submitEarlyAccess = action({
  args: {
    name: v.string(),
    email: v.string(),
    marketingConsent: v.optional(v.boolean()),
    privacyPolicyVersion: v.optional(v.string()),
    utmSource: v.optional(v.string()),
    utmMedium: v.optional(v.string()),
    utmCampaign: v.optional(v.string()),
    referrer: v.optional(v.string()),
    landingVariant: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any): Promise<any> => {
    const error = await validateEmail(args.email);
    if (error) {
      return { success: false, error };
    }

    const result = await ctx.runMutation(internal.waitlist.join, args);

    // Best-effort welcome email for brand-new signups only.
    if (result?.user && !result.alreadyJoined) {
      const firstName = String(result.user.name || "").split(" ")[0] || "there";
      const { subject, html } = welcomeEmail(firstName);
      await sendEmail({ to: result.user.email, subject, html });
    }

    return result;
  },
});

/**
 * Write an early access signup. Internal: reached only through
 * `submitEarlyAccess`, which validates the email first.
 *
 * A new signup starts in the `email_only` status. The Stripe checkout flow later
 * moves it to `pending_payment` / `paid` via the mutations below.
 */
export const join = internalMutation({
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
    redemptionCodeCandidates: v.array(v.string()),
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
      const redemptionCode = await selectUniqueRedemptionCode(
        ctx,
        args.redemptionCodeCandidates,
      );
      const name = args.name?.trim() || email.split("@")[0];
      await ctx.db.insert("waitlist", {
        name,
        email,
        ...paymentFields,
        marketingConsent: false,
        redemptionCode,
        redemptionCodeIssuedAt: Date.now(),
      });
      return { success: true, newlyPaid: true, email, name };
    }

    // Idempotent: a webhook may be delivered more than once. Return early so we
    // do not overwrite the timestamp or issue a second redemption code.
    if (user.status === "paid") {
      return { success: true, alreadyPaid: true };
    }

    // Issue the early access redemption code now that payment is confirmed.
    const redemptionCode =
      user.redemptionCode ??
      (await selectUniqueRedemptionCode(ctx, args.redemptionCodeCandidates));

    await ctx.db.patch(user._id, {
      ...paymentFields,
      redemptionCode,
      redemptionCodeIssuedAt: user.redemptionCodeIssuedAt ?? Date.now(),
    });
    return { success: true, newlyPaid: true, email: user.email, name: user.name };
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
      // This is a public query, so return only the minimum non-sensitive
      // information needed for a status check. Never expose the underlying
      // record, which contains Stripe identifiers, attribution data and a
      // redemption code.
      status: user.status,
    };
  },
});

/**
 * Look up a reservation by its Stripe Checkout Session id, for the post-payment
 * success page. Stripe appends `?session_id={CHECKOUT_SESSION_ID}` when it
 * redirects the payer back, so the session id acts as an unguessable capability
 * that only the payer holds.
 *
 * The webhook sets `stripeSessionId` when it confirms the payment, so a record
 * is only returned once payment has been processed. The redemption code is
 * revealed only when the reservation is actually `paid`.
 */
export const getBySessionId = query({
  args: {
    stripeSessionId: v.string(),
  },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db
      .query("waitlist")
      .withIndex("by_stripeSessionId", (q: any) =>
        q.eq("stripeSessionId", args.stripeSessionId),
      )
      .unique();

    if (user === null) {
      return { found: false };
    }

    return {
      found: true,
      status: user.status,
      name: user.name,
      email: user.email,
      redemptionCode: user.status === "paid" ? user.redemptionCode : undefined,
      confirmationEmailSent:
        user.status === "paid" && user.confirmationEmailSentAt !== undefined,
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
