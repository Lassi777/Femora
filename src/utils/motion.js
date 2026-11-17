const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Adds a gentle 3D fade-in to elements as they scroll into view. */
export function observeReveal(selector) {
  const els = [...document.querySelectorAll(selector)];
  els.forEach((el) => {
    el.classList.add('reveal');
    const idx = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
    el.style.setProperty('--d', `${Math.min(idx, 5) * 80}ms`);
  });
  if (!('IntersectionObserver' in window) || reduced()) { els.forEach((e) => e.classList.add('is-in')); return () => {}; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
  }), { threshold: 0.12 });
  els.forEach((e) => io.observe(e));
  return () => io.disconnect();
}

/** Pointer-follow 3D tilt for cards (hover devices only, never with reduced motion). */
export function attachTilt(selector, max = 7) {
  if (reduced() || !window.matchMedia?.('(hover: hover)').matches) return () => {};
  const cleanups = [...document.querySelectorAll(selector)].map((el) => {
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${(-py * max).toFixed(2)}deg) rotateY(${(px * max).toFixed(2)}deg) translateY(-6px)`;
    };
    const leave = () => { el.style.transform = ''; };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); leave(); };
  });
  return () => cleanups.forEach((c) => c());
}
