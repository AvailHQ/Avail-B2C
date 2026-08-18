# Design QA — £3 paid-only Founding Waitlist

## Evidence

- Source visual truth:
  - `/var/folders/_2/m58mwf8507dcc9hqd0cb370r0000gn/T/codex-clipboard-cf34203a-3dc0-4c03-913b-510011f18828.png` (1282 × 1110 px)
  - `/var/folders/_2/m58mwf8507dcc9hqd0cb370r0000gn/T/codex-clipboard-2f5715e9-deb3-4063-b499-f06e0d6420f9.png` (1202 × 1270 px)
- Browser-rendered implementation:
  - `qa-assets/paid-waitlist-desktop.png` (1272 × 716 px)
  - `qa-assets/why-avail-desktop.png` (1272 × 716 px)
- Implementation URL: `http://localhost:4173/`
- Viewport/state: desktop, 1272 × 716 CSS px, device scale factor 1; Cookie banner dismissed; reveal animations triggered by scrolling.
- Density normalization: all implementation evidence is 1× CSS density. Source screenshots are communication screenshots rather than pixel-perfect mockups, so the comparison is structural and content-led.

## Full-view comparison evidence

- The old three-audience card module is absent and is replaced by a compact three-card explanation of female-physiology training context.
- The hero follows the requested hierarchy: “Learn Your Body.” first, then “Be Stronger. Train Smarter.”
- The former unverifiable user/performance/retention metrics are absent.
- Free signup fields and the intermediate saved-details state are absent. Both visible CTAs lead directly to the configured Stripe Payment Link and disclose £3 before the click.

## Focused-region comparison evidence

- `paid-waitlist-desktop.png` verifies the paid-only CTA, price disclosure, Stripe/name/email explanation and non-refundable qualifier.
- `why-avail-desktop.png` verifies the three requested problem themes, consistent card hierarchy, readable contrast and no desktop overflow.

## Required fidelity surfaces

- Fonts and typography: existing Avail display/body family retained; headline hierarchy is clear and wraps without clipping at the checked desktop viewport.
- Spacing and layout rhythm: hero, paid card, feature photography and physiology cards retain the existing page shell and vertical rhythm.
- Colors and tokens: existing mint-to-blue CTA gradient and teal neutrals are consistently reused.
- Image quality: the existing high-resolution training image remains sharp; the removed audience portraits leave no placeholder or broken asset.
- Copy and content: unsupported metrics, “first” claim, fixed Q4 launch promise, four-week promise and lifetime-discount promise were removed. The page now describes priority consideration rather than guaranteed admission.

## Findings

- [P0] Local CTA price and local Stripe product are inconsistent.
  - Location: both landing-page CTAs / `VITE_STRIPE_PAYMENT_LINK` in `.env.local`.
  - Evidence: the rendered CTA says £3, while the configured local link is the retired £10 Sandbox Payment Link.
  - Impact: a local end-to-end test could charge the wrong test amount and cannot validate the new offer.
  - Fix: create a £3 GBP Sandbox Payment Link with required name/email collection and update `.env.local`.
- [P0] Production rollout is not yet safe to perform.
  - Evidence: the live Stripe Payment Link has not yet been confirmed as £3, and the latest production audit found `RESEND_API_KEY` / `EMAIL_FROM` missing.
  - Impact: deploying first would create an offer mismatch; a real payer may not receive the Avail confirmation email.
  - Fix: update/confirm the live Payment Link at £3 and either configure a verified Resend sender or deliberately revise the success/email promise to rely only on Stripe receipts.

## Interaction and runtime checks

- Header, hero and paid-card waitlist CTAs are present and keyboard-addressable.
- Footer navigation now resolves to `#early-access`, `#features`, `#why-avail` and `#faq`.
- Cookie banner Reject action tested successfully.
- Browser console warnings/errors: none.
- Direct Stripe checkout was not opened because the local Payment Link still targets the retired £10 Sandbox product.

## Comparison history

1. Initial inspection found a stale `#audiences` footer link, inconsistent header CTA language and unsupported FAQ promises.
2. Fixed navigation, unified “Founding Waitlist” language, and replaced unsupported product/launch claims with current-stage wording.
3. Re-rendered and captured the paid waitlist and physiology sections. No remaining visual P0/P1/P2 issue was found; the remaining blockers are payment configuration and production email delivery.

final result: blocked
