# 🔍 TrustLedger

### AI Audit & Accountability Layer for XRPL AI Agent Transactions

[![Live Demo](https://img.shields.io/badge/Live%20Demo-trustledger--tau.vercel.app-00d4ff?style=for-the-badge)](https://trustledger-tau.vercel.app)
[![Built on XRPL](https://img.shields.io/badge/Built%20on-XRPL-blue?style=for-the-badge)](https://xrpl.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![XRPL Grants](https://img.shields.io/badge/XRPL-Grants%20Applicant-orange?style=for-the-badge)](https://xrplgrants.org)

---

## 🎯 What Is TrustLedger?

TrustLedger is the accountability layer for AI agent commerce on the XRP Ledger.

AI agents are now moving money autonomously on XRPL. But when an AI agent makes a transaction, the record is cryptographic data that nobody can read or understand. There is no tool that explains what happened, who authorized it, or whether something went wrong — for everyday users and small businesses.

**TrustLedger fixes that.**

It connects to the XRP Ledger and translates every transaction into plain English — showing who sent money, who received it, why it moved, and whether anything looks suspicious.

---

## 🚀 Live Demo

**[trustledger-tau.vercel.app](https://trustledger-tau.vercel.app)**

Try it with any XRPL wallet address. TrustLedger will:

- Fetch real transactions from the XRP Ledger
- Translate each one into plain English
- Calculate a Trust Score from 0–100
- Flag any suspicious or high-risk activity

---

## 💡 The Problem

AI agents are moving real money on XRPL right now:

- Ripple invested $5M in AI agent payment infrastructure in 2026
- $50M+ in on-chain agent volumes with 40,000+ agents operating
- Deutsche Bank, Société Générale, and Aviva Investors all integrated XRPL in early 2026

But when an AI agent makes 47 transactions in a month, nobody can explain what happened. No descriptions. No audit trail. No way to catch unauthorized activity. No compliance reports for accountants or regulators.

**That gap is what TrustLedger fills.**

---

## ✅ The Solution

TrustLedger performs three core functions:

**1. Translates** — converts raw XRPL blockchain data into plain English that anyone can understand

**2. Traces** — shows the authorization chain from human instruction through AI agent to final transaction

**3. Flags** — identifies unusual patterns, suspicious amounts, and high-risk activity automatically

---

## 🔧 How It Works

```
User enters XRPL wallet address
        ↓
TrustLedger connects to XRP Ledger via WebSocket
        ↓
Fetches transaction history using account_tx API
        ↓
AI engine translates each transaction to plain English
        ↓
Trust Score calculated from transaction patterns
        ↓
Results displayed with risk indicators and audit trail
```

---

## 📊 Features

| Feature                               | Status      |
|---------------------------------------|-------------|
| Real XRPL testnet connection          | ✅ Live      |
| Plain English transaction translation | ✅ Live      |
| Trust Score 0–100                     | ✅ Live      |
| Risk flagging (Low / Medium / High)   | ✅ Live      |
| 16 XRPL transaction types supported   | ✅ Live      |
| Memo field decoding                   | ✅ Live      |
| Loading states and error handling     | ✅ Live      |
| Demo mode with sample data            | ✅ Live      |
| PDF compliance export                 | 🔜 Coming   |
| Tax report generation                 | 🔜 Coming   |
| Authorization chain visualization     | 🔜 Coming   |

---

## 🛠️ Tech Stack

- **Blockchain:** XRP Ledger (XRPL)
- **API:** XRPL WebSocket API (account_tx, account_info)
- **Network:** XRPL Testnet — wss://s.altnet.rippletest.net:51233
- **Frontend:** HTML, CSS, JavaScript (single file, no dependencies)
- **Hosting:** Vercel
- **License:** MIT (open source)

---

## 🏃 Run It Locally

1. Clone the repository

```bash
git clone https://github.com/Cypher928/trustledger
cd trustledger
```

2. Open index.html in any browser

```bash
open index.html
```

That's it. No build steps. No dependencies. No configuration needed.

---

## 🗺️ 12-Month Roadmap

**Months 1–3 — Foundation**

- ✅ Working prototype with real XRPL data
- ✅ Plain English translation engine
- ✅ Trust Score algorithm
- Connect to XRPL mainnet

**Months 4–6 — Beta Launch**

- PDF compliance report export
- Tax report generation
- 25 beta testers from XRPL community
- TradeFlow integration

**Months 7–9 — AI Agent Focus**

- Authorization chain reconstruction
- XRPL Credentials integration
- Permissioned DEX monitoring
- 1,000+ monthly wallets audited

**Months 10–12 — Scale**

- Regulatory export formats
- Proof-of-work certificates
- On-chain audit anchoring
- Revenue model launch

---

## 👤 About

Built by Lynn Raymond — a small business owner with an accounts payable background who identified this gap from real-world experience managing business transactions and needing audit trails that accountants and regulators can actually understand.

Also the builder of **TradeFlow** — a cross-border payments tool on XRPL. TrustLedger is the natural accountability complement to TradeFlow. TradeFlow moves money. TrustLedger explains it.

---

## 🌐 Ecosystem

TrustLedger is part of a growing XRPL payments ecosystem:

- **TradeFlow** — Cross-border payments on XRPL
- **TrustLedger** — Audit and accountability layer for XRPL

Together they form a complete solution: execution layer + accountability layer.

---

## 📬 Contact & Community

- **Live Demo:** [trustledger-tau.vercel.app](https://trustledger-tau.vercel.app)
- **GitHub:** [github.com/Cypher928/trustledger](https://github.com/Cypher928/trustledger)
- **XRPL Discord:** Find us in the XRPL developer community

---

## 📄 License

MIT License — open source and free to use.

See [LICENSE](LICENSE) for full details.

---

*Built for the XRPL Grants Program · Spring 2026*  
*The accountability layer for the agentic economy*
