// ================================================================ DÉCORS V3 : couches en cache, lumière, particules, 12 ambiances
const rr = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
let QUAL = 2;                                       // 0 basse · 1 moyenne · 2 haute (réglée automatiquement selon les performances)
const SW = 1280;                                    // largeur des bandes de décor mises en cache (répétées en boucle)
const stripCache = {};
function strip(key, h, fn) {                        // dessine une fois, réutilise ensuite (très économique)
  const k = key + '|' + h;
  let c = stripCache[k];
  if (!c) { c = document.createElement('canvas'); c.width = SW; c.height = h; const g = c.getContext('2d'); fn(g, SW, h); stripCache[k] = c; }
  return c;
}
function blit(c, f, y, alpha) {                     // défilement horizontal parallaxe (f : 0 = fixe, 1 = comme le jeu)
  const off = -(((cam.x * f * .6) % SW) + SW) % SW;
  if (alpha !== undefined && alpha < 1) ctx.globalAlpha = alpha;
  for (let x = off; x < W; x += SW) ctx.drawImage(c, Math.round(x), Math.round(y));
  ctx.globalAlpha = 1;
}
const lyY = (f, base) => base - (cam.y + 150) * f * .25;      // léger décalage vertical selon la caméra
function wrapX(g, x, w, fn) { fn(x); if (x < w) fn(x + SW); if (x > SW - w) fn(x - SW); }
function ridge(g, w, h, base, amp, k1, k2, ph, color, color2) {
  const gr = g.createLinearGradient(0, base - amp * 1.6, 0, h); gr.addColorStop(0, color); gr.addColorStop(1, color2 || color);
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) g.lineTo(x, base - (Math.sin(x / w * Math.PI * 2 * k1 + ph) * amp + Math.sin(x / w * Math.PI * 2 * k2 + ph * 2.1) * amp * .4));
  g.lineTo(w, h); g.fill();
}
function cloud(x, y, s, a, tint) {
  ctx.fillStyle = `rgba(${tint || '255,255,255'},${a})`;
  for (const [dx, dy, r] of [[0, 0, 1], [.9, .15, .75], [-.9, .2, .7], [.35, -.35, .8], [-.4, -.25, .65]]) { ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s, s * r * 1.2, s * r * .75, 0, 0, Math.PI * 2); ctx.fill(); }
}
function glow(x, y, r, c0, c1) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, c0); g.addColorStop(1, c1 || 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
}
const Q3 = n => Math.max(2, Math.round(n * (QUAL + 1) / 3));      // nombre de particules selon la qualité
function particles(n, fn) { const m = Q3(n); for (let i = 0; i < m; i++) fn(i, rr(i), rr(i + 7), rr(i + 13)); }
function stars(n, t, a) {
  particles(n, (i, a1, a2, a3) => { const x = (a1 * W * 1.3 - cam.x * .02) % W, y = a2 * H * .75; ctx.fillStyle = `rgba(255,255,255,${(a || 1) * (.35 + .65 * Math.abs(Math.sin(t * (1 + a3 * 2) + i)))})`; ctx.fillRect(x, y, 1 + a3 * 1.8, 1 + a3 * 1.8); });
}
let vigC = null;
function vignette(str) {
  if (!vigC) { vigC = document.createElement('canvas'); vigC.width = W; vigC.height = H; const g = vigC.getContext('2d'), r = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = r; g.fillRect(0, 0, W, H); }
  ctx.globalAlpha = str; ctx.drawImage(vigC, 0, 0); ctx.globalAlpha = 1;
}
function rays(x, y, n, len, a, t, color) {                       // rayons de lumière tournants
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * .05); ctx.fillStyle = `rgba(${color},${a})`;
  for (let i = 0; i < n; i++) { ctx.rotate(Math.PI * 2 / n); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(len, -len * .07); ctx.lineTo(len, len * .07); ctx.fill(); }
  ctx.restore();
}
function shaft(x, w, a, color) { const g = ctx.createLinearGradient(x, 0, x + w * .6, H); g.addColorStop(0, `rgba(${color},${a})`); g.addColorStop(1, `rgba(${color},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w * 1.8, H); ctx.lineTo(x + w * .8, H); ctx.fill(); }

const THEMES = {};

// ---------------------------------------------------------------- 1. PRAIRIE FLEURIE
THEMES.prairie = {
  bg(def, t) {
    rays(W * .82, 95, 14, 700, .05, t, '255,240,170');
    glow(W * .82, 95, 150, 'rgba(255,245,190,.95)', 'rgba(255,245,190,0)'); ctx.fillStyle = '#fffbd0'; ctx.beginPath(); ctx.arc(W * .82, 95, 40, 0, Math.PI * 2); ctx.fill();
    for (const [f, y0, sz, a, sp] of [[.12, 40, 38, .8, 40], [.22, 110, 52, .75, 70], [.34, 70, 34, .6, 90]]) for (let i = 0; i < 6; i++) { const x = ((rr(i + f * 50) * 1500 + t * sp - cam.x * f * .6) % 1500 + 1500) % 1500 - 200; cloud(x, y0 + rr(i + 3) * 80, sz * (.7 + rr(i) * .6), a); }
    blit(strip('pra_h1', 330, (g, w, h) => ridge(g, w, h, 190, 55, 2, 5, 1, '#9ad8a0', '#bde8b8')), .16, lyY(.16, 120));
    blit(strip('pra_h2', 330, (g, w, h) => ridge(g, w, h, 170, 48, 3, 7, 3, '#6cc474', '#8bd488')), .3, lyY(.3, 180));
    blit(strip('pra_t', 330, (g, w, h) => { ridge(g, w, h, 190, 22, 4, 9, 5, '#4faa5a', '#3f9a4a'); for (let i = 0; i < 16; i++) wrapX(g, rr(i) * w, 60, x => { const s = .7 + rr(i + 2) * .8, by = 175 + rr(i + 9) * 25; g.fillStyle = '#6a4a2a'; g.fillRect(x - 4 * s, by - 34 * s, 8 * s, 36 * s); g.fillStyle = i % 3 ? '#2f8a3a' : '#3a9a44'; g.beginPath(); g.arc(x, by - 46 * s, 24 * s, 0, 7); g.arc(x - 16 * s, by - 34 * s, 16 * s, 0, 7); g.arc(x + 16 * s, by - 34 * s, 16 * s, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,.15)'; g.beginPath(); g.arc(x - 7 * s, by - 52 * s, 11 * s, 0, 7); g.fill(); }); }), .5, lyY(.5, 215));
    particles(7, (i, a, b, c) => { const x = ((a * 1400 + t * (60 + c * 40) - cam.x * .3) % 1400) - 120, y = 60 + b * 150 + Math.sin(t * 3 + i) * 8; ctx.strokeStyle = 'rgba(40,60,90,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.quadraticCurveTo(x - 3, y - 5 - Math.sin(t * 12 + i) * 3, x, y); ctx.quadraticCurveTo(x + 3, y - 5 - Math.sin(t * 12 + i) * 3, x + 7, y); ctx.stroke(); });
  },
  back(def, t) {
    ctx.save(); ctx.translate(640, -24); ctx.fillStyle = '#d8c8a8'; ctx.beginPath(); ctx.moveTo(-26, 24); ctx.lineTo(-18, -110); ctx.lineTo(18, -110); ctx.lineTo(26, 24); ctx.fill(); ctx.fillStyle = '#b84a3a'; ctx.beginPath(); ctx.moveTo(-26, -108); ctx.lineTo(0, -140); ctx.lineTo(26, -108); ctx.fill();
    ctx.translate(0, -100); ctx.rotate(t * .8); ctx.fillStyle = '#f4ecd8'; for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.fillRect(2, -5, 90, 10); ctx.fillStyle = k % 2 ? '#f4ecd8' : '#e8dcc0'; } ctx.restore();
    for (const x of [-700, -640]) { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(x - 12, -230, 24, 232); ctx.fillStyle = '#2f8a3a'; ctx.beginPath(); ctx.arc(x, -250, 78, 0, 7); ctx.arc(x - 50, -212, 52, 0, 7); ctx.arc(x + 50, -212, 52, 0, 7); ctx.fill(); }
    for (let i = 0; i < 46; i++) { const x = -540 + i * 24 + rr(i) * 10; ctx.fillStyle = ['#ff6a8a', '#ffd93b', '#ffffff', '#b07aff'][i % 4]; ctx.beginPath(); ctx.arc(x, -7 - rr(i + 2) * 8, 3.2, 0, 7); ctx.fill(); ctx.strokeStyle = '#3f9a4a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x, -7 - rr(i + 2) * 8); ctx.stroke(); }
    particles(5, (i, a, b) => { const x = -500 + ((a * 1100 + t * 30 * (i % 2 ? 1 : -1)) % 1100), y = -40 - b * 120 + Math.sin(t * 2 + i * 3) * 18; ctx.fillStyle = ['#ffb04a', '#ff7ab0', '#7ab8ff'][i % 3]; const fl = Math.abs(Math.sin(t * 10 + i)) * 5 + 1; ctx.beginPath(); ctx.ellipse(x - 3, y, fl, 4, 0, 0, 7); ctx.ellipse(x + 3, y, fl, 4, 0, 0, 7); ctx.fill(); });
  },
  front(def, t) { ctx.fillStyle = '#4faa4f'; for (let x = -560; x < 560; x += 14) { const s = Math.sin(t * 2 + x * .05) * 3; ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x + 3 + s, -7); ctx.lineTo(x + 6, 6); ctx.fill(); } },
  vig:.35, tint:'rgba(255,230,160,.05)',
};

// ---------------------------------------------------------------- 2. DIMENSION FINALE
THEMES.space = {
  bg(def, t) {
    blit(strip('spc_n', 540, (g, w, h) => { for (const [x, y, r, c] of [[.2, .35, 330, '90,50,200'], [.62, .6, 380, '30,110,220'], [.9, .25, 260, '200,60,180']]) { const q = g.createRadialGradient(x * w, y * h, 1, x * w, y * h, r); q.addColorStop(0, `rgba(${c},.38)`); q.addColorStop(1, `rgba(${c},0)`); g.fillStyle = q; g.fillRect(0, 0, w, h); wrapX(g, x * w, r, xx => { const q2 = g.createRadialGradient(xx, y * h, 1, xx, y * h, r); q2.addColorStop(0, `rgba(${c},.38)`); q2.addColorStop(1, `rgba(${c},0)`); g.fillStyle = q2; g.fillRect(0, 0, w, h); }); } }), .03, 0);
    blit(strip('spc_s', 540, (g, w, h) => { for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${.3 + rr(i + 3) * .7})`; const s = rr(i + 5) * 1.8 + .6; g.fillRect(rr(i) * w, rr(i + 1) * h, s, s); } }), .05, 0);
    stars(60, t, .9);
    glow(W * .78, 140 - (cam.y + 150) * .03, 70, '#d8b8ff', 'rgba(90,50,160,.15)'); ctx.strokeStyle = 'rgba(210,180,255,.65)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(W * .78, 140, 120, 24, -.35, 0, Math.PI * 2); ctx.stroke();
    const ph = (t * .35) % 4; if (ph < 1) { const x = W * (1.1 - ph * 1.3), y = 40 + ph * 220; const g = ctx.createLinearGradient(x, y, x + 130, y - 55); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 130, y - 55); ctx.stroke(); }
  },
  back(def, t) {
    for (let i = 0; i < 10; i++) { const x = -1050 + i * 235 + Math.sin(t * .6 + i) * 22, y = -280 - rr(i) * 360 + Math.sin(t + i * 2) * 26, s = 16 + rr(i + 1) * 22, a = t * .9 + i; ctx.fillStyle = `rgba(120,220,255,${.3 + .25 * Math.sin(t * 2 + i)})`; ctx.beginPath(); ctx.moveTo(x, y - s * 1.7); ctx.lineTo(x + s * Math.cos(a), y); ctx.lineTo(x, y + s * 1.7); ctx.lineTo(x - s * Math.cos(a), y); ctx.fill(); if (QUAL) glow(x, y, s * 2.2, 'rgba(120,220,255,.28)'); }
    ctx.strokeStyle = 'rgba(120,150,255,.28)'; ctx.lineWidth = 1; for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(i * 55, 140); ctx.lineTo(i * 150, 640); ctx.stroke(); } for (let j = 0; j < 7; j++) { ctx.beginPath(); ctx.moveTo(-1500, 140 + j * j * 13); ctx.lineTo(1500, 140 + j * j * 13); ctx.stroke(); }
  },
  front() {}, vig:.55, tint:'rgba(120,80,255,.05)',
};

// ---------------------------------------------------------------- 3. CITÉ DU CIEL
THEMES.sky = {
  bg(def, t) {
    rays(W * .5, -20, 18, 900, .045, t, '255,250,210'); glow(W * .5, 10, 340, 'rgba(255,252,220,.85)', 'rgba(255,252,220,0)');
    ctx.lineWidth = 14; ['255,80,80', '255,200,60', '90,210,120', '80,150,255', '170,90,255'].forEach((c, k) => { ctx.strokeStyle = `rgba(${c},.2)`; ctx.beginPath(); ctx.arc(W * .5 - cam.x * .03, H * 1.25, 520 - k * 13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
    blit(strip('sky_i', 260, (g, w, h) => { for (let i = 0; i < 5; i++) wrapX(g, (i + rr(i)) * w / 5, 130, x => { const y = 60 + rr(i + 4) * 90, s = .7 + rr(i + 9) * .7; g.fillStyle = 'rgba(105,135,180,.6)'; g.beginPath(); g.ellipse(x, y, 76 * s, 15 * s, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x - 60 * s, y); g.lineTo(x + 60 * s, y); g.lineTo(x + 6 * s, y + 70 * s); g.fill(); g.fillStyle = 'rgba(80,150,100,.7)'; g.beginPath(); g.arc(x - 20 * s, y - 14 * s, 14 * s, 0, 7); g.arc(x + 14 * s, y - 18 * s, 18 * s, 0, 7); g.fill(); }); }), .22, lyY(.22, 40));
    for (const [f, y0, sz, a, sp] of [[.18, 90, 62, .55, 50], [.4, 330, 60, .85, 90], [.7, 440, 90, .95, 130]]) for (let i = 0; i < 6; i++) { const x = ((rr(i + f * 40) * 1600 + t * sp - cam.x * f * .6) % 1600 + 1600) % 1600 - 250; cloud(x, y0 + rr(i + 2) * 70, sz * (.8 + rr(i) * .5), a); }
    particles(5, (i, a, b, c) => { const x = ((a * 1500 + t * (70 + c * 50) - cam.x * .3) % 1500) - 150, y = 70 + b * 200 + Math.sin(t * 2 + i) * 10; ctx.strokeStyle = 'rgba(40,60,90,.65)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x - 3, y - 6 - Math.sin(t * 11 + i) * 4, x, y); ctx.quadraticCurveTo(x + 3, y - 6 - Math.sin(t * 11 + i) * 4, x + 8, y); ctx.stroke(); });
  },
  back(def, t) { for (const x of [-520, 0, 520]) { ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(x + Math.sin(t * .3 + x) * 30, 200, 190, 36, 0, 0, 7); ctx.fill(); } },
  front(def, t) { ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 7; i++) { const x = -1200 + i * 380 + Math.sin(t * .4 + i) * 40; ctx.beginPath(); ctx.ellipse(x, 420, 260, 50, 0, 0, 7); ctx.fill(); } },
  vig:.18, tint:'rgba(255,255,255,.04)',
};

// ---------------------------------------------------------------- 4. PONT SUSPENDU (coucher de soleil sur la mer)
THEMES.bridge = {
  bg(def, t) {
    const hy = lyY(.3, 250);
    rays(W * .5, hy - 6, 16, 800, .06, t, '255,200,120'); glow(W * .5, hy - 6, 230, 'rgba(255,205,125,.95)', 'rgba(255,120,60,0)'); ctx.fillStyle = '#ffd890'; ctx.beginPath(); ctx.arc(W * .5, hy - 6, 66, 0, 7); ctx.fill();
    blit(strip('br_c', 300, (g, w, h) => { ridge(g, w, h, 150, 38, 3, 8, 2, '#7a3a5a', '#5a2a4a'); for (let i = 0; i < 20; i++) wrapX(g, rr(i) * w, 30, x => { const bh = 30 + rr(i + 3) * 70; g.fillStyle = '#4a2448'; g.fillRect(x - 10, 150 - bh, 20, bh + 40); if (QUAL) { g.fillStyle = 'rgba(255,210,130,.8)'; for (let k = 0; k < bh / 12; k++) if (rr(i * 9 + k) > .5) g.fillRect(x - 6 + (k % 2) * 8, 150 - bh + 6 + k * 10, 3, 4); } }); }), .2, lyY(.2, 100));
    const sy = lyY(.5, 340); ctx.fillStyle = '#1b1033'; ctx.fillRect(0, sy, W, H);
    for (let k = 0; k < Q3(30); k++) { const wy = sy + 4 + k * 8 * (1 + k / 40), wd = (260 + k * 14) * (1 + Math.sin(t * 2 + k) * .06); ctx.fillStyle = `rgba(255,190,120,${.16 + .12 * Math.sin(t * 2.2 + k * 1.3)})`; ctx.fillRect(W / 2 - wd / 2 + Math.sin(t + k) * 10, wy, wd, 2); }
    const bx = ((t * 12) % (W + 260)) - 130; ctx.fillStyle = '#1a0e24'; ctx.beginPath(); ctx.moveTo(bx - 40, sy - 2); ctx.lineTo(bx + 40, sy - 2); ctx.lineTo(bx + 28, sy + 9); ctx.lineTo(bx - 30, sy + 9); ctx.fill(); ctx.fillRect(bx - 3, sy - 38, 3, 36); ctx.fillStyle = '#ffd890'; ctx.fillRect(bx + 14, sy - 8, 3, 3);
    particles(6, (i, a, b, c) => { const x = ((a * 1500 + t * (60 + c * 40) - cam.x * .3) % 1500) - 150, y = 60 + b * 140 + Math.sin(t * 2 + i) * 9; ctx.strokeStyle = 'rgba(30,20,40,.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x - 3, y - 6 - Math.sin(t * 11 + i) * 4, x, y); ctx.quadraticCurveTo(x + 3, y - 6 - Math.sin(t * 11 + i) * 4, x + 8, y); ctx.stroke(); });
  },
  back(def, t) {
    for (const x of [-700, 700]) { const g = ctx.createLinearGradient(x - 22, 0, x + 22, 0); g.addColorStop(0, '#7a4a3a'); g.addColorStop(1, '#4a2a22'); ctx.fillStyle = g; ctx.fillRect(x - 24, -540, 48, 1160); ctx.fillStyle = '#9a5a44'; ctx.fillRect(x - 32, -560, 64, 24); ctx.fillRect(x - 32, -330, 64, 14); ctx.fillStyle = 'rgba(255,200,120,.7)'; ctx.fillRect(x - 3, -545, 6, 10); }
    ctx.strokeStyle = '#a06048'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-700, -540); ctx.quadraticCurveTo(0, 30, 700, -540); ctx.stroke();
    ctx.lineWidth = 1.5; for (let x = -680; x <= 680; x += 36) { const u = (x + 700) / 1400, cy = (1 - u) * (1 - u) * -540 + 2 * u * (1 - u) * 30 + u * u * -540; ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x, -4); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,220,150,.9)'; for (let x = -680; x <= 680; x += 120) { const u = (x + 700) / 1400, cy = (1 - u) * (1 - u) * -540 + 2 * u * (1 - u) * 30 + u * u * -540; ctx.beginPath(); ctx.arc(x, cy + 6, 4, 0, 7); ctx.fill(); if (QUAL) glow(x, cy + 6, 22, 'rgba(255,200,120,.35)'); }
  },
  front(def, t) { ctx.fillStyle = 'rgba(40,20,60,.35)'; ctx.beginPath(); ctx.moveTo(-1500, 640); for (let x = -1500; x <= 1500; x += 40) ctx.lineTo(x, 330 + Math.sin(x * .01 + t * 1.2) * 8); ctx.lineTo(1500, 640); ctx.fill(); },
  vig:.4, tint:'rgba(255,140,80,.06)',
};

// ---------------------------------------------------------------- 5. VOLCAN EN ÉRUPTION
THEMES.volcano = {
  bg(def, t) {
    stars(18, t, .25);
    const pulse = .75 + .25 * Math.sin(t * 1.7);
    blit(strip('vol_m', 340, (g, w, h) => { ridge(g, w, h, 170, 60, 2, 6, 1, '#2a0c0c', '#1a0606'); for (let i = 0; i < 3; i++) wrapX(g, (i * .33 + .12) * w, 220, x => { const s = .8 + rr(i) * .5; g.fillStyle = '#1c0707'; g.beginPath(); g.moveTo(x - 200 * s, h); g.lineTo(x - 36 * s, 60); g.lineTo(x + 36 * s, 60); g.lineTo(x + 200 * s, h); g.fill(); g.strokeStyle = 'rgba(255,100,20,.85)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x - 20 * s, 66); g.lineTo(x - 80 * s, 230); g.moveTo(x + 18 * s, 66); g.lineTo(x + 60 * s, 200); g.stroke(); }); }), .26, lyY(.26, 90));
    for (const k of [.12, .45, .78]) glow(((k * 1280 - cam.x * .26 * .6) % 1280 + 1280) % 1280, lyY(.26, 90) + 62, 80 * pulse, 'rgba(255,170,50,.8)', 'rgba(255,60,0,0)');
    for (let i = 0; i < 4; i++) { const ph = (t * .5 + i * .25) % 1; ctx.fillStyle = `rgba(255,${120 + 80 * ph},30,${1 - ph})`; const x = W * (.2 + i * .22) + Math.sin(ph * 3 + i) * 40; ctx.beginPath(); ctx.arc(x, lyY(.26, 90) + 40 - Math.sin(ph * Math.PI) * 130, 5, 0, 7); ctx.fill(); }
    particles(60, (i, a, b, c) => { const x = (a * W + Math.sin(t * .6 + i) * 30) % W, y = H - ((t * (25 + c * 60) + b * H) % H); ctx.fillStyle = `rgba(255,${100 + c * 110},40,${.35 + .5 * c})`; ctx.fillRect(x, y, 2 + c * 1.5, 2 + c * 1.5); });
    ctx.fillStyle = 'rgba(40,20,20,.25)'; for (let i = 0; i < 4; i++) { cloud(((i * 330 + t * 15 - cam.x * .1) % 1500) - 200, 40 + i * 28, 90, .22, '60,40,40'); }
  },
  back(def, t) { for (const [x, s] of [[-900, 1.2], [-470, .8], [520, .9], [960, 1.3]]) { const g = ctx.createLinearGradient(x - 90 * s, 0, x + 100 * s, 0); g.addColorStop(0, '#2a0c0c'); g.addColorStop(1, '#140505'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 100 * s, 420); ctx.lineTo(x - 22 * s, -270 * s); ctx.lineTo(x + 20 * s, -230 * s); ctx.lineTo(x + 110 * s, 420); ctx.fill(); ctx.strokeStyle = `rgba(255,${90 + 40 * Math.sin(t * 2 + x)},20,.7)`; ctx.lineWidth = 2; ctx.stroke(); } },
  front(def, t) {
    const bd = def.bounds, y0 = (G.env && G.env.lavaY !== null && G.env.lavaY !== undefined) ? G.env.lavaY : 330;
    const g = ctx.createLinearGradient(0, y0 - 20, 0, y0 + 260); g.addColorStop(0, 'rgba(255,200,60,.95)'); g.addColorStop(.25, 'rgba(255,100,10,.92)'); g.addColorStop(1, 'rgba(160,20,0,.95)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bd.l - 100, bd.b + 300);
    for (let x = bd.l - 100; x <= bd.r + 100; x += 28) ctx.lineTo(x, y0 + Math.sin(x * .012 + t * 1.6) * 14 + Math.sin(x * .03 + t * 2.6) * 6);
    ctx.lineTo(bd.r + 100, bd.b + 300); ctx.fill();
    for (let i = 0; i < 18; i++) { const x = bd.l + rr(i) * (bd.r - bd.l), ph = (t * .5 + rr(i + 1)) % 1; ctx.fillStyle = `rgba(255,210,70,${1 - ph})`; ctx.beginPath(); ctx.arc(x, y0 - ph * 190, 3 + rr(i) * 5, 0, 7); ctx.fill(); }
    if (QUAL) glow(0, y0, 700, 'rgba(255,100,20,.2)', 'rgba(255,100,20,0)');
  },
  vig:.5, tint:'rgba(255,80,20,.06)',
};

// ---------------------------------------------------------------- 6. FORÊT MYSTIQUE
THEMES.forest = {
  bg(def, t) {
    for (const [f, a, col, hh] of [[.12, .5, '#0d2a1f', 330], [.26, .65, '#123826', 380], [.44, .85, '#18482e', 440]]) blit(strip('for_' + f, 540, (g, w, h) => { for (let i = 0; i < 9; i++) wrapX(g, (i + rr(i + f * 9)) * w / 9, 120, x => { const tw = 24 + rr(i + 4) * 20; g.fillStyle = col; g.fillRect(x - tw / 2, 0, tw, h); g.beginPath(); g.arc(x, 90 + rr(i) * 60, 70 + rr(i + 2) * 40, 0, 7); g.arc(x - 60, 130, 50, 0, 7); g.arc(x + 60, 140, 52, 0, 7); g.fill(); }); }), f, 0, a);
    shaft(W * .1 + Math.sin(t * .2) * 20, 70, .1, '210,255,200'); shaft(W * .42 + Math.sin(t * .25 + 1) * 20, 90, .08, '210,255,200'); shaft(W * .72, 60, .09, '210,255,200');
    particles(30, (i, a, b, c) => { const x = (a * W + Math.sin(t * .5 + i * 2) * 50 + W) % W, y = b * H * .85 + Math.cos(t * .6 + i) * 30; glow(x, y, 8 + c * 5, `rgba(235,255,120,${.35 + .6 * Math.abs(Math.sin(t * 2.5 + i))})`, 'rgba(235,255,120,0)'); });
    const g = ctx.createLinearGradient(0, H * .5, 0, H); g.addColorStop(0, 'rgba(160,230,190,0)'); g.addColorStop(1, 'rgba(160,230,190,.28)'); ctx.fillStyle = g; ctx.fillRect(0, H * .5, W, H * .5);
  },
  back(def, t) {
    for (const x of [-900, 840]) { const g = ctx.createLinearGradient(x - 60, 0, x + 60, 0); g.addColorStop(0, '#1e120a'); g.addColorStop(.5, '#3a2616'); g.addColorStop(1, '#1e120a'); ctx.fillStyle = g; ctx.fillRect(x - 62, -760, 124, 940); ctx.fillStyle = '#10301e'; ctx.beginPath(); ctx.arc(x, -760, 190, 0, 7); ctx.fill(); ctx.strokeStyle = `rgba(120,255,200,${.4 + .3 * Math.sin(t * 2 + x)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - 20, -300); ctx.lineTo(x, -330); ctx.lineTo(x + 20, -300); ctx.lineTo(x, -250); ctx.closePath(); ctx.stroke(); }
    for (let i = 0; i < 9; i++) { const x = -540 + i * 135 + rr(i) * 40; ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x - 3, -16, 6, 16); ctx.fillStyle = ['#e84a6a', '#e8a03a', '#7a9aff'][i % 3]; ctx.beginPath(); ctx.ellipse(x, -17, 15, 10, 0, Math.PI, 0); ctx.fill(); if (QUAL) glow(x, -22, 26, 'rgba(255,200,160,.22)'); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(x - 6, -23, 3, 3); ctx.fillRect(x + 3, -21, 3, 3); }
    ctx.strokeStyle = 'rgba(70,160,70,.65)'; ctx.lineWidth = 3; for (let i = 0; i < 12; i++) { const x = -760 + i * 140; ctx.beginPath(); ctx.moveTo(x, -640); ctx.quadraticCurveTo(x + 12 * Math.sin(t + i), -540, x, -460 - rr(i) * 70); ctx.stroke(); }
  },
  front(def, t) { const g = ctx.createLinearGradient(0, 60, 0, 430); g.addColorStop(0, 'rgba(180,235,205,0)'); g.addColorStop(1, 'rgba(180,235,205,.3)'); ctx.fillStyle = g; ctx.fillRect(def.bounds.l, 60, def.bounds.r - def.bounds.l, 370); },
  vig:.55, tint:'rgba(40,160,90,.05)',
};

