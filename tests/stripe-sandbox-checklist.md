# Stripe Sandbox Acceptance Checklist (Gate 5)

Manual end-to-end acceptance for the paid early-access reservation flow, run
against the deployed **development** build and Stripe **sandbox**.

> **Recording rules.** Never paste secrets or customer data here: no signing
> secrets, no API keys, no full Checkout Session / PaymentIntent / Payment Link
> ids, no real email addresses, no redemption codes. Use the last few characters
> of an id, and refer to payers as synthetic labels (T1, T2, …). Never run this
> matrix against live mode.

---

## Run 1

| Field | Value |
| --- | --- |
| Date | 2026-08-16 |
| Tester | Claude Opus 4.8 (`claude-opus-4-8`), via Claude Code |
| Deployed commit | `c7b8693` — verified by fingerprinting the served Vercel bundle |
| Convex deployment | `basic-otter-332` (dev, eu-west-1) |
| Stripe Payment Link | test-mode link, id suffix `…3Yjrdb1` |
| Stripe mode | Sandbox / test mode only |
| `STRIPE_EXPECTED_LIVEMODE` | `false` |
| Live-mode resources touched | **None** — every card, link, refund, and event was sandbox |

Payers are synthetic `example.com` addresses (T1–T5), not real people.
Test cards are Stripe's published test numbers: `4242…4242` success,
`4000 0025 0000 3155` 3DS-required, `4000…0002` declined.

### Results

| # | Scenario | Stripe event | Result | Verdict |
| --- | --- | --- | --- | --- |
| S1 | 3D Secure authenticated payment (T1) | `checkout.session.completed` | Challenge shown; dashboard logged "3D Secure authentication succeeded"; record → `paid`, one code issued; redirect landed on `/success?session_id=…` and personalised | **Pass** |
| S2 | Declined card (T2) | none | Stripe refused at checkout ("card was declined"); **no record created**, no entitlement | **Pass** |
| S3 | Abandoned checkout (T3) | none | Left checkout without paying; **no record, no state change** | **Pass** |
| S4 | Duplicate payment, same email (T4 ×2) | 2 × `checkout.session.completed` | One reservation row, **one** code (not re-issued); second PaymentIntent (`…0ztUQg1W`) appended to `duplicatePaymentIntents`; primary session/PI unchanged | **Pass** |
| S5 | Partial refund £3 of £10 (T1) | `charge.refunded` | `status → refunded` (policy: any refund revokes), `amountRefunded = 300`, `refundedAt` set | **Pass** |
| S6 | Refund of the remaining £7 (T1) | `charge.refunded` (2nd) | `amountRefunded` advanced 300 → **1000**; `refundedAt` **unchanged** from the first refund | **Pass** |
| S7 | Redirect, confirmation email, mobile success page | — | Redirect carries `session_id`; personalised page correct on desktop and at 375 px; email copy correctly said "we'll email you" rather than claiming delivery | **Pass (email delivery: see note)** |

### Notes and observations

- **S1 needed one human click.** Stripe's 3DS challenge renders in a
  cross-origin iframe that automated clicks cannot reach; the repo owner clicked
  **Complete** manually. Everything either side of that click was automated.
- **S7 email delivery is only partly covered here.** The sandbox sender
  (`onboarding@resend.dev`) only delivers to the Resend account owner, so the
  synthetic payers could not receive mail. The page correctly showed the
  *undelivered* wording. Actual delivery (`confirmationEmailSent: true` plus an
  inbox check) was verified in an earlier session using the owner's own address.
- **Duplicate payment UX.** The payer of a second charge lands on the unverified
  state, because the duplicate's session id is deliberately not written to the
  reservation. The copy is safe — it never claims success, and it tells the
  customer to keep their receipt — but they do not see a code. Acceptable under
  the one-reservation-per-email policy; worth revisiting if duplicates turn out
  to be common.

### Defect found and fixed during this run

**Refunding a duplicate charge broke the webhook.** The policy tells the operator
to refund the accidental second payment, but `markRefunded` matched only the
reservation's primary PaymentIntent and Checkout Session. A refund of the
duplicate therefore matched nothing, threw, and returned 500 — so Stripe would
have retried that delivery for days while the operator saw a permanently failing
webhook. Reproduced with a Convex test rather than by refunding in the sandbox,
to avoid leaving a retrying failed delivery on the account.

Fix: duplicates are now also written to an indexed `duplicatePayments` table, and
a refund matching one is acknowledged (200) **without** touching the
reservation — the customer keeps the entitlement they paid for with the first
charge. Covered by a regression test.

### Supporting automated verification (same commit + fix)

Vitest 63 passed; Playwright 26 passed in a single run (16 payment-UI, 10 a11y);
`oxlint`, `tsc -b` + `vite build`, and `git diff --check` clean.

### Sign-off

All seven scenarios pass. One defect was found and fixed during the run; no
live-mode resource was touched at any point.
