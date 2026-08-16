import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

/**
 * Abuse controls for the public signup action (ABUSE-05).
 *
 * Convex actions do not expose a client IP, so the buckets are:
 *  - per normalized email — stops one address hammering DNS/email work;
 *  - global — caps how much DNS and Resend work anonymous traffic can trigger
 *    in total, which is the amplification that actually costs money.
 *
 * Fixed windows are deliberately simple: this protects an expensive side effect,
 * it is not a precise quota.
 */
export const SIGNUP_EMAIL_LIMIT = { max: 3, windowMs: 10 * 60 * 1000 };
export const SIGNUP_GLOBAL_LIMIT = { max: 60, windowMs: 60 * 1000 };

export const GLOBAL_SIGNUP_KEY = "signup:global";

/**
 * Rows older than this are garbage collected. It only has to comfortably exceed
 * the longest window above (10 minutes) — keeping them longer serves no purpose
 * and just enlarges the live set.
 */
export const RATE_LIMIT_RETENTION_MS = 60 * 60 * 1000;

/** Rows deleted per transaction; the job reschedules itself until drained. */
export const CLEANUP_BATCH_SIZE = 500;

/**
 * Bucket key for one email address. The address is hashed rather than stored:
 * the table would otherwise accumulate raw, unvalidated, attacker-supplied
 * strings (and personal data) purely as a side effect of rate limiting.
 * Computed in the calling action — hashing is async and mutations stay pure.
 */
export async function emailSignupKey(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );
  const hex = Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return `signup:email:${hex}`;
}

/**
 * Consume one unit from a fixed-window bucket. Read-modify-write inside a single
 * mutation, so Convex's transactions make concurrent consumers safe.
 */
export const consume = internalMutation({
  args: {
    key: v.string(),
    max: v.number(),
    windowMs: v.number(),
  },
  handler: async (ctx: any, args: any) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q: any) => q.eq("key", args.key))
      .unique();

    if (existing === null) {
      await ctx.db.insert("rateLimits", { key: args.key, windowStart: now, count: 1 });
      return { allowed: true, remaining: args.max - 1 };
    }

    // Window expired: start a fresh one.
    if (now - existing.windowStart >= args.windowMs) {
      await ctx.db.patch(existing._id, { windowStart: now, count: 1 });
      return { allowed: true, remaining: args.max - 1 };
    }

    if (existing.count >= args.max) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: existing.windowStart + args.windowMs - now,
      };
    }

    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { allowed: true, remaining: args.max - existing.count - 1 };
  },
});

/**
 * Delete rate-limit rows whose window is long past. Without this the table grows
 * without bound — one row per distinct email ever submitted.
 *
 * The batch is capped so one transaction stays small, and the job reschedules
 * itself while full batches keep coming. A single capped pass would not keep up:
 * the global limit alone permits 60 new buckets a minute, i.e. ~86k a day, so a
 * fixed 500-per-run budget would fall behind under sustained abuse. Each pass
 * commits its deletes before rescheduling, so the drain always makes progress
 * and terminates.
 */
export const cleanupExpired = internalMutation({
  args: {
    olderThanMs: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: any, args: any) => {
    const batchSize = args.limit ?? CLEANUP_BATCH_SIZE;
    const cutoff = Date.now() - (args.olderThanMs ?? RATE_LIMIT_RETENTION_MS);
    const stale = await ctx.db
      .query("rateLimits")
      .withIndex("by_windowStart", (q: any) => q.lt("windowStart", cutoff))
      .take(batchSize);

    for (const row of stale) {
      await ctx.db.delete(row._id);
    }

    // A full batch means there may be more; continue in a fresh transaction.
    const continued = stale.length === batchSize;
    if (continued) {
      await ctx.scheduler.runAfter(0, internal.rateLimit.cleanupExpired, args);
    }
    return { deleted: stale.length, continued };
  },
});
