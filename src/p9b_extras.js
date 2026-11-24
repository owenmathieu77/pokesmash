// ================================================================ ÉVÉNEMENTS DE DÉCOR (lave, marée, blizzard, gravité, trampolines, foudre…)
const mkEnv = (id, color) => ({ idx:-1, team:-2, ch:{ id, color, name:'Décor' }, buff:0, giant:0, dmgM:1, state:'free', ult:0, ultReady:false, hitSet:null, kind:'env', countered:false });
const ENV_FIRE = mkEnv('0006', '#ff7a2b'), ENV_ELEC = mkEnv('0025', '#ffe84a'), ENV_ICE = mkEnv('0131', '#9fe8ff'), ENV_EARTH = mkEnv('0383', '#d8a03a'), ENV_WATER = mkEnv('0009', '#3a9aff');
function envBanner(text, sub) { G.banner = { t:2.6, text, sub:sub || '' }; if (G.net === 'host') netEvents.push(['bn', text, sub || '']); sfx('ui'); }
function newEnv() { return { t:0, next:12 + Math.random() * 8, state:'idle', pt:0, lavaY:null, wind:0, hit:{} }; }
function mainPlat() { return G.plats.reduce((a, p) => (!a || (!p.soft && p.w > a.w)) ? p : a, null) || G.plats[0]; }
function envTick(dt) {
  const E = G.env, th = G.stage && G.stage.theme; if (!th || G.cd > 0 || G.winner >= 0) return;
  E.t += dt; const mp = mainPlat(), bd = G.stage.bounds, alive = G.fighters.filter(f => f.state !== 'dead' && f.state !== 'spawn' && f.stocks > 0);
  const fire = (kind, o) => addHaz(Object.assign({ kind, life:.3, dmg:8, base:300, gr:3.2, ang:84, rehit:.9, owner:ENV_ELEC, color:'#fff' }, o));
  switch (th) {
    case 'volcano': {
      if (E.state === 'idle' && E.t > E.next) { E.state = 'warn'; E.pt = 0; envBanner('🌋 ÉRUPTION !', 'Montez sur les plateformes !'); }
      if (E.state !== 'idle') {
        E.pt += dt;
        if (E.state === 'warn') { E.lavaY = 330 - E.pt * 8; if (Math.floor(E.pt * 10) !== E.sk) { E.sk = Math.floor(E.pt * 10); fxShake(2); } if (E.pt > 2.4) { E.state = 'rise'; E.pt = 0; } }
        else if (E.state === 'rise') { E.lavaY = 310 - (310 + 8) * Math.min(1, E.pt / 2.2); if (E.pt > 2.2) { E.state = 'hold'; E.pt = 0; } }
        else if (E.state === 'hold') { E.lavaY = -8; if (E.pt > 2.4) { E.state = 'fall'; E.pt = 0; } }
        else if (E.state === 'fall') { E.lavaY = -8 + 338 * Math.min(1, E.pt / 3); if (E.pt > 3) { E.state = 'idle'; E.t = 0; E.next = 24 + Math.random() * 10; E.lavaY = null; } }
        if (E.lavaY !== null && E.lavaY < 60) for (const f of alive) if (f.y > E.lavaY + 4 && f.inv <= 0 && (E.hit[f.idx] === undefined || E.t - E.hit[f.idx] > .7)) {
          E.hit[f.idx] = E.t; launch(f, ENV_FIRE, 9, 320, 3, 88, f.x > 0 ? -1 : 1, f.x, f.y - 10, true); applyStatus(f, 'burn'); f.hurtT = Math.min(f.hurtT, .3); fxSfx('boom');
        }
      }
      break;
    }
    case 'beach':
      if (E.t > E.next) { E.t = 0; E.next = 22 + Math.random() * 10; const s = Math.random() < .5 ? -1 : 1; envBanner('🌊 MARÉE HAUTE !', 'Une vague approche'); addHaz({ kind:'wave', x:s > 0 ? mp.x - 520 : mp.x + mp.w + 120, y:mp.y - 270, w:400, h:280, vx:s * 460, life:2.8, dmg:3, base:130, gr:1.2, ang:40, rehit:.18, push:s * 420, face:s, color:'#3a9aff', owner:ENV_WATER, delay:1.4, fin:{ dmg:8, base:380, gr:3.5, ang:40 } }); }
      break;
    case 'ice': case 'sky': case 'bridge':
      if (E.state === 'idle' && E.t > E.next) { E.state = 'wind'; E.pt = 0; E.wind = Math.random() < .5 ? -1 : 1; envBanner(th === 'ice' ? '❄️ BLIZZARD !' : '💨 RAFALES !', E.wind > 0 ? 'Vent vers la droite' : 'Vent vers la gauche'); }
      if (E.state === 'wind') {
        E.pt += dt; for (const f of alive) if (Math.abs(f.vx) < (f.grounded ? 340 : 440)) f.vx += E.wind * (f.grounded ? 420 : 520) * dt;
        if (th === 'ice' && Math.random() < dt * 1.1) { const ix = (Math.random() - .5) * 1100; G.projs.push({ x:ix, y:bd.t + 60, vx:E.wind * 40, vy:600, r:12, owner:ENV_ICE, life:3, max:3, dir:1, p:{ color:'#cfeeff', dmg:6, base:200, gr:2.6, ang:-60, life:3, grav:500 } }); }
        if (E.pt > 5.5) { E.state = 'idle'; E.wind = 0; E.t = 0; E.next = 20 + Math.random() * 10; }
      }
      break;
    case 'space':
      if (E.state === 'idle' && E.t > E.next) { E.state = 'low'; E.pt = 0; G.gravM = .5; envBanner('🌌 GRAVITÉ FAIBLE !', 'Sautez plus haut'); }
      if (E.state === 'low') { E.pt += dt; if (E.pt > 9) { E.state = 'idle'; G.gravM = 1; E.t = 0; E.next = 24 + Math.random() * 10; } }
      break;
    case 'forest':
      for (const f of alive) { f.padCd = Math.max(0, (f.padCd || 0) - dt); if (f.grounded && f.plat === mp && f.padCd <= 0 && [-330, 330].some(px => Math.abs(f.x - px) < 38)) { f.vy = -1050; f.grounded = false; f.coyote = 0; f.padCd = .4; fxSfx('jump'); fxSparks(f.x, f.y, '#ff8a6a', 10, 200); } }
      break;
    case 'city':
      if (E.t > E.next) { E.t = 0; E.next = 13 + Math.random() * 6; const third = mp.w / 3, k = Math.floor(Math.random() * 3), x0 = mp.x + k * third; envBanner('⚡ SURTENSION !', 'Fuyez la zone rouge');
        for (let i = 0; i < 5; i++) fire('bolt', { owner:ENV_ELEC, delay:1.3, x:x0 + third * (i + .5) / 5 - 36, w:72, y:mp.y - 320, h:340, life:.4, dmg:8, color:'#ff6ae8' }); }
      break;
    case 'crystal':
      if (E.t > E.next) { E.t = 0; E.next = 9 + Math.random() * 5; for (let i = 0; i < 3; i++) { const t2 = alive.length ? alive[Math.floor(Math.random() * alive.length)] : null, x = (t2 ? t2.x : 0) + (Math.random() - .5) * 240; fire('bolt', { owner:ENV_EARTH, delay:1.0, x:x - 30, w:60, y:bd.t, h:(mp.y + 60) - bd.t, life:.3, dmg:9, color:'#a8b8ff' }); } envBanner('💎 ÉBOULEMENT !', ''); }
      break;
    case 'desert':
      if (E.t > E.next) { E.t = 0; E.next = 11 + Math.random() * 5; for (let i = 0; i < 2; i++) { const x = mp.x + 120 + Math.random() * (mp.w - 240); fire('vine', { owner:ENV_EARTH, delay:.9, x:x - 45, w:90, y:mp.y - 380, h:400, life:.5, dmg:8, ang:88, color:'#e8c07a' }); } }
      break;
    case 'haunted':
      if (E.t > E.next) { E.t = 0; E.next = 8 + Math.random() * 5; for (let i = 0; i < 1 + (Math.random() < .5 ? 1 : 0); i++) { const x = mp.x + 80 + Math.random() * (mp.w - 160); fire('bolt', { owner:ENV_ELEC, delay:.8, x:x - 34, w:68, y:bd.t, h:(mp.y + 70) - bd.t, life:.25, dmg:8, color:'#dfe6ff' }); } G.darkT = Math.max(G.darkT, .3); }
      break;
  }
}
function drawWind() {
  if (!G.env || !G.env.wind) return;
  ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; const tt = performance.now() / 1000;
  for (let i = 0; i < 40; i++) { const y = (rr(i) * H + tt * 60) % H, x = ((rr(i + 5) * W + tt * 700 * G.env.wind) % W + W) % W, l = 40 + rr(i + 9) * 60; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - G.env.wind * l, y); ctx.stroke(); }
  ctx.restore();
}

// ================================================================ REPLAYS (ralenti, caméra libre)
const REP = { buf:[], clips:[], pend:[], acc:0, on:false, free:false, cam:{ x:0, y:0, z:.8 }, speed:.5, paused:false, t:0, clip:null, ui:null, cls:'', save:null };
function repReset() { REP.buf = []; REP.clips = []; REP.pend = []; REP.acc = 0; }
function repMark(kind, f) { if (G.net === 'guest' || !f || !f.ch) return; REP.pend.push({ kind, who:f.ch.name, at:G.time, wait:kind === 'ko' ? 1.3 : 3.4, back:kind === 'ko' ? 4.2 : 2.2 }); }
function repRecord(dt) {
  if (G.net === 'guest' || G.scene !== 'fight' || G.paused || G.hitstop > 0) { return; }
  REP.acc += dt;
  if (REP.acc >= .05) { REP.acc = 0; REP.buf.push({ t:G.time, s:makeSnap() }); if (REP.buf.length > 260) REP.buf.shift(); }
  for (let i = REP.pend.length - 1; i >= 0; i--) {
    const p = REP.pend[i]; if (G.time < p.at + p.wait) continue;
    const frames = REP.buf.filter(fr => fr.t >= p.at - p.back && fr.t <= p.at + p.wait);
    if (frames.length > 8) { REP.clips.push({ kind:p.kind, title:(p.kind === 'ko' ? '💥 K.O. de ' : '⭐ Ultime de ') + p.who, frames }); if (REP.clips.length > 8) REP.clips.shift(); }
    REP.pend.splice(i, 1);
  }
}
function repFlush() {                                   // finalise les clips encore en attente à la fin du combat
  for (const p of REP.pend.splice(0)) {
    const frames = REP.buf.filter(fr => fr.t >= p.at - p.back);
    if (frames.length > 8) REP.clips.push({ kind:p.kind, title:(p.kind === 'ko' ? '💥 K.O. de ' : '⭐ Ultime de ') + p.who, frames });
  }
}
function replayButtons() {
  if (G.scene === 'over') repFlush();
  if (G.scene !== 'over' || G.net === 'guest' || !REP.clips.length) return [];
  const last = k => { for (let i = REP.clips.length - 1; i >= 0; i--) if (REP.clips[i].kind === k) return REP.clips[i]; return null; };
  const out = [], ko = last('ko'), ul = last('ult');
  if (ko) out.push(btn('🎬 Revoir le dernier K.O.', () => startReplay(ko), 'small'));
  if (ul) out.push(btn('⭐ Revoir le dernier ultime', () => startReplay(ul), 'small'));
  return out;
}
function startReplay(clip) {
  REP.clip = clip; REP.on = true; REP.ui = Array.from(ui.childNodes); REP.cls = ui.className; REP.save = makeSnap(); REP.t = clip.frames[0].t; REP.speed = .5; REP.paused = false; REP.free = false;
  REP.cam = { x:cam.x, y:cam.y, z:cam.z }; G.scene = 'replay'; showReplayUI();
}
function closeReplay() {
  REP.on = false; G.scene = 'over'; applySnap(REP.save); ui.innerHTML = ''; ui.className = REP.cls; REP.ui.forEach(n => ui.appendChild(n));
}
function showReplayUI() {
  const sp = s => btn(s + '×', () => { REP.speed = s; showReplayUI(); }, REP.speed === s ? 'small go' : 'small');
  ui.innerHTML = ''; ui.className = 'overlay replay';
  ui.appendChild(h('div', { class:'rbar' }, h('b', null, '🎬 ' + REP.clip.title), sp(.25), sp(.5), sp(1),
    btn(REP.paused ? '▶ Lecture' : '⏸ Pause', () => { REP.paused = !REP.paused; showReplayUI(); }, 'small'),
    btn(REP.free ? '🎥 Caméra : libre' : '🎥 Caméra : auto', () => { REP.free = !REP.free; if (REP.free) REP.cam = { x:cam.x, y:cam.y, z:cam.z }; showReplayUI(); }, 'small'),
    btn('↺ Début', () => { REP.t = REP.clip.frames[0].t; }, 'small'), btn('✖ Fermer', closeReplay, 'small'),
    h('span', { class:'hint' }, REP.free ? 'Flèches/ZQSD : déplacer · +/- ou molette : zoom · glisser : déplacer' : '')));
}
function repUpdate(dt) {
  const F = REP.clip.frames, end = F[F.length - 1].t;
  if (!REP.paused) { REP.t += dt * REP.speed; if (REP.t > end + .6) REP.t = F[0].t; }
  let i = 0; while (i < F.length - 2 && F[i + 1].t <= REP.t) i++;
  const a = F[i], b = F[Math.min(i + 1, F.length - 1)], u = b.t > a.t ? clamp((REP.t - a.t) / (b.t - a.t), 0, 1) : 0;
  applySnap(a.s);
  G.fighters.forEach((f, k) => { const fa = a.s.f[k], fb = b.s.f[k]; if (!fa || !fb) return; f.x = fa[0] + (fb[0] - fa[0]) * u; f.y = fa[1] + (fb[1] - fa[1]) * u; f.tx = f.x; f.ty = f.y; });
  if (REP.free) {
    const sp = 600 * dt / REP.cam.z;
    if (keys.ArrowLeft || keys.KeyA) REP.cam.x -= sp; if (keys.ArrowRight || keys.KeyD) REP.cam.x += sp; if (keys.ArrowUp || keys.KeyW) REP.cam.y -= sp; if (keys.ArrowDown || keys.KeyS) REP.cam.y += sp;
    if (keys.Equal || keys.NumpadAdd || keys.KeyE) REP.cam.z = clamp(REP.cam.z * (1 + dt), .3, 2.2); if (keys.Minus || keys.NumpadSubtract || keys.KeyQ) REP.cam.z = clamp(REP.cam.z * (1 - dt), .3, 2.2);
  }
}
(function repInput() {
  let drag = null;
  canvas.addEventListener('wheel', e => { if (G.scene === 'replay' && REP.free) { e.preventDefault(); REP.cam.z = clamp(REP.cam.z * (e.deltaY < 0 ? 1.1 : .9), .3, 2.2); } }, { passive:false });
  canvas.addEventListener('pointerdown', e => { if (G.scene === 'replay' && REP.free) drag = { x:e.clientX, y:e.clientY }; });
  addEventListener('pointermove', e => { if (drag && G.scene === 'replay' && REP.free) { const s = canvas.getBoundingClientRect().width / W; REP.cam.x -= (e.clientX - drag.x) / s / REP.cam.z; REP.cam.y -= (e.clientY - drag.y) / s / REP.cam.z; drag = { x:e.clientX, y:e.clientY }; } });
  addEventListener('pointerup', () => { drag = null; });
})();

// ================================================================ NAVIGATION DES MENUS (clavier, manette, tactile)
const NAV = { last:null, cool:0, held:0, prev:{} };
const uiVisible = () => ui.className.indexOf('hidden') < 0 && ui.childNodes.length > 0 && G.scene !== 'fight' && G.scene !== 'replay';
const navItems = () => Array.from(ui.querySelectorAll('button, select, input[type=checkbox], input[type=range], input[type=search], input[type=text], .cell')).filter(e => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4 && !e.disabled; });
function navFocus(el) {
  const prev = ui.querySelector('.nfocus'); if (prev) prev.classList.remove('nfocus');
  el.classList.add('nfocus'); el.focus({ preventScroll:true }); try { el.scrollIntoView({ block:'nearest', inline:'nearest' }); } catch (e) { /* ignoré */ }
  const r = el.getBoundingClientRect(); NAV.last = { x:r.left + r.width / 2, y:r.top + r.height / 2 };
}
function navMove(dir) {
  const items = navItems(); if (!items.length) return;
  let cur = ui.querySelector('.nfocus'); if (!cur || !items.includes(cur)) cur = null;
  if (!cur) {
    if (NAV.last) { let best = null, bd = 1e12; for (const e of items) { const r = e.getBoundingClientRect(), d = (r.left + r.width / 2 - NAV.last.x) ** 2 + (r.top + r.height / 2 - NAV.last.y) ** 2; if (d < bd) { bd = d; best = e; } } navFocus(best); return; }
    navFocus(ui.querySelector('.btn.go') || items[0]); return;
  }
  if (cur.tagName === 'SELECT' && (dir === 'left' || dir === 'right')) { const n = cur.options.length; cur.selectedIndex = clamp(cur.selectedIndex + (dir === 'right' ? 1 : -1), 0, n - 1); cur.dispatchEvent(new Event('change')); return; }
  if (cur.tagName === 'INPUT' && cur.type === 'range' && (dir === 'left' || dir === 'right')) { cur.value = String(parseFloat(cur.value) + (dir === 'right' ? 1 : -1) * parseFloat(cur.step || 1)); cur.dispatchEvent(new Event('input')); cur.dispatchEvent(new Event('change')); return; }
  const c = cur.getBoundingClientRect(), cx = c.left + c.width / 2, cy = c.top + c.height / 2; let best = null, bs = 1e12;
  for (const e of items) {
    if (e === cur) continue; const r = e.getBoundingClientRect(), ex = r.left + r.width / 2, ey = r.top + r.height / 2, dx = ex - cx, dy = ey - cy;
    const ok = dir === 'right' ? dx > 6 : dir === 'left' ? dx < -6 : dir === 'down' ? dy > 6 : dy < -6; if (!ok) continue;
    const s = (dir === 'left' || dir === 'right') ? Math.abs(dx) + 2.2 * Math.abs(dy) : Math.abs(dy) + 2.2 * Math.abs(dx);
    if (s < bs) { bs = s; best = e; }
  }
  if (best) navFocus(best);
}
function navBack() {
  const modal = ui.querySelector('.modal'); const scope = modal || ui;
  const b = Array.from(scope.querySelectorAll('button')).find(x => /^(←|Annuler|Retour|Quitter|Menu|Fermer)/.test(x.textContent.trim()));
  if (b) b.click();
}
function navKey(e) {
  ensureAudio();
  if (!uiVisible()) return false;
  const t = e.target, typing = t && (t.tagName === 'INPUT' && (t.type === 'text' || t.type === 'search'));
  const map = { ArrowUp:'up', ArrowDown:'down', ArrowLeft:'left', ArrowRight:'right' };
  if (map[e.code] && !typing) { e.preventDefault(); navMove(map[e.code]); return true; }
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && !typing) { const f = ui.querySelector('.nfocus'); if (f) { e.preventDefault(); if (f.tagName === 'SELECT') return false; f.click(); return true; } }
  if (e.code === 'Escape') { navBack(); return true; }
  return false;
}
function uiPadTick(dt) {
  if (!uiVisible() || !padInfo.pads.length) { NAV.prev = {}; return; }
  const g = padInfo.pads[0], ax = g.axes[0] || 0, ay = g.axes[1] || 0, b = i => g.buttons[i] && g.buttons[i].pressed;
  const cur = { left:ax < -.5 || b(14), right:ax > .5 || b(15), up:ay < -.5 || b(12), down:ay > .5 || b(13), a:b(0), b:b(1), start:b(9) };
  NAV.cool -= dt;
  for (const d of ['left', 'right', 'up', 'down']) if (cur[d] && (!NAV.prev[d] || NAV.cool <= 0)) { navMove(d); NAV.cool = NAV.prev[d] ? .13 : .38; }
  if (cur.a && !NAV.prev.a) { const f = ui.querySelector('.nfocus'); if (f) f.click(); else navMove('down'); }
  if (cur.b && !NAV.prev.b) navBack();
  if (cur.start && !NAV.prev.start) { const go = ui.querySelector('.btn.go'); if (go) go.click(); }
  NAV.prev = cur;
}

// ================================================================ SALONS PUBLICS (serveur) ET RÉSEAU
const PS = { server:null, hb:null, probed:false };
function serverBase() { const w = (typeof window.POKESMASH_SERVER === 'string' && window.POKESMASH_SERVER) ? window.POKESMASH_SERVER.replace(/\/+$/, '') : ''; const s = (SET.net && SET.net.server || '').trim().replace(/\/+$/, ''); return s || w || PS.server; }
async function probeServer() {
  PS.probed = true; if (location.protocol.indexOf('http') !== 0) return;
  try { const r = await fetch('/api/health', { cache:'no-store' }); if (r.ok) { const j = await r.json(); if (j && j.pokesmash) PS.server = ''; } } catch (e) { /* pas de serveur : ok */ }
}
async function pubFetch(path, opt) { const b = serverBase(); if (b === null || b === undefined) throw new Error('no-server'); return fetch(b + path, Object.assign({ mode:'cors' }, opt || {})); }
function pubStop() { if (PS.hb) { clearInterval(PS.hb); PS.hb = null; } if (NET.code && serverBase() !== null && serverBase() !== undefined && PS.regCode) { pubFetch('/api/rooms/' + PS.regCode, { method:'DELETE' }).catch(() => {}); } PS.regCode = null; }
function pubStart() {
  if (!S || S.mode !== 'host' || !S.pub || !NET.code || (serverBase() === null || serverBase() === undefined)) return;
  PS.regCode = NET.code;
  const beat = () => pubFetch('/api/rooms', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ code:NET.code, name:(SET.net.nick || 'Hôte') + (S.tour ? ' — tournoi' : S.teams ? ' — équipes' : ' — combat'), players:onlineCount(), max:MAXP, state:(G.scene === 'fight' || G.scene === 'over') ? 'playing' : 'lobby' }) }).catch(() => {});
  beat(); if (PS.hb) clearInterval(PS.hb); PS.hb = setInterval(beat, 8000);
}
async function showPublicRooms() {
  show(false, h('div', { class:'title sm' }, '🌍 Salons publics'), h('div', { class:'sub' }, 'Recherche des salons…'));
  if (!PS.probed) await probeServer();
  let rooms = null, err = '';
  try { const r = await pubFetch('/api/rooms'); rooms = (await r.json()).rooms; } catch (e) { err = serverBase() === null || serverBase() === undefined ? 'Aucun serveur de salons configuré.' : 'Serveur injoignable.'; }
  const body = rooms ? (rooms.length ? h('div', { class:'rooms' }, rooms.map(r => h('div', { class:'room' }, h('div', null, h('b', null, r.name), h('div', { class:'hint' }, 'Code ' + r.code + ' · ' + r.players + '/' + r.max + ' joueurs')), btn('Rejoindre', () => netJoinFlow(r.code), r.players >= r.max ? 'small' : 'small go')))) : h('div', { class:'panel txt' }, 'Aucun salon public pour le moment. Hébergez le vôtre et cochez « Salon public » !'))
    : h('div', { class:'panel txt' }, h('p', null, err), h('p', null, 'Les salons publics nécessitent le serveur du jeu (voir le tutoriel d\'hébergement). Vous pouvez saisir son adresse dans Paramètres → Réseau.'));
  show(false, h('div', { class:'title sm' }, '🌍 Salons publics'), body, h('div', { class:'row' }, btn('← Menu', showMenu), btn('↻ Actualiser', showPublicRooms, 'small'), btn('🔑 Saisir un code', () => netJoinFlow(), 'small'), btn('⚙️ Réseau', () => showSettings('net', showPublicRooms), 'small')));
}

// ================================================================ HORS-LIGNE ET INSTALLATION
let INSTALL_EVT = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); INSTALL_EVT = e; });
if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('sw.js').catch(() => {});
async function preloadOffline(statusEl) {
  const used = Object.entries(STATS.used).sort((a, b) => b[1] - a[1]).slice(0, 12).map(x => CHAR_BY_ID[x[0]]).filter(x => x !== undefined);
  const picks = (S && S.slots ? S.slots.map(s => s.char).filter(c => c >= 0) : []);
  const wanted = Array.from(new Set(used.concat(picks, [CHAR_BY_ID['0025'], CHAR_BY_ID['0006'], CHAR_BY_ID['0448']])));
  let n = 0; const total = CHARS.length + wanted.length;
  for (const ch of CHARS) { if (!ch.custom) { try { await fetch(BASE + 'portrait/' + ch.id + '/Normal.png', { mode:'cors' }); } catch (e) { /* ignoré */ } } n++; if (statusEl && n % 8 === 0) statusEl.textContent = 'Portraits… ' + n + '/' + total; }
  for (const i of wanted) { await loadSprites(CHARS[i], false); n++; if (statusEl) statusEl.textContent = 'Sprites : ' + CHARS[i].name + ' (' + n + '/' + total + ')'; }
  if (statusEl) statusEl.textContent = '✔ Terminé : ' + wanted.length + ' Pokémon et tous les portraits sont enregistrés pour le hors-ligne (si le jeu est installé depuis un serveur HTTPS).';
}
probeServer();

addEventListener('pointerdown', () => ensureAudio(), { passive:true });
