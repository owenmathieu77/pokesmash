// ================================================================ RENDU
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
canvas.width = W; canvas.height = H;
let fdt = 0, rScale = 1, fpsAvg = 60;
function setRenderScale(s) {                         // résolution interne réduite sur les appareils lents (moins de pixels à remplir)
  if (s === rScale) return; rScale = s; canvas.width = Math.round(W * s); canvas.height = Math.round(H * s);
}
function applyQuality(q) { QUAL = q; setRenderScale(q === 0 ? .75 : 1); }
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  canvas.style.width = Math.floor(W * s) + 'px'; canvas.style.height = Math.floor(H * s) + 'px';
}
addEventListener('resize', fit); fit();

const portraitImgs = {};
function getPortrait(ch, shiny) {
  const id = ch.custom ? ch.custom.head : ch.id, key = id + (shiny ? '*' : '');
  let im = portraitImgs[key];
  if (!im) {
    im = new Image(); im.crossOrigin = 'anonymous';
    im.onerror = function () { if (shiny && !this.__fb) { this.__fb = true; this.__hue = shinyHue(ch); this.src = BASE + 'portrait/' + id + '/Normal.png'; } };
    im.src = BASE + 'portrait/' + id + (shiny ? '/0000/0001' : '') + '/Normal.png'; portraitImgs[key] = im;
  }
  return im.complete && im.naturalWidth > 0 ? im : null;
}
function drawPortrait(im, x, y, s) {
  ctx.imageSmoothingEnabled = false;
  if (im.__hue && ctx.filter !== undefined) { ctx.filter = 'hue-rotate(' + im.__hue + 'deg) saturate(1.2)'; ctx.drawImage(im, x, y, s, s); ctx.filter = 'none'; } else ctx.drawImage(im, x, y, s, s);
}
function pickAnim(sp, names) { if (!sp) return null; for (const n of names) if (sp.anims[n]) return sp.anims[n]; return null; }
function animFor(f) {
  if (G.scene === 'over' && f.idx === G.winner) return { n:['Pose','Idle'], mode:'loop' };
  switch (f.state) {
    case 'hurt':    return { n:['Hurt','Pain','Cringe','Idle'], mode:'loop' };
    case 'stun':    return { n:['Pain','LostBalance','Hurt','Cringe'], mode:'loop' };
    case 'grabbed': return { n:['Cringe','Hurt','Pain'], mode:'loop' };
    case 'hold':    return { n:['Pull','Strike','Idle'], mode:'loop' };
    case 'shield':  return { n:['Sit','Idle'], mode:'loop' };
    case 'dodge':   return { n:['Hop','Rotate','Walk','Idle'], mode:'loop' };
    case 'spawn':   return { n:['Float','Hop','Idle'], mode:'loop' };
    case 'ledge':   return { n:['Sit','Hop','Float','Idle'], mode:'loop' };
    case 'attack':  return { n:f.move.anim, mode:'prog', p:f.mt / f.move.dur };
  }
  if (!f.grounded) return { n:['Hop','Float','Walk','Idle'], mode:'loop' };
  if (Math.abs(f.vx) > 30) return { n:['Walk','Idle'], mode:'loop' };
  return { n:['Idle'], mode:'loop' };
}

// ---------------------------------------------------------------- CAMÉRA (suit les combattants, dézoome si besoin)
const cam = { x:0, y:-150, z:.7, init:false };
const hudTop = () => wantTouch();           // sur téléphone, les boutons occupent le bas : le HUD passe en haut
function updateCamera(dt) {
  if (G.scene === 'replay' && REP.free) { cam.x = REP.cam.x; cam.y = REP.cam.y; cam.z = REP.cam.z; cam.init = true; return; }
  const bd = G.stage.bounds, pts = G.fighters.filter(f => f.state !== 'dead' && f.stocks > 0).map(f => [f.x, f.y - f.ch.h / 2]);
  if (G.ball) pts.push([G.ball.x, G.ball.y]);                   // la Boule Smash reste toujours visible
  let tx = 0, ty = -150, z = .6;
  const cn = G.cine && G.cine.t > 0 ? G.fighters[G.cine.idx] : (G.evo && G.evo.t > 0 ? G.fighters[G.evo.idx] : null);
  if (cn) { tx = cn.x; ty = cn.y - cn.ch.h / 2; z = 1.15; }
  else if (SET.game.camera && pts.length) {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const bw = Math.max(560, x1 - x0 + 560), bh = Math.max(340, y1 - y0 + 440);
    z = clamp(Math.min(W / bw, (H - 80) / bh), .45, 1);
    tx = (x0 + x1) / 2; ty = (y0 + y1) / 2 + (hudTop() ? -34 : 38) / z;
    const vw = W / z, vh = H / z;
    tx = (bd.r - bd.l > vw) ? clamp(tx, bd.l + vw / 2, bd.r - vw / 2) : (bd.l + bd.r) / 2;
    ty = (bd.b - bd.t > vh) ? clamp(ty, bd.t + vh / 2, bd.b - vh / 2) : (bd.t + bd.b) / 2;
  }
  if (!cam.init) { cam.x = tx; cam.y = ty; cam.z = z; cam.init = true; return; }
  const k = Math.min(1, dt * 4.5);
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (z - cam.z) * Math.min(1, dt * 3);
}

// ---------------------------------------------------------------- PERSONNAGES
function drawFighter(f) {
  if (f.state === 'dead') return;
  const ch = f.ch;
  if (f.state === 'spawn') { ctx.fillStyle = 'rgba(120,200,255,.55)'; ctx.fillRect(f.x - 48, f.y + 2, 96, 6); }
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(f.x, f.y + 2, ch.w * .6, 5, 0, 0, Math.PI * 2); ctx.fill();
  let alpha = 1;
  if (f.inv > 0 && !(f.star > 0) && Math.floor(f.inv * 12) % 2 === 0 && f.state !== 'spawn' && f.state !== 'dodge') alpha = .45;
  if (f.ghost === 1) alpha = .25; else if (f.ghost === 2) alpha = .6;
  if (f.state === 'dodge') alpha = .5;
  ctx.globalAlpha = alpha;
  const cy = f.y - ch.h / 2;
  if (f.ultReady || (f.state === 'attack' && f.mname === 'ult')) {
    const tt = performance.now() / 1000, pu = .5 + .5 * Math.sin(tt * 9), big = f.mname === 'ult' && f.state === 'attack' ? 1.5 : 1;
    ctx.globalAlpha = 1; if (QUAL) glow(f.x, cy, ch.h * (1.2 + .2 * pu) * big, `hsla(${(tt * 300) % 360},100%,65%,${.28 + .18 * pu})`, 'rgba(255,230,120,0)');
    ctx.strokeStyle = `hsla(${(tt * 300) % 360},100%,70%,.85)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x, cy, ch.w * (1 + .1 * pu), ch.h * (.85 + .1 * pu), 0, 0, 7); ctx.stroke();
    ctx.globalAlpha = alpha; ctx.font = '14px system-ui,sans-serif'; ctx.textAlign = 'center';
    for (let i = 0; i < 4; i++) { const a2 = tt * 2.4 + i * 1.57; ctx.fillText('✦', f.x + Math.cos(a2) * ch.w * 1.1, cy + Math.sin(a2) * ch.h * .7); }
  }
  if (f.buff > 0) { ctx.fillStyle = 'rgba(255,120,60,.25)'; ctx.beginPath(); ctx.ellipse(f.x, cy, ch.w * .9, ch.h * .75, 0, 0, Math.PI * 2); ctx.fill(); }
  if (f.star > 0) { ctx.fillStyle = `hsla(${(G.time * 600) % 360},100%,60%,.35)`; ctx.beginPath(); ctx.ellipse(f.x, cy, ch.w * 1.0, ch.h * .8, 0, 0, Math.PI * 2); ctx.fill(); }
  const af = animFor(f), an = pickAnim(f.sp, af.n), key = af.n[0] + f.state, gs = f.giant > 0 ? 1.3 : 1;
  if (gs !== 1) { ctx.save(); ctx.translate(f.x, f.y); ctx.scale(gs, gs); ctx.translate(-f.x, -f.y); }
  if (key !== f.akey) { f.akey = key; f.at = 0; }
  f.at += fdt;
  if (an) {
    const n = an.durs.length; let fi = 0;
    if (af.mode === 'prog') fi = Math.min(n - 1, Math.floor(clamp(af.p, 0, .999) * n));
    else {
      const total = an.durs.reduce((a, b) => a + b, 0) / 60 || 1; let t = (f.at % total) * 60, acc = 0;
      for (let i = 0; i < n; i++) { acc += an.durs[i]; if (t < acc) { fi = i; break; } }
    }
    const row = f.face > 0 ? 2 : 6, an2 = an.anch && an.anch[row] && an.anch[row][fi];
    const ok2 = an2 && an2.y > an.fh * .35, ax = ok2 ? an2.x : an.fw / 2, ay = ok2 ? an2.y : an.fh - 6;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(an.img, fi * an.fw, row * an.fh, an.fw, an.fh, Math.round(f.x - ax * SC), Math.round(f.y - ay * SC), an.fw * SC, an.fh * SC);
  } else {
    ctx.fillStyle = ch.color; ctx.beginPath(); ctx.roundRect(f.x - ch.w / 2, f.y - ch.h, ch.w, ch.h, 8); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(f.x + f.face * 6 - 3, f.y - ch.h + 12, 6, 6);
  }
  if (f.status) {
    const tt2 = performance.now() / 1000;
    if (f.status === 'burn') for (let i = 0; i < 5; i++) { const ph = (tt2 * 2.2 + i * .37) % 1; ctx.fillStyle = `rgba(255,${120 + 100 * ph},30,${1 - ph})`; ctx.beginPath(); ctx.ellipse(f.x + (i - 2) * ch.w * .25, f.y - ch.h * (.15 + .8 * ph), 5 * (1 - ph * .5), 8 * (1 - ph * .4), 0, 0, 7); ctx.fill(); }
    else if (f.status === 'poison') for (let i = 0; i < 5; i++) { const ph = (tt2 * 1.2 + i * .31) % 1; ctx.strokeStyle = `rgba(190,100,240,${1 - ph})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x + Math.sin(tt2 * 3 + i) * ch.w * .4, f.y - ch.h * (.1 + .9 * ph), 3 + i % 3, 0, 7); ctx.stroke(); }
    else if (f.status === 'para') { ctx.strokeStyle = '#ffe84a'; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { if (Math.sin(tt2 * 30 + i * 2) > -.2) { ctx.beginPath(); let x = f.x + (i - 1) * ch.w * .35, y = f.y - ch.h; ctx.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (Math.random() - .5) * 14; y += ch.h * .24; ctx.lineTo(x, y); } ctx.stroke(); } } }
  }
  if (f.charge > 0 && f.state === 'attack') {
    const bw = 46, bx = f.x - bw / 2, by = f.y - ch.h - 36;
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 9); ctx.fillStyle = `hsl(${55 - 55 * f.charge},100%,55%)`; ctx.fillRect(bx, by, bw * f.charge, 5);
    if (f.charge >= .99) { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MAX', f.x, by - 4); }
  }
  if (f.state === 'stun' && f.frozen > 0) { ctx.fillStyle = 'rgba(150,230,255,.55)'; ctx.strokeStyle = '#e8fbff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(f.x - ch.w * .62, f.y - ch.h * 1.05, ch.w * 1.24, ch.h * 1.1, 8); ctx.fill(); ctx.stroke(); }
  if (gs !== 1) ctx.restore();
  ctx.globalAlpha = 1;
  if (f.state === 'attack' && (f.mname === 'sword' || f.mname === 'hammer')) {
    const p = clamp(f.mt / f.move.dur, 0, 1), ang = f.face * (-1.9 + p * 3.2);
    ctx.save(); ctx.translate(f.x + f.face * 6, f.y - ch.h * .55); ctx.rotate(ang); ctx.font = (f.mname === 'hammer' ? 54 : 46) + 'px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ITEMS[f.mname].emoji, 0, -26); ctx.restore();
  }
  if (f.barrier > 0) { ctx.strokeStyle = 'rgba(120,200,255,.8)'; ctx.fillStyle = 'rgba(120,200,255,.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(f.x, cy, ch.h * .72, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  if (f.state === 'shield') {
    const rr = ch.h * .62 * (.55 + .5 * clamp(f.shield / 100, 0, 1));
    ctx.fillStyle = tcol(f) + '55'; ctx.strokeStyle = tcol(f);
    ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, cy, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  if (f.state === 'attack' && f.move && f.move.hs !== undefined && f.mt >= f.move.hs && f.mt <= f.move.he) {
    const b = f.move.box, bx = f.face > 0 ? f.x + b.x : f.x - b.x - b.w;
    if (f.move.kind === 'beam') { ctx.fillStyle = ch.color + 'bb'; ctx.fillRect(bx, f.y + b.y, b.w, b.h); ctx.fillStyle = '#ffffffcc'; ctx.fillRect(bx, f.y + b.y + b.h * .3, b.w, b.h * .4); }
    else if (SET.game.hitboxes) { ctx.strokeStyle = 'rgba(255,60,60,.9)'; ctx.lineWidth = 2; ctx.strokeRect(bx, f.y + b.y, b.w, b.h); }
    else { ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 2; ctx.strokeRect(bx, f.y + b.y, b.w, b.h); }
  }
  if (SET.game.hitboxes) { ctx.strokeStyle = 'rgba(80,255,80,.8)'; ctx.lineWidth = 1; ctx.strokeRect(f.x - ch.w / 2, f.y - ch.h, ch.w, ch.h); }
  const col = tcol(f), ty = f.y - ch.h - 22;
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(f.x, ty + 12); ctx.lineTo(f.x - 7, ty); ctx.lineTo(f.x + 7, ty); ctx.fill();
  ctx.font = 'bold 12px system-ui,sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(f.kind === 'cpu' ? 'CPU' : 'P' + (f.idx + 1), f.x, ty - 3);
  if (f.held && ITEMS[f.held]) { ctx.font = '20px system-ui,sans-serif'; ctx.fillText(ITEMS[f.held].emoji, f.x + ch.w / 2 + 6, f.y - ch.h * .7); }
}

function drawProj(p) {
  if (p.item) {
    ctx.font = '26px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(ITEMS[p.item].emoji, p.x, p.y + 9);
    if (p.still && p.fuse < .4 && Math.floor(p.fuse * 20) % 2 === 0) { ctx.fillStyle = 'rgba(255,80,60,.4)'; ctx.beginPath(); ctx.arc(p.x, p.y, 20, 0, Math.PI * 2); ctx.fill(); }
    return;
  }
  const a = clamp(p.life / p.max, 0, 1);
  const r = p.r * (p.mine ? 1 : (p.p.dmg >= 9 && !p.p.boom ? .8 + .4 * (1 - a) : 1));
  const col = p.p.color || p.owner.ch.color;
  const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r * 1.8);
  g.addColorStop(0, '#fff'); g.addColorStop(.35, col); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.8, 0, Math.PI * 2); ctx.fill();
  if (p.mine) { ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke(); }
}
function drawItem(it, t) {
  if (it.life < 4 && Math.floor(it.life * 6) % 2 === 0) return;
  const bob = it.landed ? Math.sin(t * 4 + it.x) * 3 : 0, d = ITEMS[it.type];
  const g = ctx.createRadialGradient(it.x, it.y - 18 + bob, 2, it.x, it.y - 18 + bob, 26);
  g.addColorStop(0, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(it.x, it.y - 18 + bob, 26, 0, Math.PI * 2); ctx.fill();
  ctx.font = '26px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText(d.emoji, it.x, it.y - 9 + bob);
}

// ---------------------------------------------------------------- HUD
function drawHud() {
  const fs = G.fighters.filter(f => !f.hidden && !(G.horde && f.team === 1 && f.stocks <= 0)), n = fs.length, gap = 10, pw = Math.min(380, (W - 40 - (n - 1) * gap) / n);
  const x0 = (W - (n * pw + (n - 1) * gap)) / 2, y = hudTop() ? 32 : H - 86, compact = pw < 300;
  if (n > 4) { drawHudMini(fs); return; }
  fs.forEach((f, i) => {
    const x = x0 + i * (pw + gap);
    ctx.fillStyle = 'rgba(8,10,24,.72)'; ctx.beginPath(); ctx.roundRect(x, y, pw, 72, 12); ctx.fill();
    ctx.strokeStyle = tcol(f); ctx.lineWidth = 2; ctx.stroke();
    const pt = getPortrait(f.ch, f.shiny), ps = compact ? 52 : 60;
    if (pt) drawPortrait(pt, x + 8, y + 8, ps); else { ctx.fillStyle = f.ch.color; ctx.fillRect(x + 8, y + 8, ps, ps); }
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.font = 'bold ' + (compact ? 12 : 15) + 'px system-ui,sans-serif';
    ctx.fillText((f.kind === 'cpu' ? 'CPU ' + f.lvl : 'P' + (f.idx + 1)) + ' · ' + f.ch.name + (f.shiny ? ' ✨' : ''), x + ps + 16, y + 20);
    const kk = clamp(f.pct / 160, 0, 1);
    ctx.fillStyle = `rgb(255,${Math.round(255 - 200 * kk)},${Math.round(255 - 215 * kk)})`;
    ctx.font = 'bold ' + (compact ? 28 : 34) + 'px system-ui,sans-serif';
    ctx.fillText(Math.floor(f.pct) + '%', x + ps + 16, y + 58);
    const ms = Math.max(1, f.maxStocks || 3);
    for (let s = 0; s < ms; s++) {
      ctx.fillStyle = s < f.stocks ? f.ch.color : 'rgba(255,255,255,.15)';
      ctx.beginPath(); ctx.arc(x + pw - 16 - s * 16, y + 38, 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x + pw - 76, y + 56, 62, 6);
    ctx.fillStyle = '#9fd8ff'; ctx.fillRect(x + pw - 76, y + 56, 62 * clamp(f.shield / 100, 0, 1), 6);
    if (f.ult > 0 || f.ultReady) {
      const bx0 = x + ps + 16, bw = pw - ps - 30; ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(bx0, y + 64, bw, 5);
      ctx.fillStyle = f.ultReady ? `hsl(${(performance.now() / 3) % 360},100%,60%)` : '#ffd93b'; ctx.fillRect(bx0, y + 64, bw * (f.ultReady ? 1 : f.ult / 100), 5);
      if (f.ultReady) { ctx.font = 'bold 10px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText('⭐ SMASH PRÊT', bx0, y + 62); }
    }
    const eff = (f.buff > 0 ? '💪' : '') + (f.haste > 0 ? '👟' : '') + (f.barrier > 0 ? '🛡️' : '') + (f.star > 0 ? '⭐' : '') + (f.status === 'burn' ? '🔥' : f.status === 'para' ? '⚡' : f.status === 'poison' ? '☠️' : '') + (f.giant > 0 ? '🍄' : '') + (f.regen > 0 ? '🌿' : '') + (f.jumpB > 0 ? '🚀' : '') + (f.held ? ITEMS[f.held].emoji + (f.uses > 0 ? f.uses : '') : '');
    if (eff) { ctx.font = '13px system-ui,sans-serif'; ctx.textAlign = 'right'; ctx.fillText(eff, x + pw - 12, y + 18); }
  });
}
function drawHudMini(fs) {                              // 5 à 8 combattants : panneaux compacts
  const n = fs.length, g = 5, pw = (W - 12 - (n - 1) * g) / n, y = hudTop() ? 32 : H - 70;
  fs.forEach((f, i) => {
    const x = 6 + i * (pw + g);
    ctx.fillStyle = 'rgba(8,10,24,.74)'; ctx.beginPath(); ctx.roundRect(x, y, pw, 62, 8); ctx.fill(); ctx.strokeStyle = tcol(f); ctx.lineWidth = 2; ctx.stroke();
    const pt = getPortrait(f.ch, f.shiny);
    if (pt) drawPortrait(pt, x + 4, y + 4, 34); else { ctx.fillStyle = f.ch.color; ctx.fillRect(x + 4, y + 4, 34, 34); }
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui,sans-serif';
    ctx.fillText((f.kind === 'cpu' ? 'CPU' : 'P' + (f.idx + 1)) + (f.shiny ? '✨' : ''), x + 42, y + 14);
    ctx.font = '9px system-ui,sans-serif'; ctx.fillStyle = '#cfd6ff'; ctx.fillText(f.ch.name.slice(0, 9), x + 42, y + 26);
    const kk = clamp(f.pct / 160, 0, 1); ctx.fillStyle = `rgb(255,${Math.round(255 - 200 * kk)},${Math.round(255 - 215 * kk)})`; ctx.font = 'bold 18px system-ui,sans-serif'; ctx.fillText(Math.floor(f.pct) + '%', x + 6, y + 56);
    const ms = Math.max(1, f.maxStocks || 3);
    for (let s = 0; s < ms; s++) { ctx.fillStyle = s < f.stocks ? f.ch.color : 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(x + pw - 8 - s * 9, y + 54, 3.6, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x + 42, y + 32, pw - 48, 4); ctx.fillStyle = '#9fd8ff'; ctx.fillRect(x + 42, y + 32, (pw - 48) * clamp(f.shield / 100, 0, 1), 4);
    if (f.ult > 0 || f.ultReady) { ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(x + 42, y + 39, pw - 48, 3); ctx.fillStyle = f.ultReady ? `hsl(${(performance.now() / 3) % 360},100%,60%)` : '#ffd93b'; ctx.fillRect(x + 42, y + 39, (pw - 48) * (f.ultReady ? 1 : f.ult / 100), 3); }
  });
}
const HINT_K = [ 'WASD (ZQSD sur AZERTY) bouger/sauter · F attaque · G spécial · H bouclier · T grab', 'Flèches bouger/sauter · K attaque · L spécial · ; bouclier · O grab' ];
function drawHints() {
  const lines = [];
  if (G.net === 'guest') lines.push(['Vous (P' + (G.me + 1) + ')', PCOL[Math.max(0, G.me) % 8], hintText(0) + ' (ou ' + hintText(1) + ')']);
  else for (const f of G.fighters) if (f.kind === 'human') lines.push(['P' + (f.idx + 1), tcol(f), hintText(f.slot)]);
  if (G.net === 'host') lines.length = 1;
  if (wantTouch()) { lines.length = 0; lines.push(['Tactile', PCOL[0], 'joystick = bouger · Saut · Attaque · Spécial · 🛡 bouclier · Grab']); }
  ctx.save(); ctx.textAlign = 'center'; ctx.font = '12px system-ui,sans-serif';
  const y0 = hudTop() ? 150 : 74;
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(W / 2 - 400, y0 - 14, 800, lines.length * 18 + 22);
  lines.forEach((l, i) => { ctx.fillStyle = l[1]; ctx.fillText(l[0] + ' : ' + l[2], W / 2, y0 + i * 18); });
  ctx.fillStyle = '#cfd6ff'; ctx.fillText('Grab = bouclier + attaque · Ramassez les objets · Pause : ' + (wantTouch() ? 'bouton en haut à droite' : 'Échap') + ' · Réglages dans le menu', W / 2, y0 + lines.length * 18);
  ctx.restore();
}

function drawFight(t) {
  updateCamera(fdt);
  const def = G.stage;
  drawBackground(def, t);
  if (G.darkT > 0) { G.darkT -= fdt; ctx.fillStyle = `rgba(8,0,24,${.55 * Math.min(1, G.darkT / .4)})`; ctx.fillRect(0, 0, W, H); }
  ctx.save();
  ctx.translate(W / 2, H / 2); ctx.scale(cam.z, cam.z); ctx.translate(-cam.x, -cam.y);
  if (G.shake > 0) ctx.translate(rnd(-1, 1) * G.shake * .6, rnd(-1, 1) * G.shake * .6);
  worldBack(def, t);
  for (const p of G.plats) drawPlat(p, def, t);
  for (const it of G.items) drawItem(it, t);
  for (const f of G.fighters) drawFighter(f);
  for (const p of G.projs) drawProj(p);
  for (const hz of G.hazards) drawHazard(hz, t);
  if (G.ball) drawBall(G.ball, t);
  for (const s of G.sparks) { ctx.globalAlpha = clamp(s.life / s.max, 0, 1); ctx.fillStyle = s.color; ctx.fillRect(s.x, s.y, s.r, s.r); }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  for (const tx of G.texts) { ctx.globalAlpha = clamp(tx.life / tx.max * 1.5, 0, 1); ctx.font = 'bold 16px system-ui,sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(tx.text, tx.x, tx.y); ctx.fillStyle = tx.color; ctx.fillText(tx.text, tx.x, tx.y); }
  ctx.globalAlpha = 1;
  worldFront(def, t);
  ctx.restore();
  drawPost(def);
  drawWind(); drawCine(); drawEvo(); drawBanner();
  drawHud();
  ctx.textAlign = 'center';
  if (G.go > 0) G.go -= fdt;
  if (G.cd > 0 || G.go > 0) {
    ctx.save(); ctx.textAlign = 'center'; ctx.font = 'bold 120px system-ui,sans-serif'; ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    const txt = G.cd > 1.6 ? '3' : G.cd > .8 ? '2' : G.cd > 0 ? '1' : 'GO!';
    ctx.fillStyle = G.cd > 0 ? '#ffffff' : '#ffd93b'; ctx.strokeText(txt, W / 2, 250); ctx.fillText(txt, W / 2, 250); ctx.restore();
  }
  if (G.time < 7 && G.scene === 'fight' && SET.game.hints && !(G.cine && G.cine.t > 0)) drawHints();
  if (G.horde) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 190, 4, 380, 26); ctx.fillStyle = '#ff9a6a'; ctx.font = 'bold 16px system-ui,sans-serif';
    ctx.fillText('SURVIE · Vague ' + G.horde.wave + ' · Score ' + G.horde.score + ' · K.O. ' + G.horde.kills, W / 2, 23);
    if (G.horde.state === 'prep' && G.horde.t > 0 && G.horde.wave > 0) { ctx.fillStyle = '#fff'; ctx.fillText('Prochaine vague dans ' + Math.ceil(G.horde.t) + '…', W / 2, 48); }
  } else if (G.arcade) {
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(W / 2 - 150, 4, 300, 26);
    ctx.fillStyle = '#ffd93b'; ctx.font = 'bold 16px system-ui,sans-serif';
    ctx.fillText('ARCADE  ·  Combat ' + G.arcade.n + '/' + G.arcade.total + '  ·  Score ' + G.arcade.score, W / 2, 23);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(W / 2 - 110, 4, 220, 22);
    ctx.fillStyle = '#e8ecff'; ctx.font = '13px system-ui,sans-serif'; ctx.fillText(def.name, W / 2, 20);
  }
  const noSp = G.fighters.some(f => !f.sp || !f.sp.ok);
  if (noSp && G.time > 3) { ctx.fillStyle = 'rgba(255,160,60,.95)'; ctx.font = '13px system-ui,sans-serif'; ctx.fillText('Sprites non chargés (GitHub inaccessible ?) : formes de remplacement utilisées', W / 2, 48); }
  if (SET.game.fps) { ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(4, 4, 150, 20); ctx.fillStyle = fpsAvg > 50 ? '#7aff9a' : fpsAvg > 30 ? '#ffe45a' : '#ff6a6a'; ctx.font = '12px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.fillText(Math.round(fpsAvg) + ' FPS · qualité ' + ['basse', 'moyenne', 'haute'][QUAL], 10, 18); ctx.textAlign = 'center'; }
  if (G.net === 'guest') { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '11px system-ui,sans-serif'; ctx.fillText('En ligne (invité) · ' + G.ping + ' ms', W - 80, 16); }
}

// ---------------------------------------------------------------- ATTAQUES ULTIMES : dangers, boule, cinématique
function drawHazard(h, t) {
  const col = h.color, tt = performance.now() / 1000;
  const rc = h.rc !== undefined ? h.rc : (h.ring ? h.r0 + (h.r1 - h.r0) * Math.min(1, h.t / h.life) : 0);
  if (h.delay > 0) {                                               // avertissement avant l'impact
    ctx.save(); ctx.globalAlpha = .35 + .35 * Math.sin(h.age * 30); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(h.x + h.w / 2, h.y); ctx.lineTo(h.x + h.w / 2, h.y + h.h); ctx.stroke(); ctx.restore();
    ctx.fillStyle = col; ctx.globalAlpha = .45; ctx.beginPath(); ctx.ellipse(h.x + h.w / 2, h.y + h.h, h.w * .55, 9, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; return;
  }
  switch (h.kind) {
    case 'flame': {
      const dir = h.face || 1, ox = dir > 0 ? h.x : h.x + h.w, cy = h.y + h.h / 2, N = QUAL ? 30 : 16;
      if (QUAL) glow(ox, cy, 90, 'rgba(255,200,80,.6)');
      for (let i = 0; i < N; i++) {
        const u = i / N, px = ox + dir * u * h.w, py = cy + Math.sin(u * 14 - tt * 18) * (14 + u * 26), r = 20 + u * 46;
        ctx.fillStyle = `hsla(${34 - u * 28},100%,${62 - u * 22}%,${.88 - u * .4})`; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,250,200,${.55 - u * .5})`; ctx.beginPath(); ctx.arc(px, py, r * .45, 0, 7); ctx.fill();
      }
      break;
    }
    case 'wave': {
      const g = ctx.createLinearGradient(0, h.y, 0, h.y + h.h); g.addColorStop(0, 'rgba(170,230,255,.95)'); g.addColorStop(1, 'rgba(30,100,220,.92)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(h.x, h.y + h.h);
      for (let i = 0; i <= 20; i++) { const u = i / 20, y = h.y + 40 * (1 - Math.sin(u * Math.PI)) + Math.sin(u * 9 + tt * 8) * 12; ctx.lineTo(h.x + u * h.w, y); }
      ctx.lineTo(h.x + h.w, h.y + h.h); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 5; ctx.beginPath(); for (let i = 0; i <= 20; i++) { const u = i / 20, y = h.y + 40 * (1 - Math.sin(u * Math.PI)) + Math.sin(u * 9 + tt * 8) * 12; if (i) ctx.lineTo(h.x + u * h.w, y); else ctx.moveTo(h.x, y); } ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)'; for (let i = 0; i < 12; i++) ctx.fillRect(h.x + rr(i) * h.w, h.y + 10 + ((tt * 200 + i * 40) % 90), 4, 4);
      break;
    }
    case 'vine': {
      const grow = Math.min(1, h.t / .14), hh = h.h * grow, x = h.x + h.w / 2, yb = h.y + h.h;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - h.w / 2, yb);
      for (let i = 0; i <= 12; i++) ctx.lineTo(x - h.w * (.45 - i / 40) + Math.sin(i * 1.2 + tt * 12) * 7, yb - hh * i / 12);
      for (let i = 12; i >= 0; i--) ctx.lineTo(x + h.w * (.45 - i / 40) + Math.sin(i * 1.2 + tt * 12 + 2) * 7, yb - hh * i / 12);
      ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x - 5, yb - hh, 8, hh);
      ctx.fillStyle = shade(col, -.3); for (let i = 1; i < 7; i++) { const yy = yb - hh * i / 7; ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + (i % 2 ? 36 : -36), yy - 14); ctx.lineTo(x, yy - 6); ctx.fill(); }
      break;
    }
    case 'bolt': {
      const x = h.x + h.w / 2, seed = Math.floor(h.age * 40), top = h.y, bot = h.y + h.h;
      const pts = []; for (let i = 0; i <= 14; i++) pts.push([x + (i === 0 || i === 14 ? 0 : (rr(seed * 7 + i) - .5) * 70), top + (bot - top) * i / 14]);
      if (QUAL) glow(x, bot, 110, 'rgba(255,255,200,.7)');
      for (const [lw, c] of [[22, 'rgba(255,230,60,.35)'], [9, col], [3, '#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); }
      break;
    }
    case 'beam': {
      const dir = h.face || 1, ox = dir > 0 ? h.x : h.x + h.w, cy = h.y + h.h / 2, pulse = .9 + .1 * Math.sin(tt * 40), x0 = dir > 0 ? h.x : h.x, g = ctx.createLinearGradient(0, h.y, 0, h.y + h.h);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.25, col); g.addColorStop(.5, '#ffffff'); g.addColorStop(.75, col); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = .92; ctx.fillStyle = g; ctx.fillRect(x0, cy - h.h / 2 * pulse, h.w, h.h * pulse); ctx.globalAlpha = 1;
      if (QUAL) glow(ox, cy, h.h * .9, 'rgba(255,255,255,.8)');
      break;
    }
    case 'ring': {
      const fade = 1 - h.t / h.life; if (QUAL) glow(h.x, h.y, rc * .9, `rgba(255,255,255,${.12 * fade})`);
      ctx.strokeStyle = col; ctx.globalAlpha = Math.max(.1, fade); ctx.lineWidth = 22 * fade + 4; ctx.beginPath(); ctx.arc(h.x, h.y, rc, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(h.x, h.y, rc * .97, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      break;
    }
    case 'vortex': {
      const cx = h.x + h.w / 2;
      for (let k = 0; k < 14; k++) { const u = k / 14, y = h.y + h.h * (1 - u), w = h.w * (.35 + .9 * u), ph = tt * 9 + k * .7; ctx.strokeStyle = `rgba(255,255,255,${.65 - u * .25})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(cx + Math.sin(ph) * 10, y, w / 2, 9, 0, ph % 3, ph % 3 + 4.2); ctx.stroke(); }
      ctx.fillStyle = 'rgba(190,225,255,.22)'; ctx.beginPath(); ctx.moveTo(cx - h.w * .2, h.y + h.h); ctx.lineTo(cx - h.w * .65, h.y); ctx.lineTo(cx + h.w * .65, h.y); ctx.lineTo(cx + h.w * .2, h.y + h.h); ctx.fill();
      break;
    }
  }
}
function drawBall(b, t) {
  const tt = performance.now() / 1000, hue = (tt * 220) % 360, r = 28 + (b.flash > 0 ? 4 : 0);
  if (QUAL) glow(b.x, b.y, 85, `hsla(${hue},100%,65%,.5)`);
  for (let i = 0; i < 3; i++) { const a = tt * (2 + i) + i * 2.1; ctx.strokeStyle = `hsla(${(hue + i * 80) % 360},100%,70%,.7)`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(b.x, b.y, r + 8, (r + 8) * .35, a, 0, 7); ctx.stroke(); }
  const g = ctx.createRadialGradient(b.x - 8, b.y - 10, 3, b.x, b.y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(.5, `hsl(${hue},100%,65%)`); g.addColorStop(1, `hsl(${(hue + 60) % 360},100%,40%)`);
  ctx.fillStyle = b.flash > 0 ? '#ffffff' : g; ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.font = 'bold 30px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('S', b.x, b.y + 11);
  for (let i = 0; i < (b.hpMax || 5); i++) { ctx.fillStyle = i < b.hp ? '#ffe45a' : 'rgba(255,255,255,.2)'; ctx.beginPath(); ctx.arc(b.x - ((b.hpMax || 5) - 1) * 6 + i * 12, b.y - r - 14, 4, 0, 7); ctx.fill(); }
}
function drawCine() {
  const c = G.cine; if (!c || c.t <= 0) return;
  c.t -= fdt; const a = clamp(Math.min(c.t / .25, (c.max - c.t) / .12), 0, 1), f = G.fighters[c.idx];
  const sx = f ? W / 2 + (f.x - cam.x) * cam.z : W / 2, sy = f ? H / 2 + (f.y - f.ch.h / 2 - cam.y) * cam.z : H / 2;
  const g = ctx.createRadialGradient(sx, sy, 50, sx, sy, 460); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${.78 * a})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalAlpha = a; const slide = (1 - Math.min(1, (c.max - c.t) / .18)) * 160;
  ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(0, H * .66 - 6, W, 100);
  ctx.fillStyle = c.color; ctx.fillRect(0, H * .66 - 6, W, 4); ctx.fillRect(0, H * .66 + 90, W, 4);
  ctx.textAlign = 'center'; ctx.font = 'bold 15px system-ui,sans-serif'; ctx.fillStyle = '#ffe45a'; ctx.fillText('⭐ ATTAQUE ULTIME ⭐   ' + (c.who || ''), W / 2 - slide, H * .66 + 20);
  ctx.font = 'bold 46px system-ui,sans-serif'; ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.strokeText(c.name, W / 2 + slide, H * .66 + 70); ctx.fillStyle = c.color; ctx.fillText(c.name, W / 2 + slide, H * .66 + 70);
  ctx.restore();
}


function drawEvo() {
  const e = G.evo; if (!e || e.t <= 0) return;
  e.t -= fdt; const f = G.fighters[e.idx], pr = 1 - e.t / e.max;
  const sx = f ? W / 2 + (f.x - cam.x) * cam.z : W / 2, sy = f ? H / 2 + (f.y - f.ch.h / 2 - cam.y) * cam.z : H / 2;
  ctx.save(); ctx.fillStyle = `rgba(255,255,255,${Math.sin(Math.min(1, pr) * Math.PI) * .75})`; ctx.fillRect(0, 0, W, H);
  glow(sx, sy, 80 + pr * 260, 'rgba(255,255,255,.95)', 'rgba(255,255,255,0)');
  ctx.textAlign = 'center'; ctx.font = 'bold 34px system-ui,sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.7)';
  const t1 = e.from + '  ➜  ' + e.to; ctx.strokeText(t1, W / 2, H * .22); ctx.fillStyle = '#ffd93b'; ctx.fillText(t1, W / 2, H * .22);
  ctx.font = 'bold 16px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText('✨ ÉVOLUTION ! ✨', W / 2, H * .22 - 36); ctx.restore();
}

function drawBanner() {
  const b = G.banner; if (!b) return; b.t -= fdt; if (b.t <= 0) { G.banner = null; return; }
  const a = clamp(Math.min(b.t / .3, (2.6 - b.t) / .2), 0, 1);
  ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, H * .3, W, 92);
  ctx.font = 'bold 44px system-ui,sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.strokeText(b.text, W / 2, H * .3 + 50); ctx.fillStyle = '#ffd93b'; ctx.fillText(b.text, W / 2, H * .3 + 50);
  ctx.font = '16px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(b.sub || '', W / 2, H * .3 + 78); ctx.restore();
}
