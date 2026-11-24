// ================================================================ EN LIGNE : hôte + jusqu'à 7 invités (PeerJS / WebRTC, topologie en étoile)
const MAXP = 8, HZK = ['beam', 'flame', 'wave', 'vine', 'bolt', 'ring', 'vortex'];
const NET = {
  peer:null, role:null, code:'', conn:null,          // invité : connexion vers l'hôte
  conns:[],                                          // hôte : [{ conn, slot, ready }]
  send(m) { if (this.conn && this.conn.open) { try { this.conn.send(m); } catch (e) { /* canal fermé */ } } },      // invité → hôte
  sendTo(c, m) { if (c.conn && c.conn.open) { try { c.conn.send(m); } catch (e) { /* canal fermé */ } } },         // hôte → un invité
  broadcast(m) { for (const c of this.conns) this.sendTo(c, m); },                                                 // hôte → tous
};
function netClose() {
  pubStop();
  try { if (NET.conn) NET.conn.close(); } catch (e) { /* ignoré */ }
  for (const c of NET.conns) { try { c.conn.close(); } catch (e) { /* ignoré */ } }
  try { if (NET.peer) NET.peer.destroy(); } catch (e) { /* ignoré */ }
  NET.conn = null; NET.conns = []; NET.peer = null; NET.role = null; NET.code = ''; G.net = null;
}
function loadScript(url) {
  return new Promise((res, rej) => { const s = document.createElement('script'); s.src = url; s.onload = res; s.onerror = () => rej(new Error('script')); document.head.appendChild(s); });
}
async function loadPeerJS() {
  if (window.Peer) return;
  try { await loadScript('https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'); }
  catch (e) { await loadScript('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'); }
}
function netFail(msg) {
  netClose(); G.scene = 'menu';
  show(false, h('div', { class:'title sm' }, 'Connexion impossible'), h('div', { class:'panel txt' }, msg), btn('← Menu', showMenu));
}
const parseMsg = m => (typeof m === 'string' ? JSON.parse(m) : m);
const onlineCount = () => NET.conns.length + 1;

// ---------------------------------------------------------------- HÔTE
function lobbySend() {
  if (NET.role !== 'host' || !S) return;
  const sl = S.slots.map(s => ({ k:s.kind === 'human' ? 'remote' : s.kind, c:s.char < 0 ? -1 : refOf(s.char), s:!!s.shiny, l:s.lvl || 5, tm:s.team || 0 }));
  for (const c of NET.conns) NET.sendTo(c, { t:'lobby', you:c.slot, sl, stage:S.stage, stocks:S.stocks, tms:!!S.teams, ff:!!S.ff });
}
async function netHostFlow() {
  show(false, h('div', { class:'title sm' }, 'Création du salon…'));
  try { await loadPeerJS(); } catch (e) { return netFail('Impossible de charger la bibliothèque PeerJS : vérifiez votre connexion Internet.'); }
  netClose(); NET.role = 'host'; S = newSelect('host');
  const al = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let code = '';
  for (let i = 0; i < 6; i++) code += al[Math.floor(Math.random() * al.length)];
  let peer;
  try { peer = new Peer('pbrawl-' + code); } catch (e) { return netFail('Impossible de créer la connexion en ligne.'); }
  NET.peer = peer;
  peer.on('open', () => { NET.code = code; showSelect(); pubStart(); });
  peer.on('error', err => { if (err.type === 'unavailable-id') netHostFlow(); else if (!NET.conns.length) netFail('Erreur réseau (' + err.type + '). Le serveur de signalisation PeerJS est peut-être indisponible.'); });
  peer.on('connection', conn => {
    const entry = { conn, slot:-1, ready:false };
    conn.on('open', () => {
      const busy = G.scene === 'fight' || G.scene === 'over' || G.scene === 'loading';
      let slot = S.slots.findIndex((s, i) => i > 0 && s.kind === 'off');
      if (slot < 0) slot = S.slots.findIndex((s, i) => i > 0 && s.kind === 'cpu');            // une CPU cède sa place
      if (busy || slot < 0) { try { conn.send({ t:'full', busy }); } catch (e) { /* ignoré */ } setTimeout(() => { try { conn.close(); } catch (e) { /* ignoré */ } }, 400); return; }
      entry.slot = slot; NET.conns.push(entry);
      S.slots[slot] = { kind:'remote', char:-1, shiny:false, lvl:5, team:slot % 2 };
      lobbySend(); if (G.scene === 'menu') showSelect();
    });
    conn.on('data', m => hostOnData(entry, parseMsg(m)));
    conn.on('close', () => hostConnClosed(entry));
  });
}
function hostConnClosed(c) {
  const i = NET.conns.indexOf(c); if (i < 0) return;
  NET.conns.splice(i, 1);
  if (G.scene === 'fight' || G.scene === 'over') {                      // en plein combat : une CPU reprend le personnage
    const f = G.fighters.find(x => x.conn === c);
    if (f && f.kind === 'remote') { f.kind = 'cpu'; f.lvl = 5; f.conn = null; f.ai = { cool:.6, jc:0, react:.2, shT:0, hold:0 }; fxText(f.x, f.y - f.ch.h - 24, '📴 déconnecté → CPU', '#ffb0b0'); }
    return;
  }
  if (S && S.slots[c.slot]) { S.slots[c.slot] = { kind:'off', char:randomForm(), shiny:false, lvl:SET.game.cpu }; lobbySend(); if (G.scene === 'menu') showSelect(); }
}
function hostOnData(c, m) {
  if (m.t === 'pick') {
    if (S && S.slots[c.slot]) { S.slots[c.slot].char = m.c < 0 ? -1 : idxOf(m.c); S.slots[c.slot].shiny = !!m.s; lobbySend(); if (G.scene === 'menu') showSelect(); }
  } else if (m.t === 'in') {
    const f = G.fighters.find(x => x.conn === c); if (!f || f.kind !== 'remote') return;
    const i = unpackInput(m.b), n = f.netIn;
    for (const k of HELD) n[k] = i[k]; for (const k of EDGES) n[k] = n[k] || i[k];
  } else if (m.t === 'ready') c.ready = true;
  else if (m.t === 'ping') NET.sendTo(c, { t:'pong', ts:m.ts });
}

// ---------------------------------------------------------------- INVITÉ
async function netJoinFlow(codeArg) {
  let code = codeArg || prompt('Code du salon (6 caractères) :'); if (!code) return;
  code = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  show(false, h('div', { class:'title sm' }, 'Connexion…'));
  try { await loadPeerJS(); } catch (e) { return netFail('Impossible de charger la bibliothèque PeerJS : vérifiez votre connexion Internet.'); }
  netClose(); NET.role = 'guest';
  let peer; try { peer = new Peer(); } catch (e) { return netFail('Impossible de créer la connexion en ligne.'); }
  NET.peer = peer;
  const timer = setTimeout(() => { if (!NET.conn || !NET.conn.open) netFail('Aucune réponse du salon « ' + code + ' ». Vérifiez le code, ou essayez un autre réseau (certains pare-feu bloquent WebRTC).'); }, 15000);
  peer.on('error', err => { clearTimeout(timer); netFail(err.type === 'peer-unavailable' ? 'Aucun salon avec le code « ' + code + ' ».' : 'Erreur réseau (' + err.type + ').'); });
  peer.on('open', () => {
    const conn = peer.connect('pbrawl-' + code, { reliable:true }); NET.conn = conn;
    conn.on('open', () => {
      clearTimeout(timer); S = newSelect('guest'); showSelect();
      setInterval(() => { if (NET.conn && NET.conn.open) NET.send({ t:'ping', ts:performance.now() }); }, 2000);
    });
    conn.on('data', m => guestOnData(parseMsg(m))); conn.on('close', guestLost);
  });
}
function guestLost() {
  netClose(); G.scene = 'menu';
  show(false, h('div', { class:'title sm' }, 'Connexion perdue'), h('div', { class:'sub' }, 'L\'hôte a quitté le salon.'), btn('← Menu', showMenu));
}
function guestOnData(m) {
  if (m.t === 'full') { netFail(m.busy ? 'Une partie est déjà en cours dans ce salon : réessayez à la fin du combat.' : 'Ce salon est complet (8 joueurs maximum).'); return; }
  if (m.t === 'lobby') {
    if (!S || S.mode !== 'guest') S = newSelect('guest');
    const mine = S.slots[m.you], keep = mine && mine.kind === 'human' && mine.char >= 0 ? { char:mine.char, shiny:mine.shiny } : null;
    S.you = m.you; S.stage = m.stage; S.stocks = m.stocks; S.active = m.you; S.teams = !!m.tms; S.ff = !!m.ff;
    S.slots = m.sl.map((o, i) => {
      const ch = (typeof o.c === 'number' && o.c < 0) ? -1 : idxOf(o.c);
      if (i === m.you) return { kind:'human', char:keep ? keep.char : ch, shiny:keep ? keep.shiny : !!o.s, lvl:5, team:o.tm || 0 };
      return { kind:o.k, char:ch, shiny:!!o.s, lvl:o.l, team:o.tm || 0 };
    });
    if (S.slots[m.you].char < 0) { S.slots[m.you].char = CHAR_BY_ID['0025']; NET.send({ t:'pick', c:S.slots[m.you].char, s:false }); }
    else if (!keep) NET.send({ t:'pick', c:refOf(S.slots[m.you].char), s:!!S.slots[m.you].shiny });
    if (G.scene === 'menu') showSelect();
  } else if (m.t === 'start') guestStart(m);
  else if (m.t === 's') applySnap(m);
  else if (m.t === 'end') {
    G.scene = 'over';
    const w = G.fighters[m.w]; G.winTeam = m.wt === undefined ? -1 : m.wt; endOverlay(winnerTitle(w), 'En attente de l\'hôte pour la revanche…', btn('Quitter', showMenu));
  } else if (m.t === 'bracket') showBracketRO(m.d);
  else if (m.t === 'lobbyback') { G.scene = 'menu'; showSelect(); }
  else if (m.t === 'pong') G.ping = Math.round(performance.now() - m.ts);
}
async function guestStart(m) {
  show(false, h('div', { class:'title sm' }, 'Chargement des sprites…')); G.scene = 'loading';
  const ci = m.chars.map(idxOf), sh = m.sh || [];
  const sps = await loadSpritesFast(ci.map((c, i) => ({ ch:CHARS[c], shiny:!!sh[i] })), 7000);
  const fighters = ci.map((c, i) => ({ team:m.tm ? m.tm[i] : 0, char:c, shiny:!!sh[i], kind:i === m.you ? 'human' : (m.kinds[i] === 'c' ? 'cpu' : 'remote'), lvl:(m.lv && m.lv[i]) || 5, slot:i }));
  setupMatch({ fighters, stocks:m.stocks, mode:'guest', teams:!!m.tm, ff:!!m.ff }, m.stage, sps);
  G.net = 'guest'; G.me = m.you; NET.send({ t:'ready' });
}

// ---------------------------------------------------------------- SNAPSHOTS (hôte → tous les invités, texte JSON fabriqué une seule fois)
function makeSnap() {
  const r = (v, d) => +v.toFixed(d);
  return { t:'s',
    f:G.fighters.map(f => [r(f.x, 1), r(f.y, 1), Math.round(f.vx), Math.round(f.vy), f.face, r(f.pct, 1), f.stocks, f.state, f.mname, r(f.mt, 3), f.grounded ? 1 : 0, r(f.inv, 2), Math.round(f.shield), r(f.buff, 1), f.ghost,
            f.held || 0, (f.buff > 0 ? 1 : 0) | (f.haste > 0 ? 2 : 0) | (f.barrier > 0 ? 4 : 0) | (f.star > 0 ? 8 : 0) | (f.giant > 0 ? 16 : 0) | (f.frozen > 0 ? 32 : 0) | (f.regen > 0 ? 64 : 0) | (f.jumpB > 0 ? 128 : 0), f.uses | 0, f.ultReady ? 101 : Math.round(f.ult), f.status === 'burn' ? 1 : f.status === 'para' ? 2 : f.status === 'poison' ? 3 : 0, Math.round(f.charge * 100)]),
    p:G.projs.map(p => [Math.round(p.x), Math.round(p.y), p.r, p.p.color || p.owner.ch.color, p.mine ? 1 : p.item ? 2 + ITEM_KEYS.indexOf(p.item) : 0, r(p.life / p.max, 2)]),
    i:G.items.map(it => [Math.round(it.x), Math.round(it.y), ITEM_KEYS.indexOf(it.type), r(it.life, 1)]),
    z:G.hazards.map(h => [HZK.indexOf(h.kind), Math.round(h.x), Math.round(h.y), Math.round(h.w), Math.round(h.h), h.ring ? Math.round(h.r0 + (h.r1 - h.r0) * Math.min(1, h.t / h.life)) : 0, r(h.t, 2), r(h.life, 2), r(Math.max(0, h.delay), 2), h.color, h.face || 1, r(h.age, 2)]),
    b:G.ball ? [Math.round(G.ball.x), Math.round(G.ball.y), G.ball.hp, r(G.ball.flash, 2)] : 0,
    v:[G.env.lavaY === null ? null : Math.round(G.env.lavaY), G.env.wind || 0], e:[], tm:r(G.time, 2), cd:r(G.cd, 2) };
}
function sendSnap() {
  const snap = makeSnap(); snap.e = netEvents; netEvents = [];
  if (NET.conns.length) NET.broadcast(JSON.stringify(snap));
}
function applySnap(m) {
  if (G.scene !== 'fight' && G.scene !== 'over' && G.scene !== 'replay') return;
  m.f.forEach((a, i) => {
    const f = G.fighters[i]; if (!f) return;
    f.tx = a[0]; f.ty = a[1]; f.vx = a[2]; f.vy = a[3]; f.face = a[4]; f.pct = a[5]; f.stocks = a[6]; f.state = a[7]; f.mname = a[8]; f.mt = a[9];
    f.grounded = !!a[10]; f.inv = a[11]; f.shield = a[12]; f.ghost = a[14]; f.held = a[15] || null;
    f.buff = (a[16] & 1) ? 1 : 0; f.haste = (a[16] & 2) ? 1 : 0; f.barrier = (a[16] & 4) ? 1 : 0; f.star = (a[16] & 8) ? 1 : 0;
    f.giant = (a[16] & 16) ? 1 : 0; f.frozen = (a[16] & 32) ? 1 : 0; f.regen = (a[16] & 64) ? 1 : 0; f.jumpB = (a[16] & 128) ? 1 : 0; f.uses = a[17] || 0; f.ultReady = (a[18] || 0) > 100; f.ult = Math.min(100, a[18] || 0); f.status = [null, 'burn', 'para', 'poison'][a[19] || 0]; f.charge = (a[20] || 0) / 100;
    f.move = (f.state === 'attack' && f.ch.moves[f.mname]) ? f.ch.moves[f.mname] : null;
    if (f.x === undefined || Math.abs(f.tx - f.x) > 90 || Math.abs(f.ty - f.y) > 90) { f.x = f.tx; f.y = f.ty; }
  });
  G.projs = m.p.map(a => ({ x:a[0], y:a[1], r:a[2], p:{ color:a[3], dmg:0 }, owner:{ ch:{ color:a[3] } }, mine:a[4] === 1, item:a[4] >= 2 ? ITEM_KEYS[a[4] - 2] : undefined, still:false, fuse:1, life:a[5], max:1 }));
  G.hazards = (m.z || []).map(a => ({ kind:HZK[a[0]], x:a[1], y:a[2], w:a[3], h:a[4], rc:a[5], ring:a[0] === 5, t:a[6], life:a[7], delay:a[8], color:a[9], face:a[10], age:a[11] }));
  G.ball = m.b ? { x:m.b[0], y:m.b[1], hp:m.b[2], hpMax:5, flash:m.b[3] } : null;
  G.items = (m.i || []).map(a => ({ x:a[0], y:a[1], type:ITEM_KEYS[a[2]] || 'heal', life:a[3], landed:true }));
  for (const e of m.e) {
    if (e[0] === 'sp') fxSparks(e[1], e[2], e[3], e[4], e[5]); else if (e[0] === 'sf') sfx(e[1]); else if (e[0] === 'sk') G.shake = Math.max(G.shake, e[1]); else if (e[0] === 'tx') fxText(e[1], e[2], e[3], e[4]); else if (e[0] === 'dk') G.darkT = e[1]; else if (e[0] === 'bn') G.banner = { t:2.6, text:e[1], sub:e[2] || '' }; else if (e[0] === 'ev') { const f = G.fighters[e[1]]; if (f) { const old = f.ch.name; swapChar(f, e[2]); if (e[3] !== 0 && f.ch.name !== old) { G.hitstop = 0; G.evo = { t:.85, max:.85, idx:e[1], from:old, to:f.ch.name }; sfx('evo'); } } } else if (e[0] === 'ci') { G.cine = { t:.9, max:.9, name:e[1], color:e[2], idx:e[3], who:e[4] }; sfx('ult'); }
  }
  if (m.v) { G.env.lavaY = m.v[0]; G.env.wind = m.v[1]; }
  G.time = m.tm;
  if (G.cd > 0 && m.cd <= 0) G.go = .7;
  G.cd = m.cd;
}
