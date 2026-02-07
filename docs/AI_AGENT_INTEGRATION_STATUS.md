# AI Agent Automation – Integration Status

**Last updated:** From move of AgentAutomationPanel to Settings and backend wiring.

## Where to find it

- **UI:** Homeowner **Settings** → **AI & Automation** (sidebar). Dashboard has a quick link “AI & Automation” under Quick Links that goes to `/settings?tab=automation`.

## Backend & SQL

| Component | Status | Notes |
|-----------|--------|--------|
| **user_agent_settings** | ✅ Integrated | Table stores `enable_automation`, `automation_level`, `agents` (JSONB). GET/POST `/api/agents/settings` read/write this table. Migration: `20251217000004_add_user_agent_settings_table.sql`. |
| **agent_decisions** | ✅ Used | Audit log for agent actions. Settings POST inserts a row when automation is changed. GET uses it for “last action” per agent. Columns used: `agent_name`, `action`, `confidence`, `created_at`; migration adds `context`, `decision`, `action` where needed. |
| **automation_preferences** | ✅ Wired for Bid Acceptance | Table has `auto_accept_bids`. **BidAcceptanceAgent** reads `AutomationPreferencesService.getPreferences(userId)` → `autoAcceptBids`. When the user saves the panel with **Bid Acceptance** on and automation enabled, POST `/api/agents/settings` upserts `automation_preferences` so `auto_accept_bids` is set – so the panel now drives auto-accept. |

## Agents that are wired

| Agent | Backend integration | Table / service |
|-------|---------------------|------------------|
| **Bid Acceptance** | ✅ | Panel toggles sync to `automation_preferences.auto_accept_bids`. `BidAcceptanceAgent.evaluateAutoAccept()` runs after submit-bid and checks `AutomationPreferencesService.isEnabled(homeownerId, 'autoAcceptBids')`. |
| **Pricing** | ✅ (suggest only) | PricingAgent used in submit-bid flow for suggestions; no automation level gating. |
| **Scheduling, Notifications, Dispute, Job Status, Predictive** | ⚠️ Config only | Shown in the panel and stored in `user_agent_settings.agents`; no backend logic yet that reads automation level or per-agent enabled state for these. |

## Bug fix in agents settings API

- **POST** rate limit used `request` / `request.url` instead of `req` / `req.url`; this was corrected to use `req`.

## Summary

- Panel is in **Settings → AI & Automation**; dashboard links to it.
- **Bid Acceptance** is fully wired: panel → `user_agent_settings` + sync to `automation_preferences.auto_accept_bids` → BidAcceptanceAgent reads that and can auto-accept when criteria are met.
- Other agents are stored and displayed but not yet used by backend logic.
