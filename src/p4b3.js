// ================================================================ PLATEFORMES (une apparence par style)
function shade(hex, k) {                              // éclaircit (k>0) ou assombrit (k<0) une couleur #rrggbb
  const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v + (k > 0 ? (255 - v) * k : v * k))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function vgrad(y0, y1, c0, c1) { const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }
function drawPlat(p, def, t) {
  const st = p.style || (p.soft ? 'plank' : 'grass'), x = p.x, y = p.y, w = p.w;
  if (!p.soft) {
    if (st !== 'cloud' && st !== 'space' && st !== 'crystal') { ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + 150, w * .42, 22, 0, 0, 7); ctx.fill(); }
    if (st === 'roof') {
      ctx.fillStyle = vgrad(y, y + 520, shade(def.body, .15), shade(def.body, -.5)); ctx.fillRect(x, y, w, 520);
      ctx.fillStyle = def.top; ctx.fillRect(x, y - 2, w, 12);
      ctx.shadowColor = '#4ae8ff'; ctx.shadowBlur = QUAL ? 12 : 0; ctx.fillStyle = '#4ae8ff'; ctx.fillRect(x, y + 10, w, 3); ctx.shadowBlur = 0;
      for (let r2 = 0; r2 < 12; r2++) for (let c2 = 0; c2 < Math.floor(w / 46); c2++) if (rr(r2 * 17 + c2 + Math.floor(x)) > .45) { ctx.fillStyle = rr(c2 + r2) > .5 ? 'rgba(255,230,140,.8)' : 'rgba(255,90,200,.7)'; ctx.fillRect(x + 12 + c2 * 46, y + 40 + r2 * 34, 20, 14); }
    } else if (st === 'bridge') {
      ctx.fillStyle = def.body; ctx.fillRect(x, y + 14, w, 26);
      ctx.fillStyle = vgrad(y, y + 16, shade(def.top, .12), shade(def.top, -.15)); ctx.fillRect(x, y - 2, w, 16);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; for (let px = x; px < x + w; px += 44) { ctx.beginPath(); ctx.moveTo(px, y - 2); ctx.lineTo(px, y + 14); ctx.stroke(); }
      ctx.fillStyle = '#6a4228'; for (let px = x + 20; px < x + w; px += 160) ctx.fillRect(px, y + 40, 10, 120);
    } else if (st === 'space') {
      ctx.fillStyle = vgrad(y, y + 130, '#2a2a70', '#0c0a2a'); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 130, y + 130); ctx.lineTo(x + 130, y + 130); ctx.fill();
      ctx.strokeStyle = 'rgba(120,160,255,.35)'; ctx.lineWidth = 1; for (let k = 1; k < 8; k++) { ctx.beginPath(); ctx.moveTo(x + k * w / 8, y); ctx.lineTo(x + 130 + (w - 260) * k / 8, y + 130); ctx.stroke(); }
      ctx.shadowColor = '#7ab8ff'; ctx.shadowBlur = QUAL ? 16 : 0; ctx.fillStyle = '#b0d8ff'; ctx.fillRect(x, y - 3, w, 4); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(160,200,255,.2)'; ctx.fillRect(x, y + 3, w, 18);
    } else if (st === 'cloud') {
      ctx.fillStyle = 'rgba(255,255,255,.97)'; ctx.beginPath(); ctx.moveTo(x, y + 10); for (let px = x; px < x + w; px += 50) ctx.arc(px + 25, y + 10, 30, Math.PI, 0); ctx.lineTo(x + w, y + 10); ctx.lineTo(x + w - 40, y + 70); ctx.lineTo(x + 40, y + 70); ctx.fill();
      ctx.fillStyle = vgrad(y + 30, y + 90, 'rgba(210,225,248,.95)', 'rgba(170,195,235,.75)'); ctx.beginPath(); ctx.moveTo(x + 20, y + 36); ctx.lineTo(x + w - 20, y + 36); ctx.lineTo(x + w - 50, y + 92); ctx.lineTo(x + 50, y + 92); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(x, y - 2, w, 6);
    } else if (st === 'rock') {
      ctx.fillStyle = vgrad(y, y + 200, shade(def.body, .45), shade(def.body, -.5)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      for (let k = 12; k >= 0; k--) ctx.lineTo(x + 60 + (w - 120) * k / 12, y + 90 + (k % 2 ? 70 : 20) + rr(k + x) * 40); ctx.fill();
      ctx.fillStyle = def.top; ctx.fillRect(x, y - 2, w, 12);
      ctx.shadowColor = '#ff6a10'; ctx.shadowBlur = QUAL ? 14 : 0; ctx.fillStyle = 'rgba(255,120,30,.95)'; ctx.fillRect(x + 6, y + 8, w - 12, 3); ctx.shadowBlur = 0;
      ctx.strokeStyle = `rgba(255,${100 + 50 * Math.sin(t * 2)},20,.8)`; ctx.lineWidth = 2; for (let k = 0; k < 6; k++) { const cx = x + 80 + rr(k) * (w - 160); ctx.beginPath(); ctx.moveTo(cx, y + 14); ctx.lineTo(cx + 10, y + 50); ctx.lineTo(cx - 4, y + 90); ctx.stroke(); }
    } else if (st === 'ice') {
      ctx.fillStyle = vgrad(y, y + 120, shade(def.body, .35), shade(def.body, -.3)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 60, y + 110); ctx.lineTo(x + 60, y + 110); ctx.fill();
      ctx.fillStyle = 'rgba(210,245,255,.85)'; for (let k = 0; k < 14; k++) { const ix = x + 40 + k * (w - 80) / 13; ctx.beginPath(); ctx.moveTo(ix - 8, y + 90 + (k % 3) * 8); ctx.lineTo(ix + 8, y + 90 + (k % 3) * 8); ctx.lineTo(ix, y + 130 + rr(k) * 40); ctx.fill(); }
      ctx.fillStyle = def.top; ctx.fillRect(x, y - 2, w, 12); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x, y - 2, w, 3);
      ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let k = 0; k < 8; k++) { const sx = x + rr(k + 3) * w, ph = (t * 1.5 + k) % 2; if (ph < .5) { ctx.fillRect(sx - 1, y - 3, 2, 8); ctx.fillRect(sx - 4, y, 8, 2); } }
    } else if (st === 'sand') {
      ctx.fillStyle = vgrad(y, y + 130, shade(def.body, .2), shade(def.body, -.35)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 80, y + 130); ctx.lineTo(x + 80, y + 130); ctx.fill();
      ctx.fillStyle = def.top; ctx.fillRect(x, y - 2, w, 12); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x, y - 2, w, 3);
      ctx.fillStyle = '#e8b0a0'; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.arc(x + 80 + k * (w - 160) / 8, y + 4, 4, Math.PI, 0); ctx.fill(); }
    } else if (st === 'crystal') {
      ctx.fillStyle = vgrad(y, y + 180, '#3a2a90', '#0c0830'); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      for (let k = 14; k >= 0; k--) ctx.lineTo(x + 40 + (w - 80) * k / 14, y + 70 + (k % 2 ? 90 : 30) + rr(k + x) * 50); ctx.fill();
      ctx.strokeStyle = 'rgba(160,140,255,.35)'; ctx.lineWidth = 1.5; for (let k = 0; k < 9; k++) { ctx.beginPath(); ctx.moveTo(x + 60 + k * (w - 120) / 8, y + 6); ctx.lineTo(x + 100 + k * (w - 200) / 8, y + 100 + rr(k) * 30); ctx.stroke(); }
      ctx.fillStyle = '#5a46d8'; ctx.fillRect(x, y - 2, w, 12); ctx.shadowColor = '#9a8aff'; ctx.shadowBlur = QUAL ? 16 : 0; ctx.fillStyle = '#c8baff'; ctx.fillRect(x, y - 3, w, 3); ctx.shadowBlur = 0;
      for (let k = 0; k < 7; k++) { const cx = x + 60 + rr(k + 2) * (w - 120), hh = 14 + rr(k) * 22; ctx.fillStyle = k % 2 ? 'rgba(120,230,255,.9)' : 'rgba(210,140,255,.9)'; ctx.beginPath(); ctx.moveTo(cx - 5, y - 2); ctx.lineTo(cx, y - 2 - hh); ctx.lineTo(cx + 5, y - 2); ctx.fill(); }
    } else if (st === 'ruin') {
      ctx.fillStyle = vgrad(y, y + 150, '#d8a468', '#7a4a28'); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 60, y + 140); ctx.lineTo(x + 60, y + 140); ctx.fill();
      ctx.strokeStyle = 'rgba(70,35,15,.5)'; ctx.lineWidth = 2; for (let r2 = 1; r2 < 5; r2++) { ctx.beginPath(); ctx.moveTo(x + 8 + r2 * 12, y + r2 * 28); ctx.lineTo(x + w - 8 - r2 * 12, y + r2 * 28); ctx.stroke(); for (let c2 = 0; c2 < w / 90; c2++) { const bx = x + 10 + r2 * 12 + ((c2 + (r2 % 2) * .5) * 90); if (bx < x + w - 20) { ctx.beginPath(); ctx.moveTo(bx, y + (r2 - 1) * 28); ctx.lineTo(bx, y + r2 * 28); ctx.stroke(); } } }
      ctx.fillStyle = '#f0cd8a'; ctx.fillRect(x, y - 3, w, 13); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x, y - 3, w, 3); ctx.fillStyle = '#e8c07a'; for (let k = 0; k < 14; k++) { ctx.beginPath(); ctx.arc(x + 30 + k * (w - 60) / 13, y - 3, 6 + rr(k) * 5, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = '#4a8a3a'; for (let k = 0; k < 5; k++) ctx.fillRect(x + 60 + k * (w - 120) / 4, y - 7, 3, 7);
    } else if (st === 'grave') {
      ctx.fillStyle = vgrad(y, y + 150, '#4a4660', '#14101e'); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 70, y + 140); ctx.lineTo(x + 70, y + 140); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 2; for (let r2 = 1; r2 < 5; r2++) { ctx.beginPath(); ctx.moveTo(x + 10 + r2 * 14, y + r2 * 28); ctx.lineTo(x + w - 10 - r2 * 14, y + r2 * 28); ctx.stroke(); }
      ctx.fillStyle = '#5a7a4a'; ctx.fillRect(x, y - 3, w, 13); ctx.fillStyle = 'rgba(180,255,150,.25)'; ctx.fillRect(x, y - 3, w, 3);
      ctx.fillStyle = '#6a8a58'; for (let px = x; px < x + w; px += 20) { ctx.beginPath(); ctx.moveTo(px, y - 3); ctx.lineTo(px + 4, y - 11 - rr(px) * 6); ctx.lineTo(px + 8, y - 3); ctx.fill(); }
      ctx.fillStyle = 'rgba(80,140,70,.6)'; for (let k = 0; k < 10; k++) ctx.fillRect(x + 80 + rr(k + 5) * (w - 160), y + 14 + rr(k) * 100, 22, 8);
    } else {                                            // 'grass'
      ctx.fillStyle = vgrad(y, y + 140, shade(def.body, .12), shade(def.body, -.4)); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w - 70, y + 140); ctx.lineTo(x + 70, y + 140); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let k = 0; k < 20; k++) ctx.fillRect(x + 90 + rr(k) * (w - 180), y + 24 + rr(k + 9) * 100, 14, 6);
      ctx.fillStyle = vgrad(y - 2, y + 14, shade(def.top, .1), shade(def.top, -.25)); ctx.fillRect(x, y - 2, w, 14); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y - 2, w, 3);
      ctx.fillStyle = def.top; for (let px = x; px < x + w; px += 16) { ctx.beginPath(); ctx.moveTo(px, y - 2); ctx.lineTo(px + 4, y - 9 - rr(px) * 5); ctx.lineTo(px + 8, y - 2); ctx.fill(); }
    }
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.fillRect(x + 6, y + 10, w - 12, 5);
    if (st === 'cloud') { ctx.fillStyle = 'rgba(255,255,255,.96)'; ctx.beginPath(); for (let px = x; px < x + w; px += 40) ctx.arc(px + 20, y + 6, 20, 0, 7); ctx.fill(); ctx.fillRect(x + 10, y + 6, w - 20, 12); }
    else if (st === 'ice') { ctx.fillStyle = def.soft; ctx.fillRect(x, y, w, 10); ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(x, y, w, 3); ctx.fillStyle = 'rgba(190,235,255,.75)'; for (let px = x + 10; px < x + w - 10; px += 30) { ctx.beginPath(); ctx.moveTo(px, y + 10); ctx.lineTo(px + 8, y + 10); ctx.lineTo(px + 4, y + 26); ctx.fill(); } }
    else if (st === 'wood') { ctx.fillStyle = '#6a4a28'; ctx.fillRect(x, y + 2, w, 12); ctx.fillStyle = def.soft; ctx.fillRect(x, y, w, 7); ctx.fillStyle = '#4aa84a'; for (let px = x; px < x + w; px += 14) { ctx.beginPath(); ctx.arc(px + 6, y, 7, Math.PI, 0); ctx.fill(); } }
    else if (st === 'crystal') { ctx.shadowColor = '#9a8aff'; ctx.shadowBlur = QUAL ? 12 : 0; ctx.fillStyle = '#6a56e8'; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + 14, y); ctx.lineTo(x + w - 14, y); ctx.lineTo(x + w, y + 4); ctx.lineTo(x + w - 20, y + 14); ctx.lineTo(x + 20, y + 14); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#d0c4ff'; ctx.fillRect(x + 14, y, w - 28, 2); }
    else if (st === 'ruin') { ctx.fillStyle = '#9a6a3a'; ctx.fillRect(x, y + 2, w, 14); ctx.fillStyle = '#e8c07a'; ctx.fillRect(x, y, w, 7); ctx.fillStyle = 'rgba(70,35,15,.45)'; for (let px = x + 30; px < x + w; px += 50) ctx.fillRect(px, y + 2, 2, 14); }
    else if (st === 'grave') { ctx.fillStyle = '#3a364c'; ctx.fillRect(x, y + 2, w, 14); ctx.fillStyle = '#6a8a58'; ctx.fillRect(x, y, w, 7); ctx.fillStyle = 'rgba(180,255,150,.25)'; ctx.fillRect(x, y, w, 2); }
    else { ctx.fillStyle = def.soft; ctx.fillRect(x, y, w, 9); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(x, y, w, 3); if (def.theme === 'city') { ctx.shadowColor = def.soft; ctx.shadowBlur = QUAL ? 12 : 0; ctx.fillRect(x, y + 6, w, 3); ctx.shadowBlur = 0; } }
  }
}

