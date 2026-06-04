#!/usr/bin/env node
/**
 * TrustLedger Smoke Tests
 * Zero dependencies — runs with: node tests.js
 *
 * Tests core logic in isolation: scoring, rule evaluation,
 * agent detection, and counterparty analysis.
 */

'use strict';

// ── Minimal browser shims ─────────────────────────────────────────
const _store = {};
const localStorage = {
  getItem:    k      => _store[k] !== undefined ? _store[k] : null,
  setItem:    (k, v) => { _store[k] = String(v); },
  removeItem: k      => { delete _store[k]; },
  get length() { return Object.keys(_store).length; },
  key: i => Object.keys(_store)[i] || null,
};

// ── Test runner ───────────────────────────────────────────────────
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

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}
function assertEqual(a, b, msg) {
  if (a !== b) throw new Error((msg ? msg + ' — ' : '') + 'expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
}
function assertRange(v, lo, hi, msg) {
  if (v < lo || v > hi) throw new Error((msg ? msg + ' — ' : '') + v + ' not in [' + lo + ',' + hi + ']');
}

// ── Inline minimal rule engine (mirrors app logic) ────────────────
const EPOCH_OFFSET = 946684800;

const RULE_DEFAULTS = {
  'payment.high_value':           { enabled:true, severity:'high',   thresholds:{ xrp:100000 } },
  'payment.medium_value':         { enabled:true, severity:'medium', thresholds:{ xrp:1000   } },
  'payment.token':                { enabled:true, severity:'medium', thresholds:{}             },
  'classification.failed_tx':     { enabled:true, severity:'high',   thresholds:{}             },
  'score.high_risk_penalty':      { enabled:true, severity:'high',   thresholds:{ points:8  }  },
  'score.medium_risk_penalty':    { enabled:true, severity:'medium', thresholds:{ points:2  }  },
  'score.failed_penalty':         { enabled:true, severity:'medium', thresholds:{ points:5  }  },
  'score.account_delete_penalty': { enabled:true, severity:'high',   thresholds:{ points:15 }  },
  'score.activity_bonus':         { enabled:true, severity:'low',    thresholds:{ minTxHigh:20, pointsHigh:10, minTxLow:5, pointsLow:5 } },
  'score.escrow_bonus':           { enabled:true, severity:'low',    thresholds:{ points:5  }  },
  'score.payment_bonus':          { enabled:true, severity:'low',    thresholds:{ minPayments:3, points:5 } },
  'agent.identical_amounts':      { enabled:true, severity:'medium', thresholds:{ minRecipients:3 } },
  'agent.burst_activity':         { enabled:true, severity:'medium', thresholds:{ minTx:5, windowMinutes:60 } },
  'agent.automation_memo':        { enabled:true, severity:'medium', thresholds:{} },
  'agent.new_counterparty_burst': { enabled:true, severity:'high',   thresholds:{ burstWindowMinutes:60 } },
  'score.agent_penalty':          { enabled:true, severity:'medium', thresholds:{ points:10 } },
  'cluster.fan_out_major':        { enabled:true, severity:'high',   thresholds:{ minAddresses:5 } },
  'cluster.fan_out_minor':        { enabled:true, severity:'medium', thresholds:{ minAddresses:3 } },
  'cluster.repeat_high_risk':     { enabled:true, severity:'high',   thresholds:{ minHighRisk:2 } },
  'cluster.high_risk_concentration':{ enabled:true, severity:'high', thresholds:{ pct:30, minCount:3 } },
  'cluster.circular':             { enabled:true, severity:'medium', thresholds:{ minEachWay:2 } },
  'cluster.failed_cluster':       { enabled:true, severity:'medium', thresholds:{ minFailed:3 } },
  'cluster.amm_heavy':            { enabled:true, severity:'medium', thresholds:{ pct:30 } },
  'pattern.min_tx_count':         { enabled:true, severity:'low',    thresholds:{ minSent:3 } },
};

// Minimal RuleConfig shim
const RuleConfig = {
  _overrides: {},
  isEnabled:      id => (RuleConfig._overrides[id] && RuleConfig._overrides[id].enabled === false) ? false : (RULE_DEFAULTS[id] ? RULE_DEFAULTS[id].enabled : true),
  getSeverity:    id => { const r = RULE_DEFAULTS[id]; return r ? r.severity.charAt(0).toUpperCase() + r.severity.slice(1) : 'Low'; },
  getThreshold:   (id, key) => { const r = RULE_DEFAULTS[id]; return r && r.thresholds[key] !== undefined ? r.thresholds[key] : 0; },
  trackTrigger:   () => {},
  disable:        id => { RuleConfig._overrides[id] = { enabled: false }; },
  enable:         id => { delete RuleConfig._overrides[id]; },
  setThreshold:   (id, key, val) => {
    if (!RuleConfig._overrides[id]) RuleConfig._overrides[id] = {};
    if (!RULE_DEFAULTS[id]) RULE_DEFAULTS[id] = { enabled:true, severity:'low', thresholds:{} };
    RULE_DEFAULTS[id].thresholds[key] = val;
  },
  reset: () => { RuleConfig._overrides = {}; },
};

// ── calculateTrustScore (mirrors app logic) ───────────────────────
function calculateTrustScore(translations) {
  if (!translations.length) return { score:0, label:'No Data', desc:'', color:'low', stats:{ total:0, highRisk:0, medRisk:0, failed:0, payments:0, escrows:0 } };

  let score = 60;
  const total    = translations.length;
  const highRisk = translations.filter(t => t.risk === 'High').length;
  const medRisk  = translations.filter(t => t.risk === 'Medium').length;
  const failed   = translations.filter(t => t.summary && t.summary.startsWith('[FAILED]')).length;
  const payments = translations.filter(t => t.type === 'Payment').length;
  const escrows  = translations.filter(t => t.type && t.type.startsWith('Escrow')).length;
  const deletes  = translations.filter(t => t.type === 'AccountDelete').length;

  if (RuleConfig.isEnabled('score.activity_bonus')) {
    const hiMin = RuleConfig.getThreshold('score.activity_bonus', 'minTxHigh');
    const hiPts = RuleConfig.getThreshold('score.activity_bonus', 'pointsHigh');
    const loMin = RuleConfig.getThreshold('score.activity_bonus', 'minTxLow');
    const loPts = RuleConfig.getThreshold('score.activity_bonus', 'pointsLow');
    if      (total >= hiMin) score += hiPts;
    else if (total >= loMin) score += loPts;
  }
  if (RuleConfig.isEnabled('score.escrow_bonus') && escrows > 0)
    score += RuleConfig.getThreshold('score.escrow_bonus', 'points');
  if (RuleConfig.isEnabled('score.payment_bonus') && payments > RuleConfig.getThreshold('score.payment_bonus', 'minPayments'))
    score += RuleConfig.getThreshold('score.payment_bonus', 'points');

  const hiPen   = RuleConfig.isEnabled('score.high_risk_penalty')     ? RuleConfig.getThreshold('score.high_risk_penalty',     'points') : 0;
  const medPen  = RuleConfig.isEnabled('score.medium_risk_penalty')    ? RuleConfig.getThreshold('score.medium_risk_penalty',   'points') : 0;
  const failPen = RuleConfig.isEnabled('score.failed_penalty')         ? RuleConfig.getThreshold('score.failed_penalty',        'points') : 0;
  const delPen  = RuleConfig.isEnabled('score.account_delete_penalty') ? RuleConfig.getThreshold('score.account_delete_penalty','points') : 0;
  score -= highRisk * hiPen;
  score -= medRisk  * medPen;
  score -= failed   * failPen;
  score -= deletes  * delPen;

  // Agent penalty
  if (RuleConfig.isEnabled('score.agent_penalty')) {
    const agPen  = RuleConfig.getThreshold('score.agent_penalty', 'points');
    const agOut  = translations.filter(t => t.type === 'Payment' && t.isSender && t.amount);
    const agAmt  = Object.create(null);
    agOut.forEach(t => { if (!agAmt[t.amount]) agAmt[t.amount] = new Set(); if (t.dest) agAmt[t.amount].add(t.dest); });
    const ag1Min = RuleConfig.getThreshold('agent.identical_amounts', 'minRecipients');
    const has001 = Object.values(agAmt).some(s => s.size >= ag1Min);
    const agTs   = translations.map(t => t.ts ? (t.ts + EPOCH_OFFSET) * 1000 : 0).filter(Boolean).sort((a,b)=>a-b);
    const ag2Min = RuleConfig.getThreshold('agent.burst_activity', 'minTx');
    const ag2Win = RuleConfig.getThreshold('agent.burst_activity', 'windowMinutes') * 60000;
    let has002   = false;
    for (let i = 0; i < agTs.length && !has002; i++) {
      let cnt = 0;
      for (let j = i; j < agTs.length && agTs[j] <= agTs[i] + ag2Win; j++) cnt++;
      if (cnt >= ag2Min) has002 = true;
    }
    if (has001 || has002) score -= agPen;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 70 ? 'Trustworthy' : score >= 40 ? 'Moderate Risk' : 'High Risk';
  const color = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
  return { score, label, color, stats:{ total, highRisk, medRisk, failed, payments, escrows } };
}

// ── buildCounterpartyMap (mirrors app logic) ──────────────────────
function buildCounterpartyMap(translations, walletAddress) {
  const map = new Map();
  const wl  = walletAddress.toLowerCase();
  translations.forEach(function(t, idx) {
    const hasDest = t.dest    && t.dest.toLowerCase()    !== wl;
    const hasAcct = t.account && t.account.toLowerCase() !== wl;
    const cp = t.isSender ? (hasDest ? t.dest : null) : (hasAcct ? t.account : null);
    if (!cp) return;
    if (!map.has(cp)) map.set(cp, { address:cp, count:0, sentCount:0, recvCount:0, highRiskCount:0, txIndices:[] });
    const e = map.get(cp);
    e.count++;
    if (t.isSender) e.sentCount++; else e.recvCount++;
    if (t.risk === 'High') e.highRiskCount++;
    e.txIndices.push(idx);
  });
  return Array.from(map.values()).sort((a,b) => b.count - a.count);
}

// ── AGENT_003 memo pattern detection (mirrors app logic) ──────────
function detectAutoMemo(memo) {
  if (!memo) return null;
  const tests = [
    [/^\s*\{[\s\S]*\}\s*$/, 'structured JSON memo'],
    [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i, 'UUID reference in memo'],
    [/\b(api[_\-]?(?:call|key|id|ref)|job[_\-]?id|task[_\-]?id|cron|webhook|trigger|bot[_\-]?id|agent[_\-]?id|auto[_\-]?(?:pay|tx|send)|correlation[_\-]?id)\b/i, 'automation keyword in memo'],
    [/[-_#:]\d{4,}$/, 'sequential transaction ID in memo'],
    [/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, 'ISO timestamp in memo'],
  ];
  for (const [re, label] of tests) if (re.test(memo)) return label;
  return null;
}

// ── AGENT_002 burst detection helper ─────────────────────────────
function detectBurst(translations, minTx = 5, windowMinutes = 60) {
  const ts = translations.map(t => t.ts ? (t.ts + EPOCH_OFFSET) * 1000 : 0).filter(Boolean).sort((a,b)=>a-b);
  const winMs = windowMinutes * 60000;
  let max = 0;
  for (let i = 0; i < ts.length; i++) {
    let cnt = 0;
    for (let j = i; j < ts.length && ts[j] <= ts[i] + winMs; j++) cnt++;
    if (cnt > max) max = cnt;
  }
  return max >= minTx;
}

// ── AGENT_001 identical-amount fan-out detection ──────────────────
function detectIdenticalAmounts(translations, minRecipients = 3) {
  const out = translations.filter(t => t.type === 'Payment' && t.isSender && t.amount);
  const map = Object.create(null);
  out.forEach(t => { if (!map[t.amount]) map[t.amount] = new Set(); if (t.dest) map[t.amount].add(t.dest); });
  return Object.values(map).some(s => s.size >= minRecipients);
}

// ═══════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════

console.log('\nTrustLedger Smoke Tests\n' + '─'.repeat(45));

// ── Trust Score: boundary cases ───────────────────────────────────
console.log('\nScoring');

test('empty translations returns score 0', () => {
  const r = calculateTrustScore([]);
  assertEqual(r.score, 0);
  assertEqual(r.label, 'No Data');
});

test('single low-risk payment: score in Moderate Risk band', () => {
  RuleConfig.reset();
  const txs = [{ type:'Payment', risk:'Low',  summary:'Sent 1 XRP', isSender:true, amount:'1 XRP', dest:'rB' }];
  const r = calculateTrustScore(txs);
  // baseline 60; payment_bonus requires >3 payments (minPayments:3), no other bonuses or penalties
  assertRange(r.score, 58, 62, 'single low-risk payment');
  assertEqual(r.color, 'medium');
});

test('high-risk transactions reduce score correctly', () => {
  RuleConfig.reset();
  // 3 high-risk txs × 8pts = -24; baseline 60; no bonuses → 36
  const txs = Array.from({ length: 3 }, (_, i) => ({
    type:'Payment', risk:'High', summary:'Sent XRP', isSender:true, amount:'100000 XRP', dest:'r' + i,
  }));
  const r = calculateTrustScore(txs);
  assertEqual(r.label, 'High Risk');
  assert(r.score < 40, 'score should be High Risk');
});

test('failed transactions apply correct penalty', () => {
  RuleConfig.reset();
  const txs = [
    { type:'Payment', risk:'High', summary:'[FAILED] Sent XRP (Result: tecUNFUNDED)', isSender:true, amount:'1 XRP', dest:'rX' },
  ];
  const r1 = calculateTrustScore(txs);
  // Disable failed penalty and compare
  RuleConfig.disable('score.failed_penalty');
  const r2 = calculateTrustScore(txs);
  RuleConfig.reset();
  assert(r1.score < r2.score, 'failed penalty should reduce score');
});

test('score is clamped to 0–100', () => {
  RuleConfig.reset();
  // 20 high-risk txs: 60 - (20×8) = 60 - 160 = -100 → clamped to 0
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
  const rWith    = calculateTrustScore(withEscrow);
  const rWithout = calculateTrustScore(withoutEscrow);
  assert(rWith.score > rWithout.score, 'escrow bonus should increase score');
});

test('activity_bonus applies for wallets with many transactions', () => {
  RuleConfig.reset();
  const few  = Array.from({ length: 2 }, () => ({ type:'Payment', risk:'Low', summary:'Sent', isSender:true, amount:'1 XRP', dest:'rA' }));
  const many = Array.from({ length: 21 }, () => ({ type:'Payment', risk:'Low', summary:'Sent', isSender:true, amount:'1 XRP', dest:'rA' }));
  const rFew  = calculateTrustScore(few);
  const rMany = calculateTrustScore(many);
  assert(rMany.score > rFew.score, 'high activity should score higher than low activity');
});

test('disabling high_risk_penalty has no effect on score', () => {
  RuleConfig.reset();
  RuleConfig.disable('score.high_risk_penalty');
  const txs = [{ type:'Payment', risk:'High', summary:'Bad tx', isSender:true, amount:'1 XRP', dest:'rX' }];
  const r = calculateTrustScore(txs);
  assert(r.score >= 60, 'disabled penalty should not reduce score below baseline');
  RuleConfig.reset();
});

// ── Agent Detection ───────────────────────────────────────────────
console.log('\nAgent Detection');

test('AGENT_001: identical amounts to 3+ recipients fires', () => {
  const txs = ['rA','rB','rC'].map(d => ({ type:'Payment', risk:'Low', summary:'Sent', isSender:true, amount:'100.00 XRP', dest:d }));
  assert(detectIdenticalAmounts(txs), 'AGENT_001 should fire on 3 recipients');
});

test('AGENT_001: identical amounts to 2 recipients does not fire', () => {
  const txs = ['rA','rB'].map(d => ({ type:'Payment', risk:'Low', summary:'Sent', isSender:true, amount:'100.00 XRP', dest:d }));
  assert(!detectIdenticalAmounts(txs), 'AGENT_001 should not fire on only 2 recipients');
});

test('AGENT_001: different amounts to 3 recipients does not fire', () => {
  const txs = [
    { type:'Payment', risk:'Low', summary:'', isSender:true, amount:'100 XRP', dest:'rA' },
    { type:'Payment', risk:'Low', summary:'', isSender:true, amount:'200 XRP', dest:'rB' },
    { type:'Payment', risk:'Low', summary:'', isSender:true, amount:'300 XRP', dest:'rC' },
  ];
  assert(!detectIdenticalAmounts(txs), 'AGENT_001 should not fire when amounts differ');
});

test('AGENT_002: 5 transactions within 60 min fires', () => {
  const BASE = 799408800; // May 1, 2025 11:00 UTC in XRPL epoch
  const txs = Array.from({ length: 5 }, (_, i) => ({ type:'Payment', risk:'Low', summary:'', ts: BASE + i * 300, isSender:true, amount:'1 XRP', dest:'rA' }));
  assert(detectBurst(txs), 'AGENT_002 should fire on 5 txs in 25 minutes');
});

test('AGENT_002: 5 transactions spread over 2 hours does not fire', () => {
  const BASE = 799408800;
  // One tx every 30 minutes = 4 tx per 60-min window (below threshold of 5)
  const txs = Array.from({ length: 5 }, (_, i) => ({ type:'Payment', risk:'Low', summary:'', ts: BASE + i * 1800, isSender:true, amount:'1 XRP', dest:'rA' }));
  assert(!detectBurst(txs), 'AGENT_002 should not fire when txs are spread across 2 hours');
});

test('AGENT_003: JSON memo is detected', () => {
  assertEqual(detectAutoMemo('{"payment_id":"AP-001","job":"monthly"}'), 'structured JSON memo');
});

test('AGENT_003: UUID memo is detected', () => {
  assert(detectAutoMemo('ref: 550e8400-e29b-41d4-a716-446655440000') !== null, 'UUID should match');
});

test('AGENT_003: automation keyword in memo is detected', () => {
  assert(detectAutoMemo('job_id: 12345 webhook trigger') !== null, 'automation keyword should match');
});

test('AGENT_003: ISO timestamp in memo is detected', () => {
  assert(detectAutoMemo('processed at 2025-05-01T11:00:00Z') !== null, 'ISO timestamp should match');
});

test('AGENT_003: plain human memo is not flagged', () => {
  assertEqual(detectAutoMemo('Thanks for lunch! See you next week.'), null);
  assertEqual(detectAutoMemo('Payment for consulting services - May invoice'), null);
});

// ── Scoring with agent penalty ────────────────────────────────────
test('agent_penalty reduces score when AGENT_001 fires', () => {
  RuleConfig.reset();
  const txs = ['rA','rB','rC'].map(d => ({
    type:'Payment', risk:'Low', summary:'Sent 100 XRP', isSender:true, amount:'100 XRP', dest:d,
  }));
  const rWith = calculateTrustScore(txs);
  RuleConfig.disable('score.agent_penalty');
  const rWithout = calculateTrustScore(txs);
  RuleConfig.reset();
  assert(rWith.score < rWithout.score, 'agent_penalty should reduce score on AGENT_001 match');
});

// ── Counterparty Map ──────────────────────────────────────────────
console.log('\nCounterparty Analysis');

test('buildCounterpartyMap: counts sent and received correctly', () => {
  const wallet = 'rWallet';
  const txs = [
    { type:'Payment', risk:'Low',  summary:'', isSender:true,  account:wallet,  dest:'rAlice', amount:'10 XRP' },
    { type:'Payment', risk:'Low',  summary:'', isSender:true,  account:wallet,  dest:'rAlice', amount:'10 XRP' },
    { type:'Payment', risk:'High', summary:'', isSender:false, account:'rBob',  dest:wallet,   amount:'20 XRP' },
  ];
  const map = buildCounterpartyMap(txs, wallet);
  const alice = map.find(c => c.address === 'rAlice');
  const bob   = map.find(c => c.address === 'rBob');
  assert(alice, 'rAlice should appear in counterparty map');
  assertEqual(alice.sentCount, 2);
  assertEqual(alice.recvCount, 0);
  assert(bob, 'rBob should appear in counterparty map');
  assertEqual(bob.recvCount, 1);
  assertEqual(bob.highRiskCount, 1);
});

test('buildCounterpartyMap: wallet address does not appear as its own counterparty', () => {
  const wallet = 'rWallet';
  const txs = [
    { type:'Payment', risk:'Low', summary:'', isSender:true, account:wallet, dest:wallet, amount:'1 XRP' },
  ];
  const map = buildCounterpartyMap(txs, wallet);
  assertEqual(map.length, 0, 'wallet should not be its own counterparty');
});

test('buildCounterpartyMap: sorted by count descending', () => {
  const wallet = 'rWallet';
  const txs = [
    { type:'Payment', risk:'Low', summary:'', isSender:true, account:wallet, dest:'rA', amount:'1 XRP' },
    { type:'Payment', risk:'Low', summary:'', isSender:true, account:wallet, dest:'rB', amount:'1 XRP' },
    { type:'Payment', risk:'Low', summary:'', isSender:true, account:wallet, dest:'rB', amount:'1 XRP' },
    { type:'Payment', risk:'Low', summary:'', isSender:true, account:wallet, dest:'rB', amount:'1 XRP' },
  ];
  const map = buildCounterpartyMap(txs, wallet);
  assertEqual(map[0].address, 'rB', 'most frequent counterparty should be first');
});

// ── Rule Engine ───────────────────────────────────────────────────
console.log('\nRule Engine');

test('disabled rule has no score effect', () => {
  RuleConfig.reset();
  RuleConfig.disable('score.payment_bonus');
  const txs = Array.from({ length: 10 }, () => ({
    type:'Payment', risk:'Low', summary:'Sent', isSender:true, amount:'1 XRP', dest:'rA',
  }));
  const r = calculateTrustScore(txs);
  assert(r.score <= 65, 'payment_bonus should not fire when disabled');
  RuleConfig.reset();
});

test('threshold override changes score boundary', () => {
  RuleConfig.reset();
  // Crank high-risk penalty to 20 points; 1 high-risk tx should cause big drop
  RuleConfig.setThreshold('score.high_risk_penalty', 'points', 20);
  const txs = [{ type:'Payment', risk:'High', summary:'Bad tx', isSender:true, amount:'1 XRP', dest:'rX' }];
  const r = calculateTrustScore(txs);
  // 60 + 5 (payment bonus) + 5 (payment bonus) - 20 = 50 → but payment bonus checks >3 payments, so 1 payment won't earn it
  // 60 - 20 = 40; Moderate Risk
  assertEqual(r.label, 'Moderate Risk', 'increased penalty should put 1 high-risk tx into Moderate Risk');
  RuleConfig.reset();
});

// ── Demo scenario validation ──────────────────────────────────────
console.log('\nDemo Scenario Integrity');

test('demo scenario: 12 transactions produce High Risk score', () => {
  RuleConfig.reset();
  const B = 799408800;
  const suppliers = ['rSupplierA', 'rSupplierB', 'rSupplierC'];
  const txs = [];
  // Treasury receive
  txs.push({ type:'Payment', risk:'Low', summary:'Received 50000 XRP', isSender:false, account:'rTreasury', dest:'rDemo', amount:'50000 XRP', ts:794102400 });
  // April run
  suppliers.forEach((s, i) => txs.push({ type:'Payment', risk:'Low', summary:'Sent 1000 XRP', isSender:true, account:'rDemo', dest:s, amount:'1,000.00 XRP', ts:796816800 + i * 120 }));
  // May burst (authorized)
  for (let i = 0; i < 6; i++) txs.push({ type:'Payment', risk:'Low', summary:'Sent 1000 XRP', isSender:true, account:'rDemo', dest:suppliers[i % 3], amount:'1,000.00 XRP', ts:B + i * 120 });
  // Anomaly
  txs.push({ type:'Payment', risk:'High', summary:'Sent 25000 XRP', isSender:true, account:'rDemo', dest:'rUnknown', amount:'25,000.00 XRP', ts:B+720 });
  // Failed
  txs.push({ type:'Payment', risk:'High', summary:'[FAILED] Sent 50000 XRP (Result: tecUNFUNDED)', isSender:true, account:'rDemo', dest:'rSuspect', amount:'50,000.00 XRP', ts:B+840 });

  const r = calculateTrustScore(txs);
  assert(r.score < 45, 'demo scenario should produce low score due to anomalous transfers');
  assertEqual(r.stats.highRisk, 2, 'should have exactly 2 high-risk transactions');
  assertEqual(r.stats.failed,   1, 'should have exactly 1 failed transaction');
});

test('demo scenario: AGENT_001 fires on 1000 XRP to 3 suppliers', () => {
  const txs = [
    { type:'Payment', risk:'Low', summary:'', isSender:true, amount:'1,000.00 XRP', dest:'rSupplierA' },
    { type:'Payment', risk:'Low', summary:'', isSender:true, amount:'1,000.00 XRP', dest:'rSupplierB' },
    { type:'Payment', risk:'Low', summary:'', isSender:true, amount:'1,000.00 XRP', dest:'rSupplierC' },
  ];
  assert(detectIdenticalAmounts(txs), 'AGENT_001 should fire on demo supplier pattern');
});

test('demo scenario: AGENT_002 fires on May burst (8 txs in 14 minutes)', () => {
  const B = 799408800;
  const txs = Array.from({ length: 8 }, (_, i) => ({ type:'Payment', risk:'Low', summary:'', ts:B + i * 120, isSender:true, amount:'1 XRP', dest:'rA' }));
  assert(detectBurst(txs), 'AGENT_002 should fire on 8 transactions in 14 minutes');
});

test('demo automation memos match AGENT_003', () => {
  const memo = '{"payment_id":"AP-2025-004","job":"monthly_supplier_run","agent":"ap-bot-v2"}';
  assert(detectAutoMemo(memo) !== null, 'demo AP memo should trigger AGENT_003');
});

// ── Counterparty Intelligence ─────────────────────────────────────
console.log('\nCounterparty Intelligence');

// Mirror of app's shortAddr — kept in sync with index.html
function shortAddr(addr) { return !addr ? '—' : addr.slice(0, 8) + '…' + addr.slice(-6); }

// Inline detectRecurringPatterns for regression testing
function detectRecurringPatterns(counterpartyMap, translations) {
  var patterns = [];
  var minSent  = 3;   // pattern.min_tx_count default
  var payVar   = 0.1; // pattern.payroll_variance default: 10%
  var venVar   = 0.5; // pattern.vendor_variance  default: 50%
  counterpartyMap.forEach(function(cp) {
    if (cp.sentCount < minSent) return;
    var sentTxs = cp.txIndices.map(function(i) { return translations[i]; }).filter(function(t) { return t && t.isSender; });
    if (sentTxs.length < minSent) return;
    var allPay  = sentTxs.every(function(t) { return t.type === 'Payment'; });
    var amounts = sentTxs.map(function(t) { return parseFloat(t.amount.replace(/[^\d.]/g, '')); }).filter(function(n) { return !isNaN(n) && n > 0; });
    if (amounts.length < minSent) { patterns.push({ address:cp.address, count:cp.sentCount, type:'recurring' }); return; }
    var avg = amounts.reduce(function(a,b){return a+b;},0) / amounts.length;
    var maxDev = Math.max.apply(null, amounts.map(function(a){return Math.abs(a-avg)/avg;}));
    if (allPay && maxDev < payVar)      patterns.push({ address:cp.address, count:cp.sentCount, type:'regular_fixed' });
    else if (allPay && maxDev < venVar) patterns.push({ address:cp.address, count:cp.sentCount, type:'vendor' });
    else                                patterns.push({ address:cp.address, count:cp.sentCount, type:'recurring' });
  });
  return patterns;
}

// Demo addresses — kept in sync with DEMO_SUPPLIERS / DEMO_UNKNOWN / DEMO_SUSPECT in index.html
const DEMO_COUNTERPARTY_ADDRS = [
  'rTreasuryFundDemoXRPLAgent',
  'rVendorA1DemoXRPLTrustPay123',
  'rVendorB2DemoXRPLTrustPay456',
  'rVendorC3DemoXRPLTrustPay789',
  'rDemoUnknownXRPLxTrustab123',
  'rDemoSuspectXRPLxTrustab123',
];

test('demo: all counterparty shortAddr representations are unique (no visual duplicates)', () => {
  const shorts = DEMO_COUNTERPARTY_ADDRS.map(shortAddr);
  const unique  = new Set(shorts);
  const collisions = shorts.filter(function(s, i) { return shorts.indexOf(s) !== i; });
  assertEqual(unique.size, DEMO_COUNTERPARTY_ADDRS.length,
    'shortAddr collision detected: ' + collisions.join(', '));
});

test('buildCounterpartyMap: identical source data never produces duplicate address entries', () => {
  const wallet = 'rWalletTest1DemoXRPLTrustxx1';
  const dest   = 'rAliceTest1DemoXRPLTrustxx2';
  const txs = [
    { type:'Payment', risk:'Low', summary:'Sent', isSender:true, account:wallet, dest:dest, amount:'1 XRP' },
    { type:'Payment', risk:'Low', summary:'Sent', isSender:true, account:wallet, dest:dest, amount:'1 XRP' },
    { type:'Payment', risk:'Low', summary:'Sent', isSender:true, account:wallet, dest:dest, amount:'1 XRP' },
  ];
  const map     = buildCounterpartyMap(txs, wallet);
  const addrs   = map.map(function(cp) { return cp.address; });
  const unique  = new Set(addrs);
  assertEqual(unique.size, addrs.length, 'duplicate address in counterparty map');
  assertEqual(map.length, 1, '3 txs to same address should produce exactly 1 counterparty entry');
  assertEqual(map[0].sentCount, 3, 'sentCount should accumulate across all txs');
});

test('detectRecurringPatterns: one address with 3 sent txs produces exactly one pattern card', () => {
  const wallet = 'rWalletTest1DemoXRPLTrustxx1';
  const dest   = 'rAliceTest1DemoXRPLTrustxx2';
  const txs = [
    { type:'Payment', risk:'Low', summary:'Sent', isSender:true, account:wallet, dest:dest, amount:'1,000.00 XRP', ts:1000 },
    { type:'Payment', risk:'Low', summary:'Sent', isSender:true, account:wallet, dest:dest, amount:'1,000.00 XRP', ts:2000 },
    { type:'Payment', risk:'Low', summary:'Sent', isSender:true, account:wallet, dest:dest, amount:'1,000.00 XRP', ts:3000 },
  ];
  const map      = buildCounterpartyMap(txs, wallet);
  const patterns = detectRecurringPatterns(map, txs);
  const patAddrs = patterns.map(function(p) { return p.address; });
  const unique   = new Set(patAddrs);
  assertEqual(unique.size, patAddrs.length, 'duplicate pattern entry found');
  assertEqual(patterns.length, 1, 'one counterparty with 3 identical payments → exactly 1 pattern card');
  assertEqual(patterns[0].type, 'regular_fixed', 'identical amounts → regular_fixed pattern');
});

// ═══════════════════════════════════════════════════════════════════

console.log('\n' + '─'.repeat(45));
if (_fail === 0) {
  console.log(`\x1b[32m\n  All ${_pass} tests passed.\x1b[0m\n`);
} else {
  console.log(`\x1b[31m\n  ${_fail} failed\x1b[0m, ${_pass} passed.\n`);
  process.exit(1);
}
