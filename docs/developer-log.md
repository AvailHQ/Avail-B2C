# Developer Log

A running record of notable development sessions on the Avail B2C site.
Each entry notes the date, who did the work, what was done, and the outcome.

---

## 2026-08-16 — Stripe end-to-end test (sandbox) + personalized success page

- **Author:** Claude Opus 4.8 (`claude-opus-4-8`), via Claude Code
- **Branch:** `main`
- **Scope:** Verify the paid early-access reservation flow against a real Stripe
  sandbox, then add a personalized post-payment success page.

### Context at start

The reservation backend and Stripe wiring already existed in code (commits
`9bc63e2` and `ddad519`): Convex schema/functions, a signature-verifying webhook
(`convex/http.ts`), the `submitEarlyAccess` action with email validation, Resend
email helpers, and a static `/success` page. Nothing had been exercised against a
live Stripe environment yet.

### Environment setup (done by the user, confirmed this session)

- Convex dev deployment: `basic-otter-332` (region `eu-west-1`).
- Stripe **sandbox** (test mode) account "Avail sandbox".
- Created a Stripe event destination (webhook) `adventurous-breeze` →
  `https://basic-otter-332.eu-west-1.convex.site/stripe/webhook`, payload style
  **Snapshot**, listening to `checkout.session.completed` and `charge.refunded`.
- Set the webhook signing secret on the Convex deployment:
  `npx convex env set STRIPE_WEBHOOK_SECRET whsec_…`.
- `.env.local` gained `VITE_STRIPE_PAYMENT_LINK` (the £10 sandbox Payment Link).
  Note: `.env.local` is git-ignored and not committed.

### Verification performed

1. **Webhook liveness / secret** — an unsigned `POST` to the webhook returned
   `400 Invalid signature` (not `500`), proving the route is deployed and
   `STRIPE_WEBHOOK_SECRET` is configured.
2. **Full real checkout** — drove the site form in a browser with
   `availstripetest@gmail.com`, confirmed the `email_only` record was created
   (email MX validation passed), followed the Stripe Payment Link, and paid £10
   with test card `4242 4242 4242 4242`.
3. **Result:** the Convex record moved `email_only → paid` via the webhook, with
   `amountPaid: 1000`, `currency: gbp`, `stripePaymentIntentId`,
   `stripeSessionId`, `paidAt`, and a freshly issued `redemptionCode`
   (`W8479EZ8VBQBT6BG`). Email-based reconciliation (Payment Link flow) works.

### Code changes (committed source, on `main`)

- `convex/waitlist.ts` — added public query `getBySessionId`: looks a reservation
  up by Stripe Checkout Session id and returns the redemption code **only when
  the reservation is `paid`**. The session id (delivered to the payer via Stripe's
  `?session_id={CHECKOUT_SESSION_ID}` redirect) acts as an unguessable capability.
- `src/lib/convex.ts` — added client helper `getReservationBySession`.
- `src/pages/SuccessPage.tsx` — now reads `session_id` from the URL and polls
  Convex (1.5s × up to 10 attempts, to cover webhook processing latency), then
  shows the payer's first name, email, and redemption code. Falls back to a
  generic confirmation when there is no `session_id`, when Convex is not
  configured, or on timeout. Payment recording never depends on this page.

Both success-page paths were verified in the browser:
`/success?session_id=…` (paid) shows the personalized content; `/success` (no id)
shows the generic confirmation without hanging. `npx tsc -b` passes.

### Outstanding / not yet done

- **Payment Link redirect** — the £10 Payment Link still shows Stripe's default
  "Thanks for your payment" page. To land users on the new success page, set the
  link's *After payment → Redirect to your website* to `<site>/success`.
- **Confirmation emails not verified** — `RESEND_API_KEY` / `EMAIL_FROM` are not
  set on the Convex deployment, so welcome/confirmation emails are silently
  skipped (`convex/email.ts`). Set them to test that branch.
- **Refund branch not tested** — `charge.refunded → status: refunded` has not
  been exercised. Refund the sandbox PaymentIntent to test.
