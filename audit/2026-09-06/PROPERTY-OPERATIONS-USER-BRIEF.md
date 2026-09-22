Act as a senior full-stack SaaS engineer, product designer, and property-management domain
specialist.

You are working on Mintenance, a property maintenance and property-management platform.

IMPORTANT:

- Inspect the ACTUAL CODEBASE first.
- Do not rely on README files, old markdown plans, design documents, TODO documents, or other
  potentially outdated documentation as the source of truth.
- The current application behaviour, components, routes, database schema, API calls and tests are
  the source of truth.
- Do not rebuild the application from scratch.
- Preserve existing working functionality.
- Reuse existing design-system components and patterns wherever possible.
- Refactor duplicated code when it materially improves maintainability.
- Do not introduce fake backend behaviour just to make the UI look complete.
- If the backend does not yet support a feature, create the UI in a clean extensible way and clearly
  identify the missing backend requirement.
- Before changing database schemas, auth, RLS, payments or production-sensitive systems, inspect how
  they currently work.

GOAL

Improve the property-management side of Mintenance so it feels like a serious B2B property
operations platform rather than simply a homeowner maintenance dashboard.

A homeowner asks: “What is happening with my property?”

A professional property manager asks: “What needs my attention right now, what is overdue, who is
responsible, what is the risk, what does it cost, and what action should I take?”

Redesign the experience around that second question.

================================================== PHASE 1 — AUDIT THE EXISTING IMPLEMENTATION
==================================================

Before writing code:

1. Inspect:
   - property routes/pages
   - property overview
   - jobs/work orders
   - timeline/history
   - maintenance plan / recurring maintenance
   - documents
   - access & contacts
   - compliance
   - financials/payments
   - contractor records
   - tenant records/reporting links
   - dashboard
   - navigation
   - data models
   - API/server actions
   - database queries
   - permissions/RLS
   - responsive behaviour

2. Identify:
   - which features already exist
   - which are partially implemented
   - duplicated UI/components
   - inconsistent status terminology
   - data already available but not surfaced
   - places using mocked/hard-coded values
   - unnecessary client-side fetching
   - performance issues
   - accessibility problems
   - poor empty/loading/error states
   - dead code related to these pages

3. Produce a short implementation plan before editing.

Then implement the improvements.

Do not spend the whole task writing an audit report. The objective is to improve the product.

==================================================

1. # PROPERTY OVERVIEW → PROPERTY COMMAND CENTRE

Redesign the individual property overview to become an operational command centre.

Keep the existing Mintenance visual identity:

- clean premium SaaS appearance
- white/light-neutral backgrounds
- mint/sage green primary accents
- restrained colour
- subtle borders
- rounded cards
- strong hierarchy
- good whitespace
- clear icons
- consistent status badges

But slightly increase information density for professional users.

PROPERTY HEADER

Keep:

- property name
- address
- photo
- property type
- bedrooms/bathrooms where applicable
- edit property action

Add/surface useful operational information where available:

- occupancy status
- assigned property manager
- tenant/occupant
- owner/client where relevant

Do not overload the header.

TOP KPI ROW

Replace passive statistics with actionable operational KPIs.

Prefer:

Open jobs Overdue Compliance risks Spend YTD Committed spend Visits this week

Each card should:

- be clickable
- navigate/filter to the underlying records
- display useful secondary information
- not just be decorative

Examples:

Open jobs 7 2 overdue

Compliance risks 2 1 overdue

Spend YTD £4,350 vs £8,000 budget

Committed spend £1,280 3 approved jobs

Visits this week 2 1 inspection · 1 repair

================================================== 2. URGENT ACTIONS
==================================================

Create an “Urgent actions” component near the top of the property overview.

It should surface things requiring human action, for example:

- overdue compliance
- emergency repair
- SLA breach
- quote awaiting approval
- contractor has not responded
- tenant access not confirmed
- recurring maintenance overdue
- invoice awaiting approval
- certificate expiring soon

Each row should show:

- priority
- issue
- relevant date / age
- contextual explanation
- ONE obvious next action

Example:

Gas Safety Check is overdue Was due 1 Jun 2026 · 112 days overdue [Rebook]

Leaking pipe awaiting approval Quote received · £180 [Review]

Do not turn this into a generic notification feed.

These should be actionable operational items.

================================================== 3. TODAY / UPCOMING
==================================================

Add a compact operational schedule component.

Display:

- contractor visits
- inspections
- compliance checks
- planned maintenance
- tenant access appointments

Show:

- date
- time
- event
- contractor
- status

Allow navigation to the full schedule.

================================================== 4. WORK ORDER SYSTEM
==================================================

Review the current job status model.

Create a clear, consistent work-order lifecycle where the existing backend allows it.

Preferred conceptual lifecycle:

Reported Needs triage Awaiting approval Awaiting quote Awaiting contractor Scheduled Contractor
attending / In progress Work completed Awaiting invoice Awaiting verification Closed

Secondary states: On hold Cancelled Tenant unavailable Contractor unavailable

DO NOT unnecessarily migrate the database if existing statuses can be mapped safely.

Create a single source of truth for:

- status labels
- colours
- icons
- allowed transitions
- terminal states

Avoid multiple components independently deciding status colours or labels.

================================================== 5. PROFESSIONAL WORK ORDERS SCREEN
==================================================

Upgrade the main jobs screen into a proper work-order management screen.

Add useful top-level views:

Open Awaiting quote Awaiting approval Scheduled In progress Awaiting invoice Closed

Add filtering for:

Property Trade Priority Status Assigned contractor Assigned manager Overdue SLA Date Cost

Table columns should include where supported:

Job Property Trade Priority Status Assigned contractor Target SLA Age Cost Next action

IMPORTANT: Add an obvious “Next action” concept.

Examples:

Assign contractor Request quote Approve quote Schedule visit Chase contractor Check completion
Review invoice Close job

Selecting a row should preferably open a side panel/drawer rather than forcing unnecessary page
navigation.

The panel can contain:

Details Updates Documents Costs Tenant notes

And quick actions such as:

Message contractor Schedule visit Approve quote Upload invoice Mark complete

================================================== 6. SLA / RESPONSE TARGETS
==================================================

Introduce SLA/target tracking in the UI where possible.

A job should be able to clearly communicate:

Priority: Emergency Target response: 1 hour Remaining: 26 minutes

or:

Priority: Routine Target completion: 7 days Open: 9 days SLA exceeded by 2 days

Create reusable utilities/components for:

- SLA remaining
- overdue calculation
- SLA badge
- urgency state

Do not scatter date calculations throughout components.

If the database does not currently contain SLA rules, implement the frontend architecture cleanly
but do not invent fake persisted SLA data.

================================================== 7. OPERATIONS INBOX
==================================================

Create or redesign the main property-management dashboard around an Operations Inbox.

This should become the main daily working screen for a property manager.

Example heading:

Good morning, Jojo

17 items need your attention across 24 properties

Summary metrics:

Open jobs SLA breaches Certificates expiring Awaiting approval Spend this month

Below that create action categories such as:

Urgent Compliance Approvals Contractors Tenants Invoices

Then provide one unified task/action table.

Recommended columns:

Property Issue / task Category Assigned to Age / SLA Action

Filters:

All My tasks Overdue This week Portfolio/property

Example rows:

65 Gloucester Road Gas safety certificate overdue Compliance Unassigned 54 days overdue [Assign]

12 Maple Close Water leak – no water supply Urgent Jake Simmons 12 hours [Rebook]

18 Pine Road Boiler replacement quote Approval Paul Morrison 2 days [Approve]

The philosophy is:

The user should be able to open Mintenance in the morning and understand what needs doing without
visiting every property individually.

================================================== 8. COMPLIANCE
==================================================

Professional property managers need stronger compliance tracking.

Create a proper compliance tracker.

Potential items include:

Gas Safety EICR EPC Smoke / CO alarms Legionella Fire assessments Emergency lighting PAT Asbestos
records Lift inspections Licences / HMO requirements

IMPORTANT:

Do NOT assume every requirement applies to every property.

The system should support:

- applicable
- not required
- valid
- expiring soon
- expired/overdue
- missing

Each compliance item should support where possible:

status issue date expiry date responsible person/company linked document linked job notes
renewal/rebook action

Expiry dates should automatically feed:

- urgent actions
- dashboard
- operations inbox
- planned maintenance

================================================== 9. ASSET REGISTER
==================================================

Expand the current “Major systems” concept into an Asset Register.

Examples:

Boiler Heat pump Consumer unit Plumbing/heating system Roof Doors Access systems Kitchen appliances
Fire systems Solar equipment

Each asset can include where supported:

Name Category Manufacturer Model Serial number Installation date Warranty expiry Last service Next
service Lifetime maintenance spend Related documents Related jobs Maintenance history

Example:

Worcester Bosch Greenstar 30i

Installed: 2021 Warranty: until 2031 Last service: 12 June 2026 Next service: 12 June 2027 Lifetime
spend: £475 Repairs: 3

Allow users to open asset history.

Do not make every field mandatory.

================================================== 10. PLANNED / RECURRING MAINTENANCE
==================================================

Upgrade the existing recurring maintenance functionality into “Planned Maintenance”.

Examples:

Gas safety — yearly Boiler service — yearly Gutter cleaning — every 6 months Smoke alarm check —
every 6 months Roof inspection — every 2 years Electrical inspection — every 5 years

Show:

Upcoming Recurring Completed Overdue

Keep the current auto-job / auto-rebook functionality if it exists, but improve the terminology and
workflow.

Suggested wording:

Planned Maintenance Automation

“Invite the previous contractor 14 days before this task is due.”

Never automatically charge a customer without explicit permission.

================================================== 11. PROPERTY HISTORY / TIMELINE
==================================================

Treat the timeline like a permanent service record for the building.

It should include events such as:

Tenant report Job created Contractor assigned Quote received Quote approved Visit scheduled
Contractor attended Work completed Invoice uploaded Payment completed Certificate uploaded
Inspection completed Asset serviced Compliance renewed

Each timeline item should link to its related record.

Add useful filters:

All Jobs Documents Compliance Payments Notes

Avoid duplicating data manually if the timeline can be derived from existing events.

================================================== 12. DOCUMENTS
==================================================

Improve Documents so files are related to operational objects.

Documents should be linkable to:

Property Work order Asset Compliance item Contractor Invoice

Useful document metadata:

Document type Property Contractor Job Issue date Expiry date Amount Certificate number

If document extraction/AI already exists, integrate it.

If not, prepare the architecture but do not build an unreliable fake AI extractor.

================================================== 13. ACCESS & CONTACTS
==================================================

The existing access section is useful. Improve it rather than removing it.

Support:

Key safe Smart lock Tenant present Property manager present Other instructions

Store useful contractor information:

Parking instructions Pets Alarm instructions Access times Tenant notification requirement Water
stopcock Gas isolator Consumer unit Emergency contacts

Sensitive information such as key-safe codes must be protected.

Review the current authorization/security logic.

Do not expose access codes in:

- public URLs
- unauthorised API responses
- logs
- client payloads unnecessarily

Reveal sensitive access information only when the user/contractor has permission and at the
appropriate stage of the job.

================================================== 14. CONTRACTOR PERFORMANCE
==================================================

Where existing data permits, enhance contractor records with operational statistics.

Examples:

Jobs completed Average response Average completion Average rating Average job cost Repeat usage
First-time fix rate if reliable data exists

Also track relevant contractor documents where applicable:

Insurance Trade certification Public liability Expiry dates

Do NOT fabricate metrics if the underlying data is insufficient.

================================================== 15. FINANCIAL INFORMATION
==================================================

Improve property-level financial visibility.

Instead of only:

Total spent

support where data exists:

Paid Committed Awaiting approval Awaiting invoice Budget Remaining budget

Example:

Paid £4,350 Committed £1,280 Awaiting approval £760 Awaiting invoice £340 Budget £8,000 Remaining
£2,550

Allow spend breakdown by trade/category.

Keep financial calculations in reusable server-side/domain utilities rather than duplicating
calculations in React components.

================================================== 16. “MINT SAYS” → “MINT DETECTED”
==================================================

Improve the AI/recommendation panel.

Avoid vague statements such as:

“You have booked 2 plumbers here.”

Prefer operational recommendations:

“Gas Safety is 12 days overdue.” [Rebook]

“This plumbing job has had no contractor activity for 4 days.” [Chase contractor]

“Two visits require tenant access but no confirmation has been received.” [Contact tenants]

“This property has had 4 plumbing repairs in 12 months.” [View history]

Recommendations should ideally have:

reason evidence severity recommended action CTA

Do not make the AI make legally definitive compliance claims unless the application has sufficient
reliable information.

================================================== 17. INFORMATION ARCHITECTURE
==================================================

Review the existing property tabs.

The current concept contains items such as:

Overview Maintenance Documents Timeline Access & contacts Assessments Manage

“Manage” should not become a dumping ground.

Aim for a clearer structure such as:

Overview Work orders Compliance Assets Tenancy & Access Documents History Settings

You do not have to use these exact names if existing routes make another structure cleaner.

Important: Do not duplicate global pages unnecessarily.

For example, the property-specific Work Orders tab can simply be a filtered view of the global
work-order system.

================================================== 18. UX RULES
==================================================

Use progressive disclosure.

The default property page should answer:

1. Is something urgent?
2. What is overdue?
3. What is happening today?
4. What jobs are open?
5. Is the property compliant?
6. How much money is committed?
7. What should I do next?

Prioritise actionable content above passive analytics.

Use colour sparingly:

Red = urgent / overdue / failure Amber = attention / expiring / waiting Green = valid / healthy /
complete Blue = informational / in progress Grey = inactive / not applicable

Do not use colour as the only indicator.

Maintain accessible contrast.

================================================== 19. COMPONENT ARCHITECTURE
==================================================

Create reusable components where appropriate, for example:

PropertyKpiCard StatusBadge PriorityBadge SlaBadge ActionItem UrgentActions UpcomingSchedule
WorkOrderTable WorkOrderDrawer ComplianceStatus ComplianceTable AssetTable AssetCard
PlannedMaintenanceList OperationalInsight EmptyState ErrorState LoadingSkeleton

Follow the existing architecture and naming conventions where sensible.

Avoid giant page components.

Avoid components that know too much about database structure.

Separate:

- data fetching
- domain logic
- display components

================================================== 20. PERFORMANCE
==================================================

Do not make the richer dashboard result in dozens of independent browser requests.

Where appropriate:

- fetch dashboard data server-side
- aggregate queries
- parallelise independent server queries
- avoid N+1 queries
- paginate long tables
- lazy load secondary information
- use skeletons during loading

Inspect the existing framework before deciding the implementation strategy.

================================================== 21. RESPONSIVENESS
==================================================

Desktop is the primary property-manager experience, but the application must remain usable on
smaller screens.

For tablet/mobile:

- KPI cards can scroll/wrap
- tables may transform into cards
- filters can enter a drawer
- work-order details can become a full-screen sheet
- side navigation can collapse

Do not simply shrink a desktop table until it becomes unreadable.

================================================== 22. EMPTY, LOADING AND ERROR STATES
==================================================

Professional SaaS quality requires proper states.

Examples:

No open jobs “This property has no open maintenance jobs.”

No assets “Add the boiler, electrical system or other key assets to start tracking service history.”

No compliance data “Set up compliance requirements for this property.”

Do not show empty oversized boxes.

================================================== 23. SECURITY / DATA PROTECTION
==================================================

While touching these features, inspect:

authentication authorization role checks RLS if applicable property ownership/access contractor
permissions tenant permissions document access access-code exposure server/client boundaries

Do not weaken any security policies to make development easier.

Do not expose service-role/admin credentials to the browser.

================================================== 24. QUALITY
==================================================

After implementation:

Run:

- type checking
- linting
- unit tests
- integration tests where available
- build
- relevant end-to-end tests

Fix problems introduced by your changes.

Add tests for important domain calculations such as:

- overdue dates
- SLA calculations
- compliance status
- financial totals
- job status transitions

================================================== 25. VISUAL QUALITY
==================================================

The final interface should feel comparable to modern B2B SaaS products.

Avoid:

- enormous cards with little information
- excessive gradients
- excessive animation
- glassmorphism
- decorative graphs with no operational value
- inconsistent spacing
- inconsistent button sizes
- unnecessary modals
- excessive badges
- fake statistics

Prioritise: clarity speed trust actionability consistency accessible design

================================================== IMPLEMENTATION ORDER
==================================================

Prioritise in this order:

P0

1. Operations Inbox
2. Property Overview command centre
3. Work-order lifecycle/status consistency
4. Work-order table/detail experience
5. SLA/overdue visibility

P1 6. Compliance tracker 7. Asset register 8. Planned maintenance 9. Timeline/history
improvements 10. Financial committed-spend view

P2 11. Contractor performance 12. Smarter Mint detected recommendations 13. Advanced document
metadata/extraction 14. Portfolio analytics

Do not try to implement unfinished speculative P2 features at the expense of P0 quality.

================================================== IMPORTANT FINAL REQUIREMENT
==================================================

Do not merely make the screens LOOK like property-management software.

Make the underlying workflows coherent.

Every important KPI should lead somewhere. Every alert should have an action. Every status should
mean something. Every financial figure should come from real data. Every compliance warning should
explain why. Every work order should have a clear next step.

When finished, provide:

1. Summary of what you changed.
2. Files/components added or substantially modified.
3. Database/schema changes, if any.
4. Security/RLS changes, if any.
5. Features deliberately left for later because backend support is missing.
6. Tests run and results.
7. Any remaining risks or technical debt discovered during implementation.
