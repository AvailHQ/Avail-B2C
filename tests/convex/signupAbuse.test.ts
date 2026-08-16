import { convexTest } from "convex-test";
import { afterEach, describe, expect, it, vi } from "vitest";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import { INPUT_LIMITS } from "../../convex/inputLimits";
import { SIGNUP_EMAIL_LIMIT, SIGNUP_GLOBAL_LIMIT } from "../../convex/rateLimit";

const modules = import.meta.glob("../../convex/**/*.ts");

type T = ReturnType<typeof convexTest>;

/**
 * The signup action reaches the network twice: DNS-over-HTTPS for MX/A records,
 * and Resend for the welcome email. Both are stubbed so these tests stay
 * offline and deterministic.
 */
function stubNetwork(options: { dnsDelayMs?: number; resendOk?: boolean } = {}) {
  // Without a key `sendEmail` short-circuits before fetch, which would make the
  // email assertions below pass vacuously.
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("EMAIL_FROM", "Avail <test@example.com>");

  const calls = { dns: 0, resend: 0 };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: any, init?: any) => {
      const url = String(input);

      if (url.includes("dns.google")) {
        calls.dns += 1;
        if (options.dnsDelayMs) {
          // Respect the caller's AbortSignal so the timeout can be exercised.
          await new Promise((resolve, reject) => {
            const timer = setTimeout(resolve, options.dnsDelayMs);
            init?.signal?.addEventListener("abort", () => {
              clearTimeout(timer);
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
        }
        return new Response(JSON.stringify({ Status: 0, Answer: [{ type: 15 }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      if (url.includes("resend.com")) {
        calls.resend += 1;
        return new Response(JSON.stringify(options.resendOk === false ? { error: "no" } : { id: "e" }), {
          status: options.resendOk === false ? 500 : 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response("{}", { status: 200 });
    }),
  );
  return calls;
}

function countWaitlist(t: T) {
  return t.run(async (ctx: any) => (await ctx.db.query("waitlist").collect()).length);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("signup abuse controls", () => {
  it("ABUSE-01: concurrent submissions create one record and at most one welcome email", async () => {
    const calls = stubNetwork();
    const t = convexTest(schema, modules);

    await Promise.all(
      Array.from({ length: 3 }, () =>
        t.action(api.waitlist.submitEarlyAccess, {
          name: "Racer",
          email: "race@example.com",
        }),
      ),
    );

    expect(await countWaitlist(t)).toBe(1);
    expect(calls.resend).toBe(1); // duplicates must not each send a welcome email
  });

  it("ABUSE-02: case and space variants resolve to one identity", async () => {
    stubNetwork();
    const t = convexTest(schema, modules);

    await t.action(api.waitlist.submitEarlyAccess, {
      name: "One",
      email: "Variant@Example.com",
    });
    const second: any = await t.action(api.waitlist.submitEarlyAccess, {
      name: "Two",
      email: "  variant@example.com  ",
    });

    expect(second.alreadyJoined).toBe(true);
    expect(await countWaitlist(t)).toBe(1);
  });

  it("ABUSE-03: oversized input is rejected before any network work", async () => {
    const calls = stubNetwork();
    const t = convexTest(schema, modules);

    const res: any = await t.action(api.waitlist.submitEarlyAccess, {
      name: "x".repeat(INPUT_LIMITS.name + 1),
      email: "big@example.com",
    });

    expect(res.success).toBe(false);
    expect(calls.dns).toBe(0); // never reached the DNS lookup
    expect(await countWaitlist(t)).toBe(0);
  });

  it("ABUSE-03b: an oversized attribution field is rejected", async () => {
    stubNetwork();
    const t = convexTest(schema, modules);

    const res: any = await t.action(api.waitlist.submitEarlyAccess, {
      name: "Fine",
      email: "fine@example.com",
      referrer: "r".repeat(INPUT_LIMITS.referrer + 1),
    });

    expect(res.success).toBe(false);
    expect(await countWaitlist(t)).toBe(0);
  });

  it("ABUSE-04: a hanging MX lookup times out and fails open", async () => {
    // Longer than DNS_LOOKUP_TIMEOUT_MS: the abort must fire and validation
    // must fail open rather than hang the action.
    stubNetwork({ dnsDelayMs: 30_000 });
    const t = convexTest(schema, modules);

    const res: any = await t.action(api.waitlist.submitEarlyAccess, {
      name: "Slow DNS",
      email: "slow@example.com",
    });

    expect(res.success).toBe(true);
    expect(await countWaitlist(t)).toBe(1);
  }, 20_000);

  it("ABUSE-05: burst traffic is rate limited per email", async () => {
    stubNetwork();
    const t = convexTest(schema, modules);

    const results: any[] = [];
    for (let i = 0; i < SIGNUP_EMAIL_LIMIT.max + 2; i++) {
      results.push(
        await t.action(api.waitlist.submitEarlyAccess, {
          name: "Burst",
          email: "burst@example.com",
        }),
      );
    }

    expect(results.slice(0, SIGNUP_EMAIL_LIMIT.max).every((r) => r.success)).toBe(true);
    expect(results.at(-1).rateLimited).toBe(true);
  });

  it("ABUSE-05b: the global bucket caps total DNS/email amplification", async () => {
    const calls = stubNetwork();
    const t = convexTest(schema, modules);

    // Exhaust the global bucket directly, then confirm a fresh email is refused
    // (so varying the address cannot bypass the spend protection).
    for (let i = 0; i < SIGNUP_GLOBAL_LIMIT.max; i++) {
      await t.mutation(internal.rateLimit.consume, {
        key: "signup:global",
        ...SIGNUP_GLOBAL_LIMIT,
      });
    }
    const dnsBefore = calls.dns;

    const res: any = await t.action(api.waitlist.submitEarlyAccess, {
      name: "New Email",
      email: "fresh@example.com",
    });

    expect(res.rateLimited).toBe(true);
    expect(calls.dns).toBe(dnsBefore); // no DNS work performed
    expect(await countWaitlist(t)).toBe(0);
  });

  it("ABUSE-06: a Resend outage does not fail the signup or leak provider detail", async () => {
    stubNetwork({ resendOk: false });
    const t = convexTest(schema, modules);

    const res: any = await t.action(api.waitlist.submitEarlyAccess, {
      name: "No Mail",
      email: "nomail@example.com",
    });

    expect(res.success).toBe(true);
    expect(JSON.stringify(res)).not.toMatch(/resend/i);
    expect(await countWaitlist(t)).toBe(1);
  });
});

describe("rate limit window", () => {
  it("allows a new window once the previous one expires", async () => {
    const t = convexTest(schema, modules);
    const bucket = { key: "test:bucket", max: 2, windowMs: 1000 };

    expect((await t.mutation(internal.rateLimit.consume, bucket) as any).allowed).toBe(true);
    expect((await t.mutation(internal.rateLimit.consume, bucket) as any).allowed).toBe(true);
    expect((await t.mutation(internal.rateLimit.consume, bucket) as any).allowed).toBe(false);

    // Move the stored window into the past instead of sleeping.
    await t.run(async (ctx: any) => {
      const row = await ctx.db
        .query("rateLimits")
        .withIndex("by_key", (q: any) => q.eq("key", bucket.key))
        .unique();
      await ctx.db.patch(row._id, { windowStart: Date.now() - bucket.windowMs - 1 });
    });

    expect((await t.mutation(internal.rateLimit.consume, bucket) as any).allowed).toBe(true);
  });

  it("does not store the raw email address in the bucket key", async () => {
    stubNetwork();
    const t = convexTest(schema, modules);

    await t.action(api.waitlist.submitEarlyAccess, {
      name: "Private",
      email: "private@example.com",
    });

    const keys = await t.run(async (ctx: any) =>
      (await ctx.db.query("rateLimits").collect()).map((row: any) => row.key),
    );
    expect(keys.some((key: string) => key.includes("private@example.com"))).toBe(false);
    expect(keys.some((key: string) => key.startsWith("signup:email:"))).toBe(true);
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
    const total = 12;

    await t.run(async (ctx: any) => {
      for (let i = 0; i < total; i++) {
        await ctx.db.insert("rateLimits", { key: `old:${i}`, windowStart: stale, count: 1 });
      }
      await ctx.db.insert("rateLimits", { key: "keep", windowStart: Date.now(), count: 1 });
    });

    // One capped pass must not be the whole story: it reschedules itself until
    // the backlog is gone, otherwise sustained abuse outpaces the sweep.
    const first: any = await t.mutation(internal.rateLimit.cleanupExpired, { limit: 5 });
    expect(first.deleted).toBe(5);
    expect(first.continued).toBe(true);

    // Drains the whole self-rescheduling chain, not just one generation.
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
