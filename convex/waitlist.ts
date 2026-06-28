import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Join the waitlist or return the user details if they have already joined.
 */
export const join = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    referredByCode: v.optional(v.string()),
  },
  handler: async (ctx: any, args: any) => {
    const email = args.email.trim().toLowerCase();
    const name = args.name.trim();

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

    // Generate a unique 6-character referral code
    let referralCode = "";
    let attempts = 0;
    while (attempts < 10) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const dup = await ctx.db
        .query("waitlist")
        .withIndex("by_referralCode", (q: any) => q.eq("referralCode", code))
        .unique();
      if (dup === null) {
        referralCode = code;
        break;
      }
      attempts++;
    }
    if (!referralCode) {
      referralCode = Date.now().toString(36).toUpperCase();
    }

    // Calculate queue position
    const totalUsers = await ctx.db.query("waitlist").collect();
    const basePosition = totalUsers.length + 1;

    // Handle referredByCode
    let referredBy = undefined;
    if (args.referredByCode) {
      const referrer = await ctx.db
        .query("waitlist")
        .withIndex("by_referralCode", (q: any) => q.eq("referralCode", args.referredByCode.trim().toUpperCase()))
        .unique();

      if (referrer !== null) {
        referredBy = referrer.referralCode;

        // Boost referrer: increment referralCount and improve queuePosition by 10 spots
        const newReferralCount = referrer.referralCount + 1;
        const newPosition = Math.max(1, referrer.queuePosition - 10);
        await ctx.db.patch(referrer._id, {
          referralCount: newReferralCount,
          queuePosition: newPosition,
        });
      }
    }

    const userId = await ctx.db.insert("waitlist", {
      name,
      email,
      referralCode,
      referredBy,
      referralCount: 0,
      queuePosition: basePosition,
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
 * Check waitlist status of an existing user by email.
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
 * Get total waitlist signups.
 */
export const getStats = query({
  args: {},
  handler: async (ctx: any) => {
    const all = await ctx.db.query("waitlist").collect();
    return {
      totalSignups: all.length,
    };
  },
});
