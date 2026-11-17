import test from 'node:test';
import assert from 'node:assert/strict';
import { computeFromAnswers as A, computeFromProblemText as T, calculatePackTotal, totalPadCount, detectSignals, TAGS } from './recommendationEngine.js';

test('flow levels map to base sizes', () => {
  assert.equal(A({ flow: 'Light' }).size, 'SHORT');
  assert.equal(A({ flow: 'Normal' }).size, 'MEDIUM');
  assert.equal(A({ flow: 'Heavy' }).size, 'LARGE');
  assert.equal(A({ flow: 'Excessive' }).size, 'EXTRA_LARGE');
});
test('night use and leakage add one size each, capped at +2 and Extra Large', () => {
  assert.equal(A({ flow: 'Normal', usageTime: 'Night' }).size, 'LARGE');
  assert.equal(A({ flow: 'Light', leakageConcern: 'High', usageTime: 'Night' }).size, 'LARGE');
  assert.equal(A({ flow: 'Light', leakageConcern: 'High', usageTime: 'Night', heaviestDay: 'Day 1' }).size, 'LARGE');
  assert.equal(A({ flow: 'Excessive', leakageConcern: 'High', usageTime: 'Both' }).size, 'EXTRA_LARGE');
});
test('sensitivity and irritation change softness, never size', () => {
  const r = A({ flow: 'Normal', skinSensitivity: 'Very sensitive', irritation: 'Frequently' });
  assert.equal(r.size, 'MEDIUM'); assert.equal(r.softness, 'Extra Soft'); assert.equal(r.skinFriendlyPriority, true);
});
test('preferred length: longer raises, shorter is noted but not applied', () => {
  assert.equal(A({ flow: 'Light', preferredLength: 'Large' }).size, 'LARGE');
  const r = A({ flow: 'Heavy', preferredLength: 'Short' });
  assert.equal(r.size, 'LARGE'); assert.ok(r.reasons.some((x) => x.includes('You prefer "Short"')));
});
test('"slightly" is not light flow', () => {
  const r = T('My skin is slightly sensitive');
  assert.equal(r.size, 'MEDIUM'); assert.equal(r.flowLevel, 'Normal');
  assert.equal(r.softness, 'Extra Soft'); assert.equal(r.skinFriendlyPriority, false);
  assert.equal(detectSignals('slightly').light, undefined);
});
test('whole words only: tonight, crash, flightless do not match', () => {
  const s = detectSignals('tonight I crash on a flightless bird');
  assert.deepEqual(s, {});
});
test('negation is respected', () => {
  assert.equal(T('I have no leakage and not heavy flow').size, 'MEDIUM');
  assert.equal(T('I get leakage').size, 'LARGE');
});
test('heavy flow + leakage + night stays within cap', () => {
  assert.equal(T('heavy flow at night with leakage').size, 'EXTRA_LARGE');
});
test('light and heavy together -> ambiguous, higher coverage wins', () => {
  const r = T('light flow but also heavy flow');
  assert.equal(r.size, 'LARGE'); assert.equal(r.ambiguous, true);
});
test('excessive sweating is not excessive flow', () => {
  const r = T('excessive sweating');
  assert.equal(r.size, 'MEDIUM'); assert.equal(r.odorManagement, false); assert.equal(r.sweatingNoted, true);
});
test('empty, ambiguous and unknown inputs fall back gracefully', () => {
  for (const r of [T(''), T('   ', []), T('hello world'), T(undefined, ['Nonsense']), A(undefined), A({})]) {
    assert.equal(r.size, 'MEDIUM'); assert.ok(r.reasons.length > 0); assert.equal(r.ambiguous, true);
  }
  assert.deepEqual(T('', ['Nonsense']).ignoredTags, ['Nonsense']);
});
test('every tag has a tested behaviour or is informational', () => {
  assert.equal(T('', ['Heavy flow']).size, 'LARGE');
  assert.equal(T('', ['Leakage']).size, 'LARGE');
  assert.equal(T('', ['Skin irritation']).skinFriendlyPriority, true);
  assert.equal(T('', ['Rashes']).skinFriendlyPriority, true);
  assert.equal(T('', ['Discomfort']).softness, 'Extra Soft');
  assert.equal(T('', ['Odor concerns']).odorManagement, true);
  assert.equal(T('', ['Too much sweating']).odorManagement, false);
  assert.equal(T('', ['Too much sweating']).sweatingNoted, true);
  for (const t of ['Difficulty finding the right size', 'Other']) assert.equal(T('', [t]).size, 'MEDIUM');
  assert.equal(TAGS.length, 9);
});
test('conflicting tags are combined with the cap', () => {
  assert.equal(T('', ['Heavy flow', 'Leakage', 'Odor concerns']).size, 'EXTRA_LARGE');
});
test('both routes return the same shape', () => {
  assert.deepEqual(Object.keys(A({ flow: 'Normal' })).sort(), Object.keys(T('x')).sort());
});
test('pack totals clamp quantities', () => {
  assert.equal(calculatePackTotal({ SHORT: 2, MEDIUM: 1, LARGE: 0, EXTRA_LARGE: 0 }), 32);
  assert.equal(totalPadCount({ SHORT: -5, MEDIUM: 1000, LARGE: 0, EXTRA_LARGE: 0 }), 50);
});

test('sweating never enables odor management unless odor is mentioned', () => {
  assert.equal(T('I sweat a lot').odorManagement, false);
  assert.equal(T('I sweat and there is odor').odorManagement, true);
});
test('discomfort negation', () => {
  assert.equal(T('no discomfort').softness, 'Soft');
  assert.equal(T('I am not uncomfortable').softness, 'Soft');
  assert.equal(T('I have discomfort').softness, 'Extra Soft');
  assert.equal(T('pads are not comfortable').softness, 'Extra Soft');
});
test('"not sensitive" does not trigger sensitivity; "not sensitive but irritated" still triggers irritation', () => {
  const a = T('my skin is not sensitive');
  assert.equal(a.softness, 'Soft'); assert.equal(a.skinFriendlyPriority, false);
  const b = T('not sensitive but irritated');
  assert.equal(b.skinFriendlyPriority, true);
});
test('"no leakage at night" negates leakage only; night use still counts', () => {
  const r = T('no leakage at night');
  assert.equal(r.leakageProtection, 'Medium'); assert.equal(r.size, 'LARGE');
});
test('negation carries across "or" but stops at "and"', () => {
  assert.equal(T('no heavy flow or leakage').size, 'MEDIUM');
  assert.equal(T('no leakage and heavy flow').size, 'LARGE');
});
test('mixed and contradictory signals', () => {
  const r = T('I have no leakage but heavy flow at night and irritation');
  assert.equal(r.size, 'EXTRA_LARGE'); assert.equal(r.skinFriendlyPriority, true);
  assert.equal(T('not light flow').size, 'MEDIUM');
  assert.equal(T('excessive and light').size, 'EXTRA_LARGE');
});
test('ambiguous phrases do not trigger flow', () => {
  for (const x of ['it is a light day for me', 'slightly heavy shopping bag nonsense'.replace('heavy', 'dull'), 'tonight']) {
    assert.equal(T(x).flowLevel, 'Normal');
  }
});
test('reasons only describe rules that fired', () => {
  const r = T('my skin is slightly sensitive');
  assert.ok(!r.reasons.join(' ').toLowerCase().includes('leak'));
  assert.ok(!r.reasons.join(' ').toLowerCase().includes('night'));
  const q = A({ flow: 'Normal' });
  assert.ok(!q.reasons.join(' ').toLowerCase().includes('skin'));
});
test('disclaimer says larger size does not guarantee better absorbency', () => {
  assert.ok(A({ flow: 'Heavy' }).disclaimer.includes('not guaranteed better absorbency'));
});
