import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  waitlist: defineTable({
    name: v.string(),
    email: v.string(),
    referralCode: v.string(),
    referredBy: v.optional(v.string()),
    referralCount: v.number(),
    queuePosition: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_referralCode", ["referralCode"])
    .index("by_queuePosition", ["queuePosition"]),
});
