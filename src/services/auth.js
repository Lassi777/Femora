// Compact synchronous SHA-256 so hashing also works when the site is opened from a file.
function rr(n, x) { return (x >>> n) | (x << (32 - n)); }
const K = [];
(function () {
  let n = 2, i = 0;
  while (i < 64) {
    let p = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { p = false; break; }
    if (p) { K[i++] = (Math.cbrt(n) % 1) * 4294967296 | 0; }
    n++;
  }
})();
function sha256(str) {
  const bytes = Array.from(new TextEncoder().encode(str));
  const l = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (l >>> (i * 8)) & 255);
  let H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  for (let o = 0; o < bytes.length; o += 64) {
    const w = [];
    for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
    for (let i = 16; i < 64; i++) {
      const s0 = rr(7, w[i - 15]) ^ rr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rr(17, w[i - 2]) ^ rr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (rr(6, e) ^ rr(11, e) ^ rr(25, e)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
      const t2 = ((rr(2, a) ^ rr(13, a) ^ rr(22, a)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H = [a, b, c, d, e, f, g, h].map((v, i) => (H[i] + v) | 0);
  }
  return H.map((v) => (v >>> 0).toString(16).padStart(8, '0')).join('');
}
export function hashPassword(email, password) {
  return sha256(`${email.trim().toLowerCase()}:${password}:femora-v2`);
}
