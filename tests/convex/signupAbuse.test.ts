import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";

const modules = import.meta.glob("../../convex/**/*.ts");

describe("rate limit window", () => {
  it("allows a new window once the previous one expires", async () => {
    const t = convexTest(schema, modules);
    const bucket = { key: "test:bucket", max: 2, windowMs: 1000 };

    expect((await t.mutation(internal.rateLimit.consume, bucket) as any).allowed).toBe(true);
    expect((await t.mutation(internal.rateLimit.consume, bucket) as any).allowed).toBe(true);
    expect((await t.mutation(internal.rateLimit.consume, bucket) as any).allowed).toBe(false);

    await t.run(async (ctx: any) => {
      const row = await ctx.db
        .query("rateLimits")
        .withIndex("by_key", (q: any) => q.eq("key", bucket.key))
        .unique();
      await ctx.db.patch(row._id, { windowStart: Date.now() - bucket.windowMs - 1 });
    });

    expect((await t.mutation(internal.rateLimit.consume, bucket) as any).allowed).toBe(true);
  });

  it("cleanup removes expired buckets so the table cannot grow forever", async () => {
    const t = convexTest(schema, modules);

    await t.run(async (ctx: any) => {
      await ctx.db.insert("rateLimits", {
        key: "old:1",
        windowStart: Date.now() - 48 * 60 * 60 * 1000,
        count: 1,
      });
      await ctx.db.insert("rateLimits", {
        key: "recent:1",
        windowStart: Date.now(),
        count: 1,
      });
    });

    const res: any = await t.mutation(internal.rateLimit.cleanupExpired, {});
    const remaining = await t.run(async (ctx: any) =>
      (await ctx.db.query("rateLimits").collect()).map((row: any) => row.key),
    );

    expect(res.deleted).toBe(1);
    expect(res.continued).toBe(false);
    expect(remaining).toEqual(["recent:1"]);
  });

  it("cleanup drains a backlog larger than one batch", async () => {
    const t = convexTest(schema, modules);
    const stale = Date.now() - 2 * 60 * 60 * 1000;

    await t.run(async (ctx: any) => {
      for (let i = 0; i < 12; i++) {
        await ctx.db.insert("rateLimits", { key: `old:${i}`, windowStart: stale, count: 1 });
      }
      await ctx.db.insert("rateLimits", { key: "keep", windowStart: Date.now(), count: 1 });
    });

    const first: any = await t.mutation(internal.rateLimit.cleanupExpired, { limit: 5 });
    expect(first.deleted).toBe(5);
    expect(first.continued).toBe(true);

    vi.useFakeTimers();
    try {
      await t.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }

    const remaining = await t.run(async (ctx: any) =>
      (await ctx.db.query("rateLimits").collect()).map((row: any) => row.key),
    );
    expect(remaining).toEqual(["keep"]);
  });
});
