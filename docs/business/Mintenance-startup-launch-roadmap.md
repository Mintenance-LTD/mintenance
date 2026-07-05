# Mintenance, Startup Launch Roadmap

_For Gloire & Liam · UK · Prepared June 2026 · Status: beta, pre-revenue, company dormant_

> This is a plan, not legal or financial advice. Where it touches law, tax, or regulation, treat it
> as "what to take to a solicitor or accountant," not a final answer. I've flagged those points
> clearly.

---

## Where you actually are

You have more than most pre-launch founders: a working web app on Vercel, an internal Android build,
a Stripe Connect payment flow, and a registered company. What you do not yet have is the one thing
that matters most: proof that someone other than you will use Mintenance and pay for it. Everything
below is sequenced around getting that proof as fast and as cheaply as possible, without tripping
over the few legal things you genuinely can't skip.

**The core principle: validate before you scale.** Your burn is almost nothing (about $100). That's
a huge advantage. It means you can take the time to prove demand before spending money on lawyers,
branding, or features. Do not invert that order. The most common way startups like yours die is
building and polishing for months, then discovering nobody wanted it.

**The one sentence to keep on your wall:** _Get 5 to 10 real maintenance jobs booked and paid
through Mintenance, by people who aren't us, in one postcode, before doing anything that costs real
money._

---

## The three launch-blockers (everything else can wait)

These are the only things that genuinely must be true before a real homeowner pays a real contractor
through your platform. Don't let anything else feel as urgent as these.

1. **Money flow is clean.** You're on Stripe Connect, which is the right answer. Confirm Stripe
   holds and moves the funds (destination or separate charges/transfers) and your company never
   holds client money in an account it controls. If that's the case, you almost certainly avoid
   being a regulated payment business yourself. Verify against Stripe's Connect docs and, ideally, a
   30-minute solicitor check. (Detail in Workstream B.)
2. **You have basic terms and a privacy policy live, and you've registered with the ICO.** You're
   collecting personal data the moment a real user signs up. Terms + privacy policy + ICO
   registration is the minimum. The ICO fee is about £52/year for a business your size. There is no
   excuse to skip this one; it's cheap and legally required. (Detail in Workstream B.)
3. **"Vetted" is true.** If your marketing says trades are vetted, you must actually verify them
   before they take a paid job: Gas Safe registration for gas work, proof of insurance, ID, relevant
   qualifications. Define your real vetting standard and apply it, or change the wording. (Detail in
   Workstream B.)

If those three are handled, you can legally and safely run your first real transactions. That's the
gate.

---

## The 90-day plan at a glance

**Phase 0, this week (foundations):** Pick your city. Stand up the founding-member capture page.
Register with the ICO. Confirm your Stripe Connect configuration. Get one real end-to-end test
transaction through with a friendly contractor and a small real job.

**Phase 1, weeks 1 to 4 (minimum legal + first jobs):** Put basic terms and a privacy policy live.
Define and apply your vetting standard. Start the content engine (you already have the plan).
Hand-broker your first 3 to 5 real jobs personally.

**Phase 2, weeks 5 to 12 (prove the loop):** Get to 5 to 10 completed, paid jobs in one area. Talk
to every single user. Fix the path to a transaction, don't add features. Sign the founders agreement
and move the company to trading.

**Phase 3, month 3 onward (decide):** Look honestly at the data. If the loop works (homeowners post,
contractors bid, jobs complete, both come back), press on and consider raising via SEIS. If it
doesn't, you've spent almost nothing to learn that, and you can pivot.

---

## Workstream A, Validation (your top priority)

This is where 70% of your energy goes for the next 90 days.

**Name your riskiest assumption.** For a two-sided maintenance marketplace it's usually one of
these: (a) will homeowners trust an unknown platform enough to pay through it, and (b) will good
contractors accept jobs and the fee. You can't answer these from your desk. You answer them by
getting real jobs done.

**Do things that don't scale.** For your first jobs, be the algorithm. Personally find a homeowner
with a real job, personally find a vetted contractor, introduce them, and walk the payment through
your app. It's manual and that's the point. You'll learn exactly where the product and the trust
break.

**A concrete first-jobs plan:**

- Use your and Liam's networks first. The first 3 to 5 jobs should come from people you can message
  directly. A leaking tap, a paint job, a broken fence, anything real.
- Line up 3 to 5 contractors you've personally vetted in your chosen city so you have supply ready
  when a job appears.
- Watch the whole journey over their shoulder (or on a call). Where do they hesitate? What do they
  ask? Where does the app confuse them?
- Honour the founding-member promise (free for life) for these people. They're doing you a favour.

**What "it's working" looks like:** homeowners complete the booking without you holding their hand,
contractors actually want the jobs, money moves cleanly, and at least a few people say "when can I
use this again." Repeat business is the strongest signal at this stage.

**Talk to users relentlessly.** Every founding member is a 20-minute conversation. What nearly
stopped them? What would they tell a friend? You're hunting for the difference between "nice idea"
and "I needed this."

---

## Workstream B, Legal & compliance

Minimum viable legal, sequenced. The goal is "safe enough to take real money from a few people," not
"ready for 10,000 users." Don't over-spend here before validation.

**B1. Confirm the Stripe Connect setup (this week, free).** Verify that funds are held and disbursed
by Stripe, not by a Mintenance-controlled balance. With standard Connect destination/separate
charges, Stripe is the regulated party and you're a platform facilitating payments, which is the
position you want. Keep a written note of how it's configured. If anything looks like you're holding
client funds, get a solicitor on it before launch.

**B2. ICO data protection registration (this week, about £52/year).** Legally required because you
process personal data. Micro-organisation tier (10 or fewer staff, or under £632k turnover) is
£52/year, or £47 by Direct Debit. Do it now; it's the cheapest box to tick.

**B3. Terms of Service, two-sided (before first real job).** You need homeowner terms and contractor
terms. The non-negotiable points:

- Mintenance is a platform that _connects_ homeowners and contractors. You are not the one doing the
  work and not a party to the work contract.
- Clear limitation of liability for the quality/outcome of work.
- How payments and the escrow/hold-and-release flow work, in plain English.
- Dispute process and refund rules.
- Contractor obligations: valid insurance, qualifications, lawful work.
- Cancellation rights under the Consumer Contracts Regulations.

You can start from a reputable template (SeedLegals, Genie AI, or similar) and get a solicitor to
review for a few hundred pounds, rather than commissioning bespoke drafting for thousands. I can
draft a solid starting version for a solicitor to finalise.

**B4. Privacy policy + UK GDPR basics (before first real job).** What data you collect, why, lawful
basis, how long you keep it, who it's shared with (Stripe, Supabase, etc.), and users' rights. Goes
live alongside terms.

**B5. The "vetted" standard (before first paid job).** Write down exactly what vetting means at
Mintenance and apply it consistently: Gas Safe for gas, NICEIC/registered for electrical, proof of
public liability insurance, ID verification, and relevant certifications. This protects users and
protects you from a mis-selling/negligence claim. Your marketing claims must match what you actually
do.

**B6. Insurance (before scaling, not necessarily before the first friendly job).** Look into
professional indemnity and public liability for the platform, and require contractors to carry their
own cover. Get quotes; it's often cheaper than founders expect.

**Rough cost:** ICO ~£52/year now. Template terms + privacy with a solicitor review: ballpark £500
to £2,000 depending on how much you DIY. Bespoke marketplace T&Cs from a law firm: £2,000+. Start
lean.

---

## Workstream C, Company & founders

**C1. The founders/shareholders agreement (do this early, it's the most important document you don't
have).** You and Liam are 50/50. That feels fair and is a classic deadlock trap: if you ever
disagree and can't break the tie, the company can freeze. Before you trade, agree in writing:

- Share split and **vesting** (shares earned over time, typically 4 years, so if someone leaves
  early they don't walk with half the company).
- Roles and decision rights, and a tie-break mechanism for deadlock.
- What happens if a founder leaves, wants out, or stops contributing (good leaver / bad leaver).
- **IP assignment:** all code, designs, and the brand must be owned by the company, not by either of
  you personally. This is essential and often missed.
- Commitment expectations (full-time, part-time, time to first salary).

SeedLegals is the common UK tool for this and is built for exactly your situation. I can draft heads
of terms (the plain-English summary of what you both agree) so you and Liam align before paying for
the legal version.

**C2. Move from dormant to trading (when you start taking real money).** The moment you have real
revenue, the company is no longer dormant:

- Tell HMRC the company is active and register for Corporation Tax (must be done within 3 months of
  starting to trade).
- File a confirmation statement and annual accounts at Companies House as normal.
- Keep clean records from day one.

**C3. Money & bookkeeping.** Your Monzo business account is fine to start. Add simple bookkeeping
(FreeAgent or Xero) before transactions get numerous. Keep personal and company money strictly
separate.

**C4. VAT, not yet.** You only must register for VAT once taxable turnover crosses £90,000 in any
rolling 12-month period (then within 30 days). You're nowhere near it, so park this. Voluntary
registration rarely makes sense for you right now.

---

## Workstream D, Product readiness

**Don't build new features.** The instinct will be to add things. Resist it. Until the core loop is
proven, the only product work that matters is making the path to a completed, paid job smooth and
trustworthy.

- **Get one real-money transaction through end to end** with a friendly contractor and a small real
  job. Test mode is not proof. This will surface the real bugs.
- **Tighten the trust-critical screens:** signup, posting a job, accepting a quote, paying, marking
  work done, releasing payment. Those are the moments people drop off or get scared.
- **Android:** move the internal APK into Google Play closed testing so real users can install it
  cleanly on their own phones. Full public store listing can wait until the loop works.
- **Basic security/privacy hygiene** since you hold personal data: that's part of being
  launch-ready, not a nice-to-have.

You have a detailed engineering picture already; the discipline here is restraint, not more code.

---

## Workstream E, Go-to-market

You already have the 30-day content plan, the 20-post bank, and the founding-member landing copy.
The founding-150 offer is not just marketing; it's your validation engine. Each founding member is a
real test of the loop.

- **Pick the city this week** (wherever you and Liam can physically show up and meet contractors).
  Density beats reach.
- **Run the content plan** but remember the note in it: distribution beats production at this stage.
  Time spent in local Facebook groups, Nextdoor, and DMs matters more than a fourth post.
- **Recruit supply in parallel:** you need a handful of vetted contractors ready so that when a
  homeowner posts, there's someone to match.

---

## Workstream F, Money & runway

You're effectively at near-zero burn, which is your superpower. Protect it.

- **Near-term costs are tiny:** ICO (~£52/year), a domain if you don't have one, maybe a few hundred
  pounds for legal review. You can reach your first real transactions for well under £500 all-in.
- **Don't raise money yet.** You have nothing to show an investor, and raising now would be at a
  terrible valuation. Get traction first.
- **When you're ready to raise (Phase 3+), know about SEIS.** The UK's Seed Enterprise Investment
  Scheme lets a company raise up to £250,000 in its lifetime with generous tax relief for investors,
  which makes you far more attractive to angels. Getting HMRC "advance assurance" takes about 4 to 6
  weeks. You don't need it now, but it's the single most useful UK funding lever for a startup at
  your stage, so keep it in your back pocket.

---

## This week: the five things to actually do

1. **Pick your launch city** and put it in your bios and landing page.
2. **Register with the ICO** (~£52, ~20 minutes online).
3. **Confirm your Stripe Connect configuration** (Stripe holds the funds, you don't) and write down
   how it works.
4. **Run one real-money test job** end to end with a friendly contractor.
5. **Stand up the founding-member capture page** and DM your first 10 prospects.

Everything else follows from these.

---

## What I can build for you next (just say which)

- **Draft Terms of Service (homeowner + contractor) and a Privacy Policy** as solid starting
  versions for a solicitor to finalise.
- **Founders agreement heads of terms** so you and Liam align before paying for the legal version.
- **A validation playbook**: the exact first-jobs script, the user-interview questions, and a simple
  tracking sheet.
- **A one-page launch checklist** version of this roadmap you can tick off.
- **A simple investor-ready one-pager** for when you reach Phase 3.

---

### Sources (current as of June 2026)

- ICO data protection fee tiers:
  [ico.org.uk/for-organisations/data-protection-fee](https://ico.org.uk/for-organisations/data-protection-fee/)
- UK VAT registration threshold (£90,000):
  [GOV.UK](https://www.gov.uk/government/publications/vat-increasing-the-registration-and-deregistration-thresholds/increasing-the-vat-registration-threshold)
- SEIS limits and advance assurance:
  [Carta UK guide](https://carta.com/uk/en/learn/startups/fundraising/seis-eis-advance-assurance/)
