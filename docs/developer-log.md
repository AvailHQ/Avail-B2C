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
  link's *After payment → Redirect to your website* to
  `<site>/success?session_id={CHECKOUT_SESSION_ID}`. The placeholder is required
  so Stripe passes the completed Checkout Session id to the personalized page.
- **Confirmation emails not verified** — `RESEND_API_KEY` / `EMAIL_FROM` are not
  set on the Convex deployment, so welcome/confirmation emails are silently
  skipped (`convex/email.ts`). Set them to test that branch.
- **Refund branch not tested** — `charge.refunded → status: refunded` has not
  been exercised. Refund the sandbox PaymentIntent to test.

---

## 2026-08-16 — Post-payment flow security and correctness review

- **Author:** Codex (GPT-5), via Codex desktop
- **Branch:** `main`
- **Scope:** Review the personalized Stripe success-page implementation and fix
  the identified privacy, verification, redirect, and email-copy issues.

### Findings resolved

- **Unverified payments shown as confirmed** — `/success` previously rendered a
  confirmed £10 reservation after a missing `session_id`, unavailable Convex
  client, lookup error, or polling timeout. The page now shows confirmation and
  the redemption code only after Convex returns a reservation with `paid`
  status. All other terminal outcomes use a clearly separate unverified state
  that asks the customer to retain their Stripe receipt and await confirmation.
- **Public status query exposed the full database record** — `checkPosition`
  previously returned the complete waitlist document for any supplied email,
  including Stripe identifiers, attribution data, and potentially a redemption
  code. It now returns only `found` and the reservation `status`.
- **Email copy could claim an unsent confirmation** — the session lookup now
  returns a boolean derived from `confirmationEmailSentAt`. The success page says
  an email was sent only when that flag is true; otherwise it promises a future
  email without claiming delivery.
- **Incomplete Stripe redirect instruction** — the required Payment Link redirect
  is documented as `<site>/success?session_id={CHECKOUT_SESSION_ID}` so the page
  receives the Checkout Session capability it needs for verification and
  personalization.
- **Misleading fallback iconography** — the unverified state now uses an alert
  icon rather than the paid-success checkmark.

### Verification performed

- `npm run lint` passes.
- `npm run build` passes, including `tsc -b` and the Vite production build.
- `git diff --check` passes.

### Still outstanding

- Implement the three-layer Stripe security test plan documented in
  `docs/stripe-security-testing.md` (unit, Convex integration, and Stripe
  sandbox end-to-end tests).
- Update the Stripe sandbox Payment Link's *After payment* redirect in the
  Stripe Dashboard to the URL above, then repeat the checkout redirect test.
- Configure `RESEND_API_KEY` and `EMAIL_FROM` on the Convex deployment and verify
  the confirmation-email branch.
- Exercise a sandbox refund to verify the `charge.refunded` path.

---

## 2026-08-16 — Stripe security testing Gate 1

- **Author:** Codex (GPT-5), via Codex desktop
- **Branch:** `main`
- **Scope:** Implement the first gate of `docs/stripe-security-testing.md`:
  deterministic security primitives, payment entitlement validation, secure
  redemption-code generation, and a unit-test foundation.

### Implemented

- Added Vitest, `convex-test`, and Stripe Node test dependencies and scripts.
- Added a dedicated Vitest configuration so unit/Convex tests do not collect
  Playwright specs or files inside `.claude` worktrees.
- Extracted raw-body Stripe HMAC verification to `convex/stripeSignature.ts`,
  with an injectable clock and strict five-minute tolerance.
- Added `convex/stripeSecurity.ts`, which rejects a Checkout Session unless it
  is paid, exactly GBP 10, from the configured Payment Link, and from the
  expected Stripe test/live environment.
- Added `convex/redemptionCode.ts`. Codes are generated with Web Crypto using
  rejection sampling rather than `Math.random()`. Ten secure candidates are
  generated outside the deterministic Convex mutation, which selects the first
  valid candidate not already indexed.
- Added 19 unit tests covering Stripe-generated signatures, missing/malformed
  signatures, payload tampering, timestamp replay windows, multiple signatures,
  every payment-eligibility rule, policy configuration, and redemption-code
  format/randomness.
- Ran `npm audit fix` for compatible dependency patches. The audit moved from
  one critical and two high findings to zero known vulnerabilities.

### Verification performed

- `npm test`: 3 files, 19 tests passed.
- `npm run test:security`: passes; later Convex and payment-UI gates currently
  contain no tests and exit cleanly.
- `npx convex codegen --typecheck enable`: passes.
- `npm run lint`: passes.
- `npm run build`: passes.
- `git diff --check`: passes.

### Deployment prerequisite

The hardened webhook fails closed until the Convex deployment has both policy
variables configured:

```sh
npx convex env set STRIPE_PAYMENT_LINK_ID plink_<sandbox-payment-link-id>
npx convex env set STRIPE_EXPECTED_LIVEMODE false
```

Gate 1 source has not been deliberately deployed as part of this implementation
session. Configure the actual sandbox Payment Link id before the next deploy.

---

## 2026-08-16 — Configure payment policy vars + re-verify hardened webhook

- **Author:** Claude Opus 4.8 (`claude-opus-4-8`), via Claude Code
- **Branch:** `main`
- **Scope:** Recover the webhook from the fail-closed state introduced by the
  Gate 1 hardening, and re-run the sandbox end-to-end test against the new code.

### Problem found

`npx convex dev` (watch mode) had already pushed the hardened `convex/http.ts`
to deployment `basic-otter-332`, but only `STRIPE_WEBHOOK_SECRET` was set on it.
The new webhook calls `loadStripePaymentPolicy` first, which throws when
`STRIPE_PAYMENT_LINK_ID` / `STRIPE_EXPECTED_LIVEMODE` are missing and returns
`500`. In that state **every real payment would fail to record** — the earlier
green end-to-end result no longer held.

### Actions taken

- Retrieved the Payment Link id from the Stripe Dashboard and set both policy
  variables on the deployment:
  ```sh
  npx convex env set STRIPE_EXPECTED_LIVEMODE false
  npx convex env set STRIPE_PAYMENT_LINK_ID plink_1U4g2gC23gnYvLlIl3Yjrdb1
  ```
  Deployment env is now `STRIPE_WEBHOOK_SECRET`, `STRIPE_EXPECTED_LIVEMODE`,
  `STRIPE_PAYMENT_LINK_ID`.
- Re-ran a real sandbox checkout: went straight to the Payment Link with
  `prefilled_email=availstripetest3@gmail.com` and paid £10 with test card
  `4242 4242 4242 4242`.

### Result — hardened flow verified

- The record reached `status: paid`, proving `validateCheckoutSession` accepted
  the session (payment link id, `livemode=false`, £10, gbp, paid all matched).
  A wrong `STRIPE_PAYMENT_LINK_ID` would have been rejected as
  `wrong_payment_link` — so the configured id is correct.
- This checkout took the "no prior record" branch of `markPaid`, which generates
  the redemption code *before* insert. A `paid` result therefore also confirms
  the new Web-Crypto `redemptionCode` generator produced a valid unique code
  (a failure there would have thrown and left the record unpaid).
- Confirmed Codex's privacy fix is live: `checkPosition` now returns only
  `{ found, status }`.

### Notes

- Gate 1 source (hardened webhook, `stripeSecurity.ts`, `redemptionCode.ts`,
  `stripeSignature.ts`, unit tests) is now verified end-to-end but was still
  uncommitted in the working tree at the time of this entry — safe to commit.
- Still outstanding (unchanged): Payment Link *After payment* redirect to
  `<site>/success?session_id={CHECKOUT_SESSION_ID}`, Resend email config
  (`RESEND_API_KEY` / `EMAIL_FROM`), and the `charge.refunded` path.
