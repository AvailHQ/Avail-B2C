import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

/** Reservations scanned per transaction; the job reschedules itself until done. */
export const BACKFILL_BATCH_SIZE = 200;

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
 * Walks the whole table in creation order, one batch per transaction, so it does
 * not silently stop at an arbitrary cap once the table grows. Idempotent:
 * existing index rows are left alone, so it is safe to re-run.
 */
export const backfillDuplicatePayments = internalMutation({
  args: {
    // Exclusive `_creationTime` to resume after; omit to start from the top.
    after: v.optional(v.number()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx: any, args: any) => {
    const batchSize = args.batchSize ?? BACKFILL_BATCH_SIZE;
    const reservations = await ctx.db
      .query("waitlist")
      .withIndex("by_creation_time", (q: any) =>
        args.after === undefined ? q : q.gt("_creationTime", args.after),
      )
      .order("asc")
      .take(batchSize);

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

    // A full batch means there may be more reservations after this one.
    const continued = reservations.length === batchSize;
    if (continued) {
      await ctx.scheduler.runAfter(0, internal.migrations.backfillDuplicatePayments, {
        after: reservations[reservations.length - 1]._creationTime,
        batchSize,
      });
    }

    return { scanned, inserted, continued };
  },
});
