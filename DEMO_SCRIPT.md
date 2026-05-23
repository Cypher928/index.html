# TrustLedger — Demo Script

## 60-Second Demo (Grant Elevator Pitch)

**Setup:** Open `index.html` in a browser. Testnet is selected by default.

---

**[0:00 — 0:10] The problem**

> "AI agents are moving funds on XRPL autonomously — executing payments, managing escrows — without per-transaction human approval. There's no existing tool to audit what they did or explain the behavior in plain language."

**[0:10 — 0:20] Paste and audit**

Paste a testnet wallet address with varied transaction history. Click **Audit Wallet**.

> "TrustLedger fetches up to 300 transactions directly from the XRPL network — no server involved."

**[0:20 — 0:35] Point to the output**

- Point to the Trust Score gauge.
  > "Every wallet gets a 0–100 Trust Score based on risk-weighted transaction analysis."
- Point to a High-risk finding card.
  > "Each transaction is classified and explained in plain English — the analyst doesn't need to read raw ledger data."

**[0:35 — 0:50] Investigation workflow**

Click a finding's state dropdown, set it to **Escalated**. Type a short note.
> "Analysts can triage findings, leave notes, and build an immutable audit trail — all locally, all exportable."

**[0:50 — 1:00] Governance and export**

Press Ctrl+Shift+R to open the Rules panel briefly, then close it.
> "Every detection rule has a configurable threshold and policy preset — no source code changes required. And the whole investigation can be exported as a structured compliance report."

---

## 3-Minute Grant Walkthrough

### Segment 1 — Context (0:00–0:30)

Open the app. Point to the hero section and the "Why TrustLedger Exists" section at the bottom of the page.

> "TrustLedger is grant-funded infrastructure for XRPL. The core problem: AI agents and automated systems are increasingly operating wallets on-chain, but there's no compliance layer for their behavior. TrustLedger provides that — explainable findings, governed rules, structured investigation workflows."

Note the onboarding guide card (visible on first visit). Walk through the 5 steps briefly.

---

### Segment 2 — Network and Audit (0:30–1:00)

Switch to **Mainnet** using the network selector.

> "TrustLedger works on both Testnet and Mainnet. For this demo we'll use Mainnet to show real on-chain data."

Paste a wallet address and click **Audit Wallet**. While it loads:

> "The app connects directly to the XRPL WebSocket API — no intermediary server, no API key, no account required. It paginates through up to 300 transactions."

When results appear, point to:
- The **Trust Score** and the risk tier label beneath it
- The **stats row** (total, high-risk, medium-risk, failed, escrow counts)

> "The Trust Score is a governed metric — every penalty weight is configurable. You can see exactly which rules contributed and why."

---

### Segment 3 — Audit Events and Investigation (1:00–1:45)

Scroll to the **Audit Events** section.

> "Every transaction is normalized into what we call an Audit Event — a plain-English finding with a risk classification and a direct link to the XRPL explorer."

Click on a High-risk finding to expand it. Show the risk chip, summary text, and hash link.

> "The classification isn't a black box. Every rule has an explainability statement — why this transaction was flagged, what the threshold is, and what it means."

Use the filter bar — click **Escalated**, then **Critical**.

> "Investigators can filter by review state or severity to prioritize their work."

Set a finding to **Escalated**, type a note. Show the audit trail update.

> "State changes are logged with timestamps. This creates an immutable investigation record — every action an analyst takes is captured."

Click **Export Compliance Report**.

> "The full investigation — wallet summary, all findings with notes and trail entries, counterparty labels — exports as a structured text file ready for a compliance handoff."

---

### Segment 4 — Counterparty and Relationship Analysis (1:45–2:20)

Scroll to the **Counterparty Intelligence** panel.

> "TrustLedger also analyzes behavioral relationships across the wallet's counterparties."

Point to any detected cluster flags.

> "Cluster flags detect structural patterns: fan-out bursts, high-risk concentration, circular flows between wallets. Each flag is explained in plain English with the specific threshold that triggered it."

Point to the recurring patterns section.

> "Recurring payment patterns are classified — payroll-like, subscription-like, vendor-like — based on amount variance. This helps distinguish automated agent behavior from manual transactions."

Click a counterparty row. Show the label, trust, and mute controls.

> "Analysts can label known counterparties, mark them as trusted or muted. Those labels persist across audits and are included in exports."

---

### Segment 5 — Rule Governance (2:20–2:50)

Press Ctrl+Shift+R (or click ⚖ Rules in the footer).

> "The Rule Governance panel exposes every detection rule. There are 15 governed rules across 4 categories — classification, cluster detection, pattern detection, and Trust Score weights."

Click the **Conservative** policy preset.

> "Policy presets adjust all thresholds simultaneously. Conservative mode tightens thresholds and increases penalties — appropriate for high-stakes compliance contexts. Aggressive mode loosens them for exploratory analysis."

Show the per-rule threshold override input for one rule.

> "Individual rules can be enabled or disabled, thresholds can be overridden, and the full configuration can be exported as a JSON snapshot for reproducibility. No source code changes required."

---

### Segment 6 — Close (2:50–3:00)

> "TrustLedger is a single HTML file — no server, no installation, no data leaving the device. It's built for grant evaluators, compliance analysts, and the XRPL ecosystem as open infrastructure for AI agent accountability."

---

## Investigation Scenario Narrative

**Scenario: Auditing a suspected automated distribution wallet**

An investigator receives a tip that an XRPL wallet may be distributing funds to a large number of addresses — potentially structuring payments to avoid detection thresholds.

**Step 1 — Initial audit**

Paste the suspected wallet address on Mainnet. The Trust Score comes back at 34 (Low trust). Stats show: 187 total transactions, 23 High-risk, 14 failed.

**Step 2 — Cluster flag review**

The Counterparty Intelligence panel shows two cluster flags:
- *Fan-Out Burst (Major)* — the wallet sent to 47 unique addresses, each contacted exactly once. The rule threshold is 5 single-contact addresses.
- *High-Risk Concentration* — 41% of all transactions are rated High risk, above the 30% threshold.

Both flags display the plain-English "why" statement explaining the compliance significance.

**Step 3 — Triage findings**

The investigator applies the **Critical** filter to isolate the High-risk Audit Events. Three findings stand out — all high-value payments above the 100,000 XRP threshold. She sets each to **Escalated** and types a note: "Fan-out correlation — pending counterparty review."

**Step 4 — Counterparty labeling**

In the Counterparty Intelligence panel, she identifies a recurring high-volume counterparty. She applies the label "Known Exchange Hot Wallet" and marks it as **Trusted**. This removes it from the suspicious cluster analysis context in the exported report.

**Step 5 — Governance adjustment**

The investigator opens the Rule Governance panel (Ctrl+Shift+R) and switches to **Conservative** policy to see how the analysis changes under tighter thresholds. The Trust Score drops to 28. She exports the configuration snapshot for the case file.

**Step 6 — Export**

She clicks **Export Compliance Report**. The exported `.txt` file contains:
- Wallet address and audit timestamp
- Trust Score and risk tier
- All 187 Audit Events with their states and risk classifications
- The 3 escalated findings with her notes
- The full audit trail (timestamped state transitions)
- Counterparty labels including the exchange hot wallet annotation
- Active rule configuration snapshot

The file is attached to the case and handed to the compliance team.

---

## Talking Points

**On architecture:**
> "It's a single HTML file with no external dependencies. Any evaluator can open it immediately. That's not a limitation — it's a deliberate design choice that eliminates installation friction and keeps all data local."

**On AI agent focus:**
> "Most blockchain analytics tools are built for tracking humans. TrustLedger is designed for wallets that may have no single human owner — AI agents, multi-sig arrangements, automated treasury systems. The explainability layer is what makes it useful for those cases."

**On rule governance:**
> "The rule engine is the core infrastructure contribution. Every threshold is governed, every rule has an explainability statement, and configuration is portable. A compliance team can deploy their own policy preset without touching code."

**On privacy:**
> "Everything runs locally. No wallet addresses, transaction data, or analyst notes leave the browser. This is a hard architectural guarantee — there's no server to send data to."

**On the Trust Score:**
> "The Trust Score is a starting point, not a verdict. It's designed to direct attention, not replace judgment. The investigation workspace is where the real analysis happens."

**On the roadmap:**
> "The current version is fully functional for single-wallet audits on Mainnet and Testnet. Multi-wallet comparison, historical trend tracking, and collaborative workspaces are on the roadmap — those require a backend, which is the next phase."
