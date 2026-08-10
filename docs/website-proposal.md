# Avail B2C Website Proposal

## Purpose

This website is a pre-launch landing page for Avail B2C. Its primary job is to collect early access demand for a cycle-aware readiness app for women who train.

The site should validate more than casual interest. The intended commercial test is a small paid early access reservation, likely through a Stripe Payment Link.

## Product Positioning

Avail is a cycle-aware readiness app for women who train.

It helps users understand whether their body is ready to push today or whether it may be better to pull back, using readiness context built around female physiology and personal baselines.

Avail is not:

- a workout program generator
- a period tracker or fertility app
- a medical or diagnostic tool
- a coach replacement

The product should be framed as insight and context, not instruction.

## Target User

Primary audience:

- women who train 3-6 times per week
- gym-goers, lifters, runners, CrossFit or class users, hybrid trainers, and recreational athletes
- users who already track something, such as sleep, recovery, cycle, HRV, or training load
- users frustrated that generic recovery tools ignore female physiology

The page should speak to everyday and serious-amateur users, not only elite athletes or teams.

## Website Goal

Primary conversion:

- reserve early access

Planned payment framing:

- one-time low-friction reservation
- proposed price: GBP 5
- likely payment method: Stripe Payment Link

Secondary conversion:

- collect email if payment is not ready or the user is not ready to pay

## Offer Framing

The paid early access offer should make the value clear:

- priority beta access
- founding member status or early cohort position
- influence on product direction
- potential future credit or discount, if confirmed

Important: do not imply benefits that are not operationally true yet.

Before launch, decide and document:

- whether the GBP 5 is refundable
- whether it credits toward a future subscription
- when early access is expected
- what happens if the product does not ship
- whether the paid reservation creates any account entitlement

## Header Direction

The header should stay minimal.

Recommended first version:

- left: Avail logo
- right: no controls, or one clear CTA once the offer is settled

Avoid temporary auth or account actions in the header until they are actually wired. GitHub sign-in does not match the consumer positioning and should not be prominent.

Potential future header CTA:

- Reserve Early Access
- Reserve Early Access - GBP 5

## Content Direction

The hero should communicate:

- the product category: cycle-aware readiness for women who train
- the daily decision: push or pull back
- the reason it exists: generic recovery tools are male-default or cycle-blind
- the conversion: reserve early access

Suggested message territories:

- Know when to push. Know when to pull back.
- Readiness built around female physiology.
- Stop treating your cycle like noise in the data.
- A daily readiness signal for women who train.

Claims should stay careful:

- use "context", "insight", "readiness", "patterns"
- avoid "prevents injury", "clinically proven", "diagnoses", "predicts performance"

## Payment Flow

Initial simple flow:

1. User clicks Reserve Early Access.
2. User goes to Stripe Payment Link.
3. Stripe collects payment.
4. Stripe confirmation page or redirect confirms reservation.

Optional later flow:

1. Collect email first.
2. Continue to Stripe.
3. Store email and payment status in backend.
4. Send confirmation email.

For the current front-end-only stage, do not pretend payment/account state is fully implemented.

## Design Direction

The site should feel:

- calm
- premium but accessible
- health-aware without looking clinical
- performance-oriented without looking like a generic gym brand
- trustworthy around sensitive data

Avoid:

- overly playful gamified referral mechanics
- heavy team-management language
- B2B gym/community positioning as the main message
- prominent auth UI before auth is real

## Open Questions

- Is the early access reservation refundable?
- Does the GBP 5 count toward a future subscription?
- Is the first paid product monthly, annual, or one-time founder access?
- Will early access be capped by number of users?
- Should the site collect email before Stripe or send users directly to Stripe?
- What is the expected beta launch date?
- What confirmation experience happens after payment?
