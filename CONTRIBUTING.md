# Contributing to TrustLedger

## Architecture

TrustLedger is a single HTML file (`index.html`, ~5,000 lines). All logic is vanilla JavaScript using an IIFE module pattern — no framework, no build step, no external dependencies. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical reference.

## Running Tests

Tests require Node.js. They load the live implementation via the `vm` module — no copy-paste or stubs.

```bash
node tests.js
```

All tests must pass before submitting a pull request. The test suite exercises `calculateTrustScore`, `buildCounterpartyMap`, `detectRecurringPatterns`, `detectClusterFlags`, and `translateTx` against the live implementation.

## Making Changes

- Edit `index.html` directly — there is no build step.
- If you add or modify a rule in `RULE_REGISTRY`, update [ARCHITECTURE.md](ARCHITECTURE.md) (rule count, category table, and rule ID list).
- If you add a new localStorage prefix or module, update both [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md).
- Run `node tests.js` to verify nothing regressed.

## Rule Governance

Detection thresholds live in `RULE_REGISTRY` inside `index.html`. Each rule entry has:
- `id` — unique dot-namespaced identifier
- `category` — one of `classification`, `cluster`, `pattern`, `agent`, `scoring`
- `thresholds` — key/value defaults (overridable via the governance panel)
- `desc` — plain-English description shown in the governance panel
- `explainability` — why this rule matters, displayed on triggered findings

Do not hardcode thresholds outside of `RULE_REGISTRY`. All threshold reads must go through `RuleConfig.getThreshold(ruleId, key)`.

## Pull Request Checklist

- [ ] `node tests.js` passes
- [ ] No new external dependencies introduced
- [ ] Documentation updated if public API or rule registry changed
- [ ] No wallet addresses, private keys, or real transaction data in test fixtures
