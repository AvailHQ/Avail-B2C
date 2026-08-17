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

---

## 2026-08-16 — Gate 2 follow-up: retry-safe refunds and confirmation email delivery

- **Author:** Codex (GPT-5), via Codex desktop
- **Branch:** `main`
- **Scope:** Fix two retry gaps identified during review of the Gate 2 webhook
  implementation.

### Changes

- Refund events are no longer claimed before their PaymentIntent can be matched.
  An unmatched refund now fails the webhook transaction, leaves the event id
  unclaimed, and returns an HTTP failure so Stripe can retry it after the payment
  record becomes available.
- Payment confirmation email delivery now runs as a durable Convex scheduled
  action created atomically with the paid-state transition. Failed sends are
  recorded and retried up to six times with exponential backoff; successful
  delivery is recorded by waitlist id and suppresses later attempts.
- The Stripe HTTP action no longer sends confirmation mail inline, so webhook
  redelivery and email retry are independent concerns.

### Verification

- Added regression coverage proving an early refund remains unclaimed and can
  later be replayed successfully, plus confirmation-email state coverage proving
  failed attempts remain eligible until a successful attempt.
- Full suite: 31 tests passed. `npm run lint`, `npm run build`, and
  `git diff --check` pass.
- `npx convex codegen --typecheck enable` passed and uploaded the updated
  functions to the configured Convex development deployment.

---

## 2026-08-16 — Gate 3: refund policy + public data boundaries

- **Author:** Claude Opus 4.8 (`claude-opus-4-8`), via Claude Code
- **Branch:** `main`
- **Scope:** Close Gate 3 of `docs/stripe-security-testing.md` — partial-refund
  policy (REF-03) and public data boundaries (DATA-01–07).

### Finding fixed — business stats were publicly readable

`getStats` was a public `query`, so anyone could call it from a browser and read
`totalSignups` and `amountReserved` (total revenue). It is now an
`internalQuery`. Verified nothing referenced it (no frontend usage), so this
breaks nothing; expose it behind an authenticated admin surface if ever needed.

### Business decision recorded — partial refunds

**Any refund revokes the reservation, partial included.** The webhook now passes
`amount_refunded` / `amount` through, records `amountRefunded` on the record for
visibility, and logs a warning when the refund is partial (unusual for a fixed
£10 product) — but the status transition is the same as a full refund.

### Changes

- `convex/schema.ts`: optional `waitlist.amountRefunded`.
- `convex/http.ts`: pass `amountRefunded` and `chargeAmount` from the charge.
- `convex/waitlist.ts`: `markRefunded` records the refunded amount, flags/logs
  partial refunds, and returns `partialRefund`; `getStats` → `internalQuery`.

### Follow-up fix — stale cumulative refund total (found in review)

The first version of `markRefunded` returned early for an already-`refunded`
reservation, so `amountRefunded` was never advanced. Stripe's
`charge.amount_refunded` is **cumulative per charge**, so refunding £3 and then
the remaining £7 left the record claiming only 300 refunded while the customer
had been refunded in full — actively misleading for the reconciliation this
field exists for. The already-refunded branch now advances `amountRefunded`
(taking the maximum, so an out-of-order delivery cannot walk it backwards) while
still leaving `refundedAt` untouched per REF-02.

### Verification

- New `tests/convex/publicDataBoundary.test.ts` (12 tests): DATA-01–07 with
  exact-allowlist assertions (`checkPosition` returns only `{found, status}`;
  `getBySessionId` exposes only display fields and reveals the code only while
  `paid`), REF-03 partial/full refund policy, and regression coverage for
  consecutive partial refunds (total advances to 1000, `refundedAt` unchanged)
  and a stale out-of-order refund event (total cannot decrease).
- Note on method: asserting visibility by calling through the `api` handle does
  **not** work — convex-test resolves functions by path, and a call with empty
  args throws on arg validation, which is a false positive. The tests assert the
  registered function's `isInternal` metadata instead.
- Full suite 43 passed (19 unit + 24 convex); `oxlint`, `tsc -b` + `vite build`,
  `convex codegen --typecheck`, and `git diff --check` all clean. Live webhook
  still returns 400 to an unsigned probe.

### Remaining

Gate 4 (success-page Playwright UI-01–07; signup abuse/rate-limit ABUSE-01–06)
and Gate 5 (manual Stripe sandbox acceptance matrix: 3DS, declines, abandoned
checkout, duplicate payments, partial refund).

---

## 2026-08-16 — Gate 4: browser states + signup abuse controls

- **Author:** Claude Opus 4.8 (`claude-opus-4-8`), via Claude Code
- **Branch:** `main`
- **Scope:** Close Gate 4 — deterministic success-page browser tests (UI-01–07)
  and abuse controls on the public signup action (ABUSE-01–06).

### Bug found & fixed — a network blip stranded paying customers

Writing UI-05 exposed a real defect in `SuccessPage`: the poll caught lookup
errors into a `result` that stayed `null`, but `null` was also the "Convex not
configured" sentinel, so the very next branch gave up immediately. Despite the
comment claiming a retry, **a single transient failure showed the "we couldn't
verify" page instead of the redemption code** — exactly the moment (right after
payment, often on mobile) when a blip is most likely. Transient failures are now
distinguished from the permanent not-configured case and go through the bounded
retry. The test proved it: UI-05 went from settling in 1.4s to using the full
~15s budget, and new UI-05b shows recovery on the second poll.

### Abuse controls (new)

- `convex/inputLimits.ts`: size limits for name/email/UTM/referrer/variant,
  checked first — before any database, DNS, or email work (ABUSE-03).
- `convex/emailValidation.ts`: the DNS-over-HTTPS lookups now run under an
  `AbortController` with a 3s timeout and still fail open, so a slow resolver
  cannot hold the signup action open (ABUSE-04).
- `convex/rateLimit.ts` + `rateLimits` table: fixed-window buckets consumed in a
  single transaction. Convex actions expose no client IP, so the buckets are
  per-normalized-email (3 / 10 min) and global (60 / min). `submitEarlyAccess`
  now checks sizes → rate limits → DNS, so burst traffic cannot amplify DNS or
  Resend spend, and varying the email cannot bypass the global cap (ABUSE-05).

### Tests

- `tests/payment-success.spec.ts` (8 × 2 projects = 16): UI-01–07 plus UI-05b.
  The reservation lookup is controlled by intercepting the Convex `/api/query`
  request, **not** by adding a seam to the component — production code carries
  no test hook and the tests run offline.
- `tests/convex/signupAbuse.test.ts` (9): ABUSE-01–06 with `fetch` stubbed for
  both DNS and Resend, plus rate-limit window expiry. ABUSE-03 asserts zero DNS
  calls occur for oversized input; ABUSE-04's ~3s runtime is itself the evidence
  that the abort fires rather than waiting on the 30s stub.

### Review round — three findings fixed, two more found while fixing them

**P1 — the page claimed success before verifying.** The "confirming" state read
"Your payment went through", so anyone opening `/success?session_id=<anything>`
saw that claim for up to ~15s. That breaks the Gate 4 invariant directly. Copy
is now "We're checking your reservation with our payment provider."

**P1 — UI-07 was not testing unmount cleanup.** The test navigated with
`page.goto('/')`, a full page load that tears down the JS context, so React's
cleanup never ran. This app has no client-side routing, so a true unmount is not
reachable from the browser at all. The polling logic was therefore extracted to
`src/lib/reservationPolling.ts` (the effect is now a thin wrapper) and the
cancellation contract is covered by `tests/unit/reservationPolling.test.ts`. The
Playwright test was renamed to what it actually verifies. Extracting also
surfaced a defect: the `cancelled` flag alone let an already-queued retry fire
one more lookup after teardown, so cancel now clears the timer too.

**P2 — the rate-limit table grew forever and stored raw emails.** One row per
distinct address, kept indefinitely, holding unvalidated attacker-supplied
strings (and personal data) purely as a side effect. Keys are now SHA-256
hashes computed in the action, and `cleanupExpired` (cron in `convex/crons.ts`,
indexed by `windowStart`) drops stale windows.

**P2 follow-up — the first cleanup could not keep up.** A single capped pass
deleted at most 500 rows per run while the global limit alone permits 60 new
buckets a minute (~86k a day), so the table still grew under sustained abuse.
Three changes close the gap: the job now reschedules itself while it keeps
filling batches (each pass commits its deletes first, so the drain always
progresses and terminates); the cron runs hourly instead of daily; and retention
drops from 24h to 1h, which only has to exceed the longest window (10 min).
Covered by a test that drains a 12-row backlog with a batch size of 5.

**Found while fixing: the email assertions were vacuous.** `sendEmail` returns
early when `RESEND_API_KEY` is unset, which it is under convex-test — so no
request was ever made and ABUSE-06 passed without exercising anything. The tests
now stub the env, which made the reviewer's suggested `calls.resend === 1`
assertion meaningful: three concurrent signups send exactly one welcome email.

**Found while fixing: `npx playwright test` was broken.** `testDir: './tests'`
with the default pattern also matched the Vitest suites, so the bare command
failed on them. `testMatch: '**/*.spec.ts'` fixes it. This also explains the
reviewer's a11y `ERR_CONNECTION_REFUSED`: running specs in separate concurrent
invocations races the shared `webServer`. One invocation runs all 26 green.

### Verification

Vitest 62 passed (26 unit + 36 convex), stable across three consecutive runs;
Playwright 26 passed in a single run (16 payment-UI + 10 a11y); `oxlint`,
`tsc -b` + `vite build`, `convex codegen --typecheck`, and `git diff --check`
all clean.

### Remaining

Gate 5 only: the manual Stripe sandbox acceptance matrix (3DS, declined/failed
payments, abandoned checkout, duplicate payment with the same email, partial
refund), recorded per the checklist in `docs/stripe-security-testing.md`.

### Codex follow-up verification

Reviewed the Gate 4 fixes against the previous findings and reran the complete
local verification suite.

- **Verified fixed:** the confirming state now uses neutral copy and does not
  claim that an unverified payment succeeded.
- **Verified fixed:** reservation polling is extracted behind a cancellation
  contract; cancellation clears the queued timer and suppresses an in-flight
  result. Unit tests cover both cases.
- **Verified fixed:** signup tests configure the Resend environment and assert
  that three concurrent submissions create one record and exactly one welcome
  email request.
- **Verified fixed:** email bucket keys are SHA-256-derived rather than raw
  addresses, and expired rows are indexed for cleanup.
- **Capacity follow-up resolved:** `cleanupExpired` now processes capped batches
  and immediately reschedules itself whenever a batch is full, continuing until
  the stale backlog is empty. The cron runs hourly, retention is one hour (still
  longer than the longest 10-minute rate-limit window), and regression coverage
  proves that a backlog larger than one batch is fully drained without deleting
  a current bucket.

Verification on this review: Vitest **61/61**, Playwright **26/26** in one run,
`npm run lint`, `npm run build`, and `git diff --check` all passed. The cleanup
follow-up was subsequently verified with Vitest **62/62** passing, so Gate 4 is
complete.

---

## 2026-08-16 — Gate 5: Stripe sandbox acceptance matrix

- **Author:** Claude Opus 4.8 (`claude-opus-4-8`), via Claude Code
- **Branch:** `main`
- **Scope:** Run the seven-scenario manual acceptance matrix against the deployed
  dev build and Stripe sandbox, and record it in
  `tests/stripe-sandbox-checklist.md`.

### Results — all seven pass

3D Secure payment, declined card, abandoned checkout, duplicate payment on one
email, partial refund, refund of the remainder, and the redirect / email-copy /
mobile success page. Highlights:

- **3DS** produced the challenge, the dashboard logged "3D Secure authentication
  succeeded", and the reservation reached `paid` with one code and a correct
  personalised redirect. The challenge iframe is cross-origin, so the repo owner
  clicked *Complete* manually; every other step was automated.
- **Declined and abandoned checkouts created no record at all** — no entitlement
  leaks from an unpaid session.
- **Duplicate payment** left one reservation row with a single code and appended
  the second PaymentIntent to `duplicatePaymentIntents`, exactly as designed.
- **Partial then remainder refund** confirmed the Gate 3 fix in production data:
  `amountRefunded` advanced 300 → 1000 while `refundedAt` stayed at the first
  refund. Both refunds revoked the reservation, per the "any refund revokes"
  policy.

### Defect found and fixed — refunding a duplicate charge broke the webhook

The one-reservation-per-email policy tells the operator to refund the accidental
second charge, but `markRefunded` matched only the reservation's *primary*
PaymentIntent and Checkout Session. A refund of the duplicate matched nothing,
threw, and returned 500 — so Stripe would have retried that delivery for days
while the operator saw a permanently failing webhook, purely for following the
documented procedure. Reproduced with a Convex test rather than by refunding in
the sandbox, to avoid leaving a retrying failed delivery on the account.

Fix: duplicates are now also recorded in an indexed `duplicatePayments` table;
a refund matching one is acknowledged (200) **without** touching the reservation,
so the customer keeps the entitlement bought with the first charge. Covered by a
regression test.

**Follow-up (found in review): the fix only covered new duplicates.** Charges
already sitting in `waitlist.duplicatePaymentIntents` — written before the index
existed — had no index row, so refunding one still threw. Added
`convex/migrations.ts → backfillDuplicatePayments`, an idempotent internal
mutation that inserts the missing index rows. Run against the dev deployment:
`{ scanned: 1, inserted: 1 }`, and a second run returned `inserted: 0`. The test
asserts the whole arc — a legacy-shaped duplicate throws on refund, backfill
indexes it, the refund then succeeds without revoking the reservation, and a
re-run is a no-op. **Run this once against production before enabling live-mode
refunds** (see `docs/production-cutover.md`).

**Second follow-up (also from review): the backfill was capped at 1000 rows.** It
used a single `take(1000)`, so once the reservation table outgrew that, later
rows' duplicates would never be indexed — and the migration would still report
success. It now walks the whole table in creation order, one batch per
transaction, rescheduling itself while batches come back full (the same drain
pattern as the rate-limit cleanup). A test seeds seven legacy-shaped rows, runs
with `batchSize: 2`, and asserts every duplicate ends up indexed.

### Notes

- Sandbox only; no live-mode resource was touched.
- Email delivery was only partly exercisable here: the shared
  `onboarding@resend.dev` sender only delivers to the Resend account owner, so
  the synthetic payers could not receive mail and the page correctly showed the
  *undelivered* wording. Real delivery was verified in an earlier session.
- Observation: the payer of a duplicate charge lands on the unverified state
  (the duplicate's session id is deliberately not written to the reservation).
  The copy is safe, but they see no code — acceptable under the current policy.

### Verification

Vitest 65 passed; Playwright 26 passed in a single run (16 payment-UI, 10 a11y);
`oxlint`, `tsc -b` + `vite build`, `convex codegen --typecheck`, and
`git diff --check` clean.

### Status

Gates 1–5 of `docs/stripe-security-testing.md` are complete. Remaining work
before live mode is the production cutover itself, tracked in
`docs/production-cutover.md` (separate prod Convex deployment, live-mode Payment
Link and webhook with their own secrets, `STRIPE_EXPECTED_LIVEMODE=true`, a
verified Resend sending domain, and Vercel env pointed at prod).

---

## 2026-08-17 — Production cutover configuration (pre-transaction)

- **Author:** Codex (GPT-5), via Codex desktop, with dashboard steps completed
  by the repository owner
- **Branch:** `main`
- **Scope:** Connect the deployed website to isolated Stripe Live and Convex
  production resources, stopping before the first real-money transaction.

### Production resources configured

- Stripe Live Mode is available on the account.
- Created a one-off **GBP £10** Live Payment Link for Avail early access. The
  customer name is required, quantity adjustment is disabled, and the
  after-payment redirect is
  `https://myavail.vercel.app/success?session_id={CHECKOUT_SESSION_ID}`.
- Created Convex production deployment `proper-buffalo-120` in `eu-west-1` and
  deployed the committed Gate 5 functions.
- Created a Stripe Live event destination for the production Convex HTTP route,
  using Snapshot payloads and listening to `checkout.session.completed` and
  `charge.refunded`.
- Configured the production Convex Stripe signing secret, Live Payment Link
  allowlist id, and `STRIPE_EXPECTED_LIVEMODE=true`. Secret values are not
  recorded here.
- Ran `migrations:backfillDuplicatePayments` against production. The new
  database was empty: `{ continued: false, inserted: 0, scanned: 0 }`.
- Configured Vercel Production to use the production Convex URL and Live Payment
  Link, then rebuilt without the old build cache.

### Read-only verification

- An unsigned POST to the production webhook returned **HTTP 400 Invalid
  signature**, confirming the route is deployed and the signing secret is set.
- `/success`, `/privacy`, and `/terms` each return HTTP 200.
- The deployed JavaScript bundle contains
  `https://proper-buffalo-120.eu-west-1.convex.cloud` and the intended Live
  Payment Link URL.

### Deferred / not yet verified

- **No real payment has been made yet.** The first £10 Live transaction,
  successful webhook delivery, paid Convex record, redirect personalization,
  redemption code, and Stripe customer receipt remain to be verified.
- Resend production email is intentionally deferred because no owned sending
  domain is available yet. Payment state and code issuance do not depend on
  Resend; the success page will use its unsent-email wording. Stripe customer
  receipts should be used as the temporary payment confirmation channel.
- Do not publicly launch the Live Payment Link until the controlled first
  transaction passes and the Webhook destination reports HTTP 200.

---

## 2026-08-17 — Server-owned founding-athlete counter

- **Author:** Codex (GPT-5), via Codex desktop
- **Scope:** Replace the landing page's hard-coded `347` social-proof value with
  a production-backed counter.

### Implemented

- Added the indexed Convex `publicCounters` table and a narrowly scoped public
  query that exposes only `{ count }`; it does not expose waitlist records.
- The founding-athlete counter has a backend-only baseline of **347**. When no
  counter row exists, the public query returns 347.
- A genuinely new unique waitlist insert increments the counter in the same
  Convex transaction. An existing email, including case/space variants and
  concurrent repeats, returns the current value without incrementing it.
- The landing page now reads this value from Convex. It does not contain the 347
  baseline or derive/persist a count in browser state or local storage.
- Added regression coverage for the empty baseline, concurrent duplicate joins,
  normalized duplicate emails, and concurrent distinct joins.

### Production status

- Deployed the schema and functions to Convex production deployment
  `proper-buffalo-120`; `publicCounters.by_key` was created successfully.
- Direct production query verification returned `{ "count": 347 }`.
- The frontend production build is ready but **not yet deployed**: the Vercel
  CLI rejected its stored token as invalid. Re-authenticate Vercel (or publish
  the source through the normal Git deployment) before treating the UI change
  as live.

### Verification

- `convex codegen --typecheck enable`: passed.
- `vitest tests/convex/signupAbuse.test.ts`: 14 passed.
- `oxlint`: passed.
- `tsc -b && vite build`: passed.
