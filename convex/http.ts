import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { sendEmail, paymentConfirmationEmail } from "./email";

/**
 * Convert an ArrayBuffer to a lowercase hex string.
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Constant-time comparison of two equal-length hex strings.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Verify a Stripe webhook signature without the Stripe SDK, using Web Crypto.
 *
 * Reproduces Stripe's scheme: signed_payload = `${timestamp}.${rawBody}`, signed
 * with HMAC-SHA256 using the endpoint's signing secret, compared against the
 * `v1` signatures in the `Stripe-Signature` header. A 5 minute timestamp
 * tolerance guards against replay.
 */
async function verifyStripeSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureHeader) return false;

  let timestamp = "";
  const v1Signatures: string[] = [];
  for (const part of signatureHeader.split(",")) {
    const [key, value] = part.split("=");
    if (key?.trim() === "t") timestamp = value?.trim() ?? "";
    if (key?.trim() === "v1" && value) v1Signatures.push(value.trim());
  }

  if (!timestamp || v1Signatures.length === 0) return false;

  const timestampSeconds = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(timestampSeconds)) return false;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSeconds - timestampSeconds) > 60 * 5) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );
  const expected = bufferToHex(signatureBuffer);

  return v1Signatures.some((sig) => timingSafeEqual(sig, expected));
}

const stripeWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return new Response("Webhook not configured", { status: 500 });
  }

  // The raw body is required for signature verification — do not parse first.
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  const verified = await verifyStripeSignature(payload, signature, secret);
  if (!verified) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response("Invalid payload", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data?.object ?? {};
      // Only act on paid sessions (payment could still be processing/unpaid).
      if (session.payment_status && session.payment_status !== "paid") {
        break;
      }
      const result = await ctx.runMutation(internal.waitlist.markPaid, {
        stripeSessionId: session.id,
        email: session.customer_details?.email ?? session.customer_email ?? undefined,
        name: session.customer_details?.name ?? undefined,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        stripeCustomerId:
          typeof session.customer === "string" ? session.customer : undefined,
        amountPaid: typeof session.amount_total === "number" ? session.amount_total : undefined,
        currency: session.currency ?? undefined,
      });

      // Send the confirmation email once, on the first time this becomes paid.
      if (result?.newlyPaid && result.email) {
        const firstName = String(result.name || "").split(" ")[0] || "there";
        const { subject, html } = paymentConfirmationEmail(firstName);
        const sent = await sendEmail({ to: result.email, subject, html });
        if (sent) {
          await ctx.runMutation(internal.waitlist.markConfirmationEmailSent, {
            email: result.email,
          });
        }
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data?.object ?? {};
      await ctx.runMutation(internal.waitlist.markRefunded, {
        stripePaymentIntentId:
          typeof charge.payment_intent === "string" ? charge.payment_intent : undefined,
      });
      break;
    }

    default:
      // Unhandled event types are acknowledged so Stripe stops retrying them.
      break;
  }

  return new Response(null, { status: 200 });
});

const http = httpRouter();

http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: stripeWebhook,
});

export default http;
