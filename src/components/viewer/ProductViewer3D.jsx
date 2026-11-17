import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildModel } from './models';

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}
function disposeTree(o) { o.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose()); } }); }

// Real WebGL viewer. Drag to orbit (vertical page scroll still works on touch), arrow keys also rotate.
export default function ProductViewer3D({ type, tier, label, onFail, onReady }) {
  const mount = useRef(null);
  const api = useRef(null);

  useEffect(() => {
    const el = mount.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' }); } catch { onFail?.(); return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04); scene.environment = env.texture; scene.environmentIntensity = 0.85;
    const key = new THREE.DirectionalLight(0xfff3e6, 1.8); key.position.set(3, 5, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xf1c9cc, 1.1); rim.position.set(-4, 2, -3); scene.add(rim);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2c4a3a, 0.5));

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 2.1, 6.4);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false; controls.enableZoom = false; controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.minPolarAngle = 0.5; controls.maxPolarAngle = 1.75; controls.target.set(0, 0, 0);
    controls.autoRotate = !reduced(); controls.autoRotateSpeed = 1.1;
    renderer.domElement.style.touchAction = 'pan-y';
    controls.addEventListener('start', () => { controls.autoRotate = false; });

    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow);

    const state = { model: null, mode: 'ground', t0: performance.now(), swap: 0, visible: true, raf: 0, failed: false };
    function setModel(t, tr) {
      if (state.model) { scene.remove(state.model); disposeTree(state.model); }
      const m = buildModel(t, tr); scene.add(m); state.model = m; state.mode = m.userData.mode; state.swap = performance.now();
      const h = m.userData.height; const floorY = -h / 2 - (state.mode === 'float' ? 0.55 : 0.02);
      shadow.position.y = floorY; shadow.scale.set(state.mode === 'float' ? 2.2 : 3.6, state.mode === 'float' ? 2.2 : 2.2, 1);
      state.baseY = state.mode === 'float' ? 0.1 : -0.05;
    }
    setModel(type, tier);
    api.current = { setModel, state, controls };

    function resize() {
      const w = el.clientWidth || 300, h = el.clientHeight || 300;
      renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix();
      camera.position.setLength(w / h < 0.9 ? 8.4 : 6.6);
    }
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    function frame(now) {
      if (!state.visible) { state.raf = 0; return; }
      state.raf = requestAnimationFrame(frame);
      const k = Math.min(1, (now - state.swap) / 400), ease = 1 - (1 - k) ** 3;
      if (state.model) {
        state.model.scale.setScalar(reduced() ? 1 : 0.9 + 0.1 * ease);
        state.model.position.y = state.baseY + (state.mode === 'float' && !reduced() ? Math.sin((now - state.t0) / 1100) * 0.08 : 0);
      }
      controls.update(); renderer.render(scene, camera);
    }
    const start = () => { if (!state.raf && state.visible) state.raf = requestAnimationFrame(frame); };
    const io = new IntersectionObserver(([e]) => { state.visible = e.isIntersecting && !document.hidden; start(); }, { threshold: 0.05 });
    io.observe(el);
    const vis = () => { state.visible = !document.hidden; start(); };
    document.addEventListener('visibilitychange', vis);
    const lost = (e) => { e.preventDefault(); state.failed = true; onFail?.(); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    start(); requestAnimationFrame(() => onReady?.());

    return () => {
      cancelAnimationFrame(state.raf); state.visible = false;
      io.disconnect(); ro.disconnect(); document.removeEventListener('visibilitychange', vis);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      controls.dispose(); if (state.model) disposeTree(state.model);
      shadow.geometry.dispose(); shadow.material.map.dispose(); shadow.material.dispose();
      env.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
      api.current = null;
    };
    // The renderer is created once; models are swapped by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { api.current?.setModel(type, tier); }, [type, tier]);

  function onKey(e) {
    const c = api.current?.controls; const m = api.current?.state.model;
    if (!c || !m) return;
    const d = { ArrowLeft: [-0.25, 0], ArrowRight: [0.25, 0], ArrowUp: [0, -0.15], ArrowDown: [0, 0.15] }[e.key];
    if (!d) return;
    e.preventDefault(); c.autoRotate = false;
    m.rotation.y += d[0]; m.rotation.x = Math.max(-0.5, Math.min(0.5, m.rotation.x + d[1]));
  }

  return <div ref={mount} className="pv__canvas" tabIndex={0} role="img" aria-label={`${label}. Interactive 3D concept model: drag or use the arrow keys to rotate.`} onKeyDown={onKey} />;
}
