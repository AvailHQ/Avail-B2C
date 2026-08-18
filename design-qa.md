# Design QA — $5 paid-only Hero and waitlist

## Evidence

- Source visual truth:
  - `/var/folders/_2/m58mwf8507dcc9hqd0cb370r0000gn/T/codex-clipboard-8c81977d-529c-49e8-ba44-17a6c7aa2fcb.png` (reference Hero)
  - `/var/folders/_2/m58mwf8507dcc9hqd0cb370r0000gn/T/codex-clipboard-8cc2e32f-9eb2-4ed7-9144-951b31819a3c.png` (reference primary heading crop)
- Browser-rendered implementation: `qa-assets/hero-usd5-desktop.png`
- Implementation: `http://localhost:4173/`
- Viewport/state: 1272 × 716 CSS px, desktop, 1× density, landing-page initial state.

## Comparison evidence

- `Learn Your Body.` is the primary line and carries the strongest type hierarchy.
- `Be Stronger. Train Smarter.` is smaller, gradient-treated and visibly remains one line.
- `500+ Early Users` is replaced by the verifiable product structure `3 Core Signals`.
- Focused region evidence is the viewport capture itself; it contains the full Hero and readable metric row, so another crop was unnecessary.

## Required fidelity surfaces

- Typography: two distinct display sizes preserve the requested hierarchy; the second line uses `whitespace-nowrap` and a responsive clamp.
- Layout: centered Hero remains within the existing page shell. Desktop and mobile Playwright checks report no horizontal document overflow.
- Colors: existing black primary and mint-to-blue gradient tokens retained.
- Images: the Hero contains no reference image asset to reproduce.
- Copy: requested two-line wording and `3 Core Signals` replacement are present.

## Findings

- No actionable Hero P0/P1/P2 finding remains.
- [P0 configuration blocker] The local and live Stripe Payment Links have not yet been replaced with the new $5 USD products, so the paid-only branch must not be deployed yet.

## Runtime checks

- Vitest: 62 passed.
- Playwright accessibility/layout: 10 passed across desktop and mobile; no page-level horizontal overflow.
- Lint and production build: passed.
- Browser console warnings/errors: none.

## Comparison history

1. Original Hero used `Be Stronger / Train Smarter` at equal scale and displayed unsupported `500+ Early Users`.
2. Rebuilt it as primary `Learn Your Body.` plus a smaller non-wrapping `Be Stronger. Train Smarter.` line.
3. Replaced the user-count claim with `3 Core Signals`, captured the browser result, and verified desktop/mobile overflow and accessibility.

final result: blocked
