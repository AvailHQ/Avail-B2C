import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { validateEmail } from "./emailValidation";
import { sendEmail, welcomeEmail } from "./email";
import { validateInputSizes } from "./inputLimits";
import {
  GLOBAL_SIGNUP_KEY,
  SIGNUP_EMAIL_LIMIT,
  SIGNUP_GLOBAL_LIMIT,
  emailSignupKey,
} from "./rateLimit";

const FOUNDING_ATHLETES_COUNTER_KEY = "foundingAthletes";
const FOUNDING_ATHLETES_BASELINE = 347;

async function getFoundingAthletesCount(ctx: any): Promise<number> {
  const counter = await ctx.db
    .query("publicCounters")
    .withIndex("by_key", (q: any) => q.eq("key", FOUNDING_ATHLETES_COUNTER_KEY))
    .unique();
  return counter?.value ?? FOUNDING_ATHLETES_BASELINE;
}

async function incrementFoundingAthletesCount(ctx: any): Promise<number> {
  const counter = await ctx.db
    .query("publicCounters")
    .withIndex("by_key", (q: any) => q.eq("key", FOUNDING_ATHLETES_COUNTER_KEY))
    .unique();

  const value = (counter?.value ?? FOUNDING_ATHLETES_BASELINE) + 1;
  if (counter === null) {
    await ctx.db.insert("publicCounters", {
      key: FOUNDING_ATHLETES_COUNTER_KEY,
      value,
    });
  } else {
    await ctx.db.patch(counter._id, { value });
  }
  return value;
}

/** Public, read-only social-proof value. No waitlist records are exposed. */
export const getPublicWaitlistCount = query({
  args: {},
  handler: async (ctx: any) => ({ count: await getFoundingAthletesCount(ctx) }),
});

/**
 * Claim a Stripe event id inside the current transaction. Returns true the first
 * time an event is seen (caller should process it) and false if it was already
 * processed (caller treats it as a no-op). Because the claim happens in the same
 * mutation as the business write, Convex's serializable execution makes repeated
 * or concurrent deliveries of the same event idempotent; and if the business
 * write later throws, this claim rolls back with it so the event can be retried.
 */
async function claimStripeEvent(ctx: any, eventId: string, type: string): Promise<boolean> {
  const existing = await ctx.db
    .query("stripeEvents")
    .withIndex("by_eventId", (q: any) => q.eq("eventId", eventId))
    .unique();
  if (existing !== null) {
    return false;
  }
  await ctx.db.insert("stripeEvents", { eventId, type, processedAt: Date.now() });
  return true;
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
    // 1. Size limits first: cheapest check, no database or network work.
    const sizeError = validateInputSizes(args);
    if (sizeError) {
      return { success: false, error: sizeError };
    }

    // 2. Rate limits before the DNS lookup and the email send, so burst traffic
    //    cannot amplify those (ABUSE-05). Global bucket first: it is the one
    //    protecting spend, and it must not be bypassable by varying the email.
    for (const bucket of [
      { key: GLOBAL_SIGNUP_KEY, ...SIGNUP_GLOBAL_LIMIT },
      { key: await emailSignupKey(args.email), ...SIGNUP_EMAIL_LIMIT },
    ]) {
      const limit = await ctx.runMutation(internal.rateLimit.consume, bucket);
      if (!limit.allowed) {
        return {
          success: false,
          rateLimited: true,
          error: "Too many attempts just now. Please try again in a few minutes.",
        };
      }
    }

    // 3. Network validation (bounded by DNS_LOOKUP_TIMEOUT_MS).
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
        publicWaitlistCount: await getFoundingAthletesCount(ctx),
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
    const publicWaitlistCount = await incrementFoundingAthletesCount(ctx);

    return {
      success: true,
      alreadyJoined: false,
      user: newUser,
      publicWaitlistCount,
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
 * Internal: only server code may call this because it grants paid status.
 */
export const markPaid = internalMutation({
  args: {
    eventId: v.string(),
    stripeSessionId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    amountPaid: v.optional(v.number()),
    currency: v.optional(v.string()),
    // Retained temporarily as an optional compatibility input for older tests
    // and queued calls. New £5 reservations do not issue redemption codes.
    redemptionCodeCandidates: v.optional(v.array(v.string())),
  },
  handler: async (ctx: any, args: any) => {
    // Idempotency: process each Stripe event at most once (covers redelivery and
    // concurrent delivery of the same event). Claimed atomically with the writes
    // below, so a throw later rolls the claim back and allows a retry.
    const firstDelivery = await claimStripeEvent(
      ctx,
      args.eventId,
      "checkout.session.completed",
    );
    if (!firstDelivery) {
      return { success: true, deduped: true };
    }

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
      const name = args.name?.trim() || email.split("@")[0];
      const userId = await ctx.db.insert("waitlist", {
        name,
        email,
        ...paymentFields,
        marketingConsent: false,
      });
      await ctx.scheduler.runAfter(0, internal.paymentEmail.sendPaymentConfirmation, {
        waitlistId: userId,
        attempt: 1,
      });
      return { success: true, newlyPaid: true, email, name };
    }

    // A late or duplicate completion event must never restore a reservation that
    // has since been refunded (would silently re-grant the entitlement).
    if (user.status === "refunded") {
      console.warn(`Ignoring paid event for refunded reservation ${user._id}`);
      return { success: true, alreadyRefunded: true };
    }

    // Already paid. Policy is one reservation per email, so a genuinely separate
    // second payment (a different Checkout Session, not a webhook retry) is
    // recorded for manual refund rather than issuing a second code.
    if (user.status === "paid") {
      const isSamePayment = user.stripeSessionId === args.stripeSessionId;
      if (!isSamePayment && args.stripePaymentIntentId) {
        const dupes = user.duplicatePaymentIntents ?? [];
        if (!dupes.includes(args.stripePaymentIntentId)) {
          await ctx.db.patch(user._id, {
            duplicatePaymentIntents: [...dupes, args.stripePaymentIntentId],
          });
          // Indexed so a later refund of this extra charge can be matched.
          await ctx.db.insert("duplicatePayments", {
            stripePaymentIntentId: args.stripePaymentIntentId,
            waitlistId: user._id,
            recordedAt: Date.now(),
          });
          console.warn(
            `Duplicate payment for already-paid reservation ${user._id}: ${args.stripePaymentIntentId}`,
          );
          return { success: true, alreadyPaid: true, duplicatePayment: true };
        }
      }
      return { success: true, alreadyPaid: true };
    }

    await ctx.db.patch(user._id, {
      ...paymentFields,
    });
    await ctx.scheduler.runAfter(0, internal.paymentEmail.sendPaymentConfirmation, {
      waitlistId: user._id,
      attempt: 1,
    });
    return { success: true, newlyPaid: true, email: user.email, name: user.name };
  },
});

export const getPaymentEmailRecipient = internalQuery({
  args: { waitlistId: v.id("waitlist") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.waitlistId);
    if (user === null || user.status !== "paid" || user.confirmationEmailSentAt) {
      return null;
    }
    return { email: user.email, name: user.name };
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
    eventId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    stripeSessionId: v.optional(v.string()),
    amountRefunded: v.optional(v.number()),
    chargeAmount: v.optional(v.number()),
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
      // Refund of a known duplicate charge. Policy is one reservation per email,
      // so the operator is expected to refund these; the reservation itself was
      // paid by a different PaymentIntent and must keep its entitlement.
      const duplicate = await ctx.db
        .query("duplicatePayments")
        .withIndex("by_stripePaymentIntentId", (q: any) =>
          q.eq("stripePaymentIntentId", args.stripePaymentIntentId),
        )
        .unique();
      if (duplicate !== null) {
        await claimStripeEvent(ctx, args.eventId, "charge.refunded");
        return { success: true, duplicateRefund: true };
      }

      // Do not claim the event: the payment write may be temporarily lagging
      // behind Stripe's refund event. Throwing makes the webhook return 500 so
      // Stripe retries once the matching reservation exists.
      throw new Error("Refunded payment was not found; retry the Stripe event");
    }

    // Claim only after a matching reservation exists. This keeps an early
    // refund delivery retryable while retaining atomic deduplication.
    const firstDelivery = await claimStripeEvent(ctx, args.eventId, "charge.refunded");
    if (!firstDelivery) {
      return { success: true, deduped: true };
    }

    // A distinct second refund event for the same reservation must not overwrite
    // the original refund timestamp. The refunded total still has to advance
    // though: Stripe's `amount_refunded` is cumulative per charge, so a second
    // partial refund would otherwise leave a stale (too low) figure on record.
    // Take the maximum so out-of-order deliveries cannot walk it backwards.
    if (user.status === "refunded") {
      const knownRefunded = user.amountRefunded ?? 0;
      if (typeof args.amountRefunded === "number" && args.amountRefunded > knownRefunded) {
        await ctx.db.patch(user._id, { amountRefunded: args.amountRefunded });
      }
      return { success: true, alreadyRefunded: true };
    }

    // Policy (REF-03): any refund revokes the reservation, partial included.
    // A partial refund is unusual here (fixed GBP 10 product), so log it — the
    // amount is recorded either way for follow-up.
    const isPartial =
      typeof args.amountRefunded === "number" &&
      typeof args.chargeAmount === "number" &&
      args.amountRefunded > 0 &&
      args.amountRefunded < args.chargeAmount;
    if (isPartial) {
      console.warn(
        `Partial refund revokes reservation ${user._id}: ${args.amountRefunded}/${args.chargeAmount}`,
      );
    }

    await ctx.db.patch(user._id, {
      status: "refunded",
      refundedAt: Date.now(),
      amountRefunded: args.amountRefunded,
    });
    return { success: true, partialRefund: isPartial };
  },
});

/**
 * Record that the confirmation email has been sent (avoids double-sending).
 *
 * Internal: only server code may call this.
 */
export const markConfirmationEmailSent = internalMutation({
  args: {
    waitlistId: v.id("waitlist"),
    attempt: v.number(),
    sent: v.boolean(),
  },
  handler: async (ctx: any, args: any) => {
    const user = await ctx.db.get(args.waitlistId);
    if (user === null) {
      return { success: false, reason: "not_found" };
    }

    await ctx.db.patch(user._id, {
      confirmationEmailAttempts: args.attempt,
      confirmationEmailLastAttemptAt: Date.now(),
      confirmationEmailSentAt: args.sent
        ? (user.confirmationEmailSentAt ?? Date.now())
        : user.confirmationEmailSentAt,
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
      confirmationEmailSent:
        user.status === "paid" && user.confirmationEmailSentAt !== undefined,
    };
  },
});

/**
 * Reservation funnel stats: total signups plus a breakdown by status and
 * total amount reserved (in minor units, e.g. pence).
 *
 * Internal (DATA-06): signup counts and revenue are business data, so this must
 * not be callable from the browser. Expose it through an authenticated admin
 * surface if it is ever needed in the product.
 */
export const getStats = internalQuery({
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
