# Stripe Security Testing Plan

This document defines the security-focused test strategy for Avail's one-time
GBP 10 early-access reservation flow. Stripe sandbox is the final source of
truth for payment behaviour; mocks and fixtures are used only for fast,
repeatable regression tests.

Never run destructive, fuzzing, or adversarial tests against Stripe live mode.
Use local fixtures, the Convex development deployment, and Stripe sandbox data.

## Test layers

### 1. Unit tests

Test isolated validation and security rules without making network requests.

- Stripe webhook signature verification:
  - accepts a correctly signed raw payload;
  - rejects a missing or malformed `Stripe-Signature` header;
  - rejects a payload signed with the wrong secret;
  - rejects a payload changed after signing;
  - rejects timestamps more than five minutes old or in the future;
  - accepts a header containing multiple `v1` values when one is valid;
  - rejects correctly signed invalid JSON.
- Payment eligibility validation:
  - requires `payment_status` to be `paid`;
  - requires `amount_total` to equal `1000`;
  - requires `currency` to equal `gbp`;
  - requires the configured Avail Payment Link, Product, or Price identifier;
  - rejects a test/live environment mismatch;
  - rejects a missing Checkout Session id.
- Redemption-code generation:
  - uses a cryptographically secure random source;
  - produces only characters from the approved unambiguous alphabet;
  - produces the required length;
  - retries a collision and fails safely after the retry limit.

### 2. Convex integration tests

Test database state transitions and public API boundaries using signed Stripe
event fixtures.

- A valid `checkout.session.completed` event changes one matching reservation
  to `paid` and issues one redemption code.
- An invalid amount, currency, environment, or Payment Link makes no database
  change and issues no entitlement.
- Re-delivering the same Stripe `event.id` does not repeat database or email
  side effects.
- Concurrent deliveries for the same event or Checkout Session remain
  idempotent.
- Two different events for the same PaymentIntent do not issue two codes.
- A genuinely separate second payment is not mistaken for a webhook retry.
- An unpaid or incomplete Checkout Session does not become `paid`.
- A valid refund changes only the matching paid reservation to `refunded`.
- Duplicate refund delivery is safe and does not corrupt timestamps or state.
- A payment email failure does not roll back an already confirmed payment, and
  its retry behaviour is explicit.
- Public functions return only their documented field allowlist:
  - `checkPosition` does not expose Stripe ids, attribution, consent data, or a
    redemption code;
  - `getBySessionId` reveals the redemption code only for `paid` status;
  - internal payment mutations cannot be called from the browser;
  - internal business statistics are not publicly readable unless explicitly
    intended.
- Registration endpoints safely handle repeated email variants, oversized
  input, concurrent submissions, validation timeouts, and abusive request
  volume.

### 3. Stripe sandbox end-to-end tests

Test the complete browser → Stripe → webhook → Convex → success-page flow with
real Stripe sandbox objects.

- Successful GBP 10 card payment.
- A card requiring 3D Secure authentication.
- Declined and failed payments.
- Abandoned or expired Checkout.
- Duplicate checkout attempts using the same email.
- A second completed payment using the same email.
- Redirect to
  `/success?session_id={CHECKOUT_SESSION_ID}` and paid-state personalization.
- Missing, invalid, and expired `session_id` success-page states.
- Confirmation-email success and provider failure.
- Full refund and duplicate refund delivery.
- Partial refund, confirming that it follows the intended business policy and
  does not automatically revoke a fully paid entitlement unless required.

## Avail-specific implementation design

This repository currently has Playwright but no unit-test runner. Add Vitest and
`convex-test`; retain Playwright for browser assertions. Do not add
`stripe-mock`: it is stateless and cannot model the payment lifecycle that these
tests need.

### Proposed dependencies and scripts

Development dependencies:

- `vitest` for pure TypeScript tests;
- `convex-test` for fast Convex function and database tests;
- `stripe` for the official test signature generator and Stripe object types.

Proposed `package.json` scripts:

```json
{
  "test": "vitest run",
  "test:unit": "vitest run tests/unit",
  "test:convex": "vitest run tests/convex",
  "test:payment-ui": "playwright test tests/payment-success.spec.ts",
  "test:security": "npm run test:unit && npm run test:convex && npm run test:payment-ui"
}
```

Stripe sandbox tests remain intentionally manual or explicitly triggered. They
must not run automatically on every pull request because they create persistent
Stripe and Convex sandbox data and may send email.

### Proposed file layout

```text
convex/
├── stripeSecurity.ts                 # pure eligibility/config validation
├── stripeSignature.ts                # raw-body signature verification
├── stripeEvents.ts                   # event deduplication and dispatch
└── waitlist.ts                       # transactional reservation transitions

tests/
├── fixtures/stripe/
│   ├── checkout-session-paid.json
│   ├── checkout-session-unpaid.json
│   ├── checkout-session-wrong-amount.json
│   ├── checkout-session-wrong-currency.json
│   ├── checkout-session-wrong-link.json
│   ├── charge-refunded-full.json
│   └── charge-refunded-partial.json
├── helpers/
│   ├── stripeEvent.ts                # event factory + official test signature
│   └── convex.ts                     # convex-test setup and seed helpers
├── unit/
│   ├── stripeSignature.test.ts
│   ├── stripeEligibility.test.ts
│   └── redemptionCode.test.ts
├── convex/
│   ├── paymentLifecycle.test.ts
│   ├── webhookIdempotency.test.ts
│   ├── refundLifecycle.test.ts
│   └── publicDataBoundary.test.ts
├── payment-success.spec.ts           # Playwright success-page states
└── stripe-sandbox-checklist.md       # dated manual run evidence
```

Fixtures must contain synthetic identities only. Never commit exported customer
or webhook payloads containing real names, email addresses, Stripe customer ids,
PaymentIntent ids, or redemption codes.

### Required production seams before testing

The following small refactors make security rules independently testable while
keeping the HTTP handler thin:

1. Move `verifyStripeSignature` out of `convex/http.ts` into a module that
   accepts the payload, header, secret, current time, and tolerance.
2. Add a pure `validateCheckoutSession` function. It must compare the event with
   server-side environment configuration for expected amount, currency, Payment
   Link or Price, and `livemode`.
3. Pass the Stripe top-level `event.id` into the database layer.
4. Add a `stripeEvents` table keyed by event id and record processing state.
   Claiming an unseen event and applying its business mutation must be designed
   so concurrent deliveries cannot issue the entitlement twice.
5. Replace `Math.random()` redemption generation with a cryptographically
   secure random source before treating collision tests as meaningful.
6. Decide whether `getStats` is intentionally public. If not, make it internal
   or authenticated before writing its boundary test.

## Personalized test catalogue

Each test below maps directly to current Avail code and expected state.

### A. Webhook authenticity — `convex/http.ts`

| ID | Scenario | Expected result |
| --- | --- | --- |
| SIG-01 | Correct raw payload, current timestamp, correct secret | Accepted and dispatched once |
| SIG-02 | Missing signature header | HTTP 400; no database write |
| SIG-03 | Wrong signing secret | HTTP 400; no database write |
| SIG-04 | Change one byte after signing | HTTP 400; no database write |
| SIG-05 | Valid signature older than 300 seconds | HTTP 400; no database write |
| SIG-06 | Valid signature more than 300 seconds in the future | HTTP 400; no database write |
| SIG-07 | Multiple `v1` values, one valid | Accepted |
| SIG-08 | Signature valid but body is invalid JSON | HTTP 400; no database write |
| SIG-09 | Secret missing from deployment environment | HTTP 500 without leaking configuration |

Generate signed headers using Stripe Node's official
`webhooks.generateTestHeaderString` instead of duplicating the implementation
under test. This is adapted from Stripe Node's webhook-signing example.

### B. Entitlement eligibility — `convex/http.ts` → `waitlist.markPaid`

| ID | Signed Checkout Session | Expected result |
| --- | --- | --- |
| PAY-01 | Paid, GBP 1000, allowed Payment Link, matching environment | Reservation becomes `paid`; one code issued |
| PAY-02 | `payment_status: unpaid` | Acknowledge/ignore; no entitlement |
| PAY-03 | Amount 1 or 999 | Reject/ignore; no entitlement and security log |
| PAY-04 | Currency `usd` | Reject/ignore; no entitlement |
| PAY-05 | Different Payment Link or Price from same Stripe account | Reject/ignore; no entitlement |
| PAY-06 | Live event in sandbox or sandbox event in live deployment | Reject/ignore; no entitlement |
| PAY-07 | Missing Session id | HTTP 400 or controlled failure; no write |
| PAY-08 | No matching waitlist email | Create one paid record only when every payment invariant passes |
| PAY-09 | Mixed-case matching email | Reconcile to the normalized existing record |

PAY-03 through PAY-06 are the main payment-bypass regression tests. A valid
Stripe signature proves the event came from the Stripe account; it does not
prove that the event purchased the Avail product.

### C. Idempotency and concurrency — `stripeEvents` + `waitlist.markPaid`

| ID | Scenario | Expected result |
| --- | --- | --- |
| IDEM-01 | Deliver the same `event.id` twice | One state transition, one code, one email attempt |
| IDEM-02 | Concurrent delivery of the same event | Same outcome as one delivery |
| IDEM-03 | Different event ids for the same Session | One entitlement; duplicate recorded safely |
| IDEM-04 | Same PaymentIntent referenced twice | One entitlement |
| IDEM-05 | Same email makes a genuinely separate second payment | Explicit business result; never silently classified as a retry |
| IDEM-06 | Paid event arrives after the record is `refunded` | Follow an explicit transition policy; never restore accidentally |
| IDEM-07 | Database succeeds and email provider fails | Payment stays paid; retry policy cannot issue another code |

The business decision for IDEM-05 must be fixed before implementation: either
reject/flag duplicate reservations per email or model multiple orders. The
current single waitlist row per email cannot faithfully represent two payments.

### D. Refund lifecycle — `convex/http.ts` → `waitlist.markRefunded`

| ID | Scenario | Expected result |
| --- | --- | --- |
| REF-01 | Full refund for a known PaymentIntent | Status becomes `refunded` once |
| REF-02 | Duplicate full-refund event | No duplicate side effects or timestamp corruption |
| REF-03 | Partial refund | Follow documented policy; do not automatically treat as full refund |
| REF-04 | Refund for unknown PaymentIntent | Controlled `not_found`; no unrelated record changes |
| REF-05 | Refund arrives before completion event | Recorded/reconciled without granting a lasting entitlement |

The existing `charge.refunded` handler does not distinguish partial from full
refunds, so REF-03 should initially be a failing regression test that drives the
policy fix.

### E. Public data boundaries — `convex/waitlist.ts`

| ID | Request | Permitted response |
| --- | --- | --- |
| DATA-01 | `checkPosition` with a known email | `found` and `status` only |
| DATA-02 | `checkPosition` with unknown email | `found: false`; no enumeration detail |
| DATA-03 | `getBySessionId` for paid reservation | Allowed display fields and code only |
| DATA-04 | `getBySessionId` for unpaid/refunded reservation | No redemption code |
| DATA-05 | Random/oversized Session id | Safe not-found/validation response |
| DATA-06 | Anonymous `getStats` call | Denied unless public access is an explicit product decision |
| DATA-07 | Browser attempts an internal mutation | Convex rejects access |

Assert exact object equality, not just the presence of desired fields. Exact
allowlist assertions catch future accidental exposure of Stripe ids or consent
and attribution fields.

### F. Success-page browser states — `src/pages/SuccessPage.tsx`

Use Playwright request interception or an injectable reservation lookup to make
these deterministic; do not depend on a real Stripe call in CI.

| ID | Lookup state | Visible result |
| --- | --- | --- |
| UI-01 | Paid, code present, email sent | Confirmed copy, name, email, and code |
| UI-02 | Paid, email not sent | Confirmed payment but future-tense email copy |
| UI-03 | Missing `session_id` | Unverified state; never says payment is confirmed |
| UI-04 | Unknown or forged Session id | Unverified after bounded polling |
| UI-05 | Convex unavailable | Unverified state without uncaught error |
| UI-06 | Refunded status | No redemption code and no paid confirmation |
| UI-07 | Component unmounts while polling | No post-unmount update or runaway retry |

Following Stripe's `accept-a-payment` repository, retain Playwright trace and
screenshots on failure. Visual snapshots are optional; text and state assertions
are mandatory because security copy must not regress silently.

### G. Signup abuse — `waitlist.submitEarlyAccess`

| ID | Scenario | Expected result |
| --- | --- | --- |
| ABUSE-01 | Concurrent submissions for one normalized email | One waitlist record and at most one welcome email |
| ABUSE-02 | Case/space variants of one email | One identity |
| ABUSE-03 | Oversized name, email, UTM, or referrer | Rejected before expensive work |
| ABUSE-04 | MX lookup timeout | Bounded failure; no hung action |
| ABUSE-05 | Burst requests | Rate limit/abuse control activates |
| ABUSE-06 | Resend unavailable or quota exhausted | Controlled outcome without leaking provider details |

These tests adapt OWASP API Security categories for excessive data exposure,
resource consumption, and unrestricted access to sensitive business flows.

## Implementation sequence

Implement in small gates so failing tests identify one security boundary at a
time.

### Gate 1 — deterministic security primitives

1. Install Vitest, `convex-test`, and Stripe Node as development dependencies.
2. Extract signature and payment-eligibility helpers.
3. Add SIG-01 through SIG-09 and PAY-01 through PAY-07.
4. Add secure redemption-code generation tests.

Gate passes when an ineligible but correctly signed event cannot reach
`markPaid`.

### Gate 2 — transactional payment lifecycle

1. Add the `stripeEvents` schema and event-id processing path.
2. Add Convex fixtures and seed helpers.
3. Implement IDEM-01 through IDEM-07 and PAY-08/PAY-09.
4. Decide and document repeat-payment-per-email behaviour.

Gate passes when duplicate and concurrent delivery cannot create a second
entitlement or email side effect.

### Gate 3 — refund and privacy boundaries

1. Implement REF-01 through REF-05.
2. Define partial-refund behaviour.
3. Implement DATA-01 through DATA-07 using exact response allowlists.
4. Make `getStats` internal/authenticated unless deliberately public.

Gate passes when refunds cannot accidentally grant/revoke the wrong entitlement
and public calls expose no payment internals.

### Gate 4 — browser and abuse controls

1. Add deterministic reservation-lookup control for Playwright.
2. Implement UI-01 through UI-07 for desktop and mobile Chromium.
3. Add input limits, request throttling, and bounded external calls.
4. Implement ABUSE-01 through ABUSE-06.

Gate passes when the browser never asserts unverified success and anonymous
traffic cannot cheaply amplify MX or email-provider work.

### Gate 5 — sandbox acceptance

Run the sandbox checklist manually against the deployed development build.
Record, without secrets or customer data:

- date and tester;
- deployed commit SHA;
- Stripe sandbox Payment Link identifier suffix;
- Convex development deployment name;
- scenario result and relevant Stripe event type;
- confirmation that no live-mode resource was touched.

Do not paste signing secrets, full Session ids, PaymentIntent ids, customer
emails, or redemption codes into the checklist or developer log.

## Source adaptations

- Stripe's `checkout-one-time-payments` sample supplies the one-time Checkout
  lifecycle and Checkout Session return pattern. Avail keeps its Payment Link
  flow, so server-side Session creation code is not copied.
- Stripe's `stripe-node` webhook-signing example supplies independent signed
  test-header generation and raw-body test cases.
- Stripe's `accept-a-payment` suite supplies the Playwright failure-artifact and
  browser-matrix approach.
- Convex's `convex-test` pattern supplies an isolated database per test and
  direct invocation of public/internal Convex functions.
- Convex SaaS examples supply the separation between the HTTP webhook boundary,
  event handler, and transactional database mutation; subscription-specific
  code is excluded.
- OWASP API Security testing categories supply privacy, resource-consumption,
  sensitive-flow, and unsafe-webhook-consumption cases. Generic automated
  fuzzers are not pointed at Stripe or production.

For webhook delivery checks, use Stripe CLI against a development endpoint and
limit forwarding to the event types used by this integration:

```sh
stripe listen \
  --events checkout.session.completed,charge.refunded \
  --forward-to <development-webhook-url>
```

## Required security invariants

Every automated layer should enforce these invariants:

1. The browser redirect never marks a reservation as paid.
2. Only a verified, eligible Stripe event can issue an entitlement.
3. The server validates product identity, amount, currency, environment, and
   payment status instead of trusting the browser or email alone.
4. Processing the same Stripe event more than once has the same outcome as
   processing it once.
5. Public endpoints return the minimum necessary data.
6. Card details, Stripe secrets, raw sensitive payloads, and complete redemption
   codes are never written to application logs.

## Exit criteria

The payment flow is ready for live-mode review only when:

- all unit and Convex integration security tests pass in CI;
- the sandbox end-to-end matrix has been completed and recorded;
- the Payment Link/product allowlist is configured independently for sandbox
  and live environments;
- webhook event-id deduplication is deployed;
- redemption codes use cryptographically secure randomness;
- rate limiting or equivalent abuse controls protect expensive public actions;
- no known high- or critical-severity finding remains open.

## Implementation status

### Gate 1 — implemented 2026-08-16

- Vitest, `convex-test`, and Stripe Node test tooling installed.
- Vitest discovery isolated from Playwright and `.claude` worktrees.
- Stripe signature verification extracted and covered by official Stripe test
  signatures.
- GBP 10, GBP currency, Payment Link, payment status, and test/live eligibility
  rules extracted and enforced before `markPaid`.
- Redemption codes now originate from Web Crypto with rejection sampling; the
  deterministic Convex mutation selects the first valid unique candidate.
- Nineteen unit security tests pass.
- Convex code generation/typecheck, application lint, and production build pass.
- Dependency audit reports zero known vulnerabilities after compatible patch
  upgrades.

Before deploying this Gate, set these Convex environment variables:

```sh
npx convex env set STRIPE_PAYMENT_LINK_ID plink_<sandbox-payment-link-id>
npx convex env set STRIPE_EXPECTED_LIVEMODE false
```

The webhook intentionally fails closed with HTTP 500 when either policy value
is absent. Use separate values for the eventual live deployment.
