# TrustLedger — Architecture Reference

## Overview

TrustLedger is a single-file (`index.html`) browser application. There is no server, no build step, no framework, and no external dependencies. All logic executes client-side. The XRPL WebSocket API is the only external connection.

**File size:** ~5,000 lines of HTML, CSS, and vanilla JavaScript  
**Entry point:** Open `index.html` in any modern browser  
**External connection:** XRPL WebSocket (`wss://`) — read-only, public API  
**Storage:** Browser `localStorage` only — nothing leaves the device  

---

## System Layers

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (index.html)                  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │           UI Layer (HTML + CSS)                  │    │
│  │  Hero · Search · Score · Workspace · Events      │    │
│  │  Counterparty Panel · Governance Panel · Diag    │    │
│  └──────────────────┬──────────────────────────────┘    │
│                     │                                    │
│  ┌──────────────────▼──────────────────────────────┐    │
│  │           Audit Pipeline (JS functions)          │    │
│  │  auditWallet → fetch → translate → score         │    │
│  │             → render → enrich                    │    │
│  └────┬──────────┬──────────┬────────────┬─────────┘    │
│       │          │          │            │               │
│  ┌────▼───┐ ┌────▼───┐ ┌───▼────┐ ┌────▼────────────┐  │
│  │ safeLog│ │  Diag  │ │RuleConf│ │WorkspaceStore   │  │
│  │        │ │        │ │ ig     │ │CounterpartyStore│  │
│  └────────┘ └────────┘ └────────┘ │AuditHistory     │  │
│                                   │WatchlistStore   │  │
│                                   │TrendStore       │  │
│                                   └─────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              localStorage                        │    │
│  │  tl3_ (workspace) · tl4_ (counterparty)          │    │
│  │  tl5_ (rule config) · tl6_ (audit history)       │    │
│  │  tl7_ (watchlist) · tl8_ (trends)                │    │
│  │  tl_onboard_v1                                   │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ WebSocket (read-only)
              ┌────────▼────────┐
              │   XRPL Network  │
              │  Testnet / Main │
              └─────────────────┘
```

---

## Audit Pipeline

The core audit flow is linear and sequential. Each phase is independently timed by the `Diag` module.

```
auditWallet(address)
    │
    ├─ Diag.reset()
    │
    ├─ [fetch] fetchXRPLTransactions(address)
    │      │  Opens WebSocket to XRPL node
    │      │  Sends account_tx command with FETCH_LIMIT=100
    │      │  Paginates via `marker` until MAX_TX_FETCH=300 or exhausted
    │      │  Retries up to MAX_RETRIES=3 with RETRY_BASE_MS=1500ms backoff
    │      └─ Returns: raw XRPL transaction array
    │
    ├─ [translate] translations = rawList.map(entry => translateTx(entry, address))
    │      │  Normalizes each raw tx into AuditEvent schema
    │      │  Applies RuleConfig thresholds for payment classification
    │      │  Applies RuleConfig.isEnabled() guards for each rule
    │      │  Calls RuleConfig.trackTrigger() for matched rules
    │      └─ Returns: AuditEvent[] (immutable schema — never modified downstream)
    │
    ├─ [score] calculateTrustScore(translations, rawList)
    │      │  Counts high/medium/low risk, failed, escrow, delete events
    │      │  Reads penalty weights from RuleConfig
    │      │  Computes 0–100 score
    │      └─ Returns: { score, label, desc, color, stats: { total, highRisk, medRisk, failed, payments, escrows } }
    │
    ├─ [render] renderScore(trustResult) + renderTransactions(translations)
    │      │  Updates score gauge, stats row
    │      │  Renders each AuditEvent as a tx-card
    │      │  Calls WorkspaceStore to load saved finding state per hash
    │      └─ Attaches workspace control handlers to each card
    │
    ├─ enrichWithWorkspace(translations, address)
    │      │  Loads WorkspaceStore.getAllForWallet(address, network)
    │      │  Renders case summary panel (finding counts by state)
    │      └─ Wires export button
    │
    ├─ enrichWithRelationships(translations, address)
    │      │  buildCounterpartyMap() — aggregates per-counterparty stats
    │      │  detectRecurringPatterns() — payroll/subscription/vendor/irregular
    │      │  detectClusterFlags() — fan-out, concentration, circular, etc.
    │      └─ renderRelationshipPanel() — populates #relPanel
    │
    └─ RuleConfig.flush()
           └─ Writes accumulated trigger buffer to localStorage (one write per audit)
```

---

## AuditEvent Schema

The AuditEvent is the canonical data unit passed between all pipeline stages. It is produced by `translateTx()` and **never modified** by any downstream layer. Enrichment (workspace states, counterparty data, governance metadata) is always stored separately.

```javascript
{
  type:           string,          // raw XRPL TransactionType
  plainType:      string,          // human-readable label
  summary:        string,          // plain-English description
  date:           string,          // formatted local datetime
  hash:           string,          // transaction hash
  account:        string,          // initiating address
  dest:           string,          // destination address (or '')
  amount:         string,          // formatted XRP or token amount
  risk:           string,          // 'Low' | 'Medium' | 'High'
  ts:             number,          // raw XRPL epoch timestamp (0 if absent)
  memo:           string | null,   // decoded memo text, or null
  agentIndicator: string | null,   // null, or 'AGENT_003: <label>' if memo matches automation pattern
  isSender:       boolean,         // true if audited address is the sender
}
```

---

## Module Reference

### `safeLog` (inline IIFE)

Console wrapper that scrubs XRPL addresses before any log output.

- Regex: `/r[1-9A-HJ-NP-Za-km-z]{24,34}/g` → `[addr]`
- Methods: `safeLog.info(...args)`, `safeLog.warn(...args)`, `safeLog.error(...args)`
- All internal logging uses `safeLog` — raw `console.log` is avoided

### `Diag` (inline IIFE)

Observability and timing layer.

- `Diag.startTimer(phase)` / `Diag.endTimer(phase)` — wall-clock timing per pipeline phase
- `Diag.rule(ruleId)` — records a rule evaluation event
- `Diag.reset()` — clears state at the start of each audit
- `Diag.render(containerId)` — populates the diagnostics panel
- Tracks: phase durations, rule hit counts, session audit count
- Panel toggle: Ctrl+Shift+D or ⚙ Diag footer button

### `WorkspaceStore` (IIFE, prefix `tl3_`)

Persistent investigation state for findings, notes, and audit trails.

| Key pattern | Contents |
|---|---|
| `tl3_f_{hash}` | Finding object: `{ state, notes, trail[] }` |
| `tl3_wn_{addr}_{net}` | Per-wallet investigator notes string |
| `tl3_idx_{addr}_{net}` | JSON array of all known hashes for a wallet+network |

Methods:
- `getFinding(hash)` — returns finding or default unreviewed state
- `patchFinding(hash, patch)` — merges patch and persists
- `appendTrail(hash, action)` — appends timestamped trail entry
- `getWalletNote(addr, net)` / `saveWalletNote(addr, net, note)`
- `indexHashes(addr, net, hashes)` — registers hashes for wallet (union, not replace)
- `getAllForWallet(addr, net)` — returns all findings for export
- `exportData(addr, net)` — structured export object for compliance report

Review states:

| State | Display |
|---|---|
| `unreviewed` | Unreviewed |
| `reviewed` | Reviewed |
| `dismissed` | Dismissed |
| `escalated` | Escalated |
| `confirmed_safe` | Confirmed Safe |
| `needs_followup` | Needs Follow-up |

### `CounterpartyStore` (IIFE, prefix `tl4_`)

Persistent metadata for counterparty addresses.

- Key: `tl4_cp_{address}_{network}`
- Fields per record: `{ label, trusted, muted, labeledAt, trustedAt, mutedAt }`
- Methods: `get(addr, net)`, `patch(addr, net, updates)`
- Labels, trust flags, and mute flags are applied in relationship panel rendering

### `RuleConfig` (IIFE, prefix `tl5_`)

Governance layer for all detection rules, thresholds, and scoring weights.

- Key per rule: `tl5_rule_{ruleId}` — stores `{ enabled, thresholdOverrides, triggerCount }`
- Policy key: `tl5_policy` — stores active preset name

**Rule Registry (`RULE_REGISTRY`):** 28 rules, 5 categories

| Category | Rule IDs |
|---|---|
| `classification` | `payment.high_value`, `payment.medium_value`, `payment.token`, `classification.failed_tx`, `amm.pool_create`, `amm.large_deposit` |
| `cluster` | `cluster.amm_heavy`, `cluster.fan_out_major`, `cluster.fan_out_minor`, `cluster.repeat_high_risk`, `cluster.high_risk_concentration`, `cluster.circular`, `cluster.failed_cluster` |
| `pattern` | `pattern.min_tx_count`, `pattern.payroll_variance`, `pattern.vendor_variance` |
| `agent` | `agent.identical_amounts`, `agent.burst_activity`, `agent.automation_memo`, `agent.new_counterparty_burst` |
| `scoring` | `score.high_risk_penalty`, `score.medium_risk_penalty`, `score.failed_penalty`, `score.account_delete_penalty`, `score.activity_bonus`, `score.escrow_bonus`, `score.payment_bonus`, `score.agent_penalty` |

**Policy Presets (`POLICY_PRESETS`):**

| Preset | Description |
|---|---|
| `conservative` | Tighter thresholds — more findings, higher penalties |
| `balanced` | Registry defaults |
| `aggressive` | Looser thresholds — fewer findings, lower penalties |

**Key methods:**
- `getThreshold(ruleId, key)` — returns override or registry default
- `getSeverity(ruleId)` — returns `'Low'` / `'Medium'` / `'High'` (AuditEvent-compatible)
- `getSeverityDisplay(ruleId)` — returns display string including `'Critical'`
- `isEnabled(ruleId)` — returns boolean (default: true)
- `trackTrigger(ruleId)` — increments in-memory buffer (no localStorage write)
- `flush()` — writes trigger buffer to localStorage once per audit
- `exportSnapshot()` / `importSnapshot(json)` — config portability
- `applyPreset(name)` / `reset(ruleId)` / `resetAll()`

**Performance note:** `trackTrigger()` accumulates in an in-memory `_trigBuf` object. `flush()` is called once at the end of each `auditWallet()` run. This avoids per-transaction localStorage writes for high-volume wallets (up to 300 transactions per audit).

### `AuditHistory` (IIFE, prefix `tl6_`)

Deduped per-wallet audit log. Stores one entry per wallet+network combination, updated on each audit run.

- Key: `tl6_history` — stores JSON array of `{ address, network, score, label, ts, txCount }`
- Methods: `push(entry)`, `getAll()`, `remove(addr, net)`, `clear()`
- Used to populate the audit history panel and feed TrendStore on watchlist re-audits

### `WatchlistStore` (IIFE, prefix `tl7_`)

Persistent watchlist of addresses to monitor across audit sessions.

- Key: `tl7_watchlist` — stores JSON array of `{ address, network, label, alertThreshold, addedAt, lastScore, lastAuditTs }`
- Methods: `add(addr, net, label)`, `remove(addr, net)`, `has(addr, net)`, `update(addr, net, patch)`, `setLabel(addr, net, label)`, `getAll()`, `clear()`
- Alert threshold: optional 0–100 score cutoff; score drops below threshold trigger visual alerts in the watchlist panel

### `TrendStore` (IIFE, prefix `tl8_`)

Per-wallet Trust Score history for trend sparklines and change tracking.

- Key pattern: `tl8_t_{address}_{network}` — stores JSON array of `{ score, ts }` data points
- Methods: `push(addr, net, score)`, `get(addr, net)`, `clear(addr, net)`
- Populated by `auditWallet()` on every audit run and by watchlist re-audits
- Used to render trend sparklines in the audit history and watchlist panels

---

## Relationship & Counterparty Analysis

```
enrichWithRelationships(translations, address)
    │
    ├─ buildCounterpartyMap(translations, address)
    │      For each AuditEvent, aggregate per-counterparty:
    │        sentCount, receivedCount, totalXRP, riskCounts{},
    │        firstSeen, lastSeen, txHashes[]
    │      Returns: counterparty[] sorted by transaction count (count) desc
    │
    ├─ detectRecurringPatterns(counterparties, translations)
    │      For each counterparty with sent >= pattern.min_tx_count:
    │        Compute amount variance across sent txs
    │        Classify: regular_fixed (variance < payroll_variance%)
    │                  vendor (variance < vendor_variance%)
    │                  recurring (higher variance, multiple contacts)
    │                  irregular (high variance)
    │        One-time-only: single contact, no return
    │      Returns: pattern[] with type, address, txCount, avgXRP, label
    │
    ├─ detectClusterFlags(counterparties, translations)
    │      Evaluates each cluster rule (gated by RuleConfig.isEnabled()):
    │        fan_out_major / fan_out_minor: count single-contact addresses
    │        repeat_high_risk: counterparties with N+ high-risk txs
    │        high_risk_concentration: % of all txs rated High
    │        circular: pairs with N+ txs in each direction
    │        failed_cluster: total failed transaction count
    │      Returns: flag[] with ruleId, label, severity, message, plain-English why
    │
    └─ renderRelationshipPanel(_cpAnalysis)
           Renders #relPanel with:
             Cluster flags (severity chips, expandable why text)
             Recurring patterns (type badges, stats)
             Top counterparties table (label, volume, risk, trust/mute controls)
```

---

## Data Flow Diagram

```
XRPL WebSocket API
        │
        │  account_tx (paginated, up to 300 txs)
        ▼
fetchXRPLTransactions()
        │
        │  raw XRPL transaction objects
        ▼
translateTx()  ──── RuleConfig.getThreshold()
        │            RuleConfig.isEnabled()
        │            RuleConfig.trackTrigger()
        │
        │  AuditEvent[] (immutable)
        ├──────────────────────────────────────────────┐
        ▼                                              ▼
calculateTrustScore()                    enrichWithRelationships()
  RuleConfig penalty weights               buildCounterpartyMap()
        │                                 detectRecurringPatterns()
        │  { score, counts }              detectClusterFlags()
        ▼                                              │
renderScore()                            renderRelationshipPanel()
        │                                              │
        ▼                                              ▼
renderTransactions()                          #relPanel (DOM)
  WorkspaceStore.getFinding()
  per-card state/notes/trail
        │
        ▼
enrichWithWorkspace()
  WorkspaceStore.getAllForWallet()
  Case summary panel
  Export handler
        │
        ▼
RuleConfig.flush()  ──► localStorage (tl5_ keys)
```

---

## Investigation Workflow

```
Analyst pastes wallet address
        │
        ▼
auditWallet() runs pipeline
        │
        ▼
AuditEvents rendered as finding cards
  Each card: risk chip, summary, hash link, workspace controls
        │
        ├── Analyst clicks state selector → WorkspaceStore.patchFinding()
        │                                   WorkspaceStore.appendTrail()
        │
        ├── Analyst types note → WorkspaceStore.patchFinding()
        │
        ├── Filter bar → applyFilter() hides/shows cards by state or risk
        │
        ├── Analyst labels/trusts/mutes counterparty → CounterpartyStore.patch()
        │
        └── Export Compliance Report
                WorkspaceStore.exportData()
                Formats: wallet summary, score, finding list,
                         notes, trail entries, counterparty labels
                Saves as: TrustLedger_Audit_{address}_{date}.txt
```

---

## Governance Architecture

```
RULE_REGISTRY (source of truth — 28 rules, compile-time)
        │
        ▼
RuleConfig (runtime layer)
  ├── Per-rule localStorage overrides (tl5_rule_{id})
  ├── Active policy preset (tl5_policy)
  └── In-memory trigger buffer (_trigBuf)
        │
        ├── translateTx() queries RuleConfig for each payment rule
        ├── calculateTrustScore() queries RuleConfig for scoring weights
        ├── detectRecurringPatterns() queries RuleConfig for pattern thresholds
        └── detectClusterFlags() queries RuleConfig for cluster thresholds
        │
        ▼
Governance Panel (Ctrl+Shift+R)
  ├── Per-rule enable/disable toggle
  ├── Per-rule threshold override input
  ├── Policy preset selector (Conservative / Balanced / Aggressive)
  ├── Per-rule trigger count display
  ├── Export config snapshot (JSON)
  └── Import config snapshot (JSON)
```

---

## Key Design Decisions

**Single-file architecture** — Zero installation barrier. Any evaluator, grant reviewer, or compliance analyst can open the file immediately without a server, npm install, or build tool. This is intentional and will remain the primary distribution format.

**Immutable AuditEvent schema** — `translateTx()` produces the canonical fact record for a transaction. Nothing downstream modifies it. Workspace states, counterparty metadata, and governance configuration are all stored separately, preserving the integrity of the original classification.

**Trust Score isolation** — `calculateTrustScore()` only reads AuditEvent risk fields. Investigation workspace states (reviewed, escalated, etc.) and counterparty labels never enter the scoring function. This ensures the score reflects on-chain evidence, not analyst workflow state.

**Rule governance without source changes** — RULE_REGISTRY defines defaults at compile time. RuleConfig layers localStorage overrides on top. Analysts can adjust thresholds, disable rules, and apply policy presets without modifying code, and can export/import configuration snapshots for reproducibility.

**Single localStorage flush per audit** — RuleConfig.trackTrigger() accumulates to an in-memory buffer. RuleConfig.flush() is called once at the end of auditWallet(). For a 300-transaction wallet, this reduces localStorage writes from 300+ to one.

**Address scrubbing in diagnostics** — The Diag layer is useful for debugging, but XRPL addresses must never appear in console output in contexts where they could be captured by browser extensions or logging tools. safeLog enforces this by scrubbing all addresses before output.
