// FEMORA Recommendation Engine
// ------------------------------------------------------------
// This is a transparent, deterministic rule-based engine — NOT a trained
// AI model and NOT medical advice. It maps a user's questionnaire answers (or free-text
// problem description) onto a recommended pad configuration.
//
// Conflict rules (same for questionnaire and free text):
//   1. Flow sets the BASE size (Light=Short ... Excessive=Extra Large).
//      If free text mentions both light and heavy flow, the higher-coverage
//      base wins and the reason says so.
//   2. Adjustments (leakage, night use, early heaviest day) each add one size,
//      but the total is capped at +2 over the base and at Extra Large.
//   3. Skin sensitivity / irritation only change softness and the skin-friendly
//      flag - they never change size.
//   4. A longer preferred length raises the size; a shorter one is noted but the
//      recommendation stays, and the user can still choose it in the pack builder.
//   5. Priorities (comfort, sustainability, ...) are preferences, not needs:
//      they never raise size.
// Text is matched as whole words, negations ("no leakage") are ignored, and
// "slightly" never means "light flow". Specs and prices below are ILLUSTRATIVE
// prototype values, not validated product data.

export const PAD_SIZES = ['SHORT', 'MEDIUM', 'LARGE', 'EXTRA_LARGE'];

export const CATALOG_NOTE = 'Specifications and prices are illustrative, proposed prototype values - not validated product data. Each size tier bundles length/coverage and absorbency together: an illustrative design choice for this prototype.';
export const MAX_PER_SIZE = 50;

export const PAD_CATALOG = {
  SHORT: {
    id: 'SHORT',
    label: 'Short',
    flow: 'Low flow',
    absorbency: 'Low',
    thickness: '3 mm',
    softness: 'Soft',
    price: 10,
    tagline: 'Lightweight, comfortable for lighter days.',
  },
  MEDIUM: {
    id: 'MEDIUM',
    label: 'Medium',
    flow: 'Normal flow',
    absorbency: 'Medium',
    thickness: '4 mm',
    softness: 'Soft',
    price: 12,
    tagline: 'Everyday protection with balanced comfort and absorbency.',
  },
  LARGE: {
    id: 'LARGE',
    label: 'Large',
    flow: 'Heavy flow',
    absorbency: 'High',
    thickness: '5 mm',
    softness: 'Extra Soft',
    price: 15,
    tagline: 'Higher absorbency tier with extra coverage.',
  },
  EXTRA_LARGE: {
    id: 'EXTRA_LARGE',
    label: 'Extra Large',
    flow: 'Excessive flow',
    absorbency: 'Extra High',
    thickness: '6 mm',
    softness: 'Extra Soft',
    price: 18,
    tagline: 'Maximum coverage, designed for higher protection needs.',
  },
};

const FLOW_TO_SIZE = { Light: 'SHORT', Normal: 'MEDIUM', Heavy: 'LARGE', Excessive: 'EXTRA_LARGE' };
const SIZE_RANK = { SHORT: 0, MEDIUM: 1, LARGE: 2, EXTRA_LARGE: 3 };
const MAX_BUMPS = 2;
export const DISCLAIMER = 'This is a rule-based suggestion, not medical advice or a diagnosis, and it cannot guarantee protection from leakage or irritation. A larger size tier means more coverage, not guaranteed better absorbency or leak prevention. If you have pain, unusual bleeding or persistent irritation, please speak to a doctor.';

// Free-text signals. `phrases` match consecutive whole words; `words` match single whole words.
const SIGNALS = {
  excessive: { words: ['excessive', 'excessively', 'flooding', 'floods', 'flood'], notBefore: ['sweating', 'sweat', 'sweaty'] },
  heavy: { words: ['heavy', 'heavier', 'soaking', 'soaked'], notBefore: ['sweating', 'sweat'] },
  light: { phrases: ['light flow', 'light period', 'light periods', 'light days', 'light bleeding', 'low flow', 'flow is light', 'flow is low', 'spotting'] },
  leakage: { words: ['leak', 'leaks', 'leaking', 'leaked', 'leakage', 'stain', 'stains', 'staining', 'stained', 'overflow', 'overflows', 'overflowing'] },
  night: { words: ['night', 'nights', 'overnight', 'nighttime', 'sleep', 'sleeping'] },
  irritation: { words: ['rash', 'rashes', 'irritation', 'irritated', 'irritating', 'itch', 'itchy', 'itching', 'chafing', 'chafe'] },
  sensitive: { words: ['sensitive', 'sensitivity'] },
  odor: { words: ['odor', 'odour', 'smell', 'smells', 'smelly'] },
  sweat: { words: ['sweat', 'sweats', 'sweating', 'sweaty', 'humid'] },
  comfort: { words: ['comfort', 'comfortable', 'soft', 'softer', 'softness', 'gentle'], exemptFromNegation: true },
  discomfort: { words: ['discomfort', 'uncomfortable'] },
};
const NEGATORS = ['no', 'not', 'never', 'without', 'dont', "don't", 'doesnt', "doesn't", 'isnt', "isn't", 'barely', 'hardly'];
// Negation reaches back up to 4 words but stops at boundary words, so "no leakage at night" negates leakage only.
const BOUNDARY = ['at', 'during', 'in', 'on', 'but', 'and', 'while', 'because', 'when', 'although', 'though', 'however'];
function isNegated(t, i) {
  for (let k = i - 1; k >= Math.max(0, i - 4); k--) {
    if (NEGATORS.includes(t[k])) return true;
    if (BOUNDARY.includes(t[k])) return false;
  }
  return false;
}
const MILD = ['slightly', 'bit', 'somewhat', 'little', 'mildly'];

// Quick-select tags. `signal` tags feed the same rules as text; `info` tags are informational only.
export const TAG_DEFS = {
  'Heavy flow': { signal: 'heavy' },
  'Leakage': { signal: 'leakage' },
  'Skin irritation': { signal: 'irritation' },
  'Rashes': { signal: 'irritation' },
  'Discomfort': { signal: 'comfort' },
  'Odor concerns': { signal: 'odor' },
  'Too much sweating': { signal: 'sweat' },
  'Difficulty finding the right size': { info: 'Unsure about size → starting from a balanced Medium; compare sizes in the pack builder.' },
  'Other': { info: 'Tag "Other" is informational only - describe it in the text box so it is saved with your notes.' },
};
export const TAGS = Object.keys(TAG_DEFS);

export function tokenize(text) {
  return String(text || '').toLowerCase().replace(/[\u2019]/g, "'").match(/[a-z']+/g) || [];
}

// Returns { signal: { found: bool, mild: bool } } for non-negated whole-word matches.
export function detectSignals(text) {
  const t = tokenize(text);
  const out = {};
  for (const [key, def] of Object.entries(SIGNALS)) {
    for (let i = 0; i < t.length; i++) {
      let len = 0;
      if (def.words?.includes(t[i])) len = 1;
      else if (def.phrases) {
        const p = def.phrases.find((ph) => ph.split(' ').every((w, k) => t[i + k] === w));
        if (p) len = p.split(' ').length;
      }
      if (!len) continue;
      if (def.notBefore?.includes(t[i + len])) continue;
      if (!def.exemptFromNegation && isNegated(t, i)) continue;
      out[key] = { found: true, mild: key === 'sensitive' && MILD.includes(t[i - 1]) };
      break;
    }
  }
  return out;
}

function newDraft(source, note) {
  return { base: 'MEDIUM', bumps: [], reasons: [], softness: 'Soft', leakage: 'Medium', skinPriority: false, odor: false, source, note: note || '', ambiguous: false, flowLevel: 'Normal', priorities: [], sweat: false };
}
const bump = (d, reason) => { d.bumps.push(reason); };

function finish(d, preferredLength) {
  const applied = Math.min(d.bumps.length, MAX_BUMPS);
  let rank = Math.min(3, SIZE_RANK[d.base] + applied);
  d.bumps.forEach((r) => d.reasons.push(r));
  if (d.bumps.length > MAX_BUMPS) d.reasons.push(`Coverage increases are capped at ${MAX_BUMPS} sizes above your base size, so some of the factors above are not stacked further.`);
  if (SIZE_RANK[d.base] + applied > 3) d.reasons.push('Extra Large is the largest size tier, so some increases could not be applied.');
  const lengthMap = { Short: 0, Medium: 1, Large: 2, 'Extra Large': 3 };
  if (preferredLength in lengthMap) {
    const pr = lengthMap[preferredLength];
    if (pr > rank) { rank = pr; d.reasons.push(`Preferred length "${preferredLength}" is longer than the computed size, so it was used.`); }
    else if (pr < rank) d.reasons.push(`You prefer "${preferredLength}", but your answers suggest ${PAD_CATALOG[PAD_SIZES[rank]].label} coverage. You can still choose any size in the pack builder.`);
  }
  const size = PAD_SIZES[rank];
  return {
    size, flowLevel: d.flowLevel,
    absorbency: ['Low', 'Medium', 'High', 'Extra High'][rank],
    thickness: PAD_CATALOG[size].thickness,
    softness: d.softness, leakageProtection: d.leakage,
    skinFriendlyPriority: d.skinPriority, odorManagement: d.odor, sweatingNoted: d.sweat,
    material: 'Biodegradable material (proposed; to be validated)',
    priorities: d.priorities, reasons: d.reasons, source: d.source, note: d.note,
    ambiguous: d.ambiguous, ignoredTags: d.ignoredTags || [], disclaimer: DISCLAIMER,
  };
}

function applySkin(d, level, label) {
  if (level === 'strong') { d.skinPriority = true; d.softness = 'Extra Soft'; d.reasons.push(`${label} → skin-comfort priority highlighted and Extra Soft selected (size is not changed).`); }
  else if (level === 'mild') { d.softness = 'Extra Soft'; d.reasons.push(`${label} → Extra Soft selected (size is not changed).`); }
}

/** Questionnaire route. Unknown / missing answers are ignored. */
export function computeFromAnswers(a) {
  a = a || {};
  const d = newDraft('questionnaire', a.notes);
  if (FLOW_TO_SIZE[a.flow]) {
    d.base = FLOW_TO_SIZE[a.flow]; d.flowLevel = a.flow;
    d.reasons.push(`Usual flow "${a.flow}" → base size ${PAD_CATALOG[d.base].label}.`);
  } else { d.ambiguous = true; d.reasons.push('Flow was not answered → starting from a balanced Medium size.'); }

  if ((a.heaviestDay === 'Day 1' || a.heaviestDay === 'Day 2') && (a.flow === 'Heavy' || a.flow === 'Excessive')) bump(d, 'Heaviest flow lands early with heavy flow → +1 size.');
  if (a.usageTime === 'Night' || a.usageTime === 'Both') bump(d, 'Night-time use → +1 size for longer coverage.');
  if (a.leakageConcern === 'High') { d.leakage = 'Maximum'; bump(d, 'High leakage concern → +1 size and the highest leakage-protection priority (more coverage, not a guarantee against leaks).'); }
  else if (a.leakageConcern === 'Moderate') { d.leakage = 'High'; d.reasons.push('Moderate leakage concern → higher leakage-protection priority (size is not changed).'); }

  if (a.skinSensitivity === 'Very sensitive') applySkin(d, 'strong', 'Very sensitive skin');
  else if (a.skinSensitivity === 'Slightly sensitive') applySkin(d, 'mild', 'Slightly sensitive skin');
  if (a.irritation === 'Frequently') applySkin(d, 'strong', 'Frequent irritation or rashes');
  else if (a.irritation === 'Sometimes' && d.softness === 'Soft') applySkin(d, 'mild', 'Occasional irritation');
  if (a.comfortImportance === 'Very important' && d.softness === 'Soft') { d.softness = 'Extra Soft'; d.reasons.push('Comfort is very important → Extra Soft selected.'); }
  if (a.odorConcern === 'Yes' || a.odorConcern === 'Sometimes') { d.odor = true; d.reasons.push('Odor concern → odor-management option noted.'); }

  const pr = Array.isArray(a.priorities) ? a.priorities : [];
  d.priorities = pr;
  if (pr.includes('Skin-friendliness') && !d.skinPriority) { d.skinPriority = true; d.reasons.push('Skin-friendliness chosen as a priority → skin-comfort priority highlighted.'); }
  if (pr.includes('Comfort') && d.softness === 'Soft') { d.softness = 'Extra Soft'; d.reasons.push('Comfort chosen as a priority → Extra Soft selected.'); }
  if (pr.includes('Leakage protection') && d.leakage === 'Medium') { d.leakage = 'High'; d.reasons.push('Leakage protection chosen as a priority → higher leakage-protection priority (size is not changed).'); }
  return finish(d, a.preferredLength);
}

/** Free-text route. Whole-word matching; tags use explicit rules; unknown tags are reported. */
export function computeFromProblemText(text, tags = []) {
  const d = newDraft('problem-text', text);
  const sig = detectSignals(text);
  d.ignoredTags = [];
  (Array.isArray(tags) ? tags : []).forEach((tag) => {
    const def = TAG_DEFS[tag];
    if (!def) { d.ignoredTags.push(tag); return; }
    if (def.signal) { sig[def.signal] = { ...sig[def.signal], found: true }; }
    else d.reasons.push(def.info);
  });

  const exc = sig.excessive?.found, hv = sig.heavy?.found, lt = sig.light?.found;
  if (exc) { d.base = 'EXTRA_LARGE'; d.flowLevel = 'Excessive'; d.reasons.push('Mentioned excessive flow → Extra Large base size.'); }
  else if (hv) { d.base = 'LARGE'; d.flowLevel = 'Heavy'; d.reasons.push('Mentioned heavy flow → Large base size.'); }
  else if (lt) { d.base = 'SHORT'; d.flowLevel = 'Light'; d.reasons.push('Mentioned light flow → Short base size.'); }
  if (lt && (exc || hv)) { d.ambiguous = true; d.reasons.push('You mentioned both light and heavy flow → the higher-coverage base was used. Adjust it in the pack builder if needed.'); }
  if (!exc && !hv && !lt) d.reasons.push('No flow stated → assumed Normal (Medium) as a starting point.');

  if (sig.leakage?.found) { d.leakage = 'Maximum'; bump(d, 'Mentioned leakage → +1 size and the highest leakage-protection priority (more coverage, not a guarantee against leaks).'); }
  if (sig.night?.found) bump(d, 'Mentioned night-time use → +1 size for longer coverage.');
  if (sig.irritation?.found) applySkin(d, 'strong', 'Mentioned irritation or rashes');
  if (sig.sensitive?.found) applySkin(d, sig.sensitive.mild ? 'mild' : 'strong', 'Mentioned sensitive skin');
  if ((sig.comfort?.found || sig.discomfort?.found) && d.softness === 'Soft') { d.softness = 'Extra Soft'; d.reasons.push(sig.discomfort?.found ? 'Mentioned discomfort → Extra Soft selected.' : 'Mentioned comfort or softness → Extra Soft selected.'); }
  if (sig.odor?.found) { d.odor = true; d.reasons.push('Mentioned odor → odor-management option noted.'); }
  if (sig.sweat?.found) { d.sweat = true; d.reasons.push('Mentioned sweating → noted, but this prototype defines no sweating-specific product feature, so nothing was changed.'); }

  const signalsUsed = Object.values(sig).some((v) => v?.found);
  if (!signalsUsed) { d.ambiguous = true; d.reasons.unshift('We could not find specific needs in your description → showing a balanced Medium configuration. Try the questionnaire for a more tailored result.'); }
  return finish(d);
}

export function recommendedQuantities(recommendation) {
  // Suggest a starter quantity weighted toward the recommended size.
  const base = { SHORT: 0, MEDIUM: 0, LARGE: 0, EXTRA_LARGE: 0 };
  base[recommendation.size] = 10;
  return base;
}

const qty = (pack, size) => Math.min(MAX_PER_SIZE, Math.max(0, Math.floor(Number(pack?.[size]) || 0)));

export function calculatePackTotal(pack) {
  return PAD_SIZES.reduce((sum, size) => sum + qty(pack, size) * PAD_CATALOG[size].price, 0);
}

export function totalPadCount(pack) {
  return PAD_SIZES.reduce((sum, size) => sum + qty(pack, size), 0);
}
