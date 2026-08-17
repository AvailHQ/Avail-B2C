import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Backfill the `duplicatePayments` index for duplicates recorded before that
 * table existed.
 *
 * `markPaid` used to only append an extra charge to
 * `waitlist.duplicatePaymentIntents`, which is not indexable. Refunding such a
 * charge therefore matched no reservation, threw, and left Stripe retrying the
 * delivery. New duplicates are indexed at write time; this fills in the old ones
 * so the same refund works for them too.
 *
 * Idempotent: existing index rows are left alone, so it is safe to re-run.
 */
export const backfillDuplicatePayments = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx: any, args: any) => {
    const reservations = await ctx.db.query("waitlist").take(args.limit ?? 1000);

    let scanned = 0;
    let inserted = 0;

    for (const reservation of reservations) {
      const duplicates: string[] = reservation.duplicatePaymentIntents ?? [];
      for (const stripePaymentIntentId of duplicates) {
        scanned += 1;
        const existing = await ctx.db
          .query("duplicatePayments")
          .withIndex("by_stripePaymentIntentId", (q: any) =>
            q.eq("stripePaymentIntentId", stripePaymentIntentId),
          )
          .unique();
        if (existing !== null) continue;

        await ctx.db.insert("duplicatePayments", {
          stripePaymentIntentId,
          waitlistId: reservation._id,
          recordedAt: reservation.paidAt ?? Date.now(),
        });
        inserted += 1;
      }
    }

    return { scanned, inserted };
  },
});
