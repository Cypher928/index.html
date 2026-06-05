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

---

## Additional Screenshots

### why-trustledger-tiles.png
"Why TrustLedger Exists" section — the four feature tiles (AI Accountability, Governed Rules, Compliance Exports, Privacy First) with the footer showing the active XRPL Testnet connection and Backup / Restore / Rules / Diag controls.

### why-trustledger-about.png
"Why TrustLedger Exists" section — full explanatory text and all four feature tiles. No footer.

### why-trustledger-footer.png
"Why TrustLedger Exists" section — feature tiles with footer showing XRPL Testnet server URL and all four footer controls.

---

## Missing Screenshots (not yet captured)

The following screenshots from the grant positioning plan have not yet been captured. Use a desktop browser for best results.

| Filename | What to capture |
|---|---|
| `09-rule-governance.png` | Rule Governance panel (Ctrl+Shift+R) — Conservative preset selected, 3–4 rules visible with toggles and threshold inputs |
| `10-critical-filter-audit-trail.png` | Investigation workspace — Critical filter active, one finding expanded with Escalated state, analyst note, and 2–3 timestamped trail entries |
| `11-export-report-header.png` | Exported `.txt` compliance report in a text editor — wallet summary header, score, audit timestamp |
| `12-export-report-findings.png` | Exported report — 2–3 formatted finding entries with state labels and notes |
| `13-diagnostics-panel.png` | Diagnostics panel (Ctrl+Shift+D) — per-phase timing, rule trigger counts |
