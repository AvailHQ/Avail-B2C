# Backend data model

## Purpose

This document defines the first backend data model for MyAvail's early-access and payment funnel.

The intended journey is:

```text
Website visit -> Join waitlist -> Start checkout -> Payment completed or checkout expired
```

The waitlist is a simple early-access registration. It does not include referrals, referral codes, referral counts, or queue rankings.

General anonymous browsing and interaction analytics remain in Vercel Analytics and are subject to the site's analytics-cookie consent. Convex stores submitted business records and payment lifecycle data; it is not a duplicate analytics store.

## Data principles

- Collect only data needed to operate the waitlist and payment flow.
- Normalise email addresses by trimming whitespace and converting them to lowercase.
- Keep one waitlist record per email address.
- Store money in the currency's smallest unit. For example, GBP 29.99 is stored as `2999`.
- Treat Stripe webhooks as the source of truth for payment status.
- Never store card numbers, CVC values, bank details, Stripe secret keys, or webhook secrets in Convex.
- Do not collect health, cycle, wearable, or other sensitive data in this pre-launch flow.
- Do not interpret joining the waitlist as consent to unrelated marketing. Marketing consent must be captured separately if it is introduced.

## Tables

### `waitlist`

Created as soon as a visitor successfully submits the Join waitlist form.

```ts
{
  name: string,
  email: string,
  status: "waitlisted" | "checkout_started" | "paid" | "unsubscribed",

  source?: string,
  landingPath?: string,
  utmSource?: string,
  utmMedium?: string,
  utmCampaign?: string,

  privacyPolicyVersion: string,
  consentedAt: number,
  createdAt: number,
  updatedAt: number,
}
```

Required indexes:

- `by_email` on `email`
- `by_status` on `status`

Rules:

- A repeated submission with the same normalised email updates the existing record instead of creating a duplicate.
- Source and UTM fields are optional attribution attached to the submitted registration. They are not intended to reproduce page-level analytics.
- `consentedAt` records acceptance of the form's stated processing purpose and privacy notice. It does not automatically represent marketing consent.

### `checkoutSessions`

Created when a registered user starts Stripe Checkout.

```ts
{
  waitlistId: Id<"waitlist">,
  stripeCheckoutSessionId: string,
  stripePriceId: string,
  amount: number,
  currency: string,
  status: "open" | "completed" | "expired",
  createdAt: number,
  expiresAt?: number,
  completedAt?: number,
}
```

Required indexes:

- `by_stripeSessionId` on `stripeCheckoutSessionId`
- `by_waitlistId` on `waitlistId`
- `by_status` on `status`

Rules:

- `open` means Checkout was created but no final Stripe result has been received.
- `completed` is set only after verified Stripe confirmation.
- `expired` is set from Stripe's session-expired event or a trusted reconciliation process.
- Returning through the Checkout cancel URL may be tracked as a UI event, but it must not be treated as authoritative payment status. A user can also close the browser without returning.

### `customers`

Created when a Stripe customer is established or payment is successfully completed. It links the early-access identity to the payment customer without storing payment credentials.

```ts
{
  waitlistId: Id<"waitlist">,
  name: string,
  email: string,
  stripeCustomerId: string,
  status: "active" | "refunded" | "blocked",
  createdAt: number,
  updatedAt: number,
}
```

Required indexes:

- `by_waitlistId` on `waitlistId`
- `by_email` on `email`
- `by_stripeCustomerId` on `stripeCustomerId`

Rules:

- Do not store passwords in this table. Authentication should use a dedicated identity provider if accounts are added later.
- A customer record may be enriched later with an authentication user ID, but only when an account system exists.

### `orders`

Stores one record per payment order.

```ts
{
  customerId: Id<"customers">,
  waitlistId: Id<"waitlist">,
  stripeCheckoutSessionId: string,
  stripePaymentIntentId?: string,
  stripePriceId: string,
  amount: number,
  currency: string,
  status: "pending" | "paid" | "payment_failed" | "refunded" | "partially_refunded",
  createdAt: number,
  paidAt?: number,
  refundedAt?: number,
}
```

Required indexes:

- `by_customerId` on `customerId`
- `by_waitlistId` on `waitlistId`
- `by_stripeSessionId` on `stripeCheckoutSessionId`
- `by_stripePaymentIntentId` on `stripePaymentIntentId`
- `by_status` on `status`

Rules:

- Payment success, failure, and refund states are updated from verified Stripe webhooks.
- The frontend success page is not sufficient evidence that an order was paid.
- Stripe remains the system of record for payment instruments and transaction processing; Convex stores the business-facing order state.

### `stripeEvents`

Stores processed Stripe webhook IDs so retries do not create duplicate orders or repeat entitlement changes.

```ts
{
  stripeEventId: string,
  eventType: string,
  status: "processing" | "processed" | "failed",
  receivedAt: number,
  processedAt?: number,
  errorMessage?: string,
}
```

Required indexes:

- `by_stripeEventId` on `stripeEventId`
- `by_status` on `status`

The webhook handler must check `stripeEventId` before applying business changes. Event processing must be idempotent because Stripe can deliver the same event more than once.

## Lifecycle

### Waitlist submission

1. Validate and normalise `name` and `email`.
2. Insert a new waitlist record, or update the existing record for that email.
3. Set `waitlist.status` to `waitlisted` unless it is already `paid` or `unsubscribed`.

### Checkout started

1. Create the Stripe Checkout Session on the server.
2. Create a `checkoutSessions` record with status `open`.
3. Update `waitlist.status` to `checkout_started`.
4. Redirect the browser to Stripe Checkout.

### Payment completed

1. Receive and verify the Stripe webhook signature.
2. Check `stripeEvents` to prevent duplicate processing.
3. Mark the checkout session `completed`.
4. Create or update the customer.
5. Create or update the order as `paid`.
6. Update `waitlist.status` to `paid`.
7. Mark the Stripe event `processed`.

### Checkout not completed

1. Keep the waitlist registration even if the user returns from the cancel URL or closes the Checkout page.
2. When Stripe reports that the session expired, set `checkoutSessions.status` to `expired`.
3. The waitlist record remains available for early-access communication unless the user unsubscribes or requests deletion.

### Refund

1. Receive and verify the Stripe refund webhook.
2. Update the order to `refunded` or `partially_refunded`.
3. Update the customer status or entitlement only according to the product's refund policy.
4. Do not delete the financial record when it must be retained for accounting or legal obligations.

## Explicitly excluded from the waitlist

The following fields and behaviours are not part of the MyAvail waitlist and should be removed from the existing implementation:

- `referralCode`
- `referredBy`
- `referralCount`
- `queuePosition`
- Referral query parameters such as `?ref=`
- Referral sharing links and buttons
- Queue-rank and referral-count UI
- Referral-related analytics events
- Referral descriptions in the Privacy Policy and Terms

## Future additions

A `subscriptions` table should only be added if the commercial model uses recurring billing. Authentication IDs, user profiles, and product entitlements should only be added when the site introduces accounts or access-controlled product features.

Retention periods, deletion workflows, data export procedures, and marketing-consent handling must be finalised before production launch.
