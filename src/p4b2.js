// ---------------------------------------------------------------- 7. TEMPLE GLACÉ
THEMES.ice = {
  bg(def, t) {
    stars(60, t, .8);
    for (const [c, k] of [['80,255,170', 0], ['120,160,255', 1], ['210,100,255', 2]]) { const g = ctx.createLinearGradient(0, 40 + k * 30, 0, 250 + k * 30); g.addColorStop(0, `rgba(${c},0)`); g.addColorStop(.5, `rgba(${c},.28)`); g.addColorStop(1, `rgba(${c},0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 40 + k * 30); for (let x = 0; x <= W; x += 24) ctx.lineTo(x, 70 + k * 30 + Math.sin(x * .011 + t * .5 + k * 2) * 34 + Math.sin(x * .027 + t * .9) * 10); for (let x = W; x >= 0; x -= 24) ctx.lineTo(x, 210 + k * 30 + Math.sin(x * .013 + t * .6 + k) * 40); ctx.fill(); }
    blit(strip('ice_m', 360, (g, w, h) => { ridge(g, w, h, 200, 30, 3, 7, 4, '#4a78b0', '#2a4a80'); for (let i = 0; i < 6; i++) wrapX(g, (i + rr(i)) * w / 6, 160, x => { const s = .9 + rr(i + 3) * .8; g.fillStyle = '#5a88c0'; g.beginPath(); g.moveTo(x - 150 * s, h); g.lineTo(x, 70 * (2 - s * .5)); g.lineTo(x + 150 * s, h); g.fill(); g.fillStyle = '#eaf8ff'; g.beginPath(); g.moveTo(x - 46 * s, 130 * (2 - s * .5)); g.lineTo(x, 70 * (2 - s * .5)); g.lineTo(x + 46 * s, 130 * (2 - s * .5)); g.fill(); }); }), .26, lyY(.26, 110));
    particles(110, (i, a, b, c) => { const x = (a * W + t * (14 + c * 22) + Math.sin(t + i) * 12) % W, y = (b * H + t * (28 + c * 44)) % H; ctx.fillStyle = `rgba(255,255,255,${.5 + .4 * c})`; ctx.fillRect(x, y, 1.6 + c * 1.6, 1.6 + c * 1.6); });
  },
  back(def, t) {
    for (const x of [-760, 760]) { for (const dx of [-70, 0, 70]) { const hh = 260 - Math.abs(dx) * .6; const g = ctx.createLinearGradient(x + dx - 20, 0, x + dx + 20, 0); g.addColorStop(0, '#a8cce8'); g.addColorStop(1, '#6a94c0'); ctx.fillStyle = g; ctx.fillRect(x + dx - 20, -hh, 40, hh + 6); ctx.fillStyle = '#c8e4f8'; ctx.fillRect(x + dx - 26, -hh - 12, 52, 14); } ctx.fillStyle = '#b8d8f0'; ctx.fillRect(x - 110, -300, 220, 16); ctx.strokeStyle = `rgba(150,240,255,${.5 + .4 * Math.sin(t * 2 + x)})`; ctx.lineWidth = 2; ctx.strokeRect(x - 40, -240, 80, 80); }
    for (const [x, s] of [[-420, .8], [-300, .5], [330, .6], [460, .9]]) { ctx.fillStyle = 'rgba(170,230,255,.55)'; ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, -190 * s); ctx.lineTo(x + 34 * s, -50 * s); ctx.lineTo(x + 20 * s, 0); ctx.lineTo(x - 20 * s, 0); ctx.lineTo(x - 34 * s, -50 * s); ctx.closePath(); ctx.fill(); ctx.stroke(); if (QUAL) glow(x, -60 * s, 60 * s, 'rgba(170,240,255,.25)'); }
  },
  front(def, t) { const g = ctx.createLinearGradient(0, 80, 0, 430); g.addColorStop(0, 'rgba(200,240,255,0)'); g.addColorStop(1, 'rgba(200,240,255,.32)'); ctx.fillStyle = g; ctx.fillRect(def.bounds.l, 80, def.bounds.r - def.bounds.l, 350); },
  vig:.4, tint:'rgba(120,200,255,.06)',
};

// ---------------------------------------------------------------- 8. VILLE NÉON
THEMES.city = {
  bg(def, t) {
    stars(40, t, .5); glow(W * .2, 110, 90, 'rgba(255,240,230,.95)', 'rgba(255,170,255,0)'); ctx.fillStyle = '#fff6ee'; ctx.beginPath(); ctx.arc(W * .2, 110, 34, 0, 7); ctx.fill();
    for (const [f, col, hh, bwid, key] of [[.14, '#1d0c36', 300, 46, 'c1'], [.3, '#150a2a', 360, 70, 'c2']]) blit(strip('city_' + key, 480, (g, w, h) => {
      let x = 0, i = 0; while (x < w) { const bw = bwid * (.8 + rr(i + f * 50) * .6), bh = 70 + rr(i * 3 + f * 9) * hh; g.fillStyle = col; g.fillRect(x, h - bh, bw, bh); g.fillStyle = 'rgba(255,255,255,.04)'; g.fillRect(x, h - bh, 3, bh);
        if (rr(i + 40) > .6) { g.fillStyle = col; g.fillRect(x + bw * .45, h - bh - 24, 3, 24); g.fillStyle = '#ff3a6a'; g.fillRect(x + bw * .45 - 1, h - bh - 26, 5, 3); }
        for (let r = 0; r < bh / 12 - 1; r++) for (let c = 0; c < Math.floor(bw / 12); c++) if (rr(i * 97 + r * 7 + c) > .5) { g.fillStyle = rr(i + c + r) > .5 ? 'rgba(255,225,140,.85)' : (rr(i + c) > .5 ? 'rgba(120,225,255,.85)' : 'rgba(255,120,220,.8)'); g.fillRect(x + 5 + c * 12, h - bh + 6 + r * 12, 6, 7); }
        x += bw + 2; i++; } }), f, lyY(f, 150 + f * 90));
    for (let k = 0; k < 2; k++) { const a = Math.sin(t * .6 + k * 3) * .5, x = W * (.3 + k * .4); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + Math.tan(a) * H - 24, 0); ctx.lineTo(x + Math.tan(a) * H + 24, 0); ctx.fill(); }
    ctx.strokeStyle = 'rgba(170,200,255,.35)'; ctx.lineWidth = 1; particles(60, (i, a, b, c) => { const x = (a * W + t * 40) % W, y = (b * H + t * 700 * (.6 + c * .6)) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14); ctx.stroke(); });
  },
  back(def, t) {
    ctx.fillStyle = '#17102c'; ctx.fillRect(-310, -430, 620, 430); glow(0, -330, 260, 'rgba(255,60,200,.3)', 'rgba(255,60,200,0)');
    ctx.font = 'bold 56px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = Math.sin(t * 7) > -.92 ? '#ff4ad8' : '#552244'; ctx.strokeText('POKESMASH', 0, -325); ctx.fillStyle = 'rgba(255,100,220,.25)'; ctx.fillText('POKESMASH', 0, -325);
    ctx.strokeStyle = '#4ae8ff'; ctx.lineWidth = 2; ctx.strokeRect(-250, -392, 500, 100); ctx.fillStyle = Math.sin(t * 3) > 0 ? '#ffe45a' : '#ff8a3a'; ctx.font = 'bold 22px system-ui,sans-serif'; ctx.fillText('★ COMBATS NON-STOP ★', 0, -260);
    for (const x of [-880, 880]) { ctx.fillStyle = '#2a2a3a'; ctx.fillRect(x - 3, -270, 6, 200); ctx.fillStyle = '#ffe8a0'; ctx.fillRect(x - 16, -276, 32, 8); glow(x, -260, 80, 'rgba(255,230,150,.35)', 'rgba(255,230,150,0)'); }
    ctx.fillStyle = 'rgba(255,60,200,.18)'; ctx.fillRect(-360, 2, 720, 8); ctx.fillStyle = 'rgba(70,230,255,.14)'; ctx.fillRect(-360, 10, 720, 5);
  },
  front() {}, vig:.55, tint:'rgba(200,60,255,.05)',
};

// ---------------------------------------------------------------- 9. PLAGE ENSOLEILLÉE
THEMES.beach = {
  bg(def, t) {
    rays(W * .78, 90, 14, 700, .06, t, '255,250,200'); glow(W * .78, 90, 160, 'rgba(255,250,205,.95)', 'rgba(255,250,205,0)'); ctx.fillStyle = '#fffbd0'; ctx.beginPath(); ctx.arc(W * .78, 90, 38, 0, 7); ctx.fill();
    for (let i = 0; i < 6; i++) { const x = ((rr(i) * 1500 + t * 30 - cam.x * .1) % 1500 + 1500) % 1500 - 200; cloud(x, 50 + rr(i + 3) * 120, 34 + rr(i) * 24, .78); }
    const hy = lyY(.3, 255);
    blit(strip('bea_i', 140, (g, w, h) => { wrapX(g, w * .3, 160, x => { g.fillStyle = '#3a8a6a'; g.beginPath(); g.moveTo(x - 140, h); g.quadraticCurveTo(x - 60, 30, x, 60); g.quadraticCurveTo(x + 60, 30, x + 140, h); g.fill(); g.fillStyle = '#6ac08a'; g.beginPath(); g.arc(x, 56, 26, 0, 7); g.fill(); }); }), .12, hy - 100);
    const sg = ctx.createLinearGradient(0, hy, 0, H); sg.addColorStop(0, '#2a9ae0'); sg.addColorStop(1, '#0f5aa8'); ctx.fillStyle = sg; ctx.fillRect(0, hy, W, H);
    for (let k = 0; k < Q3(26); k++) { ctx.fillStyle = `rgba(255,255,255,${.12 + .12 * Math.sin(t * 2 + k)})`; const y = hy + 10 + k * 12 * (1 + k / 40); ctx.fillRect((k * 97 + t * 18 * (k % 3 + 1)) % (W + 160) - 80, y, 70 + k * 5, 2); }
    glow(W * .78, hy + 10, 240, 'rgba(255,255,200,.25)', 'rgba(255,255,200,0)');
    const bx = ((t * 14) % (W + 220)) - 110; ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.moveTo(bx - 28, hy + 8); ctx.lineTo(bx + 28, hy + 8); ctx.lineTo(bx + 18, hy + 18); ctx.lineTo(bx - 20, hy + 18); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(bx, hy - 36); ctx.lineTo(bx + 22, hy + 4); ctx.lineTo(bx, hy + 4); ctx.fill();
    particles(5, (i, a, b, c) => { const x = ((a * 1500 + t * (60 + c * 40) - cam.x * .3) % 1500) - 150, y = 50 + b * 120 + Math.sin(t * 2 + i) * 9; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.quadraticCurveTo(x - 3, y - 6 - Math.sin(t * 11 + i) * 4, x, y); ctx.quadraticCurveTo(x + 3, y - 6 - Math.sin(t * 11 + i) * 4, x + 8, y); ctx.stroke(); });
  },
  back(def, t) {
    for (const [x, s] of [[-720, 1], [690, 1.15]]) { ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 14 * s; ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + 30 * s, -150 * s, x + 10 * s, -300 * s); ctx.stroke(); for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * .5 + Math.sin(t * 1.4 + k) * .05; ctx.fillStyle = k % 2 ? '#2fa04a' : '#3ab05a'; ctx.beginPath(); ctx.moveTo(x + 10 * s, -300 * s); ctx.quadraticCurveTo(x + 10 * s + Math.cos(a) * 80 * s, -300 * s + Math.sin(a) * 60 * s - 20, x + 10 * s + Math.cos(a) * 135 * s, -300 * s + Math.sin(a) * 30 * s + 64); ctx.quadraticCurveTo(x + 10 * s + Math.cos(a) * 80 * s, -300 * s + Math.sin(a) * 60 * s + 10, x + 10 * s, -300 * s); ctx.fill(); } ctx.fillStyle = '#6a4a1a'; ctx.beginPath(); ctx.arc(x + 4, -296 * s, 8, 0, 7); ctx.arc(x + 20, -292 * s, 7, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-260, 0); ctx.lineTo(-260, -112); ctx.stroke(); ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.ellipse(-260, -112, 74, 32, 0, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-260, -112, 24, 32, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#ffd04a'; ctx.beginPath(); ctx.ellipse(-200, -4, 26, 8, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#ff8a8a'; ctx.beginPath(); ctx.arc(420, -6, 9, Math.PI, 0); ctx.fill();
  },
  front(def, t) {
    const bd = def.bounds, y0 = 215, g = ctx.createLinearGradient(0, y0, 0, y0 + 300); g.addColorStop(0, 'rgba(60,190,230,.55)'); g.addColorStop(1, 'rgba(10,80,170,.75)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(bd.l - 100, bd.b + 300); for (let x = bd.l - 100; x <= bd.r + 100; x += 22) ctx.lineTo(x, y0 + Math.sin(x * .015 + t * 1.3) * 10); ctx.lineTo(bd.r + 100, bd.b + 300); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; ctx.beginPath(); for (let x = bd.l - 100; x <= bd.r + 100; x += 22) { const y = y0 + Math.sin(x * .015 + t * 1.3) * 10; if (x === bd.l - 100) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
  },
  vig:.2, tint:'rgba(255,230,160,.05)',
};

// ---------------------------------------------------------------- 10. GROTTE DE CRISTAUX (nouveau)
THEMES.crystal = {
  bg(def, t) {
    blit(strip('cry_s', 300, (g, w, h) => { for (let i = 0; i < 26; i++) wrapX(g, rr(i) * w, 60, x => { const s = 18 + rr(i + 3) * 36, len = 60 + rr(i + 7) * 190; g.fillStyle = `rgba(${40 + rr(i) * 40},${30 + rr(i + 1) * 30},${90 + rr(i + 2) * 50},1)`; g.beginPath(); g.moveTo(x - s, 0); g.lineTo(x + s, 0); g.lineTo(x, len); g.fill(); }); }), .12, lyY(.12, -20));
    for (const [f, key, n] of [[.22, 'cry_a', 9], [.4, 'cry_b', 7]]) blit(strip(key, 420, (g, w, h) => { ridge(g, w, h, 330, 30, 3, 7, f * 10, '#1a1048', '#0d0828'); for (let i = 0; i < n; i++) wrapX(g, (i + rr(i + f * 7)) * w / n, 90, x => { for (let k = 0; k < 4; k++) { const hh = 70 + rr(i * 4 + k) * 150 * (f + .6), ang = (k - 1.5) * .28, c = ['120,90,255', '90,200,255', '210,100,255'][(i + k) % 3]; g.save(); g.translate(x + k * 14 - 20, h - 80); g.rotate(ang); const q = g.createLinearGradient(0, 0, 0, -hh); q.addColorStop(0, `rgba(${c},.35)`); q.addColorStop(1, `rgba(${c},.95)`); g.fillStyle = q; g.beginPath(); g.moveTo(-14, 0); g.lineTo(-9, -hh * .85); g.lineTo(0, -hh); g.lineTo(9, -hh * .85); g.lineTo(14, 0); g.fill(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-3, -hh * .8, 3, hh * .75); g.restore(); } }); }), f, lyY(f, 80 + f * 60));
    const pulse = .5 + .5 * Math.sin(t * 1.4); glow(W * .3, H * .65, 220, `rgba(120,90,255,${.12 + .1 * pulse})`); glow(W * .75, H * .55, 260, `rgba(80,210,255,${.1 + .1 * (1 - pulse)})`);
    particles(40, (i, a, b, c) => { const x = (a * W + Math.sin(t * .7 + i) * 30 + W) % W, y = (H - ((t * (10 + c * 24) + b * H) % H)); glow(x, y, 4 + c * 4, `rgba(${i % 2 ? '150,230,255' : '210,150,255'},${.5 + .4 * Math.sin(t * 2 + i)})`); });
  },
  back(def, t) {
    for (const [x, s] of [[-860, 1.2], [-500, .8], [520, .9], [880, 1.3]]) for (let k = -1; k <= 1; k++) { const hh = (200 - Math.abs(k) * 60) * s, c = ['110,90,255', '90,210,255', '220,110,255'][(k + 1 + (x > 0 ? 1 : 0)) % 3]; ctx.save(); ctx.translate(x + k * 34 * s, 60); ctx.rotate(k * .22); const q = ctx.createLinearGradient(0, 0, 0, -hh); q.addColorStop(0, `rgba(${c},.35)`); q.addColorStop(1, `rgba(${c},.95)`); ctx.fillStyle = q; ctx.beginPath(); ctx.moveTo(-22 * s, 0); ctx.lineTo(-14 * s, -hh * .85); ctx.lineTo(0, -hh); ctx.lineTo(14 * s, -hh * .85); ctx.lineTo(22 * s, 0); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(-4 * s, -hh * .8, 4 * s, hh * .75); ctx.restore(); if (QUAL) glow(x + k * 34 * s, -hh * .4, 70 * s, `rgba(${c},.18)`); }
  },
  front(def, t) { const g = ctx.createLinearGradient(0, 100, 0, 440); g.addColorStop(0, 'rgba(120,100,255,0)'); g.addColorStop(1, 'rgba(120,100,255,.26)'); ctx.fillStyle = g; ctx.fillRect(def.bounds.l, 100, def.bounds.r - def.bounds.l, 340); },
  vig:.6, tint:'rgba(120,80,255,.07)',
};

// ---------------------------------------------------------------- 11. RUINES DU DÉSERT (nouveau)
THEMES.desert = {
  bg(def, t) {
    const hy = lyY(.3, 290);
    rays(W * .5, hy, 18, 900, .05, t, '255,230,160'); glow(W * .5, hy, 280, 'rgba(255,225,150,.95)', 'rgba(255,140,60,0)'); ctx.fillStyle = '#ffe8a8'; ctx.beginPath(); ctx.arc(W * .5, hy, 84, 0, 7); ctx.fill();
    blit(strip('des_p', 300, (g, w, h) => { ridge(g, w, h, 190, 26, 2, 5, 1, '#c8703a', '#a85a30'); for (const [fx, s] of [[.2, 1.2], [.55, .8], [.82, 1]]) wrapX(g, fx * w, 220, x => { g.fillStyle = '#b8603a'; g.beginPath(); g.moveTo(x - 130 * s, 200); g.lineTo(x, 200 - 150 * s); g.lineTo(x + 130 * s, 200); g.fill(); g.fillStyle = '#8a4428'; g.beginPath(); g.moveTo(x, 200 - 150 * s); g.lineTo(x + 130 * s, 200); g.lineTo(x + 20 * s, 200); g.fill(); }); }), .18, lyY(.18, 150));
    blit(strip('des_d1', 300, (g, w, h) => ridge(g, w, h, 150, 36, 2, 4, 2, '#d88a48', '#b86a38')), .34, lyY(.34, 220));
    blit(strip('des_d2', 300, (g, w, h) => ridge(g, w, h, 140, 28, 3, 6, 4, '#c27a3e', '#9a5a30')), .55, lyY(.55, 290));
    particles(60, (i, a, b, c) => { const x = ((a * W + t * (90 + c * 120)) % W), y = 200 + b * 300 + Math.sin(t * 2 + i) * 6; ctx.fillStyle = `rgba(255,220,160,${.2 + .3 * c})`; ctx.fillRect(x, y, 2.4, 1.6); });
    for (let i = 0; i < 3; i++) cloud(((i * 520 + t * 12 - cam.x * .08) % 1700) - 200, 50 + i * 36, 70, .22, '255,210,170');
  },
  back(def, t) {
    for (const x of [-760, -640, 640, 780]) { const hh = 150 + rr(x) * 200; const g = ctx.createLinearGradient(x - 30, 0, x + 30, 0); g.addColorStop(0, '#e0b078'); g.addColorStop(1, '#a8743c'); ctx.fillStyle = g; ctx.fillRect(x - 30, -hh, 60, hh + 4); ctx.fillStyle = '#c88e54'; ctx.fillRect(x - 38, -hh - 14, 76, 16); ctx.strokeStyle = 'rgba(80,40,20,.45)'; ctx.lineWidth = 2; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - 30, -hh + 30 + k * 40); ctx.lineTo(x + 30, -hh + 30 + k * 40); ctx.stroke(); } }
    ctx.fillStyle = '#c88e54'; ctx.fillRect(-720, -330, 80, 16); ctx.fillStyle = '#e0b078'; ctx.beginPath(); ctx.moveTo(-80, 0); ctx.lineTo(-60, -170); ctx.lineTo(60, -170); ctx.lineTo(80, 0); ctx.fill(); ctx.fillStyle = '#a8743c'; ctx.fillRect(-26, -150, 52, 150); ctx.strokeStyle = `rgba(255,200,90,${.5 + .4 * Math.sin(t * 2)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -108, 24, 0, 7); ctx.moveTo(0, -140); ctx.lineTo(0, -76); ctx.stroke();
    ctx.fillStyle = '#7a4a24'; for (const x of [-420, 380]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x - 6, -50, x + 4, -92); ctx.lineTo(x + 12, -92); ctx.quadraticCurveTo(x + 8, -40, x + 18, 0); ctx.fill(); ctx.fillStyle = '#4a8a3a'; ctx.beginPath(); ctx.arc(x + 8, -96, 12, 0, 7); ctx.fill(); ctx.fillStyle = '#7a4a24'; }
  },
  front(def, t) { ctx.fillStyle = 'rgba(255,200,120,.12)'; for (let i = 0; i < 5; i++) { const x = -1200 + i * 520 + Math.sin(t * .3 + i) * 60; ctx.beginPath(); ctx.ellipse(x, 380, 330, 28, 0, 0, 7); ctx.fill(); } },
  vig:.38, tint:'rgba(255,150,60,.08)',
};

// ---------------------------------------------------------------- 12. MANOIR HANTÉ (nouveau)
THEMES.haunted = {
  bg(def, t) {
    stars(30, t, .5);
    glow(W * .72, 120, 190, 'rgba(255,245,210,.45)', 'rgba(255,245,210,0)'); ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.arc(W * .72, 120, 54, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(190,180,150,.35)'; for (const [dx, dy, r] of [[-14, -8, 12], [16, 10, 9], [-4, 20, 7]]) { ctx.beginPath(); ctx.arc(W * .72 + dx, 120 + dy, r, 0, 7); ctx.fill(); }
    for (let i = 0; i < 4; i++) cloud(((i * 400 + t * 20 - cam.x * .1) % 1600) - 200, 50 + i * 36, 70, .35, '30,24,60');
    blit(strip('hau_m', 360, (g, w, h) => { ridge(g, w, h, 230, 30, 3, 6, 5, '#171230', '#0c0820'); wrapX(g, w * .4, 200, x => { g.fillStyle = '#120d28'; g.fillRect(x - 120, 100, 240, 140); g.beginPath(); g.moveTo(x - 140, 100); g.lineTo(x, 20); g.lineTo(x + 140, 100); g.fill(); g.fillRect(x - 100, 40, 30, 70); g.fillRect(x + 80, 50, 24, 60); g.beginPath(); g.moveTo(x - 106, 40); g.lineTo(x - 85, 8); g.lineTo(x - 64, 40); g.fill(); g.fillStyle = '#ffd36a'; for (const [dx, dy] of [[-70, 130], [-20, 130], [30, 130], [70, 130], [-45, 170], [45, 170]]) g.fillRect(x + dx, dy, 14, 22); }); }), .2, lyY(.2, 90));
    blit(strip('hau_t', 400, (g, w, h) => { ridge(g, w, h, 270, 18, 4, 9, 7, '#0e0a22', '#080618'); for (let i = 0; i < 8; i++) wrapX(g, (i + rr(i)) * w / 8, 130, x => { const s = .8 + rr(i + 3) * .7; g.strokeStyle = '#080618'; g.lineWidth = 9 * s; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + 8 * s, 230, x - 4 * s, 170); g.stroke(); g.lineWidth = 4 * s; for (const [dx, dy] of [[-50, 140], [40, 130], [-30, 100], [60, 105]]) { g.beginPath(); g.moveTo(x - 4 * s, 175); g.quadraticCurveTo(x + dx * .5 * s, 160, x + dx * s, 175 - (210 - dy) * .5 * s); g.stroke(); } }); }), .4, lyY(.4, 140));
    particles(7, (i, a, b, c) => { const x = ((a * 1500 + t * (50 + c * 70) - cam.x * .3) % 1500) - 150, y = 70 + b * 190 + Math.sin(t * 3 + i * 2) * 20; ctx.fillStyle = '#05030c'; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 9, y - 7 - Math.sin(t * 14 + i) * 5, x - 16, y - 2); ctx.quadraticCurveTo(x - 9, y + 2, x, y + 4); ctx.quadraticCurveTo(x + 9, y + 2, x + 16, y - 2); ctx.quadraticCurveTo(x + 9, y - 7 - Math.sin(t * 14 + i) * 5, x, y); ctx.fill(); });
    for (let k = 0; k < 3; k++) { const g = ctx.createLinearGradient(0, H * (.55 + k * .14), 0, H * (.7 + k * .14)); g.addColorStop(0, 'rgba(150,140,200,0)'); g.addColorStop(.5, `rgba(150,140,200,${.14 + k * .04})`); g.addColorStop(1, 'rgba(150,140,200,0)'); ctx.fillStyle = g; ctx.fillRect(((t * (10 + k * 8) + k * 300) % (W * 2)) - W, H * (.55 + k * .14), W * 2, H * .16); }
    if ((t * .35) % 7 < .22) { ctx.fillStyle = `rgba(220,230,255,${.5 * (1 - ((t * .35) % 7) / .22)})`; ctx.fillRect(0, 0, W, H); }
  },
  back(def, t) {
    for (let i = 0; i < 13; i++) { const x = -600 + i * 98 + rr(i) * 20, s = .8 + rr(i + 2) * .5; ctx.fillStyle = '#5a566e'; ctx.beginPath(); ctx.moveTo(x - 14 * s, 0); ctx.lineTo(x - 14 * s, -34 * s); ctx.arc(x, -34 * s, 14 * s, Math.PI, 0); ctx.lineTo(x + 14 * s, 0); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, -40 * s); ctx.lineTo(x, -20 * s); ctx.moveTo(x - 6 * s, -32 * s); ctx.lineTo(x + 6 * s, -32 * s); ctx.stroke(); }
    ctx.strokeStyle = '#3a3650'; ctx.lineWidth = 4; for (let x = -680; x < 700; x += 22) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, -54); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(-680, -44); ctx.lineTo(700, -44); ctx.stroke();
    for (let i = 0; i < 5; i++) { const x = -700 + i * 330 + Math.sin(t * .6 + i) * 40, y = -190 - rr(i) * 150 + Math.sin(t * 1.3 + i * 2) * 20; ctx.globalAlpha = .55 + .2 * Math.sin(t * 2 + i); ctx.fillStyle = '#e8e6ff'; ctx.beginPath(); ctx.arc(x, y, 18, Math.PI, 0); ctx.lineTo(x + 18, y + 30); for (let k = 3; k >= 0; k--) ctx.quadraticCurveTo(x - 9 + k * 9 + 4, y + 18 + (k % 2) * 12, x - 18 + k * 9, y + 30); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(x - 8, y - 4, 4, 6); ctx.fillRect(x + 4, y - 4, 4, 6); ctx.globalAlpha = 1; }
    for (const x of [-300, 240]) { ctx.fillStyle = '#ff9a3a'; ctx.beginPath(); ctx.arc(x, -14, 16, 0, 7); ctx.fill(); ctx.fillStyle = '#2a1608'; ctx.beginPath(); ctx.moveTo(x - 9, -18); ctx.lineTo(x - 4, -24); ctx.lineTo(x, -18); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, -18); ctx.lineTo(x + 5, -24); ctx.lineTo(x + 10, -18); ctx.fill(); ctx.fillRect(x - 8, -8, 16, 3); glow(x, -14, 50, `rgba(255,150,50,${.3 + .15 * Math.sin(t * 8 + x)})`); }
  },
  front(def, t) { const g = ctx.createLinearGradient(0, 120, 0, 420); g.addColorStop(0, 'rgba(160,150,210,0)'); g.addColorStop(1, 'rgba(160,150,210,.3)'); ctx.fillStyle = g; ctx.fillRect(def.bounds.l, 120, def.bounds.r - def.bounds.l, 300); },
  vig:.6, tint:'rgba(100,60,200,.07)',
};

// ================================================================ répartiteurs
function drawBackground(def, t) {
  const bg = def ? def.bg : ['#182a5a', '#3a2f6e', '#1a1330'];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, bg[0]); g.addColorStop(.6, bg[1]); g.addColorStop(1, bg[2]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if (!def) { stars(60, t, .8); return; }
  const th = THEMES[def.theme]; if (th) th.bg(def, t);
}
function worldBack(def, t) { const th = THEMES[def.theme]; if (th && th.back) th.back(def, t); }
function worldFront(def, t) { const th = THEMES[def.theme]; if (th && th.front) th.front(def, t); }
function drawPost(def) {                              // vignette + étalonnage couleur de l'ambiance
  const th = THEMES[def.theme]; if (!th) return;
  if (th.tint) { ctx.fillStyle = th.tint; ctx.fillRect(0, 0, W, H); }
  if (th.vig && QUAL > 0) vignette(th.vig);
}

