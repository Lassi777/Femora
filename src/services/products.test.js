import test from 'node:test';
import assert from 'node:assert/strict';
import { recommendProduct as R, CATALOG, getVariation, isValidVariation, validatePack, packTotals, defaultPack, isValidRecommendation, vizFor, PRODUCT_TYPE_IDS } from './products.js';
import { computeFromAnswers, PAD_CATALOG } from './recommendationEngine.js';
import { PRODUCT_TYPES } from '../config.js';

const A = { flow: 'Normal' };
test('catalog covers every selectable product type in config (except "unsure")', () => {
  const ids = PRODUCT_TYPES.map((t) => t.id).filter((i) => i !== 'unsure');
  assert.deepEqual([...ids].sort(), [...PRODUCT_TYPE_IDS].sort());
});
test('each product type returns only compatible variations and a matching viz', () => {
  for (const type of PRODUCT_TYPE_IDS) for (const flow of ['Light', 'Normal', 'Heavy', 'Excessive', undefined]) {
    const r = R({ productType: type, path: 'questionnaire', answers: { flow } });
    assert.equal(r.productType, type);
    assert.ok(isValidVariation(type, r.variationId));
    assert.ok(r.alternatives.every((id) => isValidVariation(type, id)));
    assert.equal(vizFor(type, r.variationId).kind, type);
    assert.ok(r.reasons.length > 0);
  }
});
test('pads keep the existing pad-size behaviour', () => {
  assert.equal(R({ productType: 'pads', path: 'questionnaire', answers: { flow: 'Heavy' } }).variationId, 'LARGE');
  assert.equal(R({ productType: 'pads', path: 'questionnaire', answers: { flow: 'Heavy' } }).variationId, computeFromAnswers({ flow: 'Heavy' }).size);
  assert.equal(R({ productType: 'pads', path: 'problem', problemText: 'my skin is slightly sensitive' }).variationId, 'MEDIUM');
});
test('tampons: regular / super / super plus follow flow, never pads', () => {
  const t = (flow, x = {}) => R({ productType: 'tampons', path: 'questionnaire', answers: { flow, ...x } }).variationId;
  assert.equal(t('Normal'), 'TAMPON_REGULAR'); assert.equal(t('Heavy'), 'TAMPON_SUPER'); assert.equal(t('Excessive'), 'TAMPON_SUPER_PLUS');
  assert.equal(t('Normal', { leakageConcern: 'High' }), 'TAMPON_SUPER');
});
test('cups and underwear rules', () => {
  const c = (flow) => R({ productType: 'cups', path: 'questionnaire', answers: { flow } }).variationId;
  assert.deepEqual(['Light', 'Normal', 'Heavy'].map(c), ['CUP_SMALL', 'CUP_MEDIUM', 'CUP_LARGE']);
  const u = (a) => R({ productType: 'underwear', path: 'questionnaire', answers: a }).variationId;
  assert.equal(u({ flow: 'Light' }), 'UW_LIGHT'); assert.equal(u({ flow: 'Normal' }), 'UW_MODERATE'); assert.equal(u({ flow: 'Heavy' }), 'UW_HEAVY');
  assert.equal(u({ flow: 'Normal', usageTime: 'Night' }), 'UW_OVERNIGHT'); assert.equal(u({ flow: 'Light', usageTime: 'Night' }), 'UW_MODERATE');
});
test('free-text route works for non-pad products and mentions only rules that fired', () => {
  const r = R({ productType: 'tampons', path: 'problem', problemText: 'heavy flow', problemTags: [] });
  assert.equal(r.variationId, 'TAMPON_SUPER');
  assert.ok(!r.reasons.join(' ').toLowerCase().includes('night'));
});
test('invalid / unsure product types are rejected safely', () => {
  for (const t of ['unsure', 'bogus', undefined, null, '__proto__']) assert.equal(R({ productType: t, path: 'questionnaire', answers: A }), null);
  assert.equal(getVariation('__proto__'), null); assert.equal(getVariation('constructor'), null);
});
test('a stale recommendation from another product type is not valid', () => {
  const pad = R({ productType: 'pads', path: 'questionnaire', answers: A });
  assert.equal(isValidRecommendation(pad, 'pads'), true);
  for (const t of ['tampons', 'cups', 'underwear']) assert.equal(isValidRecommendation(pad, t), false);
  assert.equal(isValidRecommendation(null, 'pads'), false);
  assert.equal(isValidRecommendation({ productType: 'pads', variationId: 'CUP_SMALL' }, 'pads'), false);
});
test('prices and totals come from the catalogue', () => {
  assert.deepEqual(packTotals({ TAMPON_REGULAR: 2, TAMPON_SUPER: 1 }), { count: 3, total: 26 });
  assert.deepEqual(packTotals({ MEDIUM: 10 }), { count: 10, total: 10 * PAD_CATALOG.MEDIUM.price });
  assert.deepEqual(packTotals({ CUP_MEDIUM: 1, UW_LIGHT: 2 }), { count: 3, total: 1498 });
  for (const list of Object.values(CATALOG)) for (const x of list) assert.ok(x.price > 0 && x.id && x.name);
});
test('validatePack rejects wrong type, unknown ids and bad quantities', () => {
  assert.equal(validatePack('cups', { CUP_SMALL: 1 }).ok, true);
  assert.equal(validatePack('cups', { MEDIUM: 1 }).ok, false);
  assert.equal(validatePack('cups', { CUP_SMALL: 0 }).ok, false);
  assert.equal(validatePack('cups', { CUP_SMALL: 2.5 }).ok, false);
  assert.equal(validatePack('cups', { CUP_SMALL: 51 }).ok, false);
  assert.equal(validatePack('unsure', { CUP_SMALL: 1 }).ok, false);
});
test('default pack uses the recommended variation of the same type', () => {
  for (const type of PRODUCT_TYPE_IDS) {
    const rec = R({ productType: type, path: 'questionnaire', answers: A });
    const p = defaultPack(rec);
    assert.equal(validatePack(type, p).ok, true);
  }
});
