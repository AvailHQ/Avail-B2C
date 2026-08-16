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

---

## 2026-08-16 — A11y fix, Vercel SPA routing, deployed-site diagnosis, cutover doc

- **Author:** Claude Opus 4.8 (`claude-opus-4-8`), via Claude Code
- **Branch:** `main`
- **Scope:** Clear the last pre-commit gate, fix production routing, diagnose why
  the deployed success page can't verify payments, and document the prod cutover.

### Done

- **Accessibility (last failing gate → 10/10):** the marketing-consent copy in
  `EarlyAccessSection.tsx` was `#64707D` on the tinted form background (4.38:1,
  below WCAG AA 4.5:1). Changed to `#556166` (~5.56:1), an existing palette
  colour already used in the same component. `npm run test:a11y` now 10/10.
- **Vercel SPA routing:** added `vercel.json` with a catch-all rewrite to
  `/index.html`. The app is client-routed, so on Vercel `/success`, `/privacy`,
  and `/terms` were returning hard 404s — which would have broken the Stripe
  post-payment redirect entirely. After deploy, all three return 200.

### Diagnosis — deployed site is disconnected from Convex

Probing the live success page with a known-paid `session_id` showed the
"we're checking your reservation" fallback, not the personalized page.
Inspecting the deployed bundle (`/assets/index-*.js`) found **no** `*.convex.cloud`
URL, i.e. **`VITE_CONVEX_URL` is not set in Vercel**. Consequence: on the live
site `client` is null, so signups are never written to Convex and the success
page can never verify a payment. Fix (pending, user action in Vercel):

| Vercel env (Production) | Value |
| --- | --- |
| `VITE_CONVEX_URL` | `https://basic-otter-332.eu-west-1.convex.cloud` (for sandbox testing) |
| `VITE_STRIPE_PAYMENT_LINK` | `https://buy.stripe.com/test_bJe5kCbv08qa6RA3Ni6Na00` |

Then redeploy (Vite injects env at build time).

### Added

- `docs/production-cutover.md` — checklist to move from the dev deployment
  (`basic-otter-332`) + Stripe sandbox to a dedicated prod Convex deployment +
  Stripe live mode, capturing the fail-closed webhook, per-endpoint signing
  secrets, the Vercel `VITE_CONVEX_URL` requirement, and the SPA rewrite.

### Deploy state

- `main` is pushed; Vercel redeployed with `vercel.json` (SPA routes now 200).
- Deployed flow still blocked until `VITE_CONVEX_URL` is set in Vercel.

---

## 2026-08-16 — Vercel env, production end-to-end test, redirect fix, jump polish

- **Author:** Claude Opus 4.8 (`claude-opus-4-8`), via Claude Code
- **Branch:** `main`
- **Scope:** Connect the deployed site to Convex, run the full flow on the live
  domain, fix the post-payment redirect, and smooth the success-page transition.

### Vercel env configured (via the user's browser)

Added on the `myavail` project (Production + Preview), then redeployed:

| Name | Value |
| --- | --- |
| `VITE_CONVEX_URL` | `https://basic-otter-332.eu-west-1.convex.cloud` |
| `VITE_STRIPE_PAYMENT_LINK` | `https://buy.stripe.com/test_bJe5kCbv08qa6RA3Ni6Na00` |

After the redeploy the bundle contains the Convex URL and the live
`/success?session_id=…` renders the personalized page (name + code).

### Production end-to-end test (deployed site)

Full flow on `myavail.vercel.app` with a fresh email (`availstripetest4@…`):
signup form → Convex `email_only` (confirms the deployed form now writes to the
backend), Stripe £10 with test card → webhook → record `paid`. All good.

### Redirect fix

The Payment Link *After payment* redirect was set to a plain
`https://myavail.vercel.app/success`. Stripe did **not** auto-append the session
id, so the redirect landed on `/success` with no `session_id` and the page showed
the unverified fallback. Fix (done by the user in Stripe): set the redirect to
`https://myavail.vercel.app/success?session_id={CHECKOUT_SESSION_ID}` — Stripe
substitutes the placeholder, so the page can look the reservation up.
(`docs/production-cutover.md` already documents the placeholder form.)

### Success-page "jump" polish (`src/pages/SuccessPage.tsx`)

On landing, the page briefly shows a "Confirming…" state, then swaps to the paid
state once the lookup resolves. Because the content was vertically centered and
the two states differ in height, the icon/heading visibly jumped. Fix:

- Top-align the content (`items-start`) so the icon/heading keep a fixed
  position across states; the taller paid content grows downward instead.
- Wrap each state in the site's existing `fade-up` animation (keyed per phase)
  so the swap fades in softly instead of hard-cutting.

Payment recording is unaffected — this is presentation only. `tsc -b` passes.
Change is local until committed + pushed (Vercel redeploy to reach production).

---

## 2026-08-16 — Resend email + refund-path verification (sandbox)

- **Author:** Claude Opus 4.8 (`claude-opus-4-8`), via Claude Code
- **Branch:** `main`
- **Scope:** Configure transactional email and verify the two remaining
  operational paths end-to-end: confirmation emails and refunds.

### Resend configured

Set on the Convex deployment (`basic-otter-332`):

| Var | Value |
| --- | --- |
| `RESEND_API_KEY` | `re_…` (created in Resend) |
| `EMAIL_FROM` | `Avail <onboarding@resend.dev>` |

Note: with the shared `onboarding@resend.dev` sender and no verified domain,
Resend only delivers to the account owner's own email. So the email test used
`miaoyulun380@gmail.com` as the checkout email. Production needs a verified
domain (see `docs/production-cutover.md`).

### Email test — verified

Full flow on `myavail.vercel.app` with `miaoyulun380@gmail.com`: signup →
`email_only` (welcome email path), Stripe £10 → webhook → `paid`. The success
page showed "You're in, Yulun.", code `MNCZDSKKQXMSZCP6`, and — critically —
"We've sent a confirmation to miaoyulun380@gmail.com". That copy is gated on
`confirmationEmailSent`, and the backend confirmed `confirmationEmailSent: true`,
proving the confirmation email actually sent (Resend accepted) and
`markConfirmationEmailSent` ran. This also re-confirmed the redirect fix:
`session_id` now arrives and the page personalizes.

### Refund test — verified

Even though the product is marketed "Non-refundable", the `charge.refunded`
handler is a defensive path for chargebacks/disputes and manual refunds (a bank
can force a refund regardless of policy). Tested by refunding the £10
PaymentIntent (`pi_3U57kJC…`) in the Stripe sandbox dashboard:

- Stripe status → Refunded; `charge.refunded` webhook fired.
- `markRefunded` matched by `stripePaymentIntentId` and set the record to
  `status: "refunded"` (confirmed via both `getBySessionId` and `checkPosition`).
- `getBySessionId` no longer returns the redemption code once refunded (it is
  only returned while `paid`), so a refunded customer loses code exposure and,
  revisiting the success URL, lands on the unverified state rather than the code.

### Status

- Done: sandbox E2E, Gate 1 hardening, Vercel wiring, redirect, success page
  (personalization + jump polish), Resend email, refund path.
- Remaining: Gate 2 idempotency tests (`docs/stripe-security-testing.md`).
- Uncommitted at time of writing: `src/pages/SuccessPage.tsx` (jump polish),
  `docs/production-cutover.md`, `docs/developer-log.md`.

---

## 2026-08-16 — Gate 2: webhook idempotency + a refund-restore bug fix

- **Author:** Claude Opus 4.8 (`claude-opus-4-8`), via Claude Code
- **Branch:** `main`
- **Scope:** Make Stripe webhook processing idempotent (redelivery/concurrency
  safe) and fix a real bug found while reading the code.

### Bug found & fixed (IDEM-06)

`markPaid` only short-circuited on `status === "paid"`. If a reservation was
already `refunded` and a late/duplicate `checkout.session.completed` arrived
(Stripe retries are common), it fell through and patched the record back to
`paid`, re-issuing the entitlement. Now a paid event for a `refunded` reservation
is ignored (`alreadyRefunded`).

### Business decision recorded

One reservation per email (matches the one-time £10 model). A genuinely separate
second payment for an already-paid email is **not** given a second code; its
PaymentIntent is appended to `duplicatePaymentIntents` and logged for manual
refund (IDEM-05).

### Changes

- `convex/schema.ts`: new `stripeEvents` table (`eventId` indexed) for event
  dedup; new optional `waitlist.duplicatePaymentIntents` field. Both additions
  are backward-compatible.
- `convex/waitlist.ts`: `claimStripeEvent(ctx, eventId, type)` helper claims an
  event id in the same transaction as the business write — Convex's serializable
  execution makes redelivery/concurrency a no-op, and a later throw rolls the
  claim back so retries still work. `markPaid`/`markRefunded` now take `eventId`,
  dedup on it, guard against restoring a refunded record, flag duplicate
  payments, and no longer overwrite `refundedAt` on a second distinct refund
  event.
- `convex/http.ts`: pass the top-level `event.id` into both mutations.

### Verification

- `tests/convex/webhookIdempotency.test.ts`: 11 tests covering IDEM-01–07,
  PAY-08/09, and REF-01/02/04 (plus refund-event dedup).
- Full suite 30 passed (19 Gate 1 unit + 11 Gate 2 convex); `oxlint` clean;
  `tsc -b` + `vite build` pass. Functions deployed to `basic-otter-332`; the
  live webhook still returns 400 to an unsigned probe (no 500 regression).

### Note

Gate 2 code is deployed to the dev deployment (via `convex dev`/codegen) but the
source is uncommitted. `docs/stripe-security-testing.md` Gate 3+ (partial-refund
policy, public-data-boundary tests, browser/abuse gates) remain.
