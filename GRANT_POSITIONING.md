# TrustLedger — Grant Positioning

## Problem Statement

AI agents are beginning to operate wallets autonomously on XRPL — executing payments, creating and finishing escrows, interacting with DeFi protocols, and managing treasury positions without per-transaction human approval.

This creates a compliance gap that existing tools do not address:

- **Blockchain explorers** show raw transaction data. They do not classify behavior, explain risk, or support investigation workflows.
- **Analytics platforms** are built for tracing human actors. They are not designed for wallets where the "actor" is an autonomous system with no fixed identity.
- **Audit logs** from the AI agents themselves — if they exist — are internal and not verifiable against on-chain evidence.

The result: when an AI agent wallet is audited, there is no tool to answer the basic questions — what did this wallet do, was the behavior consistent with its authorized scope, and can we produce an explainable record for compliance review?

TrustLedger is built to answer those questions.

---

## Why XRPL

XRPL is a natural home for AI agent wallets for several reasons:

- **Low transaction fees** make high-frequency automated activity economically viable
- **Native escrow and payment channels** provide the primitives AI agents need for conditional fund management
- **Fast settlement** (3–5 seconds) enables real-time automated decision-making
- **Hooks (in development)** will allow on-chain programmable logic that AI systems can trigger
- **The XRPL ecosystem** is actively investing in AI agent infrastructure, creating demand for the accountability layer that TrustLedger provides

The gap between "XRPL has the primitives for AI agent wallets" and "XRPL has the tools to audit AI agent wallets" is exactly where TrustLedger sits.

---

## Why Now

Three trends are converging:

**1. Autonomous AI systems are moving money on-chain.** Multi-agent frameworks (LangChain, AutoGen, custom architectures) are being connected to crypto wallets. XRPL's speed and cost profile make it attractive for these use cases.

**2. Compliance requirements are tightening.** Regulatory interest in DeFi, stablecoins, and autonomous agents is increasing globally. Organizations deploying AI agent wallets will face audit requirements they currently have no tooling to satisfy.

**3. The accountability infrastructure doesn't exist yet.** There are no open-source tools designed specifically for auditing on-chain AI agent behavior with explainable, governed detection logic. TrustLedger is an early entry into an emerging category.

---

## What TrustLedger Provides

TrustLedger is not a monitoring service or a compliance oracle. It is **infrastructure** — a governed rule engine, an investigation workspace, and a structured export layer that can be used by:

- Compliance analysts auditing AI agent wallet behavior after the fact
- Development teams verifying that deployed AI agents behaved within their authorized scope
- Grant evaluators or auditors reviewing treasury management wallets
- Organizations building accountability workflows on top of XRPL

The key properties are:

| Property | Implementation |
|---|---|
| **Explainability** | Every finding includes a plain-English summary and a rule-level "why" statement |
| **Governance** | All detection thresholds are configurable without source code changes |
| **Auditability** | Investigation state is persisted with immutable timestamped audit trails |
| **Portability** | Compliance reports export as structured text; rule configs export as JSON |
| **Privacy** | All processing is local — no wallet data leaves the device |
| **Zero friction** | Single HTML file, no installation, no server, no account required |

---

## Ecosystem Value

TrustLedger contributes to the XRPL ecosystem in three ways:

**1. Open-source accountability infrastructure**  
The rule engine architecture — 15 governed rules, policy presets, per-rule explainability copy, exportable configuration — is a reusable pattern. Future projects can extend the rule registry, add new detection categories, or consume the investigation workspace schema as a data format.

**2. Reducing the compliance barrier for AI agent adoption**  
Organizations are more likely to deploy AI agent wallets on XRPL if they can satisfy audit requirements. TrustLedger lowers the compliance bar without requiring each team to build their own audit tooling.

**3. A working reference implementation**  
TrustLedger demonstrates that a meaningful compliance layer can be built on XRPL's public WebSocket API without any server infrastructure. This is a useful existence proof for ecosystem developers building related tools.

---

## AI Agent Governance Framing

TrustLedger's positioning as "explainable AI transaction governance infrastructure" reflects a specific technical stance:

**Explainable:** Every classification decision is traceable to a specific rule with a documented threshold and a plain-English justification. There are no black-box scores. An analyst can inspect exactly why a transaction was flagged.

**Governed:** The rule engine is not hardcoded. Thresholds, severities, and rule enablement are configurable through the governance layer without modifying source code. Policy presets allow different compliance postures (conservative, balanced, aggressive) to be applied and documented.

**Infrastructure:** TrustLedger is not a service — it's a tool. It provides the classification, investigation, and export primitives that compliance workflows need. The intent is to be a foundational layer, not a complete compliance solution.

This framing is intentional. As AI agent capabilities grow and XRPL adoption increases, the need for this layer grows with them. TrustLedger is designed to be extended — new rules, new detection categories, new export formats — without architectural changes.

---

## Institutional and Compliance Positioning

For compliance teams evaluating TrustLedger:

**What TrustLedger does:**
- Fetches and classifies on-chain transaction history for any XRPL wallet
- Produces risk-tiered findings (Low / Medium / High) with plain-English explanations
- Provides an investigation workflow with persistent state, analyst notes, and audit trails
- Exports structured compliance reports as human-readable text files
- Allows configuration of detection thresholds and policy presets for organizational compliance standards

**What TrustLedger does not do:**
- Make legal or regulatory determinations
- Monitor wallets in real-time (analysis is on-demand, not continuous)
- Provide identity attribution beyond on-chain address data
- Store or transmit any data outside the analyst's browser

**Audit trail properties:**
- Finding state transitions are timestamped and immutable once written
- Analyst notes are associated with specific transaction hashes
- Exported reports include the active rule configuration at the time of export
- All investigation data is scoped to a specific wallet address + network combination

---

## Screenshot Plan

The following screenshots should be captured for grant submissions and public documentation. All screenshots should use a real or realistic Mainnet wallet with varied transaction history.

### Screenshot 1 — Hero and Trust Score
**Capture:** Full viewport showing the hero section ("TrustLedger — AI Transaction Governance for XRPL") and the Trust Score section with a non-trivial score (e.g., 52–68 range showing "Medium Trust").
**Purpose:** First impression for evaluators — shows what the tool is and what it produces.

### Screenshot 2 — Audit Events with Risk Classification
**Capture:** The Audit Events section showing a mix of High-risk (red chip), Medium-risk (yellow chip), and Low-risk (green chip) findings. At least one expanded finding showing the full summary and hash link.
**Purpose:** Demonstrates the classification layer and plain-English explainability.

### Screenshot 3 — Investigation Workspace (Finding with Notes and Trail)
**Capture:** A single finding card expanded with:
- State set to "Escalated"
- A note typed in the analyst notes field
- The audit trail showing 2–3 timestamped state transition entries
**Purpose:** Shows the investigation workflow and audit trail — the key differentiator from raw blockchain explorers.

### Screenshot 4 — Counterparty Intelligence Panel
**Capture:** The Counterparty Intelligence panel showing:
- At least one cluster flag with severity chip and expanded "why" text
- A recurring pattern classification (payroll-like or subscription-like)
- The counterparty table with one labeled/trusted entry
**Purpose:** Demonstrates behavioral relationship analysis and the counterparty governance layer.

### Screenshot 5 — Rule Governance Panel
**Capture:** The Rule Governance panel open (Ctrl+Shift+R) showing:
- The policy preset selector with "Conservative" selected
- 3–4 visible rules with their enable toggles, threshold inputs, and trigger counts
- The export/import buttons visible
**Purpose:** Shows the governance architecture — configurable without code changes.

### Screenshot 6 — Export Compliance Report (Output File)
**Capture:** The exported `.txt` compliance report opened in a text editor, showing:
- The wallet summary header (address, score, timestamp)
- 2–3 formatted finding entries with state labels
- An analyst note and audit trail entry
**Purpose:** Shows the deliverable — what a compliance handoff actually looks like.

### Screenshot 7 — Diagnostics Panel (Developer Audience)
**Capture:** The Diagnostics panel open (Ctrl+Shift+D) showing:
- Per-phase timing (fetch, translate, score, render, relationships)
- Rule trigger counts
- Session audit count
**Purpose:** For technical reviewers — shows the observability layer and performance instrumentation.

---

## Positioning Summary

| Attribute | Value |
|---|---|
| **Category** | Compliance tooling / AI governance infrastructure |
| **Target users** | Compliance analysts, AI agent developers, XRPL treasury managers |
| **XRPL integration** | WebSocket API, Mainnet + Testnet, up to 300 tx per audit |
| **Data handling** | 100% local, no server, no accounts, no data transmission |
| **Core differentiator** | Governed + explainable rule engine designed for AI agent wallets |
| **Distribution** | Single HTML file, open source |
| **Maturity** | Functional prototype — all described features are implemented |
| **Roadmap requirement** | Backend for multi-wallet, collaborative workspaces, real-time monitoring |
