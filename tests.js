#!/usr/bin/env node
/**
 * TrustLedger Smoke Tests
 * Zero build dependencies — runs with: node tests.js
 *
 * Loads the LIVE implementation from index.html via Node vm so that tests
 * always exercise the same code that runs in the browser. No inline copies
 * of calculateTrustScore / buildCounterpartyMap / detectRecurringPatterns.
 */

'use strict';

const fs   = require('fs');
const vm   = require('vm');
const path = require('path');

// ── Load real implementation from index.html ──────────────────────
const HTML_PATH = path.join(__dirname, 'index.html');
const html = fs.readFileSync(HTML_PATH, 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (!scriptMatch) throw new Error('No <script> block found in index.html');

// Append an export shim: IIFE assigns const-scoped vars onto the global
// (sandbox) so we can pull them out after the script runs. function
// declarations are already on the sandbox automatically.
const scriptContent = scriptMatch[1] + '\n;(function(){' +
  'this._tlX={RuleConfig:RuleConfig,EPOCH_OFFSET:EPOCH_OFFSET,' +
  'DEMO_ADDRESS:DEMO_ADDRESS,DEMO_SUPPLIERS:DEMO_SUPPLIERS,' +
  'DEMO_TREASURY:DEMO_TREASURY,DEMO_UNKNOWN:DEMO_UNKNOWN,DEMO_SUSPECT:DEMO_SUSPECT};' +
  '})();';

// ── Shared localStorage backing store ────────────────────────────
// Passed to the vm sandbox AND manipulated directly by test helpers.
const _store = {};

// ── Minimal DOM stub ─────────────────────────────────────────────
function makeFakeEl(id) {
  let _html = '', _text = '', _val = '', _disabled = false;
  const el = {
    id: id || '',
    style: {},
    dataset: {},
    className: '',
    tagName: 'DIV',
    nextSibling: null,
    previousSibling: null,
    firstChild: null,
    lastChild: null,
    checked: false,
    selectedIndex: 0,
    options: { length: 0 },
    children: [],
    classList: {
      add()      {},
      remove()   {},
      toggle()   { return false; },
      contains() { return false; },
    },
    get innerHTML()   { return _html; }, set innerHTML(v)   { _html = String(v); },
    get textContent() { return _text; }, set textContent(v) { _text = String(v); },
    get value()       { return _val;  }, set value(v)       { _val  = String(v); },
    get disabled()    { return _disabled; }, set disabled(v) { _disabled = Boolean(v); },
    setAttribute()    {}, getAttribute()    { return null; },
    removeAttribute() {}, hasAttribute()    { return false; },
    addEventListener(){}, removeEventListener(){},
    focus() {}, blur() {}, click() {}, scrollIntoView() {},
    remove()          {},
    querySelector()   { return null; },
    querySelectorAll(){ return []; },
    appendChild(c)    { return c || makeFakeEl(); },
    removeChild()     {},
    insertBefore(n)   { return n || makeFakeEl(); },
    closest()         { return null; },
    matches()         { return false; },
    cloneNode()       { return makeFakeEl(); },
    dispatchEvent()   {},
  };
  el.parentNode = {
    insertBefore(n) { return n || makeFakeEl(); },
    removeChild()   {},
    appendChild(c)  { return c; },
  };
  return el;
}

// ── vm sandbox ───────────────────────────────────────────────────
const sandbox = {
  document: {
    getElementById:      () => makeFakeEl(),
    addEventListener:    () => {},
    removeEventListener: () => {},
    querySelector:       () => null,
    querySelectorAll:    () => [],
    createElement:       tag => makeFakeEl(tag),
    body:                makeFakeEl('body'),
  },
  localStorage: {
    getItem:    k      => _store[k] !== undefined ? _store[k] : null,
    setItem:    (k, v) => { _store[k] = String(v); },
    removeItem: k      => { delete _store[k]; },
    get length() { return Object.keys(_store).length; },
    key: i => Object.keys(_store)[i] || null,
  },
  setTimeout:    () => 0,
  setInterval:   () => 0,
  clearTimeout:  () => {},
  clearInterval: () => {},
  WebSocket:     function WS() { this.close = () => {}; this.send = () => {}; },
  fetch:         () => Promise.reject(new Error('no-op')),
  Blob:          function() {},
  FileReader:    function() { this.readAsText = () => {}; },
  URL:           { createObjectURL: () => '' },
  performance:   { now: () => Date.now() },
  console,
  JSON, Math, Date, Array, Object, String, Number, Boolean, RegExp,
  Set, Map, WeakMap, WeakSet, Symbol, Proxy, Reflect,
  Promise, Error, TypeError, RangeError, SyntaxError, ReferenceError,
  parseInt, parseFloat, isNaN, isFinite, NaN, Infinity,
  encodeURIComponent, decodeURIComponent,
  alert: () => {}, confirm: () => true,
};
sandbox.window = sandbox;

vm.createContext(sandbox);
vm.runInContext(scriptContent, sandbox, { filename: 'index.html' });

// ── Extract real functions and constants ──────────────────────────
// function declarations → directly on sandbox
const {
  calculateTrustScore,
  buildCounterpartyMap,
  detectRecurringPatterns,
  detectClusterFlags,
  translateTx,
  shortAddr,
} = sandbox;

// const declarations → exported via the shim IIFE above
const {
  RuleConfig,
  EPOCH_OFFSET,
  DEMO_ADDRESS,
  DEMO_SUPPLIERS,
  DEMO_TREASURY,
  DEMO_UNKNOWN,
  DEMO_SUSPECT,
} = sandbox._tlX;

// ── Patch RuleConfig with test helpers ────────────────────────────
// The real RuleConfig persists overrides in localStorage (tl5_rule_* keys).
// These helpers let tests reset state cleanly between runs.
RuleConfig.reset = () => {
  Object.keys(_store).filter(k => k.startsWith('tl5_')).forEach(k => { delete _store[k]; });
};
RuleConfig.disable = (id) => {
  const key = 'tl5_rule_' + id;
  const cur = JSON.parse(_store[key] || '{}');
  cur.enabled = false;
  _store[key] = JSON.stringify(cur);
};
RuleConfig.enable = (id) => {
  const key = 'tl5_rule_' + id;
  const cur = JSON.parse(_store[key] || '{}');
  delete cur.enabled;
  if (Object.keys(cur).length) _store[key] = JSON.stringify(cur);
  else delete _store[key];
};
RuleConfig.setThreshold = (id, tkey, val) => {
  const key = 'tl5_rule_' + id;
  const cur = JSON.parse(_store[key] || '{}');
  if (!cur.thresholdOverrides) cur.thresholdOverrides = {};
  cur.thresholdOverrides[tkey] = val;
  _store[key] = JSON.stringify(cur);
};

// ── Test runner ──────────────────────────────────────────────────
let _pass = 0, _fail = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  \x1b[32m✓\x1b[0m  ' + name);
    _pass++;
  } catch (e) {
    console.error('  \x1b[31m✗\x1b[0m  ' + name);
    console.error('       \x1b[33m' + e.message + '\x1b[0m');
    _fail++;
  }
}
function assert(cond, msg)      { if (!cond) throw new Error(msg || 'Assertion failed'); }
function assertEqual(a, b, msg) { if (a !== b) throw new Error((msg ? msg + ' — ' : '') + 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a)); }
function assertRange(v, lo, hi, msg) { if (v < lo || v > hi) throw new Error((msg ? msg + ' — ' : '') + v + ' not in [' + lo + ',' + hi + ']'); }

// ── Hex-encode a UTF-8 string for Memos.MemoData (Node only) ─────
function hexMemo(str) { return Buffer.from(str, 'utf8').toString('hex').toUpperCase(); }

// ── Minimal tx entry for translateTx / AGENT_003 tests ───────────
const _TX_WALLET = 'rTestWalletXRPLTrustab12345xxx';
const _TX_DEST   = 'rTestDestXRPLTrustabcdef12345';

function _makeTxEntry(opts) {
  const { memoStr, type = 'Payment', result = 'tesSUCCESS' } = opts || {};
  const entry = {
    tx: {
      TransactionType: type,
      Account:         _TX_WALLET,
      Destination:     _TX_DEST,
      Amount:          '1000000',
      Fee:             '12',
      date:            800000000,
      hash:            'AABB' + '0'.repeat(60),
    },
    meta: { TransactionResult: result },
  };
  if (memoStr !== undefined) {
    entry.tx.Memos = [{ Memo: { MemoData: hexMemo(memoStr) } }];
  }
  return entry;
}

// ── Minimal AuditEvent for detectClusterFlags tests ───────────────
function _simpleTx(overrides) {
  return Object.assign(
    { type:'Payment', plainType:'Payment', summary:'', risk:'Low',
      isSender:true, amount:'1 XRP', dest:'rDest', account:_TX_WALLET, ts:100 },
    overrides
  );
}

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\nTrustLedger Smoke Tests\n' + '─'.repeat(45));

// ── Scoring ──────────────────────────────────────────────────────
console.log('\nScoring');

test('empty translations returns score 0', () => {
  const r = calculateTrustScore([]);
  assertEqual(r.score, 0);
  assertEqual(r.label, 'No Data');
});

test('single low-risk payment: score in Moderate Risk band', () => {
  RuleConfig.reset();
  const txs = [{ type:'Payment', risk:'Low', summary:'Sent 1 XRP', isSender:true, amount:'1 XRP', dest:'rB' }];
  const r = calculateTrustScore(txs);
  // baseline 60; payment_bonus requires >3 payments, no other bonuses or penalties
  assertRange(r.score, 58, 62, 'single low-risk payment');
  assertEqual(r.color, 'medium');
});

test('high-risk transactions reduce score correctly', () => {
  RuleConfig.reset();
  // 3 high-risk × 8pts = −24; baseline 60 → 36 (High Risk)
  const txs = Array.from({ length: 3 }, (_, i) => ({
    type:'Payment', risk:'High', summary:'Sent XRP', isSender:true, amount:'100000 XRP', dest:'r' + i,
  }));
  const r = calculateTrustScore(txs);
  assertEqual(r.label, 'High Risk');
  assert(r.score < 40, 'score should be in High Risk band');
});

test('failed transactions apply correct penalty', () => {
  RuleConfig.reset();
  const txs = [
    { type:'Payment', risk:'High', summary:'[FAILED] Sent XRP (Result: tecUNFUNDED)', isSender:true, amount:'1 XRP', dest:'rX' },
  ];
  const r1 = calculateTrustScore(txs);
  RuleConfig.disable('score.failed_penalty');
  const r2 = calculateTrustScore(txs);
  RuleConfig.reset();
  assert(r1.score < r2.score, 'failed penalty should reduce score');
});

test('score is clamped to 0–100', () => {
  RuleConfig.reset();
  // 20 high-risk × 8pts = −160; 60 − 160 → clamped to 0
  const txs = Array.from({ length: 20 }, (_, i) => ({
    type:'Payment', risk:'High', summary:'Bad tx', isSender:true, amount:'1 XRP', dest:'r' + i,
  }));
  const r = calculateTrustScore(txs);
  assertEqual(r.score, 0, 'score must not go below 0');
});

test('escrow bonus applies when escrow present', () => {
  RuleConfig.reset();
  const withEscrow    = [{ type:'EscrowCreate', risk:'Low', summary:'Escrow created', isSender:true, amount:'100 XRP', dest:'rA' }];
  const withoutEscrow = [{ type:'Payment',      risk:'Low', summary:'Payment',        isSender:true, amount:'100 XRP', dest:'rA' }];
  assert(calculateTrustScore(withEscrow).score > calculateTrustScore(withoutEscrow).score, 'escrow bonus should increase score');
});

test('activity_bonus applies for wallets with many transactions', () => {
  RuleConfig.reset();
  const few  = Array.from({ length: 2  }, () => ({ type:'Payment', risk:'Low', summary:'Sent', isSender:true, amount:'1 XRP', dest:'rA' }));
  const many = Array.from({ length: 21 }, () => ({ type:'Payment', risk:'Low', summary:'Sent', isSender:true, amount:'1 XRP', dest:'rA' }));
  assert(calculateTrustScore(many).score > calculateTrustScore(few).score, 'high activity should score higher');
});

test('disabling high_risk_penalty keeps score at baseline', () => {
  RuleConfig.reset();
  RuleConfig.disable('score.high_risk_penalty');
  const txs = [{ type:'Payment', risk:'High', summary:'Bad tx', isSender:true, amount:'1 XRP', dest:'rX' }];
  assert(calculateTrustScore(txs).score >= 60, 'disabled penalty should not reduce score below baseline');
  RuleConfig.reset();
});

// ── Agent Detection ──────────────────────────────────────────────
console.log('\nAgent Detection');

// AGENT_001/002/004 are tested via the real detectClusterFlags(cpm, txs).
// AGENT_003 is tested via the real translateTx(entry, wallet).

test('AGENT_001: identical amounts to 3+ recipients fires', () => {
  RuleConfig.reset();
  const txs = ['rDestA','rDestB','rDestC'].map(d => _simpleTx({ amount:'100.00 XRP', dest:d }));
  const flags = detectClusterFlags(buildCounterpartyMap(txs, _TX_WALLET), txs);
  assert(flags.some(f => f.label && f.label.includes('AGENT_001')), 'AGENT_001 should fire on 3 identical-amount recipients');
});

test('AGENT_001: identical amounts to 2 recipients does not fire', () => {
  RuleConfig.reset();
  const txs = ['rDestA','rDestB'].map(d => _simpleTx({ amount:'100.00 XRP', dest:d }));
  const flags = detectClusterFlags(buildCounterpartyMap(txs, _TX_WALLET), txs);
  assert(!flags.some(f => f.label && f.label.includes('AGENT_001')), 'AGENT_001 should not fire on 2 recipients');
});

test('AGENT_001: different amounts to 3 recipients does not fire', () => {
  RuleConfig.reset();
  const txs = [
    _simpleTx({ amount:'100 XRP', dest:'rDestA' }),
    _simpleTx({ amount:'200 XRP', dest:'rDestB' }),
    _simpleTx({ amount:'300 XRP', dest:'rDestC' }),
  ];
  const flags = detectClusterFlags(buildCounterpartyMap(txs, _TX_WALLET), txs);
  assert(!flags.some(f => f.label && f.label.includes('AGENT_001')), 'AGENT_001 should not fire when amounts differ');
});

test('AGENT_002: 5 transactions within 60 min fires', () => {
  RuleConfig.reset();
  const BASE = 799408800; // May 1, 2025 11:00 UTC (XRPL epoch)
  const txs  = Array.from({ length: 5 }, (_, i) => _simpleTx({ ts: BASE + i * 300 })); // 5-min intervals
  const flags = detectClusterFlags(buildCounterpartyMap(txs, _TX_WALLET), txs);
  assert(flags.some(f => f.label && f.label.includes('AGENT_002')), 'AGENT_002 should fire on 5 txs in 25 minutes');
});

test('AGENT_002: 5 transactions spread over 2 hours does not fire', () => {
  RuleConfig.reset();
  const BASE = 799408800;
  // 30-min intervals → max 3 in any 60-min window (below minTx:5)
  const txs  = Array.from({ length: 5 }, (_, i) => _simpleTx({ ts: BASE + i * 1800 }));
  const flags = detectClusterFlags(buildCounterpartyMap(txs, _TX_WALLET), txs);
  assert(!flags.some(f => f.label && f.label.includes('AGENT_002')), 'AGENT_002 should not fire when txs are spread 30 min apart');
});

test('AGENT_003: JSON memo triggers agentIndicator', () => {
  RuleConfig.reset();
  const r = translateTx(_makeTxEntry({ memoStr: '{"payment_id":"AP-001","job":"monthly"}' }), _TX_WALLET);
  assert(r.agentIndicator !== null && r.agentIndicator.startsWith('AGENT_003'), 'JSON memo should trigger AGENT_003');
});

test('AGENT_003: UUID memo triggers agentIndicator', () => {
  RuleConfig.reset();
  const r = translateTx(_makeTxEntry({ memoStr: 'ref: 550e8400-e29b-41d4-a716-446655440000' }), _TX_WALLET);
  assert(r.agentIndicator !== null && r.agentIndicator.startsWith('AGENT_003'), 'UUID should trigger AGENT_003');
});

test('AGENT_003: automation keyword in memo triggers agentIndicator', () => {
  RuleConfig.reset();
  const r = translateTx(_makeTxEntry({ memoStr: 'job_id: 12345 webhook trigger' }), _TX_WALLET);
  assert(r.agentIndicator !== null && r.agentIndicator.startsWith('AGENT_003'), 'automation keyword should trigger AGENT_003');
});

test('AGENT_003: ISO timestamp in memo triggers agentIndicator', () => {
  RuleConfig.reset();
  const r = translateTx(_makeTxEntry({ memoStr: 'processed at 2025-05-01T11:00:00Z' }), _TX_WALLET);
  assert(r.agentIndicator !== null && r.agentIndicator.startsWith('AGENT_003'), 'ISO timestamp should trigger AGENT_003');
});

test('AGENT_003: plain human memo does not trigger agentIndicator', () => {
  RuleConfig.reset();
  const r1 = translateTx(_makeTxEntry({ memoStr: 'Thanks for lunch! See you next week.' }), _TX_WALLET);
  const r2 = translateTx(_makeTxEntry({ memoStr: 'Payment for consulting services - May invoice' }), _TX_WALLET);
  assertEqual(r1.agentIndicator, null, 'casual memo should not trigger AGENT_003');
  assertEqual(r2.agentIndicator, null, 'invoice memo should not trigger AGENT_003');
});

// ── Scoring with agent penalty ────────────────────────────────────
test('agent_penalty reduces score when AGENT_001 fires', () => {
  RuleConfig.reset();
  const txs = ['rDestA','rDestB','rDestC'].map(d => ({
    type:'Payment', risk:'Low', summary:'Sent 100 XRP', isSender:true, amount:'100 XRP', dest:d,
  }));
  const rWith    = calculateTrustScore(txs);
  RuleConfig.disable('score.agent_penalty');
  const rWithout = calculateTrustScore(txs);
  RuleConfig.reset();
  assert(rWith.score < rWithout.score, 'agent_penalty should reduce score when AGENT_001 fires');
});

// ── Counterparty Analysis ────────────────────────────────────────
console.log('\nCounterparty Analysis');

test('buildCounterpartyMap: counts sent and received correctly', () => {
  const wallet = 'rWallet';
  const txs = [
    { type:'Payment', risk:'Low',  summary:'', isSender:true,  account:wallet,  dest:'rAlice', amount:'10 XRP' },
    { type:'Payment', risk:'Low',  summary:'', isSender:true,  account:wallet,  dest:'rAlice', amount:'10 XRP' },
    { type:'Payment', risk:'High', summary:'', isSender:false, account:'rBob',  dest:wallet,   amount:'20 XRP' },
  ];
  const map   = buildCounterpartyMap(txs, wallet);
  const alice = map.find(c => c.address === 'rAlice');
  const bob   = map.find(c => c.address === 'rBob');
  assert(alice, 'rAlice should appear in map');
  assertEqual(alice.sentCount, 2);
  assertEqual(alice.recvCount, 0);
  assert(bob, 'rBob should appear in map');
  assertEqual(bob.recvCount, 1);
  assertEqual(bob.highRiskCount, 1);
});

test('buildCounterpartyMap: wallet address does not appear as its own counterparty', () => {
  const wallet = 'rWallet';
  const txs = [{ type:'Payment', risk:'Low', summary:'', isSender:true, account:wallet, dest:wallet, amount:'1 XRP' }];
  assertEqual(buildCounterpartyMap(txs, wallet).length, 0, 'wallet should not be its own counterparty');
});

test('buildCounterpartyMap: sorted by count descending', () => {
  const wallet = 'rWallet';
  const txs = [
    { type:'Payment', risk:'Low', summary:'', isSender:true, account:wallet, dest:'rA', amount:'1 XRP' },
    { type:'Payment', risk:'Low', summary:'', isSender:true, account:wallet, dest:'rB', amount:'1 XRP' },
    { type:'Payment', risk:'Low', summary:'', isSender:true, account:wallet, dest:'rB', amount:'1 XRP' },
    { type:'Payment', risk:'Low', summary:'', isSender:true, account:wallet, dest:'rB', amount:'1 XRP' },
  ];
  assertEqual(buildCounterpartyMap(txs, wallet)[0].address, 'rB', 'most frequent counterparty should be first');
});

// ── Rule Engine ──────────────────────────────────────────────────
console.log('\nRule Engine');

test('disabled rule has no score effect', () => {
  RuleConfig.reset();
  RuleConfig.disable('score.payment_bonus');
  const txs = Array.from({ length: 10 }, () => ({ type:'Payment', risk:'Low', summary:'Sent', isSender:true, amount:'1 XRP', dest:'rA' }));
  assert(calculateTrustScore(txs).score <= 65, 'payment_bonus should not fire when disabled');
  RuleConfig.reset();
});

test('threshold override changes score boundary', () => {
  RuleConfig.reset();
  RuleConfig.setThreshold('score.high_risk_penalty', 'points', 20);
  const txs = [{ type:'Payment', risk:'High', summary:'Bad tx', isSender:true, amount:'1 XRP', dest:'rX' }];
  // 60 − 20 = 40; exactly Moderate Risk (≥40)
  assertEqual(calculateTrustScore(txs).label, 'Moderate Risk', 'increased penalty should land on Moderate Risk boundary');
  RuleConfig.reset();
});

// ── Demo Scenario Integrity ──────────────────────────────────────
console.log('\nDemo Scenario Integrity');

test('demo scenario: 12 transactions produce High Risk score', () => {
  RuleConfig.reset();
  const B = 799408800;
  const suppliers = ['rSupplierA', 'rSupplierB', 'rSupplierC'];
  const txs = [];
  txs.push({ type:'Payment', risk:'Low',  summary:'Received 50000 XRP', isSender:false, account:'rTreasury', dest:'rDemo', amount:'50000 XRP', ts:794102400 });
  suppliers.forEach((s, i) => txs.push({ type:'Payment', risk:'Low',  summary:'Sent 1000 XRP', isSender:true, account:'rDemo', dest:s, amount:'1,000.00 XRP', ts:796816800 + i * 120 }));
  for (let i = 0; i < 6; i++) txs.push({ type:'Payment', risk:'Low',  summary:'Sent 1000 XRP', isSender:true, account:'rDemo', dest:suppliers[i % 3], amount:'1,000.00 XRP', ts:B + i * 120 });
  txs.push({ type:'Payment', risk:'High', summary:'Sent 25000 XRP',                       isSender:true, account:'rDemo', dest:'rUnknown', amount:'25,000.00 XRP', ts:B+720 });
  txs.push({ type:'Payment', risk:'High', summary:'[FAILED] Sent 50000 XRP (Result: tecUNFUNDED)', isSender:true, account:'rDemo', dest:'rSuspect', amount:'50,000.00 XRP', ts:B+840 });

  const r = calculateTrustScore(txs);
  assert(r.score < 45, 'demo scenario should produce a low score');
  assertEqual(r.stats.highRisk, 2, 'should have exactly 2 high-risk transactions');
  assertEqual(r.stats.failed,   1, 'should have exactly 1 failed transaction');
});

test('demo scenario: AGENT_001 fires on 1000 XRP to 3 suppliers', () => {
  RuleConfig.reset();
  const wallet = 'rDemoWallet';
  const txs = ['rSupplierA','rSupplierB','rSupplierC'].map(d => _simpleTx({ amount:'1,000.00 XRP', dest:d, account:wallet }));
  const flags = detectClusterFlags(buildCounterpartyMap(txs, wallet), txs);
  assert(flags.some(f => f.label && f.label.includes('AGENT_001')), 'AGENT_001 should fire on the demo supplier pattern');
});

test('demo scenario: AGENT_002 fires on May burst (8 txs in 14 minutes)', () => {
  RuleConfig.reset();
  const wallet = 'rDemoWallet';
  const txs = Array.from({ length: 8 }, (_, i) => _simpleTx({ ts: 799408800 + i * 120, account:wallet }));
  const flags = detectClusterFlags(buildCounterpartyMap(txs, wallet), txs);
  assert(flags.some(f => f.label && f.label.includes('AGENT_002')), 'AGENT_002 should fire on 8 txs in 14 minutes');
});

test('demo automation memo triggers AGENT_003 via translateTx', () => {
  RuleConfig.reset();
  const memo  = '{"payment_id":"AP-2025-004","job":"monthly_supplier_run","agent":"ap-bot-v2"}';
  const r     = translateTx(_makeTxEntry({ memoStr: memo }), _TX_WALLET);
  assert(r.agentIndicator !== null && r.agentIndicator.startsWith('AGENT_003'), 'demo AP memo should trigger AGENT_003');
});

// ── Counterparty Intelligence ────────────────────────────────────
console.log('\nCounterparty Intelligence');

// Pull addresses directly from the live constants — no inline copies.
const DEMO_COUNTERPARTY_ADDRS = [DEMO_TREASURY, ...DEMO_SUPPLIERS, DEMO_UNKNOWN, DEMO_SUSPECT];

test('demo: all counterparty shortAddr representations are unique (no visual duplicates)', () => {
  const shorts     = DEMO_COUNTERPARTY_ADDRS.map(shortAddr);
  const unique     = new Set(shorts);
  const collisions = shorts.filter((s, i) => shorts.indexOf(s) !== i);
  assertEqual(unique.size, DEMO_COUNTERPARTY_ADDRS.length,
    'shortAddr collision: ' + collisions.join(', '));
});

test('buildCounterpartyMap: identical source data never produces duplicate address entries', () => {
  const wallet = 'rWalletTest1DemoXRPLTrustxx1';
  const dest   = 'rAliceTest1DemoXRPLTrustxx2';
  const txs = Array.from({ length: 3 }, () => (
    { type:'Payment', risk:'Low', summary:'Sent', isSender:true, account:wallet, dest, amount:'1 XRP' }
  ));
  const map    = buildCounterpartyMap(txs, wallet);
  const addrs  = map.map(cp => cp.address);
  assertEqual(new Set(addrs).size, addrs.length, 'duplicate address in counterparty map');
  assertEqual(map.length,          1,             '3 txs to same address → exactly 1 counterparty entry');
  assertEqual(map[0].sentCount,    3,             'sentCount should accumulate across all txs');
});

test('detectRecurringPatterns: one address with 3 identical sent txs produces exactly one pattern card', () => {
  const wallet = 'rWalletTest1DemoXRPLTrustxx1';
  const dest   = 'rAliceTest1DemoXRPLTrustxx2';
  const txs = Array.from({ length: 3 }, (_, i) => (
    { type:'Payment', risk:'Low', summary:'Sent', isSender:true, account:wallet, dest, amount:'1,000.00 XRP', ts:1000 + i }
  ));
  const map      = buildCounterpartyMap(txs, wallet);
  const patterns = detectRecurringPatterns(map, txs);
  const addrs    = patterns.map(p => p.address);
  assertEqual(new Set(addrs).size, addrs.length, 'duplicate pattern entry found');
  assertEqual(patterns.length,     1,             'one counterparty with 3 identical payments → exactly 1 pattern card');
  assertEqual(patterns[0].type,    'regular_fixed', 'identical amounts → regular_fixed pattern');
});

// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '─'.repeat(45));
if (_fail === 0) {
  console.log(`\x1b[32m\n  All ${_pass} tests passed.\x1b[0m\n`);
} else {
  console.log(`\x1b[31m\n  ${_fail} failed\x1b[0m, ${_pass} passed.\n`);
  process.exit(1);
}
