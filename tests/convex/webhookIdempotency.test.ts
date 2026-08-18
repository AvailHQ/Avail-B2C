import { convexTest } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import schema from "../../convex/schema";
import { internal } from "../../convex/_generated/api";
import { generateRedemptionCodeCandidates } from "../../convex/redemptionCode";

// convex-test needs the function modules; this test file lives outside convex/.
const modules = import.meta.glob("../../convex/**/*.ts");

const PAYER = "payer@example.com";

function paidArgs(overrides: Record<string, unknown> = {}) {
  return {
    eventId: "evt_1",
    stripeSessionId: "cs_test_1",
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

type T = ReturnType<typeof convexTest>;

function recordByEmail(t: T, email: string) {
  return t.run(async (ctx: any) =>
    ctx.db
      .query("waitlist")
      .withIndex("by_email", (q: any) => q.eq("email", email.toLowerCase()))
      .unique(),
  );
}

function waitlistCount(t: T) {
  return t.run(async (ctx: any) => (await ctx.db.query("waitlist").collect()).length);
}

function eventCount(t: T) {
  return t.run(async (ctx: any) => (await ctx.db.query("stripeEvents").collect()).length);
}

describe("markPaid — entitlement & idempotency", () => {
  it("PAY-08: creates one paid record without a code when no reservation matches", async () => {
    const t = convexTest(schema, modules);
    const res: any = await t.mutation(internal.waitlist.markPaid, paidArgs());

    expect(res.newlyPaid).toBe(true);
    const rec = await recordByEmail(t, PAYER);
    expect(rec.status).toBe("paid");
    expect(rec.redemptionCode).toBeUndefined();
    expect(await waitlistCount(t)).toBe(1);
  });

  it("PAY-09: a mixed-case payer email reconciles to the existing record", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx: any) =>
      ctx.db.insert("waitlist", {
        name: "Seed",
        email: "mixed@example.com",
        status: "email_only",
        marketingConsent: false,
      }),
    );

    const res: any = await t.mutation(
      internal.waitlist.markPaid,
      paidArgs({ eventId: "evt_mc", stripeSessionId: "cs_mc", email: "Mixed@Example.com" }),
    );

    expect(res.newlyPaid).toBe(true);
    expect(await waitlistCount(t)).toBe(1);
    const rec = await recordByEmail(t, "mixed@example.com");
    expect(rec.status).toBe("paid");
  });

  it("IDEM-01: redelivering the same event id is a no-op", async () => {
    const t = convexTest(schema, modules);
    const args = paidArgs();

    const first: any = await t.mutation(internal.waitlist.markPaid, args);
    const rec1 = await recordByEmail(t, PAYER);
    const second: any = await t.mutation(internal.waitlist.markPaid, args);
    const rec2 = await recordByEmail(t, PAYER);

    expect(first.newlyPaid).toBe(true);
    expect(second.deduped).toBe(true);
    expect(rec2.redemptionCode).toBe(rec1.redemptionCode);
    expect(await waitlistCount(t)).toBe(1);
    expect(await eventCount(t)).toBe(1);
  });

  it("IDEM-02: concurrent delivery of the same event issues one code", async () => {
    const t = convexTest(schema, modules);
    const args = paidArgs();

    await Promise.all([
      t.mutation(internal.waitlist.markPaid, args),
      t.mutation(internal.waitlist.markPaid, args),
    ]);

    expect(await waitlistCount(t)).toBe(1);
    expect(await eventCount(t)).toBe(1);
  });

  it("IDEM-03/04: different events for the same session/PaymentIntent issue one entitlement", async () => {
    const t = convexTest(schema, modules);

    const first: any = await t.mutation(internal.waitlist.markPaid, paidArgs({ eventId: "evt_a" }));
    const rec1 = await recordByEmail(t, PAYER);
    const second: any = await t.mutation(internal.waitlist.markPaid, paidArgs({ eventId: "evt_b" }));
    const rec2 = await recordByEmail(t, PAYER);

    expect(first.newlyPaid).toBe(true);
    expect(second.alreadyPaid).toBe(true);
    expect(second.duplicatePayment).toBeUndefined();
    expect(rec2.redemptionCode).toBe(rec1.redemptionCode);
    expect(await waitlistCount(t)).toBe(1);
  });

  it("IDEM-05: a genuine second payment for the same email is flagged, not re-issued", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.waitlist.markPaid, paidArgs());
    const rec1 = await recordByEmail(t, PAYER);

    const second: any = await t.mutation(
      internal.waitlist.markPaid,
      paidArgs({ eventId: "evt_2", stripeSessionId: "cs_test_2", stripePaymentIntentId: "pi_2" }),
    );
    const rec2 = await recordByEmail(t, PAYER);

    expect(second.duplicatePayment).toBe(true);
    expect(rec2.redemptionCode).toBe(rec1.redemptionCode); // code unchanged
    expect(rec2.duplicatePaymentIntents).toContain("pi_2");
    expect(await waitlistCount(t)).toBe(1);
  });

  it("IDEM-06: a paid event after refund does not restore the reservation", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(internal.waitlist.markPaid, paidArgs());
    await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_refund",
      stripePaymentIntentId: "pi_1",
    });
    expect((await recordByEmail(t, PAYER)).status).toBe("refunded");

    const late: any = await t.mutation(
      internal.waitlist.markPaid,
      paidArgs({ eventId: "evt_late" }),
    );

    expect(late.alreadyRefunded).toBe(true);
    expect((await recordByEmail(t, PAYER)).status).toBe("refunded");
  });

  it("IDEM-07: after payment, a retry cannot issue a second code", async () => {
    const t = convexTest(schema, modules);
    const args = paidArgs();

    await t.mutation(internal.waitlist.markPaid, args);
    const rec1 = await recordByEmail(t, PAYER);
    // Simulate the webhook being retried (same event) after an email failure.
    const retry: any = await t.mutation(internal.waitlist.markPaid, args);
    const rec2 = await recordByEmail(t, PAYER);

    expect(retry.deduped).toBe(true);
    expect(rec2.redemptionCode).toBe(rec1.redemptionCode);
    expect(rec2.redemptionCodeIssuedAt).toBe(rec1.redemptionCodeIssuedAt);
  });
});

describe("markRefunded — refund lifecycle", () => {
  it("REF-01/REF-02: refund applies once; a second refund event is a no-op", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.waitlist.markPaid, paidArgs());

    const r1: any = await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_r1",
      stripePaymentIntentId: "pi_1",
    });
    const rec1 = await recordByEmail(t, PAYER);

    const r2: any = await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_r2",
      stripePaymentIntentId: "pi_1",
    });
    const rec2 = await recordByEmail(t, PAYER);

    expect(r1.success).toBe(true);
    expect(rec1.status).toBe("refunded");
    expect(r2.alreadyRefunded).toBe(true);
    expect(rec2.refundedAt).toBe(rec1.refundedAt); // timestamp not corrupted
  });

  it("refund: redelivering the same refund event id is a no-op", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.waitlist.markPaid, paidArgs());

    const args = { eventId: "evt_r", stripePaymentIntentId: "pi_1" };
    await t.mutation(internal.waitlist.markRefunded, args);
    const second: any = await t.mutation(internal.waitlist.markRefunded, args);

    expect(second.deduped).toBe(true);
  });

  it("refunding a duplicate charge is acknowledged and keeps the reservation paid", async () => {
    // The one-reservation-per-email policy tells the operator to refund the
    // extra charge. That refund carries a PaymentIntent the reservation does not
    // own, so without an index for it the webhook fails and Stripe retries
    // forever — and the customer's valid reservation must survive either way.
    const t = convexTest(schema, modules);
    await t.mutation(internal.waitlist.markPaid, paidArgs());
    await t.mutation(
      internal.waitlist.markPaid,
      paidArgs({ eventId: "evt_2", stripeSessionId: "cs_test_2", stripePaymentIntentId: "pi_2" }),
    );

    const res: any = await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_dup_refund",
      stripePaymentIntentId: "pi_2",
    });
    const rec = await recordByEmail(t, PAYER);

    expect(res.duplicateRefund).toBe(true);
    expect(rec.status).toBe("paid"); // entitlement intact
    expect(rec.refundedAt).toBeUndefined();
  });

  it("backfill indexes duplicates recorded before the index existed", async () => {
    // Simulates a record written by the old markPaid: the extra charge is in
    // duplicatePaymentIntents but has no index row, so its refund would throw.
    const t = convexTest(schema, modules);
    await t.mutation(internal.waitlist.markPaid, paidArgs());
    await t.run(async (ctx: any) => {
      const rec = await ctx.db
        .query("waitlist")
        .withIndex("by_email", (q: any) => q.eq("email", PAYER))
        .unique();
      await ctx.db.patch(rec._id, { duplicatePaymentIntents: ["pi_legacy"] });
    });

    await expect(
      t.mutation(internal.waitlist.markRefunded, {
        eventId: "evt_before",
        stripePaymentIntentId: "pi_legacy",
      }),
    ).rejects.toThrow();

    const first: any = await t.mutation(internal.migrations.backfillDuplicatePayments, {});
    expect(first.inserted).toBe(1);

    const res: any = await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_after",
      stripePaymentIntentId: "pi_legacy",
    });
    expect(res.duplicateRefund).toBe(true);
    expect((await recordByEmail(t, PAYER)).status).toBe("paid");

    // Safe to re-run.
    const second: any = await t.mutation(internal.migrations.backfillDuplicatePayments, {});
    expect(second.inserted).toBe(0);
  });

  it("backfill walks the whole table, not just the first batch", async () => {
    // A capped single pass would silently skip duplicates on later rows once the
    // table outgrows the batch size — and still report success.
    const t = convexTest(schema, modules);
    const total = 7;
    await t.run(async (ctx: any) => {
      for (let i = 0; i < total; i++) {
        await ctx.db.insert("waitlist", {
          name: `Legacy ${i}`,
          email: `legacy${i}@example.com`,
          status: "paid",
          marketingConsent: false,
          stripePaymentIntentId: `pi_primary_${i}`,
          duplicatePaymentIntents: [`pi_legacy_${i}`],
        });
      }
    });

    const first: any = await t.mutation(internal.migrations.backfillDuplicatePayments, {
      batchSize: 2,
    });
    expect(first.continued).toBe(true);

    vi.useFakeTimers();
    try {
      await t.finishAllScheduledFunctions(vi.runAllTimers);
    } finally {
      vi.useRealTimers();
    }

    const indexed = await t.run(async (ctx: any) =>
      (await ctx.db.query("duplicatePayments").collect()).map(
        (row: any) => row.stripePaymentIntentId,
      ),
    );
    expect(indexed.sort()).toEqual(
      Array.from({ length: total }, (_, i) => `pi_legacy_${i}`).sort(),
    );
  });

  it("REF-04: an early refund remains unclaimed so Stripe can retry it", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(internal.waitlist.markRefunded, {
        eventId: "evt_unknown",
        stripePaymentIntentId: "pi_missing",
      }),
    ).rejects.toThrow("retry the Stripe event");
    expect(await eventCount(t)).toBe(0);

    await t.mutation(internal.waitlist.markPaid, paidArgs());
    const retried: any = await t.mutation(internal.waitlist.markRefunded, {
      eventId: "evt_unknown",
      stripePaymentIntentId: "pi_1",
    });
    expect(retried.success).toBe(true);
    expect((await recordByEmail(t, PAYER)).status).toBe("refunded");
  });
});

describe("payment confirmation email retries", () => {
  it("keeps an unsent confirmation eligible until a later attempt succeeds", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.waitlist.markPaid, paidArgs());
    const rec = await recordByEmail(t, PAYER);

    expect(
      await t.query(internal.waitlist.getPaymentEmailRecipient, { waitlistId: rec._id }),
    ).toEqual({ email: PAYER, name: "Test Payer" });

    await t.mutation(internal.waitlist.markConfirmationEmailSent, {
      waitlistId: rec._id,
      attempt: 1,
      sent: false,
    });
    expect(
      await t.query(internal.waitlist.getPaymentEmailRecipient, { waitlistId: rec._id }),
    ).not.toBeNull();

    await t.mutation(internal.waitlist.markConfirmationEmailSent, {
      waitlistId: rec._id,
      attempt: 2,
      sent: true,
    });
    expect(
      await t.query(internal.waitlist.getPaymentEmailRecipient, { waitlistId: rec._id }),
    ).toBeNull();
    expect((await recordByEmail(t, PAYER)).confirmationEmailAttempts).toBe(2);
  });
});
