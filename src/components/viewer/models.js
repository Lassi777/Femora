// Procedural 3D product models (original geometry, no external assets). Pure three.js, no DOM.
import * as THREE from 'three';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const COLORS = { paper: 0xfbf7ef, core: 0xf3cfd3, coreDeep: 0xe7aab5, sage: 0xcfdcc9, sageDeep: 0x6e8f63, berry: 0xb4365b, cream: 0xf4ecdd, blush: 0xf1c9cc, ink: 0x23302a };

const fabric = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.82, metalness: 0, sheen: 1, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xffffff), ...extra });
const smooth = (g) => toCreasedNormals(g, 0.9);

function extrude(shape, depth, bevel = 0.03, curveSteps = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: curveSteps });
  return smooth(g);
}
// Parts stay flat (long thin triangles would facet if bent); the viewer's camera and tilt provide the depth.
const bend = (g) => g;

/* ---------- Pad: contoured body, absorbent core, layered edge, curved wings ---------- */
function padOutline(L, W, waist) {
  const hl = L / 2, hw = W / 2, hn = hw * waist; // hn: half-width at the waist
  const s = new THREE.Shape();
  s.moveTo(0, hl);
  s.bezierCurveTo(hw * 0.9, hl, hw, hl * 0.7, hw, hl * 0.4);
  s.bezierCurveTo(hw, hl * 0.18, hn, hl * 0.12, hn, 0);
  s.bezierCurveTo(hn, -hl * 0.12, hw, -hl * 0.18, hw, -hl * 0.4);
  s.bezierCurveTo(hw, -hl * 0.7, hw * 0.9, -hl, 0, -hl);
  s.bezierCurveTo(-hw * 0.9, -hl, -hw, -hl * 0.7, -hw, -hl * 0.4);
  s.bezierCurveTo(-hw, -hl * 0.18, -hn, -hl * 0.12, -hn, 0);
  s.bezierCurveTo(-hn, hl * 0.12, -hw, hl * 0.18, -hw, hl * 0.4);
  s.bezierCurveTo(-hw, hl * 0.7, -hw * 0.9, hl, 0, hl);
  return s;
}
function wingShape(side, hl) {
  const s = new THREE.Shape(); const x0 = 0, x1 = side * 0.62, y = hl * 0.26;
  s.moveTo(x0, y); s.bezierCurveTo(x1 * 0.5, y * 1.15, x1, y * 1.05, x1, y * 0.5);
  s.bezierCurveTo(x1, -y * 0.5, x1 * 0.5, -y * 1.1, x0, -y); s.lineTo(x0, y);
  return s;
}
export function buildPad(tier = 1) {
  const L = 3.0 + tier * 0.5, W = 1.05 + tier * 0.04, g = new THREE.Group();
  const back = new THREE.Mesh(bend(extrude(padOutline(L, W, 0.86), 0.05, 0.04), 0, 0.012), fabric(COLORS.sage));
  const body = new THREE.Mesh(bend(extrude(padOutline(L * 0.98, W * 0.98, 0.86), 0.09 + tier * 0.012, 0.05), 0, 0.012), fabric(COLORS.paper));
  body.position.z = 0.07;
  const core = new THREE.Mesh(bend(extrude(padOutline(L * 0.72, W * 0.5, 0.8), 0.05, 0.03), 0, 0.012), fabric(COLORS.core, { roughness: 0.9 }));
  core.position.z = 0.19 + tier * 0.012;
  // Channel line around the core
  const ring = padOutline(L * 0.82, W * 0.62, 0.8); ring.holes.push(new THREE.Path(padOutline(L * 0.8, W * 0.6, 0.8).getPoints(48).reverse()));
  const channel = new THREE.Mesh(bend(new THREE.ExtrudeGeometry(ring, { depth: 0.012, bevelEnabled: false, curveSegments: 32 }), 0, 0.012), fabric(COLORS.coreDeep));
  channel.position.z = 0.185 + tier * 0.012;
  g.add(back, body, core, channel);
  for (const side of [1, -1]) {
    const wing = new THREE.Mesh(extrude(wingShape(side, L / 2), 0.05, 0.03), fabric(COLORS.paper));
    wing.position.set(side * (W * 0.86 * 0.5 - 0.02), 0, 0.07);
    wing.rotation.y = side * -0.5; // folds up like a real wing
    g.add(wing);
  }
  g.rotation.x = -Math.PI / 2; // lie flat, top face up
  return wrap(g, 'ground');
}

/* ---------- Tampon: ridged cotton-style body, rounded tip, withdrawal string ---------- */
export function buildTampon(tier = 0) {
  const r = 0.34 + tier * 0.04, L = 2.3 + tier * 0.12, pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const t = i / N, y = t * L;
    let rad;
    if (t > 0.9) rad = r * Math.sqrt(Math.max(0, 1 - ((t - 0.9) / 0.1) ** 2)); // rounded tip
    else if (t < 0.06) rad = r * (0.7 + 0.3 * Math.sin((t / 0.06) * Math.PI / 2)); // softly rounded base
    else rad = r * (1 + 0.035 * Math.sin(t * 60)); // compression ridges
    pts.push(new THREE.Vector2(Math.max(rad, 0.001), y));
  }
  const body = new THREE.Mesh(toCreasedNormals(new THREE.LatheGeometry(pts, 64), 1.2), fabric(COLORS.cream, { roughness: 0.95 }));
  const g = new THREE.Group(); g.add(body);
  const stringCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.02, 0), new THREE.Vector3(0.02, -0.3, 0.05), new THREE.Vector3(0.18, -0.65, 0.22), new THREE.Vector3(0.05, -1.0, 0.4), new THREE.Vector3(-0.15, -1.3, 0.3)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(stringCurve, 48, 0.022, 8), fabric(COLORS.paper, { roughness: 0.7 })));
  g.rotation.z = Math.PI / 2 - 0.1; g.rotation.y = 0.35; // lies on its side
  return wrap(g, 'ground');
}

/* ---------- Menstrual cup: tapered hollow bell, visible rim, stem ---------- */
export function buildCup(tier = 1) {
  const s = [0.88, 1, 1.12][tier] || 1, o = [];
  const outer = [[0.001, 0], [0.16, 0.03], [0.36, 0.24], [0.54, 0.66], [0.62, 1.08], [0.64, 1.36]];
  const rim = [[0.63, 1.41], [0.6, 1.435], [0.56, 1.41]];
  const inner = [[0.55, 1.34], [0.52, 1.06], [0.44, 0.66], [0.28, 0.3], [0.1, 0.15], [0.001, 0.12]];
  [...outer, ...rim, ...inner].forEach(([x, y]) => o.push(new THREE.Vector2(x * s, y * s)));
  const mat = new THREE.MeshPhysicalMaterial({ color: COLORS.blush, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.25, transparent: true, opacity: 0.93, side: THREE.DoubleSide });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(toCreasedNormals(new THREE.LatheGeometry(o, 72), 1.1), mat));
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.6 * s, 0.032 * s, 16, 72), new THREE.MeshPhysicalMaterial({ color: COLORS.coreDeep, roughness: 0.3, clearcoat: 0.8 }));
  rimRing.rotation.x = Math.PI / 2; rimRing.position.y = 1.4 * s; g.add(rimRing);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * s, 0.06 * s, 0.55 * s, 24), mat);
  stem.position.y = -0.27 * s; g.add(stem);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.075 * s, 24, 16), mat); ball.position.y = -0.56 * s; g.add(ball);
  g.rotation.x = 0.55; g.rotation.z = -0.25;
  return wrap(g, 'float');
}

/* ---------- Period underwear: brief silhouette, ribbed waistband, defined absorbent gusset ---------- */
function briefShape() {
  const s = new THREE.Shape();
  s.moveTo(-1.25, 1.0); s.lineTo(1.25, 1.0);
  s.bezierCurveTo(1.3, 0.6, 1.2, 0.2, 0.95, -0.05);
  s.bezierCurveTo(0.7, -0.3, 0.38, -0.5, 0.3, -0.78);
  s.lineTo(-0.3, -0.78);
  s.bezierCurveTo(-0.38, -0.5, -0.7, -0.3, -0.95, -0.05);
  s.bezierCurveTo(-1.2, 0.2, -1.3, 0.6, -1.25, 1.0);
  return s;
}
function gussetShape(len, w) {
  const s = new THREE.Shape(), top = 0.55 + len * 0.4, bot = -0.74, n = 0.26;
  s.moveTo(-n, bot); s.lineTo(n, bot);
  s.bezierCurveTo(n + 0.1, -0.4, w, -0.2, w, 0.1);
  s.bezierCurveTo(w, top * 0.6, w * 0.7, top, 0, top);
  s.bezierCurveTo(-w * 0.7, top, -w, top * 0.6, -w, 0.1);
  s.bezierCurveTo(-w, -0.2, -n - 0.1, -0.4, -n, bot);
  return s;
}
export function buildUnderwear(tier = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(bend(extrude(briefShape(), 0.08, 0.03, 40), 0.1, 0), fabric(COLORS.sage, { roughness: 0.9 }));
  const wb = new THREE.Shape(); wb.moveTo(-1.27, 0.84); wb.lineTo(1.27, 0.84); wb.lineTo(1.27, 1.04); wb.lineTo(-1.27, 1.04); wb.lineTo(-1.27, 0.84);
  const band = new THREE.Mesh(bend(extrude(wb, 0.1, 0.03), 0.1, 0), fabric(COLORS.sageDeep, { roughness: 0.75 }));
  const len = [0, 0.35, 0.65, 1][tier] ?? 0.35, w = [0.34, 0.4, 0.46, 0.5][tier] ?? 0.4;
  const gusset = new THREE.Mesh(bend(extrude(gussetShape(len, w), 0.05, 0.025, 40), 0.1, 0), fabric(COLORS.core, { roughness: 0.92 }));
  gusset.position.z = 0.1;
  const outline = gussetShape(len, w * 1.04); outline.holes.push(new THREE.Path(gussetShape(len, w * 1.0).getPoints(60).reverse()));
  const stitch = new THREE.Mesh(bend(new THREE.ExtrudeGeometry(outline, { depth: 0.012, bevelEnabled: false, curveSegments: 40 }), 0.1, 0), fabric(COLORS.coreDeep));
  stitch.position.z = 0.158;
  g.add(body, band, gusset, stitch);
  g.rotation.x = -0.12;
  return wrap(g, 'float');
}

/* Normalise size, centre, and report where the "floor" is */
function wrap(group, mode) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const k = 3.1 / Math.max(size.x, size.y, size.z);
  const root = new THREE.Group();
  group.position.sub(center);
  const pivot = new THREE.Group(); pivot.add(group); pivot.scale.setScalar(k);
  root.add(pivot);
  root.userData = { mode, height: size.y * k };
  return root;
}

export const MODEL_BUILDERS = { pads: buildPad, tampons: buildTampon, cups: buildCup, underwear: buildUnderwear };
export function buildModel(type, tier = 0) { return (MODEL_BUILDERS[type] || buildPad)(tier); }
