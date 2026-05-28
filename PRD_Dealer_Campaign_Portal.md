# PRD: Dealer Campaign Portal
## CarDekho NCBD — Automated Service Agent (Item 1)

**Document owner:** Santosh Sharma, Strategy & GTM  
**Status:** Draft v1.0  
**Date:** May 2026  
**Audience:** Product, Engineering, Design, Account Management

---

## 1. Background & Context

CarDekho's Google Ads Agency Business was shut down in FY25 due to two compounding failures: dealers had no visibility into ongoing campaign work (eroding trust), and the sales team was making CPL commitments that were never approved by the marketing team (causing overruns and disputes). The business is now being re-launched with a strengthened operational backbone.

The **Dealer Campaign Portal** is the client-facing layer of this re-launch. It gives each dealer a dedicated, login-protected interface to monitor their Google Ads campaign activity — what is running, what results it is generating, what the account management team has done, and what was spent. This portal directly addresses the root cause of the historical trust problem: dealers could not see that active management was happening.

This portal is entirely **separate** from the internal campaign optimization tool used by the account management team. It is what dealers see; the internal tool is what the team uses. Dealers interact only with this portal.

---

## 2. Problem Statement

Dealers running Google Ads campaigns through CarDekho's agency had no self-service window into their campaign performance. The only touchpoint was a periodic phone call or WhatsApp message from an account manager, which many dealers perceived as insufficient — or worse, as evidence that nothing was actively being managed. This perception drove early churn and disputes over performance.

The absence of a transparent, always-available performance view means:

- Dealers cannot verify that their budget is being actively managed, leading to trust erosion over the contract period.
- Account managers spend a disproportionate share of time answering status enquiries instead of optimising campaigns.
- There is no auditable record of campaign activity, making dispute resolution slow and subjective.

---

## 3. Goals

**Dealer goals (what dealers get):**

1. Always-available, self-service visibility into campaign performance — impressions, clicks, leads, CPL — without needing to call an account manager.
2. A clear, human-readable log of every optimisation action taken on their campaign, with a plain-language explanation of what was done and why.
3. Downloadable performance reports they can share internally or with their principal/management.

**Business goals (what CarDekho gets):**

4. Reduction in dealer churn caused by the "nothing is happening" perception — target: retain ≥80% of active clients through the first contract cycle.
5. Reduction in inbound escalation volume to account managers — target: 40% fewer status-check calls/messages within 90 days of portal launch.
6. A defensible audit trail for every campaign action, reducing the frequency and cost of billing disputes.

---

## 4. Non-Goals

The following are explicitly out of scope for version 1 of this portal:

1. **Dealers cannot modify campaigns.** All changes to targeting, budgets, creatives, and bids are made exclusively by the CarDekho account management team. Dealers have no write access to campaign settings. *(Rationale: Allowing dealer edits introduces risk of conflicting changes and removes CarDekho's ability to guarantee managed service quality.)*

2. **Billing and invoicing are not in scope.** Dealers cannot view invoices, payment history, or raise billing queries through this portal. *(Rationale: Billing is handled separately; mixing it into this portal adds compliance complexity and distracts from the core trust-building purpose.)*

3. **Meta/Facebook Ads are not in scope.** This portal covers Google Ads only. *(Rationale: The internal optimisation tool does not yet support Meta campaigns.)*

4. **Competitive benchmarking is not in scope.** Dealers will not be shown how their performance compares to other dealers or industry averages. *(Rationale: Dealer data sensitivity and the risk of competitive information leakage make this a separate, later initiative.)*

5. **Self-serve campaign creation or renewal is not in scope.** Dealers cannot initiate a new campaign, extend an existing one, or change their package through the portal. *(Rationale: These are sales-led workflows and should remain under account management control in v1.)*

---

## 5. Target Users

### Primary persona — Dealer Principal / Owner

The business owner of the dealership. Checks in periodically (weekly or monthly) to verify that their marketing spend is producing returns. Not technically sophisticated; primarily cares about leads generated and cost per lead. Likely accessing on mobile. Does not want to dig into data — wants a headline number and confidence that work is ongoing.

### Secondary persona — Dealer Marketing Manager / In-house Point of Contact

The operational contact at the dealership who interacts with the CarDekho account manager. Checks more frequently (daily or every few days). Wants to see granular performance — impressions, CTR, daily spend — and verify that optimisations are being implemented. May download reports to share with the dealer principal.

---

## 6. User Stories

### Authentication & Access

- As a dealer, I want to log in to the portal with my registered mobile number so that I do not need to remember a separate password or username.
- As a dealer, I want my session to remain active for a reasonable period so that I do not need to re-authenticate every time I open the portal.
- As a dealer principal managing multiple showroom locations, I want to switch between locations from a single login so that I can review each location's campaign separately without multiple credentials.

### Campaign Performance Dashboard

- As a dealer, I want to see a summary of my campaign's performance — total impressions, clicks, click-through rate, and leads generated — on the home screen so that I can assess performance at a glance.
- As a dealer, I want to filter performance data by date range (last 7 days, last 30 days, current month, custom range) so that I can track trends over time.
- As a dealer, I want to see my cost per lead (CPL) for the selected period alongside the target CPL committed at the time of onboarding so that I can verify whether performance is meeting expectations.

### Budget Utilisation

- As a dealer, I want to see how much of my campaign budget has been spent versus how much remains so that I can plan for renewals or query under-utilisation.
- As a dealer, I want to see the daily budget burn rate as a simple chart so that I can understand whether spend is pacing correctly through the month.

### Optimisation Activity Log

- As a dealer, I want to see a chronological log of every action taken on my campaign — with the date, a plain-language description of what was changed, and a brief reason — so that I have confidence that active management is happening.
- As a dealer, I want each log entry to show the impact of the change where measurable (e.g., CTR improved from X% to Y% after keyword refinement) so that I can see the value of ongoing management.
- As a dealer marketing manager, I want to filter the optimisation log by time period so that I can review activity for a specific week or month.

### Reports

- As a dealer, I want to download a formatted PDF performance report for any calendar month so that I can share it with my management team or principal.
- As a dealer, I want to download campaign data in Excel format for any date range so that I can run my own analysis or share with a partner agency.
- As a dealer, I want to receive a monthly performance report automatically via WhatsApp and email without having to log in and download it manually.

### Support & Communication

- As a dealer, I want to raise a support request or query directly from the portal so that I have a tracked record of my question and do not have to rely on WhatsApp with the account manager.
- As a dealer, I want to see the status of my open support requests (open, in review, resolved) so that I know whether my query has been picked up.
- As a dealer marketing manager, I want to send a message to my account manager within the portal so that all campaign-related communication is in one place.

### Notifications

- As a dealer, I want to receive a WhatsApp notification when a new monthly report is available so that I do not have to log in to check.
- As a dealer, I want to receive an email notification summarising my campaign performance weekly so that I stay informed without having to log in every day.
- As a dealer, I want to control which notification types I receive so that I am not overwhelmed with messages.

---

## 7. Requirements

### P0 — Must-have (portal cannot launch without these)

**Authentication**
- Dealer can authenticate via mobile OTP (preferred) or an alternative method to be confirmed during technical design
- Session management with appropriate timeout (recommendation: 7-day persistent session on mobile, 24 hours on web)
- Each dealer login is scoped to their specific dealership(s) — no cross-dealer data visibility

**Campaign performance dashboard**
- Displays: total impressions, total clicks, CTR (%), total leads, CPL (₹), for the selected date range
- Default view on login is current calendar month
- Date range filter: last 7 days / last 30 days / current month / custom
- All values update in near-real-time from the underlying campaign data (acceptable latency: ≤ 4 hours)

  *Acceptance criteria:*
  - Given a dealer is logged in, when they open the dashboard, then they see current-month performance metrics within 3 seconds of page load
  - Given a dealer selects a custom date range, when they apply the filter, then all metrics on the page update to reflect that range
  - Given CPL data is available, when the dealer views the dashboard, then the displayed CPL is compared to the committed CPL with a clear visual indicator (on track / above target)

**Budget utilisation**
- Shows total contracted budget, amount spent, amount remaining, and percentage utilised for the current billing cycle
- Simple line or bar chart showing daily spend over the selected period

  *Acceptance criteria:*
  - Given a dealer's budget data is available, when they view the budget section, then remaining budget is never displayed as negative (any overspend is shown as 0 remaining with a flag)
  - Given the daily spend chart, when a dealer hovers or taps a data point, then they see the exact spend amount for that day

**Leads & CPL tracking**
- Total leads generated, broken down by day/week in a chart view
- CPL displayed alongside committed CPL at onboarding
- Lead source breakdown (if available from Google Ads): search, display, etc.

**Optimisation activity log**
- Chronological list of all campaign optimisation actions taken by the account management team
- Each entry includes: date, plain-language title (e.g., "Refined negative keyword list"), brief reason, and outcome/impact where measurable
- Log is updated within 24 hours of any optimisation being applied
- Language in the log is always professional, expert, and team-attributed — never attributed to automated systems

  *Acceptance criteria:*
  - Given an optimisation has been applied, when the dealer views the log, then the entry appears within 24 hours with a date stamp, title, and reason
  - Given there are no optimisation actions in a period, when a dealer views that period, then an explicit message states "No changes were made during this period"

**Downloadable reports — PDF**
- Monthly PDF report available for download for each completed calendar month
- Report includes: summary metrics, leads chart, budget utilisation, optimisation summary (count and types of actions taken)
- Report is branded (CarDekho agency branding); language is professional throughout; no reference to automated systems

  *Acceptance criteria:*
  - Given the current month has ended, when a dealer clicks "Download report" for that month, then a PDF is generated and downloaded within 10 seconds
  - Given a dealer downloads a report, then the report contains no raw API data, no system identifiers, and no technical jargon

**WhatsApp & email notifications**
- Monthly report availability triggers a WhatsApp notification with a direct link to the portal
- Weekly performance digest is sent via email (summary: leads generated that week, CPL vs. target, budget pacing)
- Notification preferences are configurable by the dealer (opt out of individual notification types)

  *Acceptance criteria:*
  - Given a new monthly report is available, when the system triggers the notification, then the dealer receives a WhatsApp message within 2 hours of report generation
  - Given a dealer has opted out of email digests, when the weekly email run executes, then that dealer does not receive an email

---

### P1 — Should-have (high priority for v1.1 / fast follow)

- **Campaign history & timeline view**: a visual timeline showing campaign start date, any pauses or restarts, budget top-ups, and major optimisation milestones — helps a dealer understand the arc of their campaign
- **Excel/CSV data download**: download raw daily performance data for custom date ranges
- **Multi-location switcher**: for dealer groups running campaigns across multiple showroom locations, a location selector on the dashboard to switch context without re-logging in
- **Support ticket / request module**: dealer can raise a query with a subject, description, and priority; receives acknowledgement notification; can track status (open / in review / resolved)
- **In-portal messaging with account manager**: a simple threaded message thread between the dealer and their assigned account manager, visible to both parties and logged for record
- **Notification history / inbox**: in-app log of all notifications sent so dealer can access past alerts without relying on WhatsApp/email history

---

### P2 — Future considerations (v2 and beyond)

These are explicitly out of scope for v1 but the technical architecture should not preclude them:

- **Category/benchmark comparison**: anonymous comparison of the dealer's CPL vs. category median (requires aggregate data pooling and privacy controls)
- **Budget top-up / renewal request**: dealer can initiate a budget increase or renewal request from within the portal (requires integration with sales/billing workflow)
- **Creative approval workflow**: dealer can review and approve ad creatives before they go live (relevant if creative production is added as a service)
- **Mobile app (iOS/Android)**: a native app wrapping the portal for push notification capability; v1 should be a responsive web app / PWA to avoid app store dependency
- **Account manager performance rating**: dealer can rate their account manager's responsiveness and service quality after each interaction
- **Automated CPL alert**: system sends a WhatsApp/email alert if CPL exceeds the committed threshold, before end of month (early warning mechanism)

---

## 8. Functional Design Notes

### Optimisation log — language guidelines

The optimisation log is the most sensitive component of this portal from a positioning standpoint. Every entry must be written to convey that active, expert human management is being applied. Log entries should follow this structure:

> **[Action title]** — [Date]  
> *What was done:* [Plain-language description, e.g., "Expanded the keyword list to include 12 new high-intent search terms based on recent search trends in your city."]  
> *Why:* [Brief rationale, e.g., "Earlier keywords were driving clicks but not converting — these new terms are more aligned with in-market buyers."]  
> *Result:* [Outcome if measurable, e.g., "Lead volume increased 18% in the 7 days following this change."]

The account management team is responsible for reviewing and approving log entry language before it publishes. Entries should never use technical jargon, system identifiers, or any language that references automated processes.

### Data architecture considerations (for engineering review)

- The portal's performance data must be sourced from the same underlying data pipeline that feeds the internal optimisation tool — a single source of truth for all campaign metrics
- The optimisation log must be driven by a separate, human-reviewed content layer — not an automated system-generated log — to ensure language quality and positioning integrity
- The Google Ads API must be the upstream data source; the portal should not require account managers to manually input performance data
- Session security: dealer login must be scoped strictly to that dealer's campaigns; any misconfiguration that would allow cross-dealer data access is a critical security defect

### Authentication recommendation (for product/tech decision)

Given that most dealers will access this portal on mobile and may not regularly use the email address on file, **mobile OTP authentication is strongly recommended** for v1. It eliminates password reset support burden and aligns with how dealers already interact with CarDekho systems. Email/password can be offered as a secondary option.

---

## 9. Success Metrics

### Leading indicators (measured weekly, weeks 1–8 post-launch)

| Metric | Target | Measurement method |
|---|---|---|
| Portal activation rate | ≥70% of active dealers log in within first 2 weeks of account creation | Portal analytics: unique logins per dealer account |
| Weekly active dealer rate | ≥50% of active dealers log in at least once per week by week 8 | Portal analytics: weekly DAU/MAU |
| Optimisation log view rate | ≥60% of logged-in sessions include a visit to the optimisation log | Portal analytics: page view events |
| Report download rate | ≥65% of dealers download their first monthly report | Portal analytics: download events |
| Notification open rate (WhatsApp) | ≥50% WhatsApp link click-through rate | WhatsApp Business API delivery/read receipts |

### Lagging indicators (measured at 90 days post-launch)

| Metric | Target | Measurement method |
|---|---|---|
| Inbound status-check calls/messages to AMs | 40% reduction vs. pre-portal baseline | Account manager log / CRM tagging |
| Dealer contract renewal rate (first cycle) | ≥80% renewal rate for dealers on the portal | CRM: contract renewal tracking |
| Billing dispute rate | 30% reduction in disputes citing "no proof of work" | CRM: dispute categorisation |
| Dealer NPS (portal-specific) | ≥40 portal NPS at 90 days | In-portal NPS prompt (post-login, once per quarter) |

---

## 10. Open Questions

| # | Question | Owner | Blocking? |
|---|---|---|---|
| 1 | What is the authentication method for v1 — mobile OTP (recommended), CarDekho dealer SSO, or standalone email/password? | Product + Engineering | Yes — must decide before UI design begins |
| 2 | How does the portal pull live data from Google Ads? Does the internal optimisation tool already expose a data API, or does the portal need its own Google Ads API integration? | Engineering | Yes — determines backend architecture |
| 3 | Who is responsible for writing and approving optimisation log entries? Is this the account manager, a team lead, or does a workflow tool need to be built? | Account Management + Product | Yes — affects v1 scope significantly |
| 4 | Which WhatsApp Business API provider is CarDekho currently using (if any)? Does NCBD have access to send transactional messages? | Engineering + Legal | Yes — needed for notification feature |
| 5 | How are multi-location dealer groups structured in existing CarDekho systems? Is there a dealer group entity that can be used for account grouping? | Engineering + Sales Ops | No — can defer to v1.1 if needed |
| 6 | What is the committed CPL stored in, and is it accessible programmatically for the CPL-vs-target comparison feature? | Engineering + Sales Ops | No — can show CPL without benchmark if unavailable at launch |
| 7 | What branding should the portal carry — CarDekho agency brand, a sub-brand, or neutral? | Marketing + GTM | No — can build with placeholder branding |
| 8 | Is there a data retention policy that governs how long campaign performance history should be accessible to dealers? | Legal + Engineering | No — default to 12 months unless told otherwise |

---

## 11. Timeline Considerations

### Hard dependencies (must complete before portal can launch)

1. **Internal optimisation tool data layer is stable and queryable** — the portal has no independent data source; it depends entirely on the internal tool's campaign data being reliable and accessible via API.
2. **At least one dealer cohort is live on managed campaigns** — the portal cannot be tested or demoed without real campaign data.
3. **Authentication method is decided** — OTP provider selection, security review, and phone number onboarding flow must be complete.
4. **Optimisation log workflow is operational** — account managers must have a process and tool for writing/approving log entries before the portal launches; an empty optimisation log at launch would undermine the product's core promise.

### Suggested phasing

**Phase 1 — MVP (target: first live dealer cohort)**
Read-only dashboard (performance + budget + CPL), optimisation log, PDF report download, WhatsApp + email notifications. Login method TBD.

**Phase 2 — Interactive layer (target: 60 days post-MVP)**
Support ticket raising, in-portal messaging with account manager, Excel download, notification preference management.

**Phase 3 — Scale features (target: 90–120 days post-MVP)**
Multi-location switcher, campaign history timeline, notification inbox, mobile PWA optimisation.

---

## 12. Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Optimisation log entries are not written on time, causing the log to appear empty or stale | High | High | Define SLA: every optimisation must have a log entry within 24 hours; AM team lead spot-checks weekly |
| Google Ads API data latency causes significant discrepancy between what the dealer sees and what Google's own dashboard shows | Medium | High | Set dealer expectation clearly: portal data is updated every 4 hours, not real-time; show "last updated" timestamp on all metrics |
| Dealers use the portal's CPL data to dispute invoices or renegotiate pricing mid-contract | Medium | Medium | Ensure committed CPL is documented in the contract and the portal shows it as a reference, not a guarantee; loop in legal to review portal language |
| Low portal adoption — dealers do not log in despite having access | Medium | High | First-login onboarding via WhatsApp from account manager; include portal link in every report notification |
| WhatsApp Business API access is not available or is delayed | Low | Medium | Email notifications are sufficient for v1 launch; WhatsApp can follow; do not make WhatsApp a launch-blocker |

---

*End of document. Next steps: route to Engineering for technical scoping, Account Management for optimisation log workflow design, and GTM for onboarding communication design.*
