# Design QA — Compact Mac Audience Panel

## Comparison Target

- Source visual truth: `/var/folders/_2/m58mwf8507dcc9hqd0cb370r0000gn/T/codex-clipboard-86df4d5a-61b0-44ef-977a-cf0149565dd1.png`
- Earlier Mac implementation evidence: `/var/folders/_2/m58mwf8507dcc9hqd0cb370r0000gn/T/codex-clipboard-246207ab-b451-4d61-aeab-3f00956e958a.png`
- Revised implementation screenshot: `qa-audiences-mac-compact.png`
- Implementation: `http://127.0.0.1:4173/#audiences`
- Mac viewport: 1988 × 1000 CSS px; captured raster: 1980 × 994 px.

## Full-view Comparison Evidence

- Revised panel follows the reference's approximately 2.6:1 wide, compact proportion.
- Three white portrait cards occupy the left side and a lightweight contextual text region occupies the right.
- A centered segmented control replaces the former oversized section heading.
- Background photography is subdued behind a neutral translucent surface, matching the source's layered panel treatment.

## Focused Region Comparison Evidence

- Portraits are now circular, consistently sized, and vertically aligned like the source.
- Cards have fixed compact Mac heights rather than stretching with portrait aspect ratio.
- The right content no longer sits inside a separate heavy dark card.
- Card click and segmented-control selection both update the same contextual content.

## Findings

- No remaining P0, P1, or P2 findings.
- [Resolved P1] Previous Mac section was excessively tall and visually heavier than the source.
  - Fix: removed the large header block, reduced panel and card height, and used a compact horizontal composition.
- [Resolved P1] Previous rectangular portrait crops did not match the reference.
  - Fix: all three portraits now use consistent circular crops.
- [Resolved P2] Previous right-side solid card dominated the composition.
  - Fix: detail content now sits directly over the softened panel background.
- [Resolved P2] Mobile could not retain the same compact three-card relationship.
  - Fix: retained the snap carousel, circular crops, and a readable detail panel without page-level horizontal overflow.

## Required Fidelity Surfaces

- Fonts and typography: compact card labels and lighter supporting copy now match the reference density; Avail's existing family is retained.
- Spacing and layout rhythm: panel aspect, card height, circular portraits, top control, and right-copy placement follow the source.
- Colors and visual tokens: neutral photographic overlay is translated into Avail teal-grey and mint accents.
- Image quality and asset fidelity: three independent 1122 × 1402 portraits remain sharp at their circular display sizes; background uses a project photographic asset.
- Copy and content: all three audience-specific content states remain intact.

## Primary Checks

- Build: passed.
- Lint: passed.
- Gym Girl card updates right-side heading: passed.
- Mac 1988px composition: passed.
- Mobile width: no page overflow (`scrollWidth: 382`, capture width: 382).
- Browser console errors: none.

## Comparison History

1. Current Mac screenshot revealed excessive height, rectangular portraits, and an overly dominant right panel.
2. Rebuilt the section around the source's compact wide aspect and circular portrait cards.
3. Captured the complete Mac panel at 1988px and verified the Gym Girl interaction.
4. Rechecked mobile layout and page overflow; no actionable P0/P1/P2 findings remain.

final result: passed

---

# Design QA — Footer Redesign

## Comparison Target

- Source visual truth: `/var/folders/_2/m58mwf8507dcc9hqd0cb370r0000gn/T/codex-clipboard-4c620aa3-8d6a-44f3-9ade-6af07c6413d8.png` (1618 × 534 px).
- Browser-rendered implementation: `qa-footer-desktop.png` (1592 × 995 px viewport capture) and `qa-footer-mobile.png` (382 × 839 px viewport capture).
- Combined comparison evidence: `qa-footer-comparison.png` (2926 × 440 px); both footer regions normalized to 440 px height for side-by-side review.
- Implementation: `http://127.0.0.1:4173/#site-footer`.
- Desktop viewport: 1600 × 1000 CSS px at deviceScaleFactor 1; rendered page client width 1592 px due to scrollbar.
- Mobile viewport: 390 × 844 CSS px at deviceScaleFactor 1; rendered content width 382 px due to scrollbar.
- State: default, no interactions active.

## Full-view Comparison Evidence

- The implementation preserves the reference's wide mint panel, dominant left contact area, two compact right columns, and separate bottom legal strip.
- The newsletter field was intentionally converted to a direct email contact line and `Contact us` CTA per the requested product adaptation.
- Right-hand fitness/social content was intentionally replaced by Avail product navigation and partnership messaging.

## Focused Region Comparison Evidence

- Focused desktop footer comparison confirms the email rule, pill CTA, three-column balance, divider, copyright, and legal links follow the source structure.
- Mobile captures confirm the same information hierarchy stacks cleanly into one column, with a full-width CTA and no horizontal page overflow.

## Findings

- No remaining P0, P1, or P2 findings.
- The different right-column copy and absence of social icons are intentional product-content changes requested by the user, not fidelity drift.

## Required Fidelity Surfaces

- Fonts and typography: existing Avail font stack retained; strong logo/section weights and readable compact link hierarchy match the reference intent.
- Spacing and layout rhythm: desktop three-column grid, wide left contact area, generous vertical padding, and divided legal strip match the reference composition; mobile stacks with consistent gaps.
- Colors and visual tokens: reference pale green translated to Avail's mint `#DCEEE5`, with deep green `#123D31` for the primary CTA and accessible body contrast.
- Image quality and asset fidelity: existing source `logo.svg` is reused at native aspect ratio; Lucide icons render cleanly and no placeholder or CSS-drawn assets are present.
- Copy and content: all footer copy is Avail-specific; contact, partnership, product anchors, privacy, and terms destinations are present.

## Primary Checks

- Build: passed.
- Lint: passed.
- Desktop width: no horizontal overflow (`scrollWidth === clientWidth`, 1592 px).
- Mobile width: no horizontal overflow (`scrollWidth: 382`, viewport content width: 382 px).
- Browser console errors: none.
- Primary interactions checked: mailto CTAs expose the intended contact address; product and legal links have valid destinations.

## Comparison History

1. Initial implementation comparison found no actionable P0/P1/P2 differences after accounting for the requested product-specific content changes.
2. Desktop and mobile responsive captures confirmed stable column behavior, readable CTA treatment, and no page overflow.

final result: passed
