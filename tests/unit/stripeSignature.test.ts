import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "../../convex/stripeSignature";

const secret = "whsec_avail_unit_test";
const nowSeconds = 1_800_000_000;
const payload = JSON.stringify({
  id: "evt_avail_test",
  type: "checkout.session.completed",
});

function signedHeader(body = payload, timestamp = nowSeconds): string {
  return Stripe.webhooks.generateTestHeaderString({
    payload: body,
    secret,
    timestamp,
  });
}

describe("verifyStripeSignature", () => {
  it("accepts an official Stripe test signature", async () => {
    await expect(
      verifyStripeSignature(payload, signedHeader(), secret, { nowSeconds }),
    ).resolves.toBe(true);
  });

  it("rejects a missing or malformed header", async () => {
    await expect(
      verifyStripeSignature(payload, null, secret, { nowSeconds }),
    ).resolves.toBe(false);
    await expect(
      verifyStripeSignature(payload, "not-a-signature", secret, { nowSeconds }),
    ).resolves.toBe(false);
  });

  it("rejects the wrong secret and a modified body", async () => {
    await expect(
      verifyStripeSignature(payload, signedHeader(), "whsec_wrong", { nowSeconds }),
    ).resolves.toBe(false);
    await expect(
      verifyStripeSignature(`${payload} `, signedHeader(), secret, { nowSeconds }),
    ).resolves.toBe(false);
  });

  it("rejects signatures outside the five-minute window in either direction", async () => {
    await expect(
      verifyStripeSignature(payload, signedHeader(payload, nowSeconds - 301), secret, {
        nowSeconds,
      }),
    ).resolves.toBe(false);
    await expect(
      verifyStripeSignature(payload, signedHeader(payload, nowSeconds + 301), secret, {
        nowSeconds,
      }),
    ).resolves.toBe(false);
  });

  it("accepts a header when one of multiple v1 signatures is valid", async () => {
    const header = `${signedHeader()},v1=${"0".repeat(64)}`;
    await expect(
      verifyStripeSignature(payload, header, secret, { nowSeconds }),
    ).resolves.toBe(true);
  });

  it("rejects non-integer timestamps and a disabled tolerance", async () => {
    const signature = signedHeader().split(",").find((part) => part.startsWith("v1="));
    await expect(
      verifyStripeSignature(payload, `t=12junk,${signature}`, secret, { nowSeconds }),
    ).resolves.toBe(false);
    await expect(
      verifyStripeSignature(payload, signedHeader(), secret, {
        nowSeconds,
        toleranceSeconds: 0,
      }),
    ).resolves.toBe(false);
  });
});
