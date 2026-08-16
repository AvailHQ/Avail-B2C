import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateRedemptionCodeCandidates } from "./redemptionCode";
import { loadStripePaymentPolicy, validateCheckoutSession } from "./stripeSecurity";
import { verifyStripeSignature } from "./stripeSignature";

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
      let policy;
      try {
        policy = loadStripePaymentPolicy(process.env);
      } catch (error) {
        console.error(error instanceof Error ? error.message : "Stripe payment policy is invalid");
        return new Response("Webhook not configured", { status: 500 });
      }
      const eligibility = validateCheckoutSession(session, policy);
      if (!eligibility.ok) {
        console.warn(`Rejected Checkout Session: ${eligibility.reason}`);
        // A malformed event cannot be processed. Valid but ineligible sessions
        // are acknowledged so Stripe does not retry an unrelated purchase.
        if (eligibility.reason === "missing_session_id") {
          return new Response("Invalid Checkout Session", { status: 400 });
        }
        return new Response(null, { status: 200 });
      }
      await ctx.runMutation(internal.waitlist.markPaid, {
        eventId: event.id,
        stripeSessionId: session.id,
        email: session.customer_details?.email ?? session.customer_email ?? undefined,
        name: session.customer_details?.name ?? undefined,
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        stripeCustomerId:
          typeof session.customer === "string" ? session.customer : undefined,
        amountPaid: typeof session.amount_total === "number" ? session.amount_total : undefined,
        currency: session.currency ?? undefined,
        redemptionCodeCandidates: generateRedemptionCodeCandidates(),
      });

      break;
    }

    case "charge.refunded": {
      const charge = event.data?.object ?? {};
      await ctx.runMutation(internal.waitlist.markRefunded, {
        eventId: event.id,
        stripePaymentIntentId:
          typeof charge.payment_intent === "string" ? charge.payment_intent : undefined,
        amountRefunded:
          typeof charge.amount_refunded === "number" ? charge.amount_refunded : undefined,
        chargeAmount: typeof charge.amount === "number" ? charge.amount : undefined,
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
