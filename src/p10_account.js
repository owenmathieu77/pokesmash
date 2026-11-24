
// ================================================================ COMPTE, SAUVEGARDE SYNCHRONISÉE, AMIS ET INVITATIONS
const ACC = { user:null, token:null, ok:false, last:0, dirty:false, timer:null, busy:false, err:'', reqSeen:0, loop:null };
try { const s = JSON.parse(localStorage.getItem('pokesmash.acc') || 'null'); if (s && s.token) { ACC.user = s.user; ACC.token = s.token; } } catch (e) { /* ignoré */ }
const accSave = () => { try { localStorage.setItem('pokesmash.acc', JSON.stringify({ user:ACC.user, token:ACC.token })); } catch (e) { /* ignoré */ } };
const accBase = () => { const s = (typeof window.POKESMASH_SERVER === 'string' && window.POKESMASH_SERVER) ? window.POKESMASH_SERVER.replace(/\/+$/, '') : serverBase(); return s; };
async function accFetch(method, path, body, keepalive) {
  const b = accBase(); if (b === null || b === undefined) throw new Error('Aucun serveur configuré.');
  const r = await fetch(b + path, { method, mode:'cors', keepalive:!!keepalive, headers:Object.assign({ 'Content-Type':'application/json' }, ACC.token ? { Authorization:'Bearer ' + ACC.token } : {}), body:body ? JSON.stringify(body) : undefined });
  let j = {}; try { j = await r.json(); } catch (e) { /* vide */ }
  if (r.status === 401 && ACC.token && path !== '/api/login') { accLogoutLocal(); throw new Error('Session expirée : reconnectez-vous.'); }
  if (!r.ok) throw new Error(j.error || ('Erreur ' + r.status));
  return j;
}

// ---------------------------------------------------------------- fichier de sauvegarde (progression)
function saveBundle() {
  return { v:1, ts:Date.now(), stats:STATS, daily:dailyStore(), settingsTs:SET.settingsTs || 0,
    settings:{ keys:SET.keys, pad:SET.pad, touch:SET.touch, audio:SET.audio, game:SET.game }, fusions:CUSTOMS.slice(0, 12).map(c => c.def) };
}
function mergeBundle(r) {
  if (!r || typeof r !== 'object') return;
  const rs = r.stats || {};
  for (const k of Object.keys(rs)) {
    if (k === 'used') for (const id of Object.keys(rs.used || {})) STATS.used[id] = Math.max(STATS.used[id] || 0, rs.used[id] || 0);
    else if (k === 'achv') for (const id of Object.keys(rs.achv || {})) STATS.achv[id] = Math.min(STATS.achv[id] || Infinity, rs.achv[id]);
    else if (typeof rs[k] === 'number') STATS[k] = Math.max(STATS[k] || 0, rs[k]);
  }
  if (r.daily && Array.isArray(r.daily.e)) {
    const st = dailyStore(), seen = new Set(st.e.map(x => x.date + '|' + x.score + '|' + x.time));
    for (const x of r.daily.e) if (!seen.has(x.date + '|' + x.score + '|' + x.time)) st.e.push(x);
    st.e = st.e.sort((a, b) => (a.date > b.date ? 1 : -1)).slice(-60); try { localStorage.setItem('pokesmash.daily', JSON.stringify(st)); } catch (e) { /* ignoré */ }
  }
  if (r.settings && (r.settingsTs || 0) > (SET.settingsTs || 0)) { const keep = SET.net; mergeInto(SET, r.settings); SET.net = keep; SET.settingsTs = r.settingsTs; try { localStorage.setItem('pokebrawl2.settings', JSON.stringify(SET)); } catch (e) { /* ignoré */ } }
  if (Array.isArray(r.fusions)) for (const d of r.fusions) { try { if (CHAR_BY_ID[d.h] !== undefined && CHAR_BY_ID[d.b] !== undefined && CHAR_BY_ID[d.t] !== undefined) makeCustom(d.h, d.b, d.t, d.n); } catch (e) { /* ignoré */ } }
  try { localStorage.setItem(STATS_KEY, JSON.stringify(STATS)); } catch (e) { /* ignoré */ }
  checkAchv();
}
function accDirty() {
  if (!ACC.token) return; ACC.dirty = true;
  if (ACC.timer) return; ACC.timer = setTimeout(() => { ACC.timer = null; accPush(); }, 6000);
}
async function accPush(keepalive) {
  if (!ACC.token || !ACC.dirty || ACC.busy) return; ACC.busy = true; ACC.dirty = false;
  try { await accFetch('PUT', '/api/save', { save:saveBundle() }, keepalive); ACC.ok = true; ACC.last = Date.now(); ACC.err = ''; }
  catch (e) { ACC.ok = false; ACC.err = e.message; ACC.dirty = true; }
  ACC.busy = false;
}
document.addEventListener('visibilitychange', () => { if (document.hidden && ACC.token && ACC.dirty) { if (ACC.timer) { clearTimeout(ACC.timer); ACC.timer = null; } accPush(true); } });
addEventListener('pagehide', () => { if (ACC.token && ACC.dirty) accPush(true); });

// ---------------------------------------------------------------- connexion / création / déconnexion
function accLogoutLocal() { ACC.user = null; ACC.token = null; ACC.ok = false; if (ACC.loop) { clearInterval(ACC.loop); ACC.loop = null; } try { localStorage.removeItem('pokesmash.acc'); } catch (e) { /* ignoré */ } }
async function accAuth(kind, user, pass) {
  const j = await accFetch('POST', kind === 'register' ? '/api/register' : '/api/login', { user, pass });
  ACC.user = j.user; ACC.token = j.token; accSave();
  mergeBundle(j.save); ACC.dirty = true; ACC.ok = true; ACC.last = Date.now(); await accPush();
  accStartLoop(); toast('☁️ Connecté : ' + ACC.user + ' — progression synchronisée');
}
async function accRestore() {
  if (!ACC.token) return;
  try { const j = await accFetch('GET', '/api/me'); ACC.user = j.user; mergeBundle(j.save); ACC.ok = true; ACC.last = Date.now(); ACC.dirty = true; accPush(); accStartLoop(); } catch (e) { ACC.err = e.message; }
}
function accStartLoop() {
  if (ACC.loop) clearInterval(ACC.loop);
  const tick = async () => {
    if (!ACC.token) return;
    try {
      const hosting = NET.role === 'host' && NET.code, playing = G.scene === 'fight' || G.scene === 'over';
      await accFetch('POST', '/api/presence', { state:hosting ? (playing ? 'playing' : 'lobby') : (G.net === 'guest' ? 'playing' : 'menu'), code:hosting ? NET.code : null });
      const box = await accFetch('GET', '/api/inbox');
      for (const inv of box.invites) toast('📨 ' + inv.from + ' vous invite à jouer !', 'Rejoindre', () => { if (G.scene === 'fight') return; netJoinFlow(inv.code); });
      if (box.reqIn > ACC.reqSeen) toast('🤝 Nouvelle demande d\'ami', 'Voir', () => showFriends());
      ACC.reqSeen = box.reqIn;
    } catch (e) { /* hors-ligne : on réessaiera */ }
  };
  tick(); ACC.loop = setInterval(tick, 15000);
}
setTimeout(() => { if (ACC.token) { const wait = () => (accBase() === null || accBase() === undefined) && !PS.probed ? setTimeout(wait, 300) : accRestore(); wait(); } }, 600);

// ---------------------------------------------------------------- sauvegarde locale (fichier .json)
function exportSave() {
  const blob = new Blob([JSON.stringify(saveBundle(), null, 1)], { type:'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'pokesmash-sauvegarde-' + todayStr() + '.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function importSave() {
  const inp = h('input', { type:'file', accept:'.json,application/json' }); inp.style.display = 'none'; document.body.appendChild(inp);
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const j = JSON.parse(rd.result); if (!j.stats) throw new Error('fichier invalide'); if (j.settingsTs !== undefined) j.settingsTs = 0; mergeBundle(j); saveStats(); accDirty(); toast('💾 Sauvegarde importée (fusionnée avec la progression actuelle)'); showAccount(); } catch (e) { alert('Fichier de sauvegarde invalide.'); } inp.remove(); }; rd.readAsText(f); };
  inp.click();
}

// ---------------------------------------------------------------- écrans
function showAccount(msg) {
  const base = accBase(), noServer = base === null || base === undefined, rows = [];
  const err = h('div', { class:'accerr' }, msg || '');
  const field = (ph, type) => { const i = h('input', { type:type || 'text', class:'search', placeholder:ph, autocomplete:type === 'password' ? 'current-password' : 'username', maxlength:'64' }); return i; };
  rows.push(h('div', { class:'title sm' }, '☁️ Compte & sauvegarde'));
  if (ACC.token && ACC.user) {
    const st = ACC.ok ? '✔ Synchronisé' + (ACC.last ? ' à ' + new Date(ACC.last).toLocaleTimeString() : '') : '⚠ ' + (ACC.err || 'Hors-ligne : sera synchronisé dès que possible');
    rows.push(h('div', { class:'panel txt' }, h('p', null, h('b', null, 'Connecté : ' + ACC.user)), h('p', null, st), h('p', { class:'hint' }, 'Votre progression (statistiques, succès, défis du jour, réglages, fusions) est envoyée automatiquement au serveur, qui la sauvegarde sur GitHub.')));
    rows.push(h('div', { class:'row' }, btn('☁️ Synchroniser maintenant', async () => { ACC.dirty = true; await accPush(); showAccount(); }, 'small'), btn('👥 Amis', () => showFriends(), 'big go'), btn('Déconnexion', async () => { try { await accFetch('POST', '/api/logout'); } catch (e) { /* ignoré */ } accLogoutLocal(); showAccount(); }, 'small')));
  } else if (noServer) {
    rows.push(h('div', { class:'panel txt' }, h('p', null, 'Les comptes nécessitent le serveur du jeu (voir le tutoriel d\'hébergement).'), h('p', null, 'Entrez son adresse dans Paramètres → Réseau, ou ouvrez le jeu depuis l\'adresse de votre serveur.')));
    rows.push(h('div', { class:'row' }, btn('⚙️ Réseau', () => showSettings('net', () => showAccount()), 'big go')));
  } else {
    const lu = field('Pseudo'), lp = field('Mot de passe', 'password'), ru = field('Pseudo (3 à 16 caractères)'), rp = field('Mot de passe (6 caractères min.)', 'password'), rp2 = field('Confirmer le mot de passe', 'password');
    const go = async (kind) => {
      try {
        err.textContent = 'Connexion…';
        if (kind === 'register') { if (rp.value !== rp2.value) throw new Error('Les mots de passe ne correspondent pas.'); await accAuth('register', ru.value.trim(), rp.value); }
        else await accAuth('login', lu.value.trim(), lp.value);
        showAccount();
      } catch (e) { err.textContent = e.message; }
    };
    rows.push(h('div', { class:'row' },
      h('div', { class:'panel set accform' }, h('b', null, 'Se connecter'), lu, lp, btn('Connexion', () => go('login'), 'big go')),
      h('div', { class:'panel set accform' }, h('b', null, 'Créer un compte'), ru, rp, rp2, btn('Créer mon compte', () => go('register'), 'big'))));
    rows.push(err);
  }
  rows.push(h('div', { class:'panel txt' }, h('b', null, '💾 Fichier de sauvegarde'), h('div', { class:'hint' }, 'Téléchargez votre progression dans un fichier .json (utile sans compte), ou importez-la sur un autre appareil.'),
    h('div', { class:'row' }, btn('💾 Exporter', exportSave, 'small'), btn('📂 Importer', importSave, 'small'))));
  rows.push(btn('← Menu', showMenu, 'big'));
  show(false, ...rows);
}
let frTimer = null;
function frStop() { if (frTimer) { clearInterval(frTimer); frTimer = null; } }
async function showFriends(msg) {
  frStop();
  if (!ACC.token) { showAccount('Connectez-vous pour gérer vos amis.'); return; }
  let d = null; try { d = await accFetch('GET', '/api/friends'); } catch (e) { showAccount(e.message); return; }
  const input = h('input', { type:'text', class:'search', placeholder:'Pseudo d\'un joueur à ajouter', maxlength:'16' });
  const act = async (fn, okMsg) => { try { await fn(); showFriends(okMsg); } catch (e) { showFriends('⚠ ' + e.message); } };
  const stateTxt = f => !f.online ? '⚫ hors-ligne' : f.state === 'lobby' ? '🟢 dans un salon' : f.state === 'playing' ? '🎮 en combat' : '🟢 en ligne';
  const hosting = NET.role === 'host' && NET.code;
  const flist = d.friends.length ? d.friends.map(f => h('div', { class:'room' }, h('div', null, h('b', null, f.name), h('div', { class:'hint' }, stateTxt(f))),
    h('div', { class:'row' }, f.code ? btn('Rejoindre', () => netJoinFlow(f.code), 'small go') : null,
      hosting && f.online ? btn('📨 Inviter', () => act(() => accFetch('POST', '/api/invite', { to:f.name, code:NET.code }), 'Invitation envoyée à ' + f.name), 'small') : null,
      btn('Retirer', () => { if (confirm('Retirer ' + f.name + ' de vos amis ?')) act(() => accFetch('DELETE', '/api/friends/' + encodeURIComponent(f.name)), f.name + ' retiré'); }, 'small')))) : [h('div', { class:'hint' }, 'Aucun ami pour l\'instant : ajoutez-en avec leur pseudo.')];
  show(false, h('div', { class:'title sm' }, '👥 Amis — ' + ACC.user), msg ? h('div', { class:'sub' }, msg) : null,
    h('div', { class:'row' }, input, btn('➕ Ajouter', () => { const v = input.value.trim(); if (v) act(() => accFetch('POST', '/api/friends/request', { to:v }), 'Demande envoyée à ' + v); }, 'small go')),
    d.reqIn.length ? h('div', { class:'panel txt' }, h('b', null, '🤝 Demandes reçues'), d.reqIn.map(n => h('div', { class:'room' }, h('span', null, n), h('div', { class:'row' }, btn('Accepter', () => act(() => accFetch('POST', '/api/friends/accept', { from:n }), n + ' est maintenant votre ami'), 'small go'), btn('Refuser', () => act(() => accFetch('POST', '/api/friends/decline', { from:n }), 'Demande refusée'), 'small'))))) : null,
    d.reqOut.length ? h('div', { class:'hint' }, 'Demandes envoyées en attente : ' + d.reqOut.join(', ')) : null,
    h('div', { class:'rooms' }, flist),
    h('div', { class:'row' }, btn('← Compte', () => { frStop(); showAccount(); }, 'big'), btn('↻', () => showFriends(), 'small')));
  frTimer = setInterval(() => { if (!document.querySelector('.rooms')) { frStop(); return; } if (document.activeElement !== input) showFriends(msg); }, 12000);
}
function showInvitePicker() {
  if (!ACC.token) { toast('Connectez-vous pour inviter vos amis (menu → Compte & amis).'); return; }
  accFetch('GET', '/api/friends').then(d => {
    const online = d.friends.filter(f => f.online), modal = h('div', { class:'modal' });
    modal.appendChild(h('div', { class:'mbox' }, h('div', { class:'title sm' }, '📨 Inviter un ami'), h('div', { class:'sub' }, 'Code du salon : ' + NET.code),
      online.length ? h('div', { class:'rooms' }, online.map(f => h('div', { class:'room' }, h('span', null, f.name + ' · ' + (f.state === 'lobby' ? 'dans un salon' : f.state === 'playing' ? 'en combat' : 'en ligne')),
        btn('Inviter', () => accFetch('POST', '/api/invite', { to:f.name, code:NET.code }).then(() => toast('📨 Invitation envoyée à ' + f.name)).catch(e => toast('⚠ ' + e.message)), 'small go')))) : h('div', { class:'hint' }, 'Aucun ami en ligne pour le moment. Partagez le code ci-dessus.'),
      btn('Fermer', () => modal.remove(), 'big')));
    ui.appendChild(modal);
  }).catch(e => toast('⚠ ' + e.message));
}
