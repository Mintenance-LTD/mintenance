# Professional Subscription – Backend Integration Review

This document reviews whether the **Professional** plan features advertised on the public pricing/subscription page are actually enforced or applied in the backend.

**Advertised Professional features (e.g. £29/month):**
- Everything in Basic  
- **Unlimited job bids**  
- **10% platform fee (33% savings)**  
- **Featured in search results**  
- **Advanced analytics dashboard**  
- **Priority support**  
- **Lead recommendations**  
- **Custom quote templates**  

---

## 1. Unlimited job bids

**Status: ❌ Not integrated**

- **feature-access-config.ts** defines `CONTRACTOR_BID_LIMIT`: free 5, basic 20, **professional 100**, enterprise unlimited. So the config does **not** say “unlimited” for Professional; it says 100. If the marketing says “Unlimited job bids” for Professional, the config should be updated to `professional: 'unlimited'`.
- **Enforcement:** The submit-bid API (`app/api/contractor/submit-bid/route.ts`) calls `requireSubscriptionForAction(request, 'submit_bid')`, which only checks that the contractor has an active subscription or trial (no “subscription required” block). It does **not**:
  - Call `checkSubscriptionLimits(contractorId, 'submit_bid')`, or
  - Count monthly bids or read `CONTRACTOR_BID_LIMIT` / `feature_usage`.
- In **subscription-check.ts**, `checkSubscriptionLimits(..., 'submit_bid')` does nothing (empty `break`), so even if it were called, bid count would not be enforced.
- **Conclusion:** Monthly bid limits are **not enforced** for any tier. “Unlimited job bids” for Professional is not implemented as a differential vs Basic/Free (and Professional is currently 100 in config, not unlimited).

**Recommendation:**  
- If Professional should have unlimited bids: set `professional: 'unlimited'` in `CONTRACTOR_BID_LIMIT` and implement monthly bid counting and enforcement in submit-bid (e.g. use `checkSubscriptionLimits` + `feature_usage` or equivalent).  
- If Professional stays at 100: enforce that limit in submit-bid and align marketing (“100 bids/month” etc.).

---

## 2. 10% platform fee (33% savings vs Basic 15%)

**Status: ❌ Not integrated**

- **FeeCalculationService** uses a single **5%** platform fee for all payment types (deposit, final, milestone). There is no subscription tier input and no 15% / 10% split.
- **FeeTransferService** and payment flows (e.g. **release-escrow**, **payment-details**, **jobs/[id]/payment-details**) call `FeeCalculationService.calculateFees(...)` with no contractor or subscription; they never pass plan type or a tier-based rate.
- **Conclusion:** Platform fee does **not** vary by subscription. Everyone is effectively on the same rate (5% in code). The advertised “10% for Professional” and “15% for Basic” are **not** applied in the backend.

**Recommendation:**  
- Add a way to resolve the contractor’s subscription/plan (e.g. from `contractor_subscriptions` or `SubscriptionService`).  
- In fee calculation (and any place that computes or displays platform fee), pass the plan and use tier-based rates (e.g. basic 15%, professional 10%, enterprise 7%) and ensure release-escrow and payment-details use that rate.

---

## 3. Featured in search results

**Status: ❌ Not integrated**

- **feature-access-config.ts** defines `CONTRACTOR_FEATURED_LISTING`: professional and enterprise `true`, free and basic `false`. So the **concept** of “featured” by plan exists in config.
- Contractor listing/search logic does **not** use subscription or this feature:
  - **getFeaturedContractorsOptimized** (e.g. in `lib/queries/airbnb-optimized-v2.ts`) orders by `created_at` and does not filter or sort by plan type or a “featured” flag derived from subscription.
  - No other path was found that orders or boosts contractors by Professional/Enterprise for “featured in search results”.
- **Conclusion:** “Featured in search results” for Professional is **not** implemented in the backend; contractor ordering/featured logic does not consider subscription tier.

**Recommendation:**  
- When querying contractors for search/browse, join or resolve subscription/plan and sort (or filter) so Professional/Enterprise can be ranked higher (e.g. “featured” first, then the rest).  
- Optionally store a denormalized `is_featured` (or equivalent) from subscription for performance.

---

## 4. Advanced analytics dashboard

**Status: ✅ Partially integrated**

- **subscription-check.ts** implements `checkSubscriptionLimits(contractorId, 'view_analytics')`: it loads `SubscriptionService.getSubscriptionFeatures(contractorId)` and blocks if `!features.advancedAnalytics` with message “Advanced analytics requires a Professional or Enterprise plan.”
- So **if** an API or server path that serves “advanced analytics” calls `checkSubscriptionLimits(..., 'view_analytics')`, then Professional (and Enterprise) can be allowed and others blocked.
- **SubscriptionService** gets features from DB/RPC (`get_subscription_features`); `advanced_analytics` must be true for professional (and enterprise) in the DB for this to work.
- **Conclusion:** The **gate** for “advanced analytics” by plan exists. Whether the **analytics dashboard** route(s) actually call this check needs to be verified per route.

**Recommendation:**  
- Ensure every API route or server action that serves advanced analytics (or the dashboard) calls `checkSubscriptionLimits(contractorId, 'view_analytics')` (or equivalent) and returns 403 when not allowed.  
- Ensure `subscription_features` (or equivalent) has `advanced_analytics = true` for professional and enterprise.

---

## 5. Priority support

**Status: ⚠️ Config only (no backend behaviour)**

- **feature-access-config.ts** has `CONTRACTOR_PRIORITY_SUPPORT`: professional and enterprise `true`.
- There is no backend logic that routes support tickets or assigns “priority” based on this (no ticket system or support API found that reads subscription).
- **Conclusion:** “Priority support” is a **product/ops** feature (e.g. 24h SLA, dedicated channel). The codebase only defines that Professional has access to the feature; actual prioritisation would be in your support tooling or processes.

**Recommendation:**  
- No code change required for “feature access” if it’s only used in UI or support processes.  
- If you add a support/help API, you can pass the contractor’s tier and tag requests as “priority” when `CONTRACTOR_PRIORITY_SUPPORT` is true.

---

## 6. Lead recommendations

**Status: ❌ Not integrated (and config says Enterprise)**

- **feature-access-config.ts** has `CONTRACTOR_LEAD_GENERATION`: only **enterprise** is `true`; professional is `false`. So “Lead recommendations” / “Lead generation” in the config is **not** a Professional feature.
- **RecommendationsService** exists but was not verified to gate “lead recommendations” by subscription.
- **Conclusion:** If “Lead recommendations” is advertised for **Professional**, the config and any backend that gates this feature should be updated to include professional. If it’s meant to be Enterprise-only, marketing should not list it under Professional.

**Recommendation:**  
- Align config with marketing: either give professional `CONTRACTOR_LEAD_GENERATION: true` and implement gating in the API that serves recommendations, or remove “Lead recommendations” from the Professional list.

---

## 7. Custom quote templates

**Status: ❌ Not differentiated by plan**

- **feature-access-config.ts** has `CONTRACTOR_QUOTE_BUILDER`: **all** tiers (free, basic, professional, enterprise) have `true`. There is no separate “custom quote templates” feature that is professional-only.
- **Conclusion:** “Custom quote templates” as a **Professional-only** benefit is **not** reflected in the backend; quote builder is available to every tier in config.

**Recommendation:**  
- Either introduce a dedicated feature (e.g. `CONTRACTOR_CUSTOM_QUOTE_TEMPLATES`) that is true only for professional (and maybe enterprise) and gate the relevant quote/template API, or remove “Custom quote templates” from the Professional-only list and treat it as an all-tier feature.

---

## Summary table

| Feature                     | Backend integrated? | Notes                                                                 |
|----------------------------|---------------------|-----------------------------------------------------------------------|
| Unlimited job bids         | ❌ No               | No monthly bid count or limit check; config says 100 for professional |
| 10% platform fee           | ❌ No               | Single 5% rate; no tier-based fee                                     |
| Featured in search         | ❌ No               | Contractor listing does not use plan for ordering/featured            |
| Advanced analytics         | ✅ Partial          | Gate exists in subscription-check; ensure all analytics routes use it |
| Priority support           | ⚠️ Config only      | No support routing logic in backend                                   |
| Lead recommendations       | ❌ No               | Config gives this to enterprise only; not professional                |
| Custom quote templates     | ❌ No               | Quote builder is all tiers; no professional-only “custom templates”   |

---

## Pricing note

- **SubscriptionService.PLAN_PRICING** has professional at **£49.99** (4999 pence).  
- **feature-access-config.TIER_PRICING** has professional at **£79**/month.  
- Public pricing page uses **£29**/month for Professional.  

Align backend plan amounts and display pricing (and any Stripe products/prices) with the chosen public price (e.g. £29) and keep a single source of truth for plan names and amounts.

---

## Recommended next steps

1. **Bid limits:** Implement monthly bid counting (e.g. `feature_usage` or similar) and enforce `CONTRACTOR_BID_LIMIT` in submit-bid; set professional to `'unlimited'` if that’s the offer.  
2. **Platform fee:** Resolve contractor plan in payment flows and apply tier-based platform fee (e.g. 15% basic, 10% professional, 7% business) in `FeeCalculationService` or callers.  
3. **Featured in search:** In contractor search/browse queries, incorporate plan (or featured flag) so Professional/Enterprise can be ranked first.  
4. **Analytics:** Ensure every advanced analytics endpoint calls `checkSubscriptionLimits(..., 'view_analytics')` and DB has correct `advanced_analytics` for professional.  
5. **Lead recommendations:** Either add professional to lead-generation feature and gate it in the API, or remove from Professional marketing.  
6. **Custom quote templates:** Either add a professional-only feature and gate template creation/use, or stop listing it as Professional-only.  
7. **Pricing:** Align SubscriptionService, TIER_PRICING, and Stripe with the chosen Professional price (e.g. £29).
