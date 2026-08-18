import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import * as waitlistModule from "../../convex/waitlist";
import { generateRedemptionCodeCandidates } from "../../convex/redemptionCode";

const modules = import.meta.glob("../../convex/**/*.ts");

const PAYER = "payer@example.com";
const SESSION = "cs_test_1";

type T = ReturnType<typeof convexTest>;

function paidArgs(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "evt_1",
    stripeSessionId: SESSION,
    email: PAYER,
    name: "Test Payer",
    stripePaymentIntentId: "pi_1",
    stripeCustomerId: "cus_1",
    amountPaid: 1000,
    currency: "gbp",
    redemptionCodeCandidates: generateRedemptionCodeCandidates(),
    ...overrides,
  };
}

async function seedPaid(t: T) {
  await t.mutation(internal.waitlist.markPaid, paidArgs());
}

describe("public data boundaries", () => {
  it("DATA-01: checkPosition returns only found + status", async () => {
    const t = convexTest(schema, modules);
    await seedPaid(t);

    const res = await t.query(api.waitlist.checkPosition, { email: PAYER });

    // Exact equality: catches any future accidental exposure of Stripe ids,
    // attribution, consent data, or the redemption code.
    expect(res).toEqual({ found: true, status: "paid" });
  });

  it("DATA-02: checkPosition for an unknown email leaks no detail", async () => {
    const t = convexTest(schema, modules);
    const res = await t.query(api.waitlist.checkPosition, { email: "nobody@example.com" });
    expect(res).toEqual({ found: false });
  });

  it("DATA-03: getBySessionId for a paid reservation returns only display fields", async () => {
    const t = convexTest(schema, modules);
    await seedPaid(t);

    const res: any = await t.query(api.waitlist.getBySessionId, {
      stripeSessionId: SESSION,
    });

    expect(Object.keys(res).sort()).toEqual(
      ["confirmationEmailSent", "email", "found", "name", "status"].sort(),
    );
    expect(res.status).toBe("paid");
    expect(res.redemptionCode).toBeUndefined();
  });

  it("DATA-04: getBySessionId hides the code for a refunded reservation", async () => {
    const t = convexTest(schema, modules);
    await seedPaid(t);
    await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_r",
      stripePaymentIntentId: "pi_1",
    });

    const res: any = await t.query(api.waitlist.getBySessionId, {
      stripeSessionId: SESSION,
    });

    expect(res.status).toBe("refunded");
    expect(res.redemptionCode).toBeUndefined();
  });

  it("DATA-04b: an unpaid reservation exposes no code", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx: any) =>
      ctx.db.insert("waitlist", {
        name: "Pending",
        email: "pending@example.com",
        status: "pending_payment",
        marketingConsent: false,
        stripeSessionId: "cs_pending",
        redemptionCode: "SHOULDNOTAPPEAR",
      }),
    );

    const res: any = await t.query(api.waitlist.getBySessionId, {
      stripeSessionId: "cs_pending",
    });

    expect(res.redemptionCode).toBeUndefined();
  });

  it("DATA-05: an unknown or oversized session id is a safe not-found", async () => {
    const t = convexTest(schema, modules);

    expect(await t.query(api.waitlist.getBySessionId, { stripeSessionId: "cs_nope" })).toEqual({
      found: false,
    });
    expect(
      await t.query(api.waitlist.getBySessionId, { stripeSessionId: "x".repeat(5000) }),
    ).toEqual({ found: false });
  });

  it("DATA-06: getStats is registered as internal, not browser-callable", async () => {
    // Business stats (signup counts, revenue) must not be public. Assert on the
    // registered function's visibility rather than calling it: convex-test
    // resolves functions by path, so a call would not prove visibility.
    expect((waitlistModule.getStats as any).isInternal).toBe(true);

    // Still reachable from server code.
    const t = convexTest(schema, modules);
    await expect(t.query(internal.waitlist.getStats, {})).resolves.toBeDefined();
  });

  it("DATA-07: payment mutations are internal; only the intended queries are public", async () => {
    for (const name of ["markPaid", "markRefunded", "markPendingPayment", "join"]) {
      expect((waitlistModule as any)[name].isInternal).toBe(true);
    }

    // The documented public surface stays public.
    for (const name of ["checkPosition", "getBySessionId", "submitEarlyAccess"]) {
      expect((waitlistModule as any)[name].isInternal).toBeFalsy();
    }
  });
});

describe("REF-03 — partial refund policy", () => {
  it("a partial refund revokes the reservation and records the amount", async () => {
    const t = convexTest(schema, modules);
    await seedPaid(t);

    const res: any = await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_partial",
      stripePaymentIntentId: "pi_1",
      amountRefunded: 300,
      chargeAmount: 1000,
    });

    const rec = await t.run(async (ctx: any) =>
      ctx.db
        .query("waitlist")
        .withIndex("by_email", (q: any) => q.eq("email", PAYER))
        .unique(),
    );

    // Policy decision: any refund revokes the entitlement, partial included.
    expect(res.partialRefund).toBe(true);
    expect(rec.status).toBe("refunded");
    expect(rec.amountRefunded).toBe(300);
  });

  it("consecutive partial refunds advance the recorded total without moving refundedAt", async () => {
    const t = convexTest(schema, modules);
    await seedPaid(t);

    const readRecord = () =>
      t.run(async (ctx: any) =>
        ctx.db
          .query("waitlist")
          .withIndex("by_email", (q: any) => q.eq("email", PAYER))
          .unique(),
      );

    // £3 of £10.
    await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_partial_1",
      stripePaymentIntentId: "pi_1",
      amountRefunded: 300,
      chargeAmount: 1000,
    });
    const afterFirst = await readRecord();

    // The rest is refunded later; Stripe reports the cumulative total.
    const second: any = await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_partial_2",
      stripePaymentIntentId: "pi_1",
      amountRefunded: 1000,
      chargeAmount: 1000,
    });
    const afterSecond = await readRecord();

    expect(second.alreadyRefunded).toBe(true);
    expect(afterSecond.amountRefunded).toBe(1000); // not stale at 300
    expect(afterSecond.refundedAt).toBe(afterFirst.refundedAt); // timestamp intact
  });

  it("a late out-of-order refund event cannot lower the recorded total", async () => {
    const t = convexTest(schema, modules);
    await seedPaid(t);

    await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_full",
      stripePaymentIntentId: "pi_1",
      amountRefunded: 1000,
      chargeAmount: 1000,
    });
    await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_stale",
      stripePaymentIntentId: "pi_1",
      amountRefunded: 300,
      chargeAmount: 1000,
    });

    const rec = await t.run(async (ctx: any) =>
      ctx.db
        .query("waitlist")
        .withIndex("by_email", (q: any) => q.eq("email", PAYER))
        .unique(),
    );
    expect(rec.amountRefunded).toBe(1000);
  });

  it("a full refund is not flagged as partial", async () => {
    const t = convexTest(schema, modules);
    await seedPaid(t);

    const res: any = await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_full",
      stripePaymentIntentId: "pi_1",
      amountRefunded: 1000,
      chargeAmount: 1000,
    });

    expect(res.partialRefund).toBe(false);
  });
});
