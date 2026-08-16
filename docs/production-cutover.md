# Production Cutover Checklist — Paid Early Access (Stripe + Convex + Vercel)

How to move the reservation flow from the current **sandbox / dev** setup to a
real **production** setup, without dropping a payment or leaking a redemption code.

Everything today runs against one Convex **dev** deployment (`basic-otter-332`)
and Stripe **sandbox**. Production must use a **separate** Convex production
deployment and Stripe **live** mode. Do not point the production site at the dev
deployment.

> Ground rules learnt while wiring this up:
> - Convex **server** env vars live on the deployment (`npx convex env set`), not
>   in `.env.local`. Setting them locally does nothing for the webhook.
> - The webhook **fails closed**: it returns 500 until `STRIPE_WEBHOOK_SECRET`,
>   `STRIPE_PAYMENT_LINK_ID`, and `STRIPE_EXPECTED_LIVEMODE` are all set on the
>   deployment it runs on.
> - Each Stripe webhook endpoint has its **own** signing secret. Live ≠ sandbox.
> - The frontend is a client-routed SPA; `vercel.json` rewrites all paths to
>   `index.html` (already committed). Without it, `/success` 404s on Vercel.
> - Without `VITE_CONVEX_URL` on Vercel, the deployed site is disconnected from
>   the backend entirely (form doesn't save, success page can't verify).

---

## What changes between environments

| Thing | Dev / sandbox (today) | Production (target) |
| --- | --- | --- |
| Convex deployment | `dev:basic-otter-332` | new prod deployment (`npx convex deploy`) |
| Convex webhook URL | `https://basic-otter-332.eu-west-1.convex.site/stripe/webhook` | `https://<prod>.convex.site/stripe/webhook` |
| Stripe mode | Sandbox (test) | Live |
| `STRIPE_EXPECTED_LIVEMODE` | `false` | **`true`** |
| `STRIPE_PAYMENT_LINK_ID` | `plink_1U4g2gC23gnYvLlIl3Yjrdb1` (test) | live link's `plink_…` |
| Payment Link URL | `https://buy.stripe.com/test_bJe5kCbv08qa6RA3Ni6Na00` | live `https://buy.stripe.com/…` |
| `STRIPE_WEBHOOK_SECRET` | sandbox endpoint's `whsec_…` | live endpoint's `whsec_…` |
| Vercel `VITE_CONVEX_URL` | (should be `…convex.cloud` of `basic-otter-332` for testing) | `…convex.cloud` of prod |

---

## Step 1 — Provision the production Convex deployment

```sh
npx convex deploy        # creates/pushes the prod deployment; note its name + URLs
```

Record the prod `*.convex.cloud` (frontend) and `*.convex.site` (HTTP) URLs.

## Step 2 — Stripe (live mode)

Switch the Dashboard from Sandbox to **live** mode, then:

1. **Create the live £10 Payment Link.** Copy its URL and its `plink_…` id
   (Dashboard URL: `.../payment-links/plink_…`).
2. **Set the After-payment redirect** on that link →
   *Redirect customers to your website* → `https://<prod-domain>/success`
   (enter the plain URL; confirm after a test that the real redirect carries
   `?session_id=cs_…`, otherwise append `?session_id={CHECKOUT_SESSION_ID}`).
3. **Create the live webhook endpoint** →
   `https://<prod>.convex.site/stripe/webhook`, payload style **Snapshot**,
   events `checkout.session.completed` and `charge.refunded`. Copy its
   signing secret (`whsec_…`).

## Step 3 — Set env vars on the production Convex deployment

```sh
npx convex env set STRIPE_WEBHOOK_SECRET   whsec_<live-endpoint-secret>   --prod
npx convex env set STRIPE_PAYMENT_LINK_ID  plink_<live-link-id>          --prod
npx convex env set STRIPE_EXPECTED_LIVEMODE true                          --prod
npx convex env set RESEND_API_KEY          re_<key>                       --prod
npx convex env set EMAIL_FROM              "Avail <hello@yourdomain>"     --prod
```

Verify: `npx convex env list --prod` shows all five.
(Sanity check: an unsigned POST to the prod webhook should return **400**, not 500.)

## Step 4 — Vercel (production env)

Project → Settings → Environment Variables (scope: Production):

| Name | Value |
| --- | --- |
| `VITE_CONVEX_URL` | prod `https://<prod>.convex.cloud` |
| `VITE_STRIPE_PAYMENT_LINK` | the **live** Payment Link URL |

Then **redeploy** (Vite injects env at build time — an env change alone does not
take effect until a rebuild).

## Step 5 — Verify end-to-end on production

1. `/success`, `/privacy`, `/terms` all return 200 (SPA rewrite works).
2. Bundle actually contains the prod Convex URL:
   `curl -s https://<domain>/assets/index-*.js | grep -o 'https://[a-z0-9-]*\.convex\.cloud'`
3. Complete a real reservation (or a live-mode test) → the record reaches
   `status: paid` with amount 1000 / gbp and a `redemptionCode`.
4. The redirect lands on `https://<domain>/success?session_id=cs_…` and the page
   shows the payer's name + code (not the "we're checking" fallback).
5. Confirmation email arrives (Resend configured).
6. Refund that PaymentIntent once → the record flips to `status: refunded`.

---

## Gotchas that will silently break it

- **Wrong `plink_` id** → webhook returns 200 but rejects every payment as
  `wrong_payment_link`; nothing reaches `paid`.
- **`STRIPE_EXPECTED_LIVEMODE=false` in prod** → live payments rejected as
  `wrong_environment`.
- **Vercel `VITE_CONVEX_URL` pointed at the dev deployment** → real customers'
  records written to dev; prod success page can't find them.
- **Forgot to redeploy Vercel after an env change** → old bundle, old config.
- **Convex functions not deployed to prod** (`getBySessionId`, webhook) → success
  page always shows the fallback. `npx convex deploy` must run against prod.

## Rollback

Cutover is config-only (no schema change). To revert, point Vercel
`VITE_CONVEX_URL` back and disable the live Payment Link / webhook endpoint in
Stripe. Data in the prod deployment is unaffected.
