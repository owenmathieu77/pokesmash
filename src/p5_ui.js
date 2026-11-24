// ================================================================ INTERFACE (DOM)
const ui = document.getElementById('ui');
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (k === 'class') e.className = v; else if (k === 'style') e.style.cssText = v;
    else if (k.slice(0, 2) === 'on') e[k] = v; else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) { if (c == null || c === false) continue; e.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c))); }
  return e;
}
function show(overlay, ...kids) {
  ui.innerHTML = ''; ui.className = overlay ? 'overlay' : '';
  kids.flat().forEach(k => { if (k) ui.appendChild(k); });
}
function hideUI() { ui.innerHTML = ''; ui.className = 'hidden'; }
const btn = (label, fn, cls) => h('button', { class:'btn ' + (cls || ''), onclick:() => { ensureAudio(); sfx('ui'); fn(); } }, label);
const clamp1 = (v, a, b) => Math.max(a, Math.min(b, v));
const LVL_NAMES = ['', 'Très facile', 'Facile', 'Assez facile', 'Moyen -', 'Moyen', 'Moyen +', 'Difficile', 'Très difficile', 'Expert'];

function showMenu() {
  G.scene = 'menu'; netClose();
  show(false,
    h('div', { class:'title' }, 'PokeSmash'),
    h('div', { class:'accline' }, ACC.token && ACC.user ? '☁️ Connecté : ' + ACC.user + (ACC.ok ? ' — progression synchronisée' : ' — synchronisation en attente') : 'Non connecté — progression enregistrée sur cet appareil'),
    h('div', { class:'sub' }, 'Fan game non officiel de combat de plateforme · 68 familles (164 formes) · 12 grands décors · 18 objets · atelier de fusion'),
    h('div', { class:'col menucol' },
      btn('🏆 Arcade — parcours, boutique, 8 combats', () => showSelect('arcade'), 'big'),
      btn('🧟 Survie — vagues infinies', () => showSelect('horde'), 'big'),
      btn('🥇 Tournoi (4, 8 ou 16)', () => showSelect('tour'), 'big'),
      btn('📅 Défi du jour', () => showDaily(), 'big'),
      btn('🎮 Versus local (2 à 4 joueurs, équipes)', () => showSelect('versus'), 'big'),
      btn('🌐 En ligne — Héberger un salon', () => netHostFlow(), 'big'),
      btn('🔑 En ligne — Rejoindre avec un code', () => netJoinFlow(), 'big'),
      btn('🌍 Salons publics', () => showPublicRooms(), 'big'),
      btn('👤 Profil & succès', () => showProfile(), 'big'),
      btn('☁️ Compte & amis', () => showAccount(), 'big'),
      btn('⚙️ Paramètres', () => showSettings('keys', showMenu), 'big'),
      btn('❔ Commandes & crédits', () => showHelp(), 'big'),
      btn('⛶ Plein écran', toggleFullscreen)),
    h('div', { class:'foot' }, h('div', { class:'by' }, 'Fait par Mathieu Owen'), 'Sprites : PMDCollab / SpriteCollab (CC BY-NC 4.0) — usage non commercial. Pokémon © Nintendo / Game Freak / Creatures Inc. Aucun lien avec ces sociétés.'));
}

function showHelp() {
  show(false,
    h('div', { class:'title sm' }, 'Commandes & crédits'),
    h('div', { class:'panel txt' },
      h('p', null, h('b', null, 'Touches = positions physiques : '), 'sur AZERTY, appuyez sur ZQSD à la place de WASD.'),
      h('p', null, h('b', null, 'Choix du Pokémon : '), 'cliquez un Pokémon pour choisir son évolution (ex. Axoloto → Maraiste, les 8 évolutions d\'Évoli…) et l\'activer en chromatique ✨. 🎲 = hasard. Les touches se reprogramment dans ⚙️ Paramètres.'),
      h('p', null, h('b', null, 'Atelier de fusion 🧬 : '), 'choisissez la tête d\'un Pokémon, le corps d\'un autre et la queue d\'un troisième : il est créé le temps de la session et placé en premier dans le menu. Tête = spécial neutre, corps = taille/poids/remontée, queue = spéciaux côté/bas et vitesse.'),
      h('p', null, h('b', null, 'Objets : '), '🍒 baie · 💊 potion · 💪 force · 👟 vitesse · ⭐ étoile · 🛡 barrière · 💖 vie · 🍄 géant · 🌿 régénération · 🚀 sauts bonus · ⚡ éclair · ☄️ météores · 💣 bombe, 🔴 Poké Ball, 🧊 glaçon, 🍌 banane (à lancer avec attaque) · ⚔️ épée et 🔨 marteau (attaque = coup d\'arme).'),
      h('p', null, h('b', null, 'Attaque ultime ⭐ : '), 'la barre Smash se remplit quand vous infligez ou subissez des dégâts, et la Boule Smash flotte dans les airs : cassez-la en plusieurs coups. Quand vous brillez, un spécial neutre déclenche votre ultime, lié au type du Pokémon (Feu : tourbillon de flammes, Eau : raz-de-marée, Plante : jungle, Électrik : foudre, Dragon : colère draconique, Spectre : cauchemar…).'),
      h('p', null, h('b', null, 'Joueur 1 : '), 'A/D déplacer · W saut (double saut) · S bas · F attaque · G spécial · H bouclier · T grab.'),
      h('p', null, h('b', null, 'Joueur 2 : '), 'flèches déplacer/sauter/bas · K attaque · L spécial · ; (touche M sur AZERTY) bouclier · O grab.'),
      h('p', null, h('b', null, 'Joueurs 3 et 4 : '), 'manettes (stick/croix, A saut, X attaque, B spécial, gâchettes bouclier). Les manettes 1 et 2 fonctionnent aussi pour P1/P2.'),
      h('p', null, h('b', null, 'Attaques : '), 'attaque seule = jab (appuyez 3 fois pour le combo) ; + haut/bas/direction = coups différents, au sol et en l\'air ; en courant = attaque de course. Une touche pressée en fin de coup est mémorisée, et un coup qui touche peut être annulé par un saut ou un spécial.'),
      h('p', null, h('b', null, 'Spécial : '), 'neutre = projectile/rayon · + direction = spécial latéral · + haut = remontée (une fois en l\'air) · + bas = contre, mine, boost ou onde de choc selon le Pokémon.'),
      h('p', null, h('b', null, 'Bouclier : '), 'maintenir le bouclier ; il s\'use et se brise s\'il est trop frappé. Bouclier + direction = esquive roulée ; bouclier + bas = esquive sur place ; bouclier + saut = sauter.'),
      h('p', null, h('b', null, 'Grab : '), 'bouclier puis attaque. Une fois l\'adversaire saisi : attaque = coup, ou direction = projection (avant, arrière, haut, bas). Martelez les touches pour vous libérer.'),
      h('p', null, h('b', null, 'Échap : '), 'pause (local). M : son on/off.'),
      h('p', null, h('b', null, 'En ligne : '), 'l\'hôte voit un code à 6 caractères, l\'invité le saisit. Connexion directe (WebRTC) via un serveur PeerJS public ; peut échouer sur certains réseaux (pare-feu stricts, certains réseaux d\'entreprise).'),
      h('p', null, h('b', null, 'Crédits : '), 'jeu fait par Mathieu Owen ; sprites de la communauté PMDCollab (sprites.pmdcollab.org, dépôt github.com/PMDCollab/SpriteCollab), licence CC BY-NC 4.0, usage non commercial avec attribution. La liste des artistes se trouve dans le dépôt. Pokémon © Nintendo / Game Freak / Creatures Inc.')),
    btn('← Retour', showMenu));
}


// ---------------------------------------------------------------- PORTRAITS, FORMES, ÉVOLUTIONS
function portraitEl(ch, shiny, cls) {
  const id = ch.custom ? ch.custom.head : ch.id;
  const img = h('img', { class:cls || '', alt:'', src:BASE + 'portrait/' + id + (shiny ? '/0000/0001' : '') + '/Normal.png' });
  img.onerror = function () {
    if (shiny && !this.__fb) { this.__fb = true; this.style.filter = 'hue-rotate(' + shinyHue(ch) + 'deg) saturate(1.2)'; this.src = BASE + 'portrait/' + id + '/Normal.png'; }
    else this.style.visibility = 'hidden';
  };
  return img;
}
const NB_L = { straight:'Tir rapide', arc:'Boule en arc', spread:'Éventail', boomerang:'Boomerang', orb:'Grosse sphère', beam:'Rayon', homing:'Tir guidé', wave:'Onde au sol', fan:'Souffle', rain:'Pluie' };
const SB_L = { dash:'Charge', slash:'Grand coup', pounce:'Bond', spin:'Toupie', tackle:'Plaquage', blink:'Éclair-bond' };
const UB_L = { rocket:'Fusée', teleport:'Téléportation', spin:'Tourbillon', flap:'Battement d\'ailes', burst:'Explosion', glide:'Plané', warp:'Warp' };
const DB_L = { counter:'Contre', mine:'Mine', boost:'Boost', slam:'Onde de choc', reflect:'Réflexion', heal:'Soin', quake:'Séisme' };
function kitText(ch) { const t = ch.types; return 'Spécial : ' + NB_L[t.nb] + ' · Côté : ' + SB_L[t.sb] + ' · Haut : ' + UB_L[t.ub] + ' · Bas : ' + DB_L[t.db]; }
function randomForm() {                              // une famille au hasard, plutôt une forme évoluée
  const fam = FAMILIES[Math.floor(Math.random() * FAMILIES.length)], last = fam[fam.length - 1], st = Math.random() < .7 ? last : fam[Math.floor(Math.random() * fam.length)];
  return CHAR_BY_ID[st[Math.floor(Math.random() * st.length)]];
}
const customs = () => CUSTOMS.map(c => c.idx);
const CUSTOMS = [];
function makeCustom(hId, bId, tId, name) {
  const key = [hId, bId, tId, name].join('/'), ex = CUSTOMS.find(c => c.key === key); if (ex) return ex.idx;
  const rows = id => ROSTER[CHAR_BY_ID[id]], H = rows(hId), B = rows(bId), T = rows(tId);
  const row = ['cu' + (CUSTOMS.length + 1), name, H[2], B[3], T[4], H[5], T[6], B[7], T[8]];
  const ch = buildChar(row, CHARS.length); ch.custom = { head:hId, body:bId, tail:tId }; ch.isCustom = true;
  ch.speed = (CHARS[CHAR_BY_ID[bId]].speed + CHARS[CHAR_BY_ID[tId]].speed) / 2; ch.jump = CHARS[CHAR_BY_ID[bId]].jump;
  CHARS.push(ch); CHAR_BY_ID[ch.id] = ch.idx; CUSTOMS.push({ key, idx:ch.idx, def:{ n:name, h:hId, b:bId, t:tId } }); if (typeof accDirty === 'function') accDirty();
  return ch.idx;
}
const refOf = i => CHARS[i] && CHARS[i].isCustom ? CUSTOMS.find(c => c.idx === i).def : i;
const idxOf = r => (r && typeof r === 'object') ? makeCustom(r.h, r.b, r.t, r.n) : r;

function evoMenu(baseIdx) {
  const stages = familyChars(baseIdx), slot = S.slots[S.active];
  let cur = [].concat(...stages).includes(slot.char) ? slot.char : baseIdx, shiny = !!slot.shiny;
  const modal = h('div', { class:'modal' });
  const render = () => {
    modal.innerHTML = '';
    const ch = CHARS[cur], chain = h('div', { class:'chain' });
    stages.forEach((st, si) => {
      if (si) chain.appendChild(h('div', { class:'arrow' }, '➜'));
      const col = h('div', { class:'stage' });
      st.forEach(i => { const c = CHARS[i]; col.appendChild(h('button', { class:'evo' + (i === cur ? ' sel' : ''), onclick() { cur = i; render(); } }, portraitEl(c, shiny, 'evoimg'), h('span', null, c.name))); });
      chain.appendChild(col);
    });
    modal.appendChild(h('div', { class:'mbox' }, h('div', { class:'title sm' }, 'Choisir la forme'), chain,
      h('div', { class:'evoinfo' }, h('b', null, ch.name + (shiny ? ' ✨' : '')), h('div', null, 'Taille ' + ch.size + ' · poids ' + ch.weight + ' · vitesse ' + Math.round(ch.speed) + ' · style ' + ch.style), h('div', null, kitText(ch))),
      h('div', { class:'row' }, btn(shiny ? '✨ Chromatique : OUI' : '✨ Chromatique : non', () => { shiny = !shiny; render(); }, shiny ? 'go' : ''),
        btn('Annuler', () => modal.remove()), btn('Valider', () => { modal.remove(); pickChar(cur, shiny); }, 'go big'))));
  };
  render(); ui.appendChild(modal);
}

// ---------------------------------------------------------------- ATELIER DE FUSION : tête + corps + queue
let fuTimer = null;
function showFusion(back) {
  if (fuTimer) { clearInterval(fuTimer); fuTimer = null; }
  const forms = CHARS.map((c, i) => i).filter(i => !CHARS[i].custom).sort((a, b) => CHARS[a].name.localeCompare(CHARS[b].name, 'fr'));
  const sel = { h:CHAR_BY_ID['0025'], b:CHAR_BY_ID['0006'], t:CHAR_BY_ID['0094'] };
  const prev = h('canvas', { width:'260', height:'240', class:'fuprev' }), pctx = prev.getContext('2d');
  const nameIn = h('input', { type:'text', class:'search', maxlength:'14', placeholder:'Nom du Pokémon' }); let touched = false;
  nameIn.oninput = () => { touched = true; };
  const status = h('div', { class:'hint' });
  let anim = null, token = 0, frame = 0, tick = 0;
  const genName = () => { const A = CHARS[sel.h].name, B = CHARS[sel.b].name, t = A.slice(0, Math.ceil(A.length / 2)) + B.slice(Math.floor(B.length / 2)).toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
  const refresh = async () => {
    const my = ++token, H = CHARS[sel.h], B = CHARS[sel.b], T = CHARS[sel.t];
    status.textContent = 'Assemblage des sprites…';
    const tmp = { id:'p' + H.id + B.id + T.id, custom:{ head:H.id, body:B.id, tail:T.id } };
    const sp = await loadCustomSprites(tmp, false);
    if (my !== token) return;
    anim = sp.anims.Idle || sp.anims.Walk || null; frame = 0;
    status.textContent = sp.ok ? '' : 'Sprites indisponibles (hors-ligne ?) : le Pokémon sera quand même créé avec des formes de remplacement.';
    if (!touched) nameIn.value = genName();
  };
  fuTimer = setInterval(() => {
    pctx.clearRect(0, 0, 260, 240);
    if (!anim) { pctx.fillStyle = '#9aa3d0'; pctx.font = '14px system-ui'; pctx.fillText('…', 120, 120); return; }
    const row = 2, n = anim.durs.length; if (++tick % 2 === 0) frame = (frame + 1) % n;
    const s = Math.min(5, 200 / anim.fh); pctx.imageSmoothingEnabled = false;
    pctx.drawImage(anim.img, frame * anim.fw, row * anim.fh, anim.fw, anim.fh, 130 - anim.fw * s / 2, 225 - anim.fh * s, anim.fw * s, anim.fh * s);
  }, 100);
  const mkSel = (label, key) => {
    const el = h('select', { onchange() { sel[key] = parseInt(this.value, 10); refresh(); } }, ...forms.map(i => h('option', Object.assign({ value:String(i) }, i === sel[key] ? { selected:'selected' } : {}), CHARS[i].name)));
    return h('label', { class:'opt' }, label + ' ', el);
  };
  const leave = () => { clearInterval(fuTimer); fuTimer = null; token++; if (back) back(); };
  const selects = [mkSel('🧠 Tête (spécial neutre)', 'h'), mkSel('🫀 Corps (taille, poids, remontée)', 'b'), mkSel('🦎 Queue (spéciaux côté/bas, vitesse)', 't')];
  show(false, h('div', { class:'title sm' }, '🧬 Atelier de fusion'),
    h('div', { class:'row' }, h('div', { class:'panel set' }, ...selects, h('label', { class:'opt' }, 'Nom ', nameIn),
        h('div', { class:'row' }, btn('🎲 Au hasard', () => { sel.h = forms[Math.floor(Math.random() * forms.length)]; sel.b = forms[Math.floor(Math.random() * forms.length)]; sel.t = forms[Math.floor(Math.random() * forms.length)]; touched = false; showFusionKeep(); }, 'small'))),
      h('div', { class:'panel' }, prev, status)),
    h('div', { class:'hint' }, 'Le Pokémon créé est temporaire (il disparaît quand vous fermez la page) et apparaît en premier dans le menu de sélection. La tête, le corps et la queue sont découpés dans les vrais sprites.'),
    h('div', { class:'row' }, btn('← Retour', leave),
      btn('Créer et jouer avec lui', () => {
        const name = (nameIn.value || genName()).trim().slice(0, 14) || 'Chimère', idx = makeCustom(CHARS[sel.h].id, CHARS[sel.b].id, CHARS[sel.t].id, name);
        if (S && editable(S.active)) { S.slots[S.active].char = idx; S.slots[S.active].shiny = false; if (S.mode === 'guest') NET.send({ t:'pick', c:refOf(idx), s:false }); if (S.mode === 'host') lobbySend(); }
        stat('fusions'); void loadSprites(CHARS[idx], false); leave();
      }, 'big go')));
  function showFusionKeep() { const k = { ...sel }; showFusion(back); Object.assign(sel, k); }
  refresh();
}

// ---------------------------------------------------------------- SÉLECTION
let S = null;
function newSelect(mode) {
  const base = { mode, stage:-1, stocks:SET.game.stocks, active:0, diff:'normal', q:'', teams:false, ff:false };
  const PK = CHAR_BY_ID['0025'];
  if (mode === 'arcade') base.slots = [{ kind:'human', char:PK, shiny:false, team:0 }];
  else if (mode === 'versus') base.slots = [{ kind:'human', char:PK, shiny:false, team:0 }, { kind:'cpu', lvl:SET.game.cpu, char:CHAR_BY_ID['0006'], shiny:false, team:1 }, { kind:'off', lvl:SET.game.cpu, char:CHAR_BY_ID['0448'], shiny:false, team:0 }, { kind:'off', lvl:SET.game.cpu, char:CHAR_BY_ID['0094'], shiny:false, team:1 }];
  else if (mode === 'horde') base.slots = [{ kind:'human', char:PK, shiny:false, team:0 }, { kind:'off', char:CHAR_BY_ID['0448'], shiny:false, team:0 }];
  else if (mode === 'tour') { base.slots = [{ kind:'human', char:PK, shiny:false, team:0 }, { kind:'cpu', lvl:SET.game.cpu, char:CHAR_BY_ID['0006'], shiny:false, team:0 }, { kind:'off', lvl:SET.game.cpu, char:CHAR_BY_ID['0448'], shiny:false, team:0 }, { kind:'off', lvl:SET.game.cpu, char:CHAR_BY_ID['0094'], shiny:false, team:0 }]; base.tsize = 8; base.stocks = 2; }
  else if (mode === 'host') { base.slots = [{ kind:'human', char:PK, shiny:false }]; for (let i = 1; i < 8; i++) base.slots.push({ kind:'off', char:randomForm(), shiny:false, lvl:SET.game.cpu, team:i % 2 }); }
  else { base.slots = []; for (let i = 0; i < 8; i++) base.slots.push({ kind:'off', char:-1, shiny:false, lvl:5 }); base.you = -1; }
  if (mode === 'guest') base.active = 0;
  return base;
}
function editable(i) { if (S.mode === 'guest') return i === S.you; return S.slots[i].kind !== 'remote' && S.slots[i].kind !== 'off'; }

function showSelect(mode) {
  if (mode) { S = newSelect(mode); G.scene = 'menu'; }
  const m = S.mode;
  const titles = { horde:'Survie — vagues infinies (1 ou 2 joueurs en coopération)', tour:'Tournoi — choisissez les participants', arcade:'Arcade — choisissez votre combattant', versus:'Versus local', host:'En ligne — vous êtes l\'hôte (P1)', guest:'En ligne — vous êtes l\'invité (P2)' };
  const roster = h('div', { class:'grid' });
  const norm = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const fillGrid = () => {
    roster.innerHTML = '';
    const q = norm(S.q || ''), famOf = i => CHARS[i].custom ? -1 : FAM_OF[CHARS[i].id];
    const owned = fi => S.slots.map((sl, si) => (sl.kind !== 'off' && sl.char >= 0 && famOf(sl.char) === fi) ? si : -1).filter(x => x >= 0);
    const cellStyle = ow => ow.length ? 'border-color:' + PCOL[ow[0]] + ';box-shadow:0 0 0 2px ' + PCOL[ow[0]] : '';
    for (const i of customs()) {
      const ch = CHARS[i], ow = S.slots.map((sl, si) => (sl.kind !== 'off' && sl.char === i) ? si : -1).filter(x => x >= 0);
      if (q && !norm(ch.name).includes(q)) continue;
      roster.appendChild(h('button', { class:'cell cust', title:'Pokémon créé : ' + ch.name, style:cellStyle(ow), onclick:() => pickChar(i, false) }, portraitEl(ch, false), h('span', null, '🧬 ' + ch.name)));
    }
    BASE_FORMS.forEach((i, fi) => {
      const ch = CHARS[i];
      if (q && !FAMILIES[fi].some(st => st.some(id => norm(CHARS[CHAR_BY_ID[id]].name).includes(q)))) return;
      const ow = owned(fi), cur = ow.length ? CHARS[S.slots[ow[0]].char] : ch, sh = ow.length && S.slots[ow[0]].shiny;
      roster.appendChild(h('button', { class:'cell', title:ch.name + (FAMILIES[fi].length > 1 ? ' (évolutions disponibles)' : ''), style:cellStyle(ow), onclick:() => evoMenu(i) },
        portraitEl(cur, sh), h('span', null, cur.name + (sh ? ' ✨' : ''))));
    });
    roster.appendChild(h('button', { class:'cell rand', onclick:() => pickChar(randomForm(), Math.random() < .1) }, h('div', { class:'q' }, '🎲'), h('span', null, 'Aléatoire')));
  };
  fillGrid();
  const search = h('input', { type:'search', class:'search', placeholder:'🔎 Rechercher parmi ' + BASE_COUNT + ' formes…', oninput() { S.q = this.value; fillGrid(); } });
  search.value = S.q || '';

  const cards = S.slots.map((s, i) => {
    if ((m === 'arcade' && i > 0) || (m === 'horde' && i > 1)) return null;
    const ch = s.char >= 0 ? CHARS[s.char] : null;
    const online = m === 'host' || m === 'guest';
    const label = s.kind === 'off' ? (online ? 'Libre' : 'Désactivé') : s.kind === 'remote' ? (i === 0 ? 'Hôte' : 'Joueur en ligne') : s.kind === 'cpu' ? 'CPU' : (m === 'guest' ? 'Vous' : (m === 'host' ? 'Vous (hôte)' : 'Humain'));
    const cyc = m === 'horde' ? (i === 1 ? { human:'off', off:'human' } : null) : (m === 'versus' || m === 'tour') ? { human:'cpu', cpu:'off', off:'human' } : (m === 'host' && i > 0 && s.kind !== 'remote') ? { off:'cpu', cpu:'off' } : null;
    const kindBtn = cyc && cyc[s.kind] ? btn(label, () => { s.kind = cyc[s.kind]; if (s.kind !== 'off') S.active = i; if (m === 'host') lobbySend(); showSelect(); }, 'small') : h('div', { class:'tag' }, label);
    const tbtn = S.teams && s.kind !== 'off' ? ((m === 'versus' || (m === 'host' && s.kind !== 'remote')) ?
      h('button', { class:'btn small', style:'border-color:' + TEAMCOL[s.team || 0] + ';color:' + TEAMCOL[s.team || 0], onclick(e) { e.stopPropagation(); s.team = s.team ? 0 : 1; if (m === 'host') lobbySend(); showSelect(); } }, 'Équipe ' + (s.team ? 'B' : 'A')) :
      h('div', { class:'tag', style:'color:' + TEAMCOL[s.team || 0] }, 'Équipe ' + ((s.team || 0) ? 'B' : 'A'))) : null;
    const lvl = s.kind === 'cpu' ? h('select', { onchange() { s.lvl = parseInt(this.value, 10); } }, ...LVL_NAMES.map((n, k) => k ? h('option', Object.assign({ value:k }, k === s.lvl ? { selected:'selected' } : {}), k + ' · ' + n) : null)) : null;
    return h('div', { class:'slot' + (S.active === i ? ' act' : '') + (s.kind === 'off' ? ' offslot' : ''), style:'border-color:' + PCOL[i], onclick:() => { if (editable(i)) { S.active = i; showSelect(); } } },
      h('div', { class:'sh', style:'color:' + PCOL[i] }, 'P' + (i + 1)), kindBtn, tbtn, lvl,
      s.kind !== 'off' ? h('div', { class:'sn' }, ch ? ch.name + (s.shiny ? ' ✨' : '') : (s.kind === 'remote' ? 'En attente…' : '—')) : null,
      ch ? portraitEl(ch, s.shiny, 'sp') : null);
  });

  const stageSel = h('select', { onchange() { S.stage = parseInt(this.value, 10); if (S.mode === 'host') lobbySend(); } },
    h('option', Object.assign({ value:-1 }, S.stage === -1 ? { selected:'selected' } : {}), 'Décor : aléatoire'),
    ...STAGES.map((st, i) => h('option', Object.assign({ value:i }, S.stage === i ? { selected:'selected' } : {}), 'Décor : ' + st.name)));
  if (m === 'guest') stageSel.setAttribute('disabled', 'disabled');
  const stockSel = h('select', { onchange() { S.stocks = parseInt(this.value, 10); if (S.mode === 'host') lobbySend(); } },
    ...[1, 2, 3, 4, 5].map(n => h('option', Object.assign({ value:n }, S.stocks === n ? { selected:'selected' } : {}), 'Vies : ' + n)));
  if (m === 'guest' || m === 'arcade') stockSel.setAttribute('disabled', 'disabled');
  const diffSel = (m === 'arcade' || m === 'horde') ? h('select', { onchange() { S.diff = this.value; } },
    ...[['easy', 'Facile'], ['normal', 'Normal'], ['hard', 'Difficile']].map(([v, n]) => h('option', Object.assign({ value:v }, S.diff === v ? { selected:'selected' } : {}), 'Difficulté : ' + n))) : null;

  const itemSel = h('select', { onchange() { SET.game.items = this.value; saveSettings(); } },
    ...[['off', 'Aucun'], ['rare', 'Rares'], ['normal', 'Normaux'], ['frequent', 'Fréquents']].map(([v, n]) => h('option', Object.assign({ value:v }, SET.game.items === v ? { selected:'selected' } : {}), 'Objets : ' + n)));
  if (m === 'guest') itemSel.setAttribute('disabled', 'disabled');
  const teamSel = (m === 'versus' || m === 'host') ? h('select', { onchange() { S.teams = this.value === '1'; if (m === 'host') lobbySend(); showSelect(); } },
    h('option', Object.assign({ value:'0' }, !S.teams ? { selected:'selected' } : {}), 'Mode : chacun pour soi'), h('option', Object.assign({ value:'1' }, S.teams ? { selected:'selected' } : {}), 'Mode : équipes (A contre B)')) : null;
  const ffSel = S.teams && (m === 'versus' || m === 'host') ? h('select', { onchange() { S.ff = this.value === '1'; if (m === 'host') lobbySend(); } },
    h('option', Object.assign({ value:'0' }, !S.ff ? { selected:'selected' } : {}), 'Tirs amis : non'), h('option', Object.assign({ value:'1' }, S.ff ? { selected:'selected' } : {}), 'Tirs amis : oui')) : null;
  const tourSel = m === 'tour' ? h('select', { onchange() { S.tsize = parseInt(this.value, 10); } }, ...[4, 8, 16].map(n => h('option', Object.assign({ value:String(n) }, S.tsize === n ? { selected:'selected' } : {}), 'Tournoi à ' + n))) :
    m === 'host' ? h('select', { onchange() { S.tour = parseInt(this.value, 10); lobbySend(); showSelect(); } }, ...[0, 4, 8, 16].map(n => h('option', Object.assign({ value:String(n) }, (S.tour || 0) === n ? { selected:'selected' } : {}), n ? 'Tournoi à ' + n : 'Combat normal'))) : null;
  const pubSel = m === 'host' ? h('select', { onchange() { S.pub = this.value === '1'; if (S.pub) pubStart(); else pubStop(); } }, h('option', Object.assign({ value:'0' }, !S.pub ? { selected:'selected' } : {}), 'Salon privé (par code)'), h('option', Object.assign({ value:'1' }, S.pub ? { selected:'selected' } : {}), 'Salon public (liste)')) : null;
  let startLabel = 'Combattre !', startFn = startFromSelect;
  if (m === 'host') { const act = S.slots.filter(x => x.kind !== 'off').length; startLabel = act >= 2 ? 'Lancer (' + act + ' combattants)' : 'En attente de joueurs…'; }
  if (m === 'guest') { startLabel = 'En attente de l\'hôte…'; startFn = () => {}; }
  const code = (m === 'host' && NET.code) ? h('div', { class:'code' }, 'Code du salon (' + onlineCount() + '/8 joueurs) : ', h('b', null, NET.code), ' ', h('button', { class:'btn small', onclick() { try { navigator.clipboard.writeText(NET.code); } catch (e) { /* presse-papiers indisponible */ } } }, 'Copier')) : null;

  roster.className = 'grid sel-grid';
  show(false, h('div', { class:'sel' },
    h('div', { class:'sel-head' }, h('div', { class:'title sm' }, titles[m]), code),
    h('div', { class:'sel-slots slots' }, cards),
    h('div', { class:'sel-opts opts' }, stageSel, (m === 'arcade' || m === 'horde') ? diffSel : stockSel, itemSel, teamSel, ffSel, tourSel, pubSel, (m === 'host' ? btn('📨 Inviter un ami', () => showInvitePicker(), 'small') : null),
      btn('⚙️ Réglages', () => showSettings('keys', () => showSelect()), 'small'), btn('🧬 Fusion', () => showFusion(() => showSelect()), 'small')),
    h('div', { class:'sel-search' }, search, h('div', { class:'hint' }, 'Touchez un Pokémon : évolution et chromatique ✨ · 🎲 = hasard')),
    roster,
    h('div', { class:'sel-foot row' }, btn('← Menu', showMenu), btn(startLabel, startFn, 'big go'))));
}

function pickChar(i, shiny) {
  if (!editable(S.active)) return;
  S.slots[S.active].char = i; S.slots[S.active].shiny = !!shiny; void loadSprites(CHARS[i], !!shiny);
  if (S.mode === 'guest') NET.send({ t:'pick', c:refOf(i), s:!!shiny });
  if (S.mode === 'host') lobbySend();
  showSelect();
}

function startFromSelect() {
  ensureAudio();
  const m = S.mode;
  const rc = () => randomForm();
  if (m === 'horde') {
    const fs = []; S.slots.forEach((sl, i) => { if (sl.kind !== 'off') fs.push({ char:sl.char >= 0 ? sl.char : rc(), shiny:!!sl.shiny, kind:'human', slot:i, team:0 }); });
    for (let j = 0; j < 4; j++) fs.push({ char:CHAR_BY_ID['0025'], kind:'cpu', lvl:3, slot:9, team:1, hidden:true });
    launchMatch({ fighters:fs, stage:S.stage, stocks:3, mode:'horde', horde:true, teams:true, ff:false, diff:S.diff }); return;
  }
  if (m === 'tour') {
    const parts = []; S.slots.forEach((sl, i) => { if (sl.kind !== 'off') parts.push({ name:sl.kind === 'human' ? 'J' + (i + 1) : 'CPU', kind:sl.kind, slot:i, char:sl.char >= 0 ? sl.char : rc(), shiny:!!sl.shiny, lvl:sl.lvl || SET.game.cpu }); });
    if (parts.length < 1) return; tourStart(parts, S.tsize, S.stage, S.stocks, false); return;
  }
  if (m === 'arcade') { startArcade(S.slots[0].char >= 0 ? S.slots[0].char : rc(), S.diff, S.slots[0].shiny); return; }
  if (m === 'versus') {
    const fs = [];
    S.slots.forEach((s, i) => { if (s.kind !== 'off') fs.push({ char:s.char >= 0 ? s.char : rc(), shiny:!!s.shiny, kind:s.kind, lvl:s.lvl, slot:i, team:s.team || 0 }); });
    if (fs.length < 2) { alert('Il faut au moins deux combattants.'); return; }
    if (S.teams && (!fs.some(x => x.team === 0) || !fs.some(x => x.team === 1))) { alert('Il faut au moins un combattant dans chaque équipe.'); return; }
    launchMatch({ fighters:fs, stage:S.stage, stocks:S.stocks, mode:'versus', teams:S.teams, ff:S.ff });
    return;
  }
  if (m === 'host' && S.tour) {
    const parts = []; S.slots.forEach((sl, i) => { if (sl.kind !== 'off') { const cn = NET.conns.find(c => c.slot === i); parts.push({ name:i === 0 ? 'Hôte' : sl.kind === 'remote' ? 'Joueur ' + (i + 1) : 'CPU', kind:i === 0 ? 'human' : (sl.kind === 'remote' ? 'remote' : 'cpu'), slot:i, char:sl.char >= 0 ? sl.char : rc(), shiny:!!sl.shiny, lvl:sl.lvl || 5, conn:cn || null }); } });
    tourStart(parts, S.tour, S.stage, S.stocks, true); return;
  }
  if (m === 'host') {
    const fs = [];
    S.slots.forEach((sl, i) => { if (sl.kind !== 'off') fs.push({ char:sl.char >= 0 ? sl.char : rc(), shiny:!!sl.shiny, team:sl.team || 0, kind:i === 0 ? 'human' : (sl.kind === 'remote' ? 'remote' : 'cpu'), lvl:sl.lvl, slot:i, conn:(NET.conns.find(c => c.slot === i) || {}).conn ? NET.conns.find(c => c.slot === i) : null }); });
    if (fs.length < 2) return;
    if (S.teams && (!fs.some(x => x.team === 0) || !fs.some(x => x.team === 1))) { alert('Il faut au moins un combattant dans chaque équipe.'); return; }
    launchMatch({ fighters:fs, stage:S.stage, stocks:S.stocks, mode:'host', teams:S.teams, ff:S.ff });
  }
}

// ---------------------------------------------------------------- ÉCRANS DE FIN / PAUSE
function endOverlay(title, sub, ...buttons) {
  show(true, h('div', { class:'box' }, h('div', { class:'title sm' }, title), sub ? h('div', { class:'sub' }, sub) : null, h('div', { class:'col' }, ...buttons, ...replayButtons())));
}
function winnerTitle(w) { return G.teamMode && G.winTeam >= 0 ? 'Équipe ' + (G.winTeam ? 'Rouge' : 'Bleue') + ' gagne !' : fighterName(w) + ' gagne !'; }
function fighterName(f) { return (f.kind === 'cpu' ? 'CPU' : 'P' + (f.idx + 1)) + ' (' + f.ch.name + ')'; }
function onMatchEnd() {
  const w = G.fighters[G.winner], cfg = G.cfg;
  statMatchEnd();
  if (cfg.tour) { tourMatchDone(); return; }
  if (cfg.mode === 'daily') { dailyEnd(); return; }
  if (cfg.mode === 'horde') { hordeEnd(); return; }
  if (cfg.mode === 'versus') {
    endOverlay(winnerTitle(w), null, btn('Revanche', () => launchMatch(cfg), 'big'), btn('Choix des combattants', () => showSelect()), btn('Menu principal', showMenu));
  } else if (cfg.mode === 'host') {
    NET.broadcast({ t:'end', w:G.winner, wt:G.winTeam });
    endOverlay(winnerTitle(w), 'Vous êtes l\'hôte.', btn('Revanche', () => launchMatch(cfg), 'big'), btn('Retour au salon', () => { NET.broadcast({ t:'lobbyback' }); lobbySend(); showSelect(); }), btn('Quitter', showMenu));
  } else if (cfg.mode === 'arcade') arcadeEnd(G.winner === 0);
}

// ---------------------------------------------------------------- ARCADE
function pauseGame() {
  if (G.scene !== 'fight' || G.net) return;
  G.paused = true; pauseGame2();
}
function pauseGame2() {
  endOverlay('Pause', null, btn('Reprendre', () => { G.paused = false; hideUI(); }, 'big'), btn('⚙️ Réglages', () => showSettings('keys', () => pauseGame2())), btn('Quitter vers le menu', () => { G.paused = false; G.scene = 'menu'; showMenu(); }));
}

