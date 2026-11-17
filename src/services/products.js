// Central product catalogue + product-specific recommendation + trusted pack/price helpers.
// All prices and variations are PROPOSED PROTOTYPE CONCEPTS, not validated products.
import {
  PAD_CATALOG, PAD_SIZES, MAX_PER_SIZE, DISCLAIMER, TAG_DEFS,
  computeFromAnswers, computeFromProblemText, detectSignals,
} from './recommendationEngine.js';

export const MAX_QTY = MAX_PER_SIZE;
export const CONCEPT_NOTE = 'All products, variations and prices are proposed prototype concepts, not validated or available products.';
export const GENERIC_DISCLAIMER = `${CONCEPT_NOTE} Suggestions come from simple rules, are not medical advice, and cannot guarantee protection from leakage or irritation. If you have pain, unusual bleeding or persistent irritation, please speak to a doctor.`;

const v = (id, type, tier, name, price, desc, specs) => ({ id, type, tier, name, price, desc, specs, viz: { kind: type, tier } });

export const TYPE_META = {
  pads: { label: 'Sanitary pads', unit: 'pad', plural: 'pads', defaultQty: 10, material: 'Biodegradable goal (not yet verified)' },
  tampons: { label: 'Tampons', unit: 'tampon', plural: 'tampons', defaultQty: 10, material: 'Biodegradable goal (not yet verified)' },
  cups: { label: 'Menstrual cups', unit: 'cup', plural: 'cups', defaultQty: 1, material: 'Material to be confirmed' },
  underwear: { label: 'Period underwear', unit: 'pair', plural: 'pairs', defaultQty: 2, material: 'Fabric to be confirmed' },
};

export const CATALOG = {
  pads: PAD_SIZES.map((id, i) => v(id, 'pads', i, PAD_CATALOG[id].label, PAD_CATALOG[id].price, PAD_CATALOG[id].tagline, [
    ['Flow', PAD_CATALOG[id].flow], ['Absorbency tier', PAD_CATALOG[id].absorbency], ['Thickness', PAD_CATALOG[id].thickness], ['Softness', PAD_CATALOG[id].softness],
  ])),
  tampons: [
    v('TAMPON_REGULAR', 'tampons', 0, 'Regular', 8, 'For lighter to normal flow days.', [['Absorbency category', 'Regular'], ['Design concept', 'Cotton-style body with withdrawal string']]),
    v('TAMPON_SUPER', 'tampons', 1, 'Super', 10, 'For heavier flow days.', [['Absorbency category', 'Super'], ['Design concept', 'Cotton-style body with withdrawal string']]),
    v('TAMPON_SUPER_PLUS', 'tampons', 2, 'Super Plus', 12, 'For the heaviest flow days.', [['Absorbency category', 'Super Plus'], ['Design concept', 'Cotton-style body with withdrawal string']]),
  ],
  cups: [
    v('CUP_SMALL', 'cups', 0, 'Small', 450, 'Smaller-capacity concept, a starting point for lighter flow.', [['Capacity category', 'Smaller'], ['Design concept', 'Flexible cup with stem']]),
    v('CUP_MEDIUM', 'cups', 1, 'Medium', 500, 'Standard-capacity concept for normal flow.', [['Capacity category', 'Standard'], ['Design concept', 'Flexible cup with stem']]),
    v('CUP_LARGE', 'cups', 2, 'Large', 550, 'Higher-capacity concept for heavier flow.', [['Capacity category', 'Higher'], ['Design concept', 'Flexible cup with stem']]),
  ],
  underwear: [
    v('UW_LIGHT', 'underwear', 0, 'Light absorbency', 499, 'For lighter days, spotting or backup.', [['Absorbency tier', 'Light'], ['Coverage', 'Standard gusset']]),
    v('UW_MODERATE', 'underwear', 1, 'Moderate absorbency', 599, 'For normal flow days.', [['Absorbency tier', 'Moderate'], ['Coverage', 'Standard gusset']]),
    v('UW_HEAVY', 'underwear', 2, 'Heavy absorbency', 699, 'For heavier flow days.', [['Absorbency tier', 'Heavy'], ['Coverage', 'Wider gusset']]),
    v('UW_OVERNIGHT', 'underwear', 3, 'Overnight coverage', 749, 'Extended back coverage for night-time use.', [['Absorbency tier', 'Heavy'], ['Coverage', 'Extended back gusset']]),
  ],
};

export const PRODUCT_TYPE_IDS = Object.keys(CATALOG);
const BY_ID = Object.fromEntries(Object.values(CATALOG).flat().map((x) => [x.id, x]));
export const isProductType = (t) => PRODUCT_TYPE_IDS.includes(t);
export const variationsOf = (t) => CATALOG[t] || [];
export const getVariation = (id) => (Object.prototype.hasOwnProperty.call(BY_ID, id) ? BY_ID[id] : null);
export const isValidVariation = (type, id) => getVariation(id)?.type === type;
export const unitLabel = (type, n) => { const m = TYPE_META[type]; return m ? (n === 1 ? m.unit : m.plural) : 'items'; };

/* ---------- Trusted pack helpers (prices always come from the catalogue) ---------- */
const clampQty = (q) => { const n = Math.floor(Number(q)); return Number.isFinite(n) ? Math.min(MAX_QTY, Math.max(0, n)) : 0; };
export function packLines(pack) {
  if (!pack || typeof pack !== 'object') return [];
  return Object.keys(pack).map((id) => ({ id, item: getVariation(id), qty: clampQty(pack[id]) }))
    .filter((l) => l.item && l.qty > 0)
    .map((l) => ({ id: l.id, type: l.item.type, name: l.item.name, qty: l.qty, price: l.item.price, subtotal: l.qty * l.item.price }));
}
export const packTotals = (pack) => packLines(pack).reduce((t, l) => ({ count: t.count + l.qty, total: t.total + l.subtotal }), { count: 0, total: 0 });
export const packBelongsTo = (type, pack) => packLines(pack).every((l) => l.type === type);

export function validatePack(type, pack) {
  if (!isProductType(type)) return { ok: false, error: 'Please choose a product type first.' };
  if (!pack || typeof pack !== 'object') return { ok: false, error: 'Your pack is empty.' };
  for (const id of Object.keys(pack)) {
    const q = Number(pack[id]);
    if (!isValidVariation(type, id) && q > 0) return { ok: false, error: 'Your pack contains an item that does not match your product type.' };
    if (!Number.isInteger(q) || q < 0 || q > MAX_QTY) return { ok: false, error: `Quantities must be whole numbers from 0 to ${MAX_QTY}.` };
  }
  const lines = packLines(pack);
  if (!lines.length) return { ok: false, error: 'Add at least one item to your pack.' };
  const { count, total } = packTotals(pack);
  return { ok: true, lines, count, total, pack: Object.fromEntries(lines.map((l) => [l.id, l.qty])) };
}
export const defaultPack = (rec) => (rec && getVariation(rec.variationId) ? { [rec.variationId]: TYPE_META[rec.productType].defaultQty } : {});

/* ---------- Recommendation ---------- */
function collectFlags(path, a, text, tags) {
  if (path === 'problem') {
    const sig = detectSignals(text);
    (Array.isArray(tags) ? tags : []).forEach((t) => { const s = TAG_DEFS[t]?.signal; if (s) sig[s] = { ...sig[s], found: true }; });
    const hi = sig.excessive?.found ? 'Excessive' : sig.heavy?.found ? 'Heavy' : sig.light?.found ? 'Light' : null;
    return { flow: hi, night: !!sig.night?.found, leak: !!sig.leakage?.found, soft: !!(sig.irritation?.found || sig.sensitive?.found || sig.discomfort?.found), src: 'what you described' };
  }
  const x = a || {};
  return {
    flow: ['Light', 'Normal', 'Heavy', 'Excessive'].includes(x.flow) ? x.flow : null,
    night: x.usageTime === 'Night' || x.usageTime === 'Both',
    leak: x.leakageConcern === 'High',
    soft: ['Very sensitive', 'Slightly sensitive'].includes(x.skinSensitivity) || ['Frequently', 'Sometimes'].includes(x.irritation),
    src: 'your answers',
  };
}

const FLOW_IDX = { tampons: { Light: 0, Normal: 0, Heavy: 1, Excessive: 2 }, cups: { Light: 0, Normal: 1, Heavy: 2, Excessive: 2 }, underwear: { Light: 0, Normal: 1, Heavy: 2, Excessive: 2 } };
const FLOW_DEFAULT = { tampons: 0, cups: 1, underwear: 1 };

function recommendOther(type, f, path, text) {
  const list = variationsOf(type);
  const reasons = [];
  let idx;
  if (f.flow) { idx = FLOW_IDX[type][f.flow]; reasons.push(`Flow "${f.flow}" from ${f.src} → starting point: ${list[idx].name}.`); }
  else { idx = FLOW_DEFAULT[type]; reasons.push(`No flow stated → starting from ${list[idx].name} as a neutral default.`); }
  const maxBump = type === 'underwear' ? 2 : list.length - 1;
  if (f.leak) {
    const next = Math.min(idx + 1, maxBump);
    reasons.push(next > idx ? `High leakage concern → one step up to ${list[next].name}.` : `High leakage concern noted, but ${list[idx].name} is already the highest step this rule reaches.`);
    idx = next;
  }
  if (type === 'underwear' && f.night) {
    const night = idx >= 1 ? 3 : 1;
    reasons.push(night === 3 ? 'Night-time use → Overnight coverage (extended back).' : 'Night-time use with a light flow → at least Moderate absorbency.');
    idx = Math.max(idx, night);
  } else if (type === 'tampons' && f.night) reasons.push("Night-time use noted. This doesn't change the variation; always follow the product's usage instructions, including maximum wear time.");
  if (type === 'cups') reasons.push('Cup fit varies from person to person, so this size is only a starting point.');
  if (f.soft) reasons.push('Skin sensitivity or irritation mentioned → a soft-contact material preference is noted (size is not changed; materials are not yet validated).');
  const variation = list[idx];
  const m = TYPE_META[type];
  return {
    productType: type, variationId: variation.id, variation, alternatives: list.map((x) => x.id), reasons,
    ambiguous: !f.flow, source: path === 'problem' ? 'problem-text' : 'questionnaire', note: text || '',
    flowLevel: f.flow || 'Not specified', disclaimer: GENERIC_DISCLAIMER,
    attributes: [['Product type', m.label], ['Suggested variation', variation.name], ['Flow level', f.flow || 'Not specified'], ...variation.specs, ['Skin-comfort priority', f.soft ? 'Yes' : 'Standard'], ['Materials', m.material]],
  };
}

export function recommendProduct({ productType, path, answers, problemText, problemTags } = {}) {
  if (!isProductType(productType)) return null;
  if (productType === 'pads') {
    const r = path === 'problem' ? computeFromProblemText(problemText || '', problemTags || []) : computeFromAnswers(answers || {});
    const variation = getVariation(r.size);
    return {
      ...r, productType: 'pads', variationId: r.size, variation, alternatives: [...PAD_SIZES], disclaimer: `${CONCEPT_NOTE} ${DISCLAIMER}`,
      attributes: [['Product type', 'Sanitary pads'], ['Suggested variation', variation.name], ['Flow level', r.flowLevel], ['Absorbency tier (illustrative)', r.absorbency], ['Thickness', r.thickness], ['Softness', r.softness],
        ['Leakage-protection priority', r.leakageProtection], ['Skin-comfort priority', r.skinFriendlyPriority ? 'Yes' : 'Standard'], ['Odor-control option', r.odorManagement ? 'Noted' : 'Standard'], ['Materials', TYPE_META.pads.material]],
    };
  }
  return recommendOther(productType, collectFlags(path, answers, problemText, problemTags), path, problemText);
}

/** A stored/passed recommendation is only usable if it matches the chosen product type and a real variation. */
export const isValidRecommendation = (rec, productType) => Boolean(rec && rec.productType === productType && isValidVariation(productType, rec.variationId));

// Catalogue labels for visualisation + display of which model to show
export const vizFor = (type, variationId) => { const x = getVariation(variationId); return x && x.type === type ? x.viz : { kind: type, tier: 0 }; };
