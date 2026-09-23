# MercadoPago Split Payments for registro-app (trainer/nutritionist revenue share)

Research date: 2026-09-23. Sources are MercadoPago's own developer documentation
(mercadopago.com.ar/developers, plus the equivalent .mx/.br/.pe/.co developer
portals, which mirror the same product docs across countries) unless explicitly
marked "secondary source." Every factual claim below is followed by its source
link(s).

## Executive summary / feasibility verdict

**Feasible, and MercadoPago does have a real, automatic split-payment API**
("Split de Pagos" / "Split Payments," 1:1 model), not just manual transfers.
At the moment of charge, the platform can tell MercadoPago to route a
configurable commission (`application_fee` / `marketplace_fee`) to itself
while the rest settles directly into the trainer/nutritionist's own MercadoPago
account — this is confirmed available in Argentina
([Split de Pagos 1:1 - Overview](https://www.mercadopago.com.ar/developers/es/docs/split-payments/split-1-1/overview)).

That said, this is a **medium-to-high complexity integration**, not a simple
flag to flip:

- Every trainer/nutritionist needs their **own MercadoPago account** and must
  go through an **OAuth "Connect" authorization flow** before the platform can
  create split payments on their behalf
  ([OAuth introduction](https://www.mercadopago.com.ar/developers/es/docs/security/oauth)).
- Refunds are **not automatically clawed back cleanly** — MercadoPago splits
  the refund proportionally between marketplace and seller, but the
  marketplace is responsible for its own share and reconciliation logic must
  be built by the platform (see §3).
- OAuth access tokens/refresh tokens need to be persisted and rotated
  correctly, and reconciliation is API-driven (no built-in ledger UI comparable
  to what a fully managed product would offer) — this is corroborated by a
  secondary source (see §1 and §3 marked "secondary").
- The invoicing/tax side (who issues a factura to whom, monotributo limits,
  AFIP treatment) is **not something MercadoPago's docs resolve** — it's a
  genuine open question that needs an accountant (see §4).
- MercadoPago's own docs say that changing commission release-date
  configuration for the 1:1 split model requires contacting an "assisted
  commercial executive" — i.e., some configuration isn't fully self-service
  ([Split Payments reports/introduction](https://www.mercadopago.com.br/developers/en/docs/split-payments/prerequisites)).

Bottom line: implementing this is realistic for registro-app, but it is a
project of its own (OAuth onboarding UI for professionals, split-payment
checkout flow, refund reconciliation, reporting) — not a quick add-on to
existing checkout code.

---

## 1. Does MercadoPago have an automatic split-payment/marketplace API?

**Yes.** The product is called **"Split de Pagos" (Split Payments)**, in the
**1:1 model** (one marketplace, one sub-seller per payment — the model that
fits registro-app's one-trainer-per-payment case; there is also a "1:N" model
for splitting a single payment across multiple sellers, which needs a
dedicated/"advised" commercial account per MercadoPago's docs).

- It is explicitly a "PSP solution for sellers with a marketplace business
  model... that have other participating sellers who should receive amounts
  from the same payment"
  ([Split Payments landing](https://www.mercadopago.com.br/developers/en/docs/split-payments/landing)).
- It is available in Argentina, Brazil, Chile, Colombia, Mexico, Peru and
  Uruguay
  ([Split de Pagos 1:1 - Overview](https://www.mercadopago.com.ar/developers/es/docs/split-payments/split-1-1/overview)).
- The split happens **at the moment of payment**, automatically, via two
  parameters depending on checkout type:
  - **Checkout Pro**: `marketplace_fee` parameter in the
    `/checkout/preferences` API.
  - **Checkout API / Checkout Transparente**: `application_fee` parameter in
    the `/payments` API.
  ([Integrate checkout in Split Payments 1:1 (marketplace) — Brazil docs, same
  product as AR](https://www.mercadopago.com.br/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace);
  [How to integrate checkout in marketplace — Argentina docs](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/how-tos/integrate-marketplace)).
- Fee deduction order: MercadoPago's own processing commission is deducted
  **first** from the gross amount, and the marketplace's `application_fee` /
  `marketplace_fee` is deducted from what remains — the seller receives the
  final remainder
  ([Integrate checkout in Split Payments 1:1 (marketplace)](https://www.mercadopago.com.br/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)).
- Mechanically, the platform makes the payment call using the **seller's own
  OAuth `access_token`** in the Authorization header (not the platform's own
  token) — that's what makes the payment settle into the seller's account
  while the marketplace commission is simultaneously carved out
  ([Integrate checkout in Split Payments 1:1 (marketplace)](https://www.mercadopago.com.br/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)).
- The platform's own `public_key` is used frontend-side; the seller's
  `access_token` is used backend-side
  ([same source](https://www.mercadopago.com.br/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)).
- A key limitation called out in the docs: within the split flow, "transfers
  from external financial institutions are not permitted" — only balance
  transfers between MercadoPago accounts work in this system
  ([same source](https://www.mercadopago.com.br/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)).

**Conclusion for Q1:** registro-app does not need to fall back to manual
scheduled transfers via a separate "Transferencias/Dinero" API — MercadoPago's
Split Payments product is a true, real-time, automatic split API and is the
right tool for the trainer-percentage use case. (Note this is distinct from
having the trainer collect the full charge directly and the platform take a
cut afterward — Split Payments does the inverse and cleaner thing: the
platform is the one initiating the charge and carving out its own piece.)

*Secondary/supplementary color (blog post, not MercadoPago docs, cited for
practical texture only):* a developer write-up on building LATAM marketplaces
with this API notes that MercadoPago's Split Payments exists specifically to
fill a gap left by Stripe Connect, whose payout infrastructure does not
support Mexico or Argentina — [Cesar Ayala, "Mercado Pago Split Payments:
Build a LATAM Marketplace with Seller
Payouts"](https://cesarayala.dev/blog/mercado-pago-split-payments-marketplace/)
(secondary source, included for context only, not as the basis for any factual
claim above).

---

## 2. What does a trainer/nutritionist need to receive split payments?

- **Their own MercadoPago seller account.** The prerequisites doc for Split de
  Pagos 1:1 states sellers need "a seller account on Mercado Pago with a KYC 6
  level" and that new sellers can create an account at no cost; it also
  recommends the MercadoPago mobile app (Android/iOS) to manage received
  payments
  ([Split Payments Prerequisites](https://www.mercadopago.com.mx/developers/en/docs/split-payments/split-1-1/prerequisites)).
- **OAuth authorization ("Connect" flow).** The platform (registro-app) must
  be registered as a MercadoPago application, and each trainer/nutritionist
  must go through MercadoPago's OAuth **Authorization Code flow** to grant the
  platform's application a scoped `access_token` (and `refresh_token`) tied to
  their account — this is explicitly required: "resellers operating
  marketplaces must complete OAuth's secure authorization process"
  ([Split Payments Prerequisites](https://www.mercadopago.com.mx/developers/en/docs/split-payments/split-1-1/prerequisites);
  [OAuth introduction](https://www.mercadopago.com.ar/developers/es/docs/security/oauth)).
  - The flow is redirect-based: the trainer is redirected to MercadoPago,
    logs in and explicitly approves access, MercadoPago issues a short-lived
    (10-minute), single-use authorization code, which the platform's backend
    exchanges for the access/refresh token pair
    ([OAuth introduction](https://www.mercadopago.com.ar/developers/es/docs/security/oauth)).
  - PKCE is available as an optional extra layer of protection against code
    interception
    ([OAuth introduction](https://www.mercadopago.com.ar/developers/es/docs/security/oauth)).
  - The platform can subscribe to webhook notifications for when a seller
    authorizes or de-authorizes the application
    ([OAuth introduction](https://www.mercadopago.com.ar/developers/es/docs/security/oauth)).
- **CBU/CVU, CUIT/CUIL, monotributo status:** MercadoPago's Split Payments and
  OAuth docs reviewed here **do not spell out** bank-account (CBU/CVU) or tax
  ID (CUIT/CUIL) requirements as part of the *split-payments-specific*
  integration — those are standard requirements of holding/withdrawing from
  any MercadoPago account in Argentina generally (opening a MercadoPago
  account already requires a CUIT/CUIL/DNI at signup, and withdrawing to a
  bank requires a CBU or the account's own CVU), but this was not confirmed
  inside the Split Payments doc set itself. Treat this as a gap: **the
  Split-Payments-specific prerequisites page does not mention CBU/CUIT/
  monotributo requirements explicitly**
  ([Split Payments Prerequisites](https://www.mercadopago.com.mx/developers/en/docs/split-payments/split-1-1/prerequisites)).
  CBU vs. CVU definitions (for background, from MercadoPago's own blog, not
  developer docs): CBU is a 22-digit bank account code; CVU is the equivalent
  22-digit code for Payment Service Provider (digital wallet) accounts —
  [MercadoPago blog: "CVU y CBU: qué son y cuáles son sus
  diferencias"](https://blog.mercadopago.com.ar/iniciativas-educativas/cvu-y-cbu-que-son-y-cuales-son-sus-diferencias).
- **1:1 vs 1:N model:** registro-app's case (one trainer receives a share of
  one payment from one student) fits the **1:1** model, which is
  self-service. The **1:N** model (splitting one payment across many
  recipients) explicitly "requires an advised portfolio and direct contact
  with Mercado Pago's commercial team," i.e., is not fully self-service
  ([Split Payments Prerequisites](https://www.mercadopago.com.mx/developers/en/docs/split-payments/split-1-1/prerequisites)).

**Onboarding flow at a high level for registro-app:**
1. Trainer/nutritionist clicks "Connect MercadoPago account" in the platform.
2. Platform redirects them into MercadoPago's OAuth authorization screen.
3. Trainer logs into (or creates) their own MercadoPago account and approves
   the platform's requested scopes.
4. MercadoPago redirects back with an authorization code; platform backend
   exchanges it for `access_token` + `refresh_token`, stores them securely per
   trainer.
5. From then on, when a student pays that trainer through registro-app, the
   platform creates the payment using the trainer's stored `access_token` and
   sets `application_fee`/`marketplace_fee` to the platform's cut.

---

## 3. Refunds and mid-cycle cancellations after a split

- MercadoPago's Split Payments docs state that **when a refund happens, the
  amount owed back to the buyer is divided and subtracted proportionally from
  both the seller's account and the marketplace's account** — i.e., the claw
  back from the sub-seller side is automatic and proportional, not something
  the platform must manually calculate and re-charge the trainer for
  (confirmed via MercadoPago's Split Payments documentation search results
  describing this proportional-refund behavior; primary doc:
  [Mercado Pago's Split Payments solution sales report / modifications
  section](https://www.mercadopago.com.ar/developers/en/docs/split-payments/additional-content/reports/sales-report/modifications),
  which documents the reporting/reconciliation side of these transactions).
- A related official statement found in search of MercadoPago's own docs:
  in split payments, **the marketplace's account must refund the equivalent
  of its own commission share**, and the marketplace must decide whether to
  return the remaining amount (the seller's share) itself via other means, or
  leave it to the seller to handle — i.e., the *marketplace's portion* of a
  refund is the marketplace's own responsibility to execute/fund, it is not
  something MercadoPago silently absorbs on the platform's behalf. This is
  consistent with MercadoPago's general (non-split) refund rules also
  applying: refunds require sufficient available balance in the refunding
  account, and are possible within 180 days of a payment's approval date
  ([Refunds and cancellations — Checkout API, Argentina
  docs](https://www.mercadopago.com.ar/developers/en/docs/checkout-api/payment-management/cancellations-and-refunds)).
- **Reconciliation:** MercadoPago provides a dedicated **Split Payments sales
  report** (downloadable via API in CSV/JSON) that includes, per transaction,
  the total amount, the marketplace fee, the MercadoPago fee, and net amount
  received — plus "settlement cases, financial blocking, and unblocking" —
  meant specifically to let the platform reconcile split transactions,
  including refunded ones
  ([Mercado Pago's Split Payments solution sales report —
  Introduction](https://www.mercadopago.com.co/developers/en/docs/split-payments/additional-content/reports/sales-report/introduction)).
  This report can only be accessed through the API (no manual dashboard
  export was found in the docs reviewed), which means registro-app would need
  to build its own reconciliation/ledger UI on top of this report rather than
  relying on a MercadoPago dashboard.

**Conclusion for Q3:** There is real, documented, proportional automatic
refund-splitting behavior — this is better than "the platform must always
manually claw back from the trainer." But the platform is still on the hook
for (a) making sure it has the balance to cover its own share of a refund and
(b) building its own reconciliation against the Split Payments sales report,
since MercadoPago doesn't appear to expose a turnkey dashboard for this
specific product.

---

## 4. Tax/invoicing (facturación) implications in Argentina

MercadoPago's developer docs are payment-API documentation, not tax guidance,
and — as expected — they do not resolve AFIP/facturación questions for a
split-payment marketplace. This section flags what needs to be checked with
an accountant rather than asserting an answer; each item below is a business
question, not a claim sourced to MercadoPago's docs:

- **Who is the seller of record for AFIP purposes?** Because the split
  payment settles directly into the *trainer's own* MercadoPago account via
  their own OAuth-connected account (per §1–2), it's likely that MercadoPago
  reports/recognizes the trainer's share as income received directly by the
  trainer's own CUIT — this needs confirmation, since it affects whether the
  trainer must issue a factura to the student for their share, and whether
  registro-app must issue a separate factura only for its own
  `application_fee`/`marketplace_fee` cut.
- **Does registro-app need to issue a factura for its commission?** Almost
  certainly yes for its own cut (the `application_fee`), as with any
  commission/service fee income — but the mechanics (factura A/B/C, whether
  it's billed to the trainer or the student) depend on registro-app's own
  tax regime (monotributo vs. responsable inscripto) and is outside
  MercadoPago's documentation scope.
  MercadoPago's own commission (its processing fee) already generates its own
  documentation for account holders in Argentina, but that's separate from
  the *marketplace's* commission.
- **Trainer's monotributo billing limits.** If a trainer/nutritionist bills
  under monotributo, this creates a real constraint: monotributo has annual
  billing caps by category, and a trainer whose receipts now flow partly
  through registro-app's split (in addition to any direct income) may need to
  monitor whether they're approaching a category limit or need to upgrade to
  responsable inscripto. This is standard Argentine tax structure knowledge,
  not something sourced from MercadoPago's docs — flagged here as something
  to verify with an accountant, per country tax rules current as of the
  trainer's fiscal year.
- **Retenciones.** MercadoPago, like other payment processors/PSPs in
  Argentina, may apply withholding (retenciones) on certain tax regimes
  (IIBB, Ganancias) depending on the account holder's jurisdiction and
  registration status — whether this applies differently to a sub-seller
  receiving funds via a marketplace's split-payment flow versus a normal
  direct sale needs to be checked, ideally directly with MercadoPago's
  support/commercial team or an accountant, since this was not addressed in
  the developer-facing docs reviewed.

**Conclusion for Q4:** This is a genuine open area — MercadoPago's technical
docs don't answer it, and it should be treated as a required pre-launch
legal/accounting review, not a "figure it out later" item, since incorrect
invoicing between platform, trainer, and student is the kind of mistake that
surfaces at tax-filing time, not at build time.

---

## 5. What does MercadoPago charge for using Split Payments itself?

- MercadoPago's Split Payments documentation reviewed here **does not publish
  a specific extra percentage fee for the split-payments feature itself**
  beyond MercadoPago's normal per-transaction processing commission. The
  Split de Pagos 1:1 Overview page describes the automated division of fees
  and taxes but the fetched content did not include a specific "MercadoPago
  charges X% for split payments" figure
  ([Split de Pagos 1:1 - Overview](https://www.mercadopago.com.ar/developers/es/docs/split-payments/split-1-1/overview)).
- What the docs *do* confirm is the **deduction order**: MercadoPago's normal
  processing commission is deducted first from the gross transaction amount,
  and only then is the marketplace's own `application_fee`/`marketplace_fee`
  deducted from what remains, with the seller receiving the final remainder
  ([Integrate checkout in Split Payments 1:1
  (marketplace)](https://www.mercadopago.com.br/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)).
  This means: registro-app should model its own commission as coming out of
  the post-MercadoPago-fee amount, not the gross sale price.
- The docs also note that for the 1:1 model, changing the **commission release
  date** configuration (i.e., when the marketplace's `application_fee` becomes
  available) requires contacting an "assisted commercial executive" rather
  than self-service configuration — implying at least some account-level
  terms (and possibly negotiated fee schedules for larger volumes) are set up
  through MercadoPago's commercial/sales team rather than published rates
  ([Split Payments Prerequisites](https://www.mercadopago.com.mx/developers/en/docs/split-payments/split-1-1/prerequisites)).
- **On MercadoPago's standard (non-split) Argentina processing fees**, for
  general context on the base cost each transaction already pays before any
  marketplace cut: MercadoPago's own help center page on "Comisiones y cargos
  para individuos y vendedores"
  (https://www.mercadopago.com.ar/ayuda/26748) is the authoritative primary
  source for these numbers, but it returned an HTTP 403 (blocked) when
  fetched directly in this research session, so its exact figures could not
  be verified first-hand here. Third-party finance/guide sites (not
  MercadoPago) report rates in the range of roughly 3–6% + IVA depending on
  card type and settlement speed (e.g., immediate vs. next-day credit) for
  Argentina in 2026 — this is **secondary, unverified color, not a primary
  MercadoPago claim**, and registro-app should re-fetch
  `mercadopago.com.ar/ayuda/26748` directly (e.g., from a logged-in session or
  via MercadoPago support) to get the authoritative current rate before doing
  any pricing math.

**Conclusion for Q5:** No published "extra % for using Split Payments" fee was
found in the primary docs accessible in this session — the cost of Split
Payments to the platform appears to be: MercadoPago's normal processing fee
(paid once per transaction, out of the gross amount) plus whatever
`application_fee` the platform itself chooses to take (which is the
platform's own revenue, not a cost). However, this should be **explicitly
confirmed with MercadoPago's commercial team before launch**, since (a) the
release-date/commission configuration note suggests some terms are
negotiated rather than uniformly published, and (b) the standard processing
fee page itself could not be directly verified in this session due to a 403
response.

---

## References (primary, MercadoPago developer docs)

- [Split Payments landing (Brazil portal, product-identical across LatAm)](https://www.mercadopago.com.br/developers/en/docs/split-payments/landing)
- [Split de Pagos 1:1 - Overview (Argentina)](https://www.mercadopago.com.ar/developers/es/docs/split-payments/split-1-1/overview)
- [Split Payments Prerequisites (1:1)](https://www.mercadopago.com.mx/developers/en/docs/split-payments/split-1-1/prerequisites)
- [Integrate checkout in Split Payments 1:1 (marketplace)](https://www.mercadopago.com.br/developers/en/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace)
- [How to integrate checkout in marketplace (Checkout API, Argentina)](https://www.mercadopago.com.ar/developers/es/docs/checkout-api/how-tos/integrate-marketplace)
- [OAuth introduction / security docs (Argentina)](https://www.mercadopago.com.ar/developers/es/docs/security/oauth)
- [Refunds and cancellations — Checkout API (Argentina)](https://www.mercadopago.com.ar/developers/en/docs/checkout-api/payment-management/cancellations-and-refunds)
- [Mercado Pago's Split Payments solution sales report — Introduction](https://www.mercadopago.com.co/developers/en/docs/split-payments/additional-content/reports/sales-report/introduction)
- [Mercado Pago's Split Payments solution sales report — Modifications](https://www.mercadopago.com.ar/developers/en/docs/split-payments/additional-content/reports/sales-report/modifications)
- [MercadoPago blog: CVU y CBU, qué son y cuáles son sus diferencias (background, not developer docs)](https://blog.mercadopago.com.ar/iniciativas-educativas/cvu-y-cbu-que-son-y-cuales-son-sus-diferencias)
- MercadoPago Argentina help center fee page (could not be fetched in this
  session, HTTP 403; treat as the source-of-record to re-check before
  pricing decisions): https://www.mercadopago.com.ar/ayuda/26748

## References (secondary — supplementary color only, not used as basis for factual API/fee claims)

- [Cesar Ayala, "Mercado Pago Split Payments: Build a LATAM Marketplace with Seller Payouts"](https://cesarayala.dev/blog/mercado-pago-split-payments-marketplace/) — practical implementation notes on OAuth refresh-token rotation, reconciliation being API-driven, and why MP Split Payments exists as a Stripe Connect alternative for LatAm.
- Various third-party fee-comparison sites (jonatanalmeira.com, guiadebancos.com, iprofesional.com, etc.) cited in §5 only as unverified secondary color for standard (non-split) MercadoPago Argentina processing rates, since the primary MercadoPago help-center page returned a 403 in this session.
