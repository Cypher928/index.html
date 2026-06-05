# TrustLedger Screenshots

All screenshots captured from the live demo investigation (AI Accounts Payable Agent — Unauthorized Transfer Investigation scenario) running on XRPL Testnet.

---

## Featured Screenshots

### 01-hero-landing.png
**Hero section — wallet input and onboarding guide**  
Shows the TrustLedger landing page with the wallet address input, Audit Wallet button, and the Five-Step Investigation Workflow onboarding card (steps 1–4 visible: Risk Assessment, Audit Events, Counterparty Analysis, Investigation Workspace).

### 02-onboarding-why.png
**Onboarding guide step 5 and "Why TrustLedger Exists" intro**  
Shows the final onboarding step (Governance & Export) and the beginning of the "Why TrustLedger Exists" section explaining the AI agent accountability problem.

### 03-trust-score-demo.png
**Demo scenario banner and Trust Score gauge**  
Shows the "AI Accounts Payable Agent — Unauthorized Transfer Investigation" demo context banner, the Trust Score at 39 (High Risk tier), and the stats row (12 audit events, 12 payments, 0 medium risk, 2 high risk, 1 failed transaction).

### 04-investigation-workspace.png
**Investigation workspace — Case Summary panel**  
Shows the Case Summary with counts (12 unresolved, 0 escalated, 0% reviewed, 2 high risk open), export buttons (Compliance Report, CSV, Print/PDF), wallet investigation note field, and the Audit Events filter bar (All Findings, Unresolved, Escalated, Reviewed, Critical).

### 05-audit-events-agent003.png
**Audit events with AGENT_003 memo annotation**  
Shows two expanded finding cards: a Low Risk incoming payment (monthly budget transfer) and a Low Risk outgoing supplier payment with the AGENT_003 badge ("structured JSON memo") and the decoded memo content (`payment_id`, `job`, `agent` fields).

### 06-high-risk-events.png
**High-risk and failed transaction findings**  
Shows two High Risk finding cards: an unauthorized 25,000 XRP payment to an unknown address (not in authorized supplier list) and a failed 50,000 XRP transfer (tecUNFUNDED_PAYMENT — second off-script attempt).

### 07-counterparty-table.png
**Counterparty Intelligence — table and recurring patterns**  
Shows the Relationship & Counterparty Analysis panel with 6 counterparties (4 Neutral, 2 Suspicious), trust/mute controls, and the Recurring Patterns section showing three "Regular Fixed Payments" classifications (3 payments of ~1,000 XRP within 10% variance).

### 08-agent-behavioral-flags.png
**Behavioral risk flags — AGENT_001, AGENT_002, AGENT_004**  
Shows three cluster flags: AGENT_001 (Identical-Amount Fan-Out — sent 1,000 XRP to 3 different recipients), AGENT_002 (Burst Transaction Activity — 8 transactions in 60 minutes), and AGENT_004 (New Counterparty During Burst — 2 previously-unseen addresses during burst window).

### 09-rule-governance.png
**Rule Governance panel — Balanced preset, Payment Classification and Cluster Detection**  
Shows the Rule Governance panel (Ctrl+Shift+R) with the Balanced policy preset selected and the first two rule categories: Payment Classification (High-Value Payment, Medium-Value Payment, Token/IOU Payment, Failed Transaction, AMM Pool Creation, Large AMM Deposit) and Cluster Detection (Heavy DeFi/AMM Activity, Fan-Out Major/Minor, Repeated High-Risk Counterparty, High-Risk Concentration).

### 09b-rule-governance-agent.png
**Rule Governance panel — Recurring Patterns and AI Agent Detection categories**  
Shows the Bidirectional High-Volume Flow and Failed Transaction Cluster cluster rules, the three Recurring Pattern rules, and the full AI Agent Detection category (AGENT_001 through AGENT_004) with their severity chips and enable toggles.

### 09c-rule-governance-scoring.png
**Rule Governance panel — Trust Score Weights and governance footer**  
Shows all Trust Score Weight rules (High-Risk Penalty, Medium-Risk Penalty, Failed Penalty, Account Delete Penalty, Activity Bonus, Escrow Bonus, Payment Bonus, Automation Pattern Score Penalty) and the panel footer displaying "28 governed rules · policy: balanced" with Export Config, Import Config, and Reset All buttons.

### 11-export-report-header.png
**Exported compliance report — wallet summary and case summary**  
Shows the TRUSTLEDGER INVESTIGATION REPORT header in a mobile text viewer with wallet address (rDemoTrustLedger123456789XRPL), network (XRPL Testnet), generation timestamp (6/4/2026, 7:47:32 PM), case summary (12 total, 1 reviewed, 1 high risk open), and the beginning of the ALL FINDINGS section.

### 12-export-report-findings.png
**Exported compliance report — full findings list**  
Shows the paginated findings list in the compliance report: Low Risk supplier payments (March, April, May 2025) and the High Risk unauthorized transfer (May 1, 2025) with the Needs Follow-up [RESOLVED] annotation visible.

### 13-export-report-counterparty.png
**Exported compliance report — audit trail, counterparty analysis, recurring patterns**  
Shows the failed payment finding with a full audit trail (state transitions: Reviewed → Dismissed → Escalated → Confirmed Safe → Needs Follow-up → Resolved, all timestamped Jun 4), the COUNTERPARTY ANALYSIS section with all 6 counterparties and their risk scores, and the RECURRING PATTERNS section.

### 14-export-report-agent-flags.png
**Exported compliance report — cluster flags section**  
Shows the CLUSTER FLAGS section of the compliance report with all three detected agent flags: AGENT_001 Identical-Amount Fan-Out (Medium), AGENT_002 Burst Transaction Activity (Medium), and AGENT_004 New Counterparty During Burst (High), each with their plain-English explanations.

---

## Additional Screenshots

### timeline-audit-events.png
**Audit Events — Timeline view (March–April 2025)**  
Shows the Timeline tab in the Audit Events section, with chronologically sorted events grouped by month. AGENT_003 "structured JSON memo" badges visible on April supplier payments.

### timeline-high-risk.png
**Audit Events — Timeline view (May 2025, High Risk events)**  
Shows the Timeline view continuing into May 2025, with Low Risk supplier payments followed by the two High Risk events (unauthorized transfer and failed transfer) at the bottom with red risk chips.

### trust-score-explanation.png
**"How is the Trust Score calculated?" — expanded accordion**  
Shows the Trust Score explanation panel with a description of what raises and lowers the score, the three score bands (70–100 Trustworthy, 40–69 Moderate Risk, 0–39 High Risk), the governance note ("All thresholds are governed"), and the compliance disclaimer.

### why-trustledger-tiles.png
**"Why TrustLedger Exists" — feature tiles and footer**  
Shows the four feature tiles (AI Accountability, Governed Rules, Compliance Exports, Privacy First) with the footer showing the active XRPL Testnet connection and Backup / Restore / Rules / Diag controls.

### why-trustledger-about.png
**"Why TrustLedger Exists" — full text and feature tiles**  
Full explanatory text and all four feature tiles. No footer.

### why-trustledger-footer.png
**"Why TrustLedger Exists" — tiles and footer controls**  
Feature tiles with footer showing XRPL Testnet server URL and all four footer controls.

### 10-critical-filter-audit-trail.png
**Investigation workspace — Critical filter active with analyst note**  
Shows the Audit Events section with the Critical filter tab selected, the analyst note field pre-filled with an investigation context note ("Investigating unauthorized transfer. Escalated for compliance review."), and the Counterparty Intelligence section beginning below.

### diagnostics-panel.png
**TrustLedger Diagnostics panel — Performance and Network Health (desktop)**  
Shows the Diagnostics panel (Ctrl+Shift+D) with per-phase timing: Fetch, Translate, Score, Render, Relationships (17ms total). Network Health shows WS State: idle, 0 reconnects, 0 failures, 0 retries, no partial fetch. No errors.

### diagnostics-panel-rules.png
**TrustLedger Diagnostics panel — Rule Engine and Governance**  
Shows the Rule Engine trigger log (per-rule ×N counts), the Governance section (Policy: aggressive, 10 custom rules, 0 disabled), and the Top Triggered list (pattern.payroll_variance ×12, score.high_risk_penalty ×4, score.failed_penalty ×4, score.activity_bonus ×4).

### diagnostics-panel-bottom.png
**TrustLedger Diagnostics panel — bottom (session summary)**  
Shows the remaining rule triggers, FP candidates: 0, Skipped: 0, UNKNOWN TX TYPES: None, Session: 0 audits, and the "Ctrl+Shift+D to toggle" footer hint.

### counterparty-agent-flags-combined.png
**Counterparty Intelligence — Suspicious addresses, Recurring Patterns, and Behavioral Risk Flags**  
Combined view showing the counterparty table (2 Suspicious addresses highlighted), three Regular Fixed Payments recurring pattern classifications, and all three active behavioral risk flags: AGENT_001, AGENT_002, AGENT_004.

---

All planned screenshots have now been captured.
