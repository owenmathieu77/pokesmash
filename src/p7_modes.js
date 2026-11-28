// ================================================================ STATISTIQUES, SUCCÈS ET PROFIL
const STATS_KEY = 'pokesmash.stats';
function loadStats() {
  const d = { kos:0, deaths:0, matches:0, wins:0, ults:0, playMs:0, online:0, evos:0, ledges:0, balls:0, fusions:0, hordeBest:0, arcade:0, arcadeHard:0, tour:0, daily:0, team:0, shinyWins:0, used:{}, achv:{} };
  try { Object.assign(d, JSON.parse(localStorage.getItem(STATS_KEY) || '{}')); } catch (e) { /* stockage indisponible */ }
  d.used = d.used || {}; d.achv = d.achv || {}; return d;
}
let STATS = loadStats(), statAcc = 0;
function saveStats() { try { localStorage.setItem(STATS_KEY, JSON.stringify(STATS)); } catch (e) { /* ignoré */ } accDirty(); }
const ACHV = [
  { id:'ko1', icon:'💥', name:'Premier K.O.', desc:'Mettre un adversaire K.O.', test:s => s.kos >= 1 },
  { id:'ko50', icon:'🥊', name:'Bagarreur', desc:'50 K.O. au total', test:s => s.kos >= 50 },
  { id:'ko250', icon:'👑', name:'Légende de l\'arène', desc:'250 K.O. au total', test:s => s.kos >= 250 },
  { id:'ult1', icon:'⭐', name:'Smash final !', desc:'Déclencher une attaque ultime', test:s => s.ults >= 1 },
  { id:'ult20', icon:'🌟', name:'Maître des ultimes', desc:'20 attaques ultimes', test:s => s.ults >= 20 },
  { id:'ball1', icon:'🔮', name:'Chasseur de boule', desc:'Briser une Boule Smash', test:s => s.balls >= 1 },
  { id:'evo1', icon:'✨', name:'Évolution !', desc:'Évoluer en plein combat', test:s => s.evos >= 1 },
  { id:'ledge1', icon:'🧗', name:'Accroche-toi', desc:'S\'accrocher à un rebord', test:s => s.ledges >= 1 },
  { id:'arc', icon:'🏆', name:'Arcade terminée', desc:'Gagner les 8 combats d\'Arcade', test:s => s.arcade >= 1 },
  { id:'arch', icon:'🔥', name:'Arcade difficile', desc:'Terminer l\'Arcade en difficulté Difficile', test:s => s.arcadeHard >= 1 },
  { id:'h10', icon:'🧟', name:'Survivant', desc:'Atteindre la vague 10 en Survie', test:s => s.hordeBest >= 10 },
  { id:'h25', icon:'☠️', name:'Inarrêtable', desc:'Atteindre la vague 25 en Survie', test:s => s.hordeBest >= 25 },
  { id:'tour', icon:'🥇', name:'Champion du tournoi', desc:'Gagner un tournoi', test:s => s.tour >= 1 },
  { id:'day1', icon:'📅', name:'Défi relevé', desc:'Réussir un défi du jour', test:s => s.daily >= 1 },
  { id:'day7', icon:'🗓️', name:'Assidu', desc:'Réussir 7 défis du jour', test:s => s.daily >= 7 },
  { id:'fus', icon:'🧬', name:'Savant fou', desc:'Créer un Pokémon fusionné', test:s => s.fusions >= 1 },
  { id:'team', icon:'🤝', name:'Esprit d\'équipe', desc:'Gagner un combat en équipe', test:s => s.team >= 1 },
  { id:'shiny', icon:'💎', name:'Chromatique', desc:'Gagner avec un Pokémon chromatique', test:s => s.shinyWins >= 1 },
  { id:'net', icon:'🌐', name:'En ligne', desc:'Jouer un combat en ligne', test:s => s.online >= 1 },
  { id:'dex', icon:'📖', name:'Collectionneur', desc:'Jouer avec 20 Pokémon différents', test:s => Object.keys(s.used).length >= 20 },
  { id:'m10', icon:'🎮', name:'Habitué', desc:'Jouer 10 combats', test:s => s.matches >= 10 },
  { id:'h1', icon:'⏱️', name:'Une heure de jeu', desc:'Cumuler 1 h de combat', test:s => s.playMs >= 3600000 },
];
function toast(msg, label, fn) {
  let el = document.getElementById('toast'); if (!el) { el = h('div', { id:'toast' }); document.body.appendChild(el); }
  const t = h('div', { class:'toastmsg' + (fn ? ' act' : '') }, msg, fn ? h('button', { class:'btn', onclick() { t.remove(); fn(); } }, label || 'OK') : null); el.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 500); }, fn ? 14000 : 3600);
}
function checkAchv() {
  for (const a of ACHV) if (!STATS.achv[a.id] && a.test(STATS)) { STATS.achv[a.id] = Date.now(); toast('🏆 Succès débloqué : ' + a.icon + ' ' + a.name); sfx('item'); saveStats(); }
}
function stat(k, n) { STATS[k] = (STATS[k] || 0) + (n === undefined ? 1 : n); checkAchv(); }
const localHuman = f => !!f && f.kind === 'human' && G.net !== 'guest';
function statKo(v) {
  if (localHuman(v)) STATS.deaths++;
  const k = G.fighters[v.lastHit]; if (k && k !== v && localHuman(k)) stat('kos');
}
const statUlt = f => { if (localHuman(f)) stat('ults'); };
const statEvo = f => { if (localHuman(f)) stat('evos'); };
const statLedge = f => { if (localHuman(f)) stat('ledges'); };
const statBall = f => { if (localHuman(f)) stat('balls'); };
function statMatchStart(cfg) {
  for (const f of G.fighters) if (localHuman(f) && !f.hidden) STATS.used[f.ch.id] = (STATS.used[f.ch.id] || 0) + 1;
  if (cfg.mode === 'host') stat('online'); else checkAchv();
  saveStats();
}
function statMatchEnd() {
  stat('matches'); if (G.horde) { saveStats(); return; }
  const w = G.fighters[G.winner];
  const won = G.teamMode && G.winTeam >= 0 ? G.fighters.some(f => localHuman(f) && f.team === G.winTeam) : localHuman(w);
  if (won) { stat('wins'); if (w && w.shiny && localHuman(w)) stat('shinyWins'); if (G.teamMode) stat('team'); }
  saveStats();
}
function statTick(dt) {
  if (G.scene === 'fight' && !G.paused) { STATS.playMs += dt * 1000; statAcc += dt; if (statAcc > 15) { statAcc = 0; saveStats(); checkAchv(); } }
}
function showProfile() {
  const fmt = ms => { const m = Math.floor(ms / 60000); return Math.floor(m / 60) + ' h ' + String(m % 60).padStart(2, '0'); };
  const fav = Object.entries(STATS.used).sort((a, b) => b[1] - a[1])[0], fch = fav ? CHARS[CHAR_BY_ID[fav[0]]] : null;
  const card = (l, v) => h('div', { class:'stat' }, h('div', { class:'sv' }, String(v)), h('div', { class:'sl' }, l));
  const unlocked = ACHV.filter(a => STATS.achv[a.id]).length;
  show(false, h('div', { class:'title sm' }, '👤 Profil & succès'),
    h('div', { class:'panel' }, h('div', { class:'stats' },
      card('Combats', STATS.matches), card('Victoires', STATS.wins + (STATS.matches ? ' (' + Math.round(100 * STATS.wins / STATS.matches) + ' %)' : '')), card('K.O. infligés', STATS.kos), card('Vies perdues', STATS.deaths),
      card('Ultimes', STATS.ults), card('Évolutions', STATS.evos), card('Temps de jeu', fmt(STATS.playMs)), card('Record Survie', 'vague ' + STATS.hordeBest),
      card('Arcades terminées', STATS.arcade), card('Tournois gagnés', STATS.tour), card('Défis du jour', STATS.daily), card('Pokémon utilisés', Object.keys(STATS.used).length)),
      fch ? h('div', { class:'favrow' }, portraitEl(fch, false, 'sp'), h('div', null, h('b', null, 'Pokémon favori : ' + fch.name), h('div', { class:'hint' }, fav[1] + ' combats'))) : null),
    h('div', { class:'sub' }, '🏆 Succès : ' + unlocked + ' / ' + ACHV.length),
    h('div', { class:'achgrid' }, ACHV.map(a => h('div', { class:'ach' + (STATS.achv[a.id] ? ' on' : '') }, h('div', { class:'ai' }, STATS.achv[a.id] ? a.icon : '🔒'), h('div', null, h('b', null, a.name), h('div', { class:'hint' }, a.desc))))),
    h('div', { class:'row' }, btn('← Menu', showMenu, 'big'), btn('Réinitialiser le profil', () => { if (confirm('Effacer toutes les statistiques et tous les succès ?')) { try { localStorage.removeItem(STATS_KEY); } catch (e) { /* ignoré */ } STATS = loadStats(); showProfile(); } }, 'small')));
}

// ================================================================ MODE SURVIE (vagues infinies)
const HORDE_BOSSES = ['0150', '0384', '0249', '0250', '0151', '0383', '0382', '0483', '0484', '0487', '0491', '0493'];
function updateHorde() {
  const H = G.horde; if (!H || G.winner >= 0) return;
  const alive = G.fighters.filter(f => f.team === 1 && !f.hidden && f.stocks > 0);
  if (H.state === 'prep') { H.t -= DT; if (H.t <= 0) spawnWave(); }
  else if (H.state === 'fight' && alive.length === 0) { H.state = 'prep'; H.t = 3.4; waveClear(); }
}
function spawnWave() {
  const H = G.horde, w = ++H.wave, boss = w % 10 === 0;
  const base = H.diff === 'easy' ? 1 : H.diff === 'hard' ? 4 : 2, lvl = clampN(Math.round(base + w * .55 + (boss ? 1 : 0)), 1, 9);
  const enemies = G.fighters.filter(f => f.team === 1), H0 = G.fighters.filter(f => f.team === 0 && !f.hidden).length;
  const count = Math.min(enemies.length, (boss ? (w >= 20 ? 3 : 1) : Math.min(4, 1 + Math.floor((w - 1) / 2.5))) + Math.floor((H0 - 1) / 2));
  for (let j = 0; j < enemies.length; j++) {
    const old = enemies[j], idx = old.idx;
    if (j >= count) { old.hidden = true; old.stocks = 0; old.state = 'dead'; old.dead = 1e9; if (G.net === 'host') netEvents.push(['wv', idx, 0, 0, 1, 0]); continue; }
    const isBoss = boss && j === 0;
    const ci = isBoss ? CHAR_BY_ID[HORDE_BOSSES[Math.floor(Math.random() * HORDE_BOSSES.length)]] : randomForm();
    const shiny = Math.random() < .06; void loadSprites(CHARS[ci], shiny);
    const sx = (j % 2 ? 1 : -1) * (360 + j * 50);
    const nf = makeFighter(idx, CHARS[ci], 'cpu', isBoss ? 9 : lvl, spriteObj[CHARS[ci].id + (shiny ? '*' : '')], sx, G.stage.rY, isBoss ? 3 + (H0 > 2 ? 1 : 0) : 1);
    nf.team = 1; nf.shiny = shiny; nf.state = 'spawn'; nf.inv = 1.6; nf.dmgM = (isBoss ? 1.25 : Math.min(1.4, 1 + w * .012)) + .05 * (H0 - 1);
    if (isBoss) { nf.giant = 1e9; nf.maxStocks = 3; }
    G.fighters[idx] = nf;
    if (G.net === 'host') netEvents.push(['wv', idx, refOf(ci), shiny ? 1 : 0, 0, isBoss ? 1 : 0]);
  }
  H.state = 'fight';
  G.banner = { t:2.6, text:boss ? '⚠️ BOSS — VAGUE ' + w : 'VAGUE ' + w, sub:boss ? 'Un adversaire légendaire approche…' : count + ' ennemi' + (count > 1 ? 's' : '') + ' · niveau ' + lvl };
  if (G.net === 'host') netEvents.push(['bn', G.banner.text, G.banner.sub]);
  sfx(boss ? 'ult' : 'item');
}
function waveClear() {
  const H = G.horde; H.score += 250 * H.wave;
  for (const f of G.fighters) if (f.team === 0 && f.stocks > 0) { f.pct = Math.max(0, f.pct - 35); chargeBar(f, 25); f.status = null; }
  if (H.wave % 5 === 0) G.items.push({ x:0, y:G.stage.bounds.t + 200, vy:0, type:'heart', life:25, landed:false, plat:null });
  const revived = [];
  for (const f of G.fighters) if (f.team === 0 && !f.hidden && f.stocks <= 0) { f.stocks = 1; f.dead = .5; f.pct = 0; f.state = 'dead'; f.ult = 0; revived.push(f.ch.name); }
  G.banner = { t:2.6, text:'VAGUE ' + H.wave + ' TERMINÉE !', sub:'+' + (250 * H.wave) + ' points · soin de 35 %' + (revived.length ? ' · 🔄 ' + revived.join(', ') + ' revient' : '') }; sfx('item');
  if (G.net === 'host') netEvents.push(['bn', G.banner.text, G.banner.sub]);
}
function hordeKo(f) {
  const H = G.horde;
  if (f.team === 1) { H.kills++; H.score += 100 + (f.lvl || 3) * 20; return; }
  if (!G.fighters.some(x => x.team === 0 && x.stocks > 0) && G.winner < 0) { G.winner = Math.max(0, G.fighters.findIndex(x => x.team === 1)); G.endT = 1.6; }
}
function hordeEnd() {
  const H = G.horde, best = Math.max(STATS.hordeBest || 0, H.wave), record = H.wave > (STATS.hordeBest || 0);
  STATS.hordeBest = best; checkAchv(); saveStats();
  const online = G.cfg.mode === 'host';
  if (online) NET.broadcast({ t:'hend', wave:H.wave, score:H.score, kills:H.kills });
  endOverlay('☠️ Fin de la Survie', 'Vague atteinte : ' + H.wave + ' · Score : ' + H.score + ' · K.O. : ' + H.kills + (record ? ' — NOUVEAU RECORD !' : ' · Record : vague ' + best),
    btn('Rejouer', () => launchMatch(G.cfg), 'big'), ...(online ? [btn('Retour au salon', () => { NET.broadcast({ t:'lobbyback' }); lobbySend(); showSelect(); })] : []), btn('Menu principal', showMenu));
}

// ================================================================ ARCADE ENRICHIE : parcours, pièces, boutique
const BOSSES = ['0150', '0384', '0249', '0250', '0151'];
const arcadeLvl = (n, diff, boss) => clampN((diff === 'easy' ? 1 : diff === 'hard' ? 5 : 3) + Math.round((n - 1) * .8) + (boss ? 1 : 0), 1, 9);
const SHOP = [
  { id:'dmg',   icon:'🗡️', name:'Griffes aiguisées', desc:'+8 % de dégâts', price:90,  fn:A => { A.dmgM *= 1.08; } },
  { id:'spd',   icon:'👟', name:'Bottes légères',    desc:'+6 % de vitesse', price:80,  fn:A => { A.spdM *= 1.06; } },
  { id:'life',  icon:'💖', name:'Cœur de combattant',desc:'+1 vie par combat (max 5)', price:140, fn:A => { A.stocks = Math.min(5, A.stocks + 1); } },
  { id:'smash', icon:'🔮', name:'Cristal Smash',     desc:'Départ avec +30 % de jauge Smash', price:100, fn:A => { A.smash = Math.min(100, A.smash + 30); } },
  { id:'bomb',  icon:'💣', name:'Bombe de poche',    desc:'Chaque combat commence avec une bombe', price:70, fn:A => { A.startItem = 'bomb'; } },
  { id:'evo',   icon:'🪨', name:'Pierre d\'évolution',desc:'Évolution en combat plus précoce (−20 %)', price:120, fn:A => { A.evoShift = Math.min(40, A.evoShift + 20); } },
];
function startArcade(ci, diff, shiny) {
  G.arcade = { n:1, total:8, score:0, ci, cs:!!shiny, diff, coins:0, dmgM:1, spdM:1, stocks:3, smash:0, startItem:null, evoShift:0, kos:0, shopDone:false, restDone:false, nextSmash:0, bonusStock:0, elite:false, offers:null, t0:Date.now() };
  arcadeRoute();
}
function arcadeBar() { const A = G.arcade; return h('div', { class:'sub' }, '🪙 ' + A.coins + ' pièces · Score ' + A.score + ' · Vies ' + A.stocks + ' · Dégâts ×' + A.dmgM.toFixed(2)); }
function arcadeRoute() {
  const A = G.arcade, boss = A.n === A.total;
  if (boss) { A.elite = false; arcadeIntro(); return; }
  const card = (icon, t, d, fn) => h('button', { class:'route', onclick() { sfx('ui'); fn(); } }, h('div', { class:'ri' }, icon), h('b', null, t), h('div', { class:'hint' }, d));
  const opts = [card('⚔️', 'Combat', 'Un adversaire de niveau normal.', () => { A.elite = false; A.shopDone = A.restDone = false; arcadeIntro(); }),
    card('🔥', 'Combat élite', 'Niveau +2, objets fréquents, pièces doublées.', () => { A.elite = true; A.shopDone = A.restDone = false; arcadeIntro(); })];
  if (!A.shopDone) opts.push(card('🛒', 'Boutique', 'Améliorations (' + A.coins + ' 🪙).', arcadeShop));
  if (!A.restDone) opts.push(card('⛺', 'Camp', '+1 vie et 50 % de Smash pour le prochain combat.', () => { A.restDone = true; A.bonusStock = 1; A.nextSmash = 50; toast('⛺ Repos : +1 vie et 50 % de Smash au prochain combat'); arcadeRoute(); }));
  show(false, h('div', { class:'title sm' }, 'Étape ' + A.n + ' / ' + A.total + ' — choisissez votre route'), arcadeBar(), h('div', { class:'routes' }, opts), btn('Abandonner', showMenu, 'small'));
}
function arcadeShop() {
  const A = G.arcade, offers = A.offers || (A.offers = SHOP.slice().sort(() => Math.random() - .5).slice(0, 3).map(o => Object.assign({}, o)));
  const buy = o => { if (A.coins < o.price || o.sold) return; A.coins -= o.price; o.fn(A); o.sold = true; sfx('item'); arcadeShop(); };
  show(false, h('div', { class:'title sm' }, '🛒 Boutique'), arcadeBar(),
    h('div', { class:'routes' }, offers.map(o => h('button', { class:'route' + (o.sold ? ' sold' : ''), onclick() { buy(o); } }, h('div', { class:'ri' }, o.icon), h('b', null, o.name), h('div', { class:'hint' }, o.desc), h('div', { class:'price' }, o.sold ? 'Acheté ✔' : o.price + ' 🪙 ' + (A.coins < o.price ? '(trop cher)' : ''))))),
    btn('Quitter la boutique', () => { A.shopDone = true; A.offers = null; arcadeRoute(); }, 'big'));
}
function arcadeIntro() {
  const A = G.arcade, boss = A.n === A.total;
  if (boss) { const bs = BOSSES.map(id => CHAR_BY_ID[id]).filter(i => i !== A.ci); A.opp = bs[Math.floor(Math.random() * bs.length)]; }
  else { do { A.opp = randomForm(); } while (A.opp === A.ci); }
  A.os = Math.random() < .06; A.lvl = clampN(arcadeLvl(A.n, A.diff, boss) + (A.elite ? 2 : 0), 1, 9);
  const oc = CHARS[A.opp];
  show(false, h('div', { class:'title sm' }, boss ? 'COMBAT FINAL' : (A.elite ? '🔥 Combat élite — ' : 'Combat ') + A.n + ' / ' + A.total), arcadeBar(),
    h('div', { class:'versus' }, h('div', null, portraitEl(CHARS[A.ci], A.cs, 'sp'), h('div', null, CHARS[A.ci].name + (A.cs ? ' ✨' : ''))), h('div', { class:'vs' }, 'VS'),
      h('div', null, portraitEl(oc, A.os, 'sp'), h('div', null, oc.name + (A.os ? ' ✨' : '') + ' (CPU ' + A.lvl + ')'))),
    btn('Combattre !', () => {
      const stocks = A.stocks + A.bonusStock;
      launchMatch({ fighters:[{ char:A.ci, shiny:A.cs, kind:'human', slot:0, stocks, dmgM:A.dmgM, spdM:A.spdM, evoShift:A.evoShift, smash:A.smash + A.nextSmash, startItem:A.startItem },
        { char:A.opp, shiny:A.os, kind:'cpu', lvl:A.lvl, slot:1, stocks:boss ? 3 : (A.n < 4 ? 2 : 3), big:boss }], stage:-1, stocks:3, mode:'arcade', itemsOverride:A.elite ? 'frequent' : null });
      A.bonusStock = 0; A.nextSmash = 0;
    }, 'big go'), btn('Abandonner', showMenu));
}
function arcadeEnd(won) {
  const A = G.arcade, p = G.fighters[0], secs = Math.round(G.time);
  if (won) {
    const gain = Math.max(200, 1000 + 400 * p.stocks + Math.max(0, 600 - secs * 5) - Math.round(p.pct)), coins = 40 + (A.elite ? 40 : 0) + p.stocks * 10 + (A.n === A.total ? 150 : 0);
    A.score += gain; A.coins += coins; A.shopDone = A.restDone = false; A.offers = null;
    if (A.n >= A.total) {
      stat('arcade'); if (A.diff === 'hard') stat('arcadeHard');
      endOverlay('🏆 Arcade terminée !', 'Score final : ' + A.score + ' — ' + A.total + ' victoires d\'affilée avec ' + CHARS[A.ci].name + ' !', btn('Rejouer', () => startArcade(A.ci, A.diff, A.cs), 'big'), btn('Menu principal', showMenu));
    } else endOverlay('Victoire !', '+' + gain + ' points · +' + coins + ' 🪙 · Score : ' + A.score, btn('Continuer', () => { A.n++; arcadeRoute(); }, 'big'), btn('Abandonner', showMenu));
  } else endOverlay('Défaite…', 'Votre série s\'arrête à l\'étape ' + A.n + '/' + A.total + ' · Score : ' + A.score + ' · ' + A.coins + ' 🪙', btn('Réessayer depuis le début', () => startArcade(A.ci, A.diff, A.cs), 'big'), btn('Menu principal', showMenu));
}

// ================================================================ DÉFI DU JOUR
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const DAILY_RULES = [
  { id:'noshield', text:'🚫 Sans bouclier' }, { id:'nospecial', text:'🚫 Sans attaques spéciales' }, { id:'onelife', text:'💀 Une seule vie chacun' },
  { id:'giantfoe', text:'🍄 Adversaire géant' }, { id:'handicap', text:'🩸 Vous démarrez à 80 % de dégâts' }, { id:'items', text:'🎁 Objets très fréquents' }, { id:'fusion', text:'🧬 Pokémon fusionné imposé' },
];
function dailyConfig(ds) {
  const r = mulberry(hashStr('pokesmash' + ds)), pick = a => a[Math.floor(r() * a.length)];
  const pop = Object.keys(SIG_ULT), finals = FAMILIES.map(f => f[f.length - 1][0]), rule = pick(DAILY_RULES);
  let pc = CHAR_BY_ID[pick(pop)];
  if (rule.id === 'fusion') pc = makeCustom(pick(pop), pick(pop), pick(pop), 'Chimère du jour');
  let oc; do { oc = CHAR_BY_ID[pick(finals)]; } while (oc === pc);
  return { ds, rule, pc, oc, lvl:4 + Math.floor(r() * 5), stage:Math.floor(r() * STAGES.length) };
}
function dailyStore() { try { return JSON.parse(localStorage.getItem('pokesmash.daily') || '{"e":[]}'); } catch (e) { return { e:[] }; } }
function showDaily() {
  const D = dailyConfig(todayStr()), st = dailyStore(), today = st.e.filter(x => x.date === D.ds), best = today.reduce((m, x) => Math.max(m, x.score), 0);
  const top = st.e.filter(x => x.win).sort((a, b) => b.score - a.score).slice(0, 5);
  show(false, h('div', { class:'title sm' }, '📅 Défi du jour — ' + D.ds),
    h('div', { class:'panel txt' }, h('p', null, h('b', null, 'Règle : '), D.rule.text), h('p', null, 'Votre Pokémon : ' + CHARS[D.pc].name + ' · Adversaire : ' + CHARS[D.oc].name + ' (CPU ' + D.lvl + ') · Décor : ' + STAGES[D.stage].name),
      h('div', { class:'versus' }, h('div', null, portraitEl(CHARS[D.pc], false, 'sp')), h('div', { class:'vs' }, 'VS'), h('div', null, portraitEl(CHARS[D.oc], false, 'sp'))),
      h('p', null, 'Meilleur score du jour : ' + (best || '—') + ' · Tentatives : ' + today.length), h('p', null, h('b', null, 'Classement local : '), top.length ? top.map((x, i) => (i + 1) + '. ' + x.score + ' pts (' + x.date + ')').join('  ·  ') : 'aucune victoire enregistrée')),
    h('div', { class:'row' }, btn('← Menu', showMenu), btn('Lancer le défi !', () => startDaily(D), 'big go')));
}
function startDaily(D) {
  const r = D.rule.id, one = r === 'onelife';
  launchMatch({ mode:'daily', daily:D, stage:D.stage, stocks:one ? 1 : 2, itemsOverride:r === 'items' ? 'frequent' : null,
    fighters:[{ char:D.pc, kind:'human', slot:0, noShield:r === 'noshield', noSpecial:r === 'nospecial', pct:r === 'handicap' ? 80 : 0, stocks:one ? 1 : 2 },
              { char:D.oc, kind:'cpu', lvl:D.lvl, slot:1, giant:r === 'giantfoe' ? 1e9 : 0, stocks:one ? 1 : 2 }] });
}
function dailyEnd() {
  const D = G.cfg.daily, win = G.winner === 0, p = G.fighters[0];
  const score = win ? Math.max(0, p.stocks * 300 + Math.max(0, 1200 - Math.round(G.time) * 8) - Math.round(p.pct) + 200) : 0;
  const st = dailyStore(), first = win && !st.e.some(x => x.date === D.ds && x.win);
  st.e.push({ date:D.ds, score, win, time:Math.round(G.time) }); st.e = st.e.slice(-60);
  try { localStorage.setItem('pokesmash.daily', JSON.stringify(st)); } catch (e) { /* ignoré */ }
  accDirty();
  if (first) stat('daily');
  const top = st.e.filter(x => x.win).sort((a, b) => b.score - a.score).slice(0, 5);
  endOverlay(win ? '🏆 Défi réussi !' : 'Défi raté…', (win ? 'Score : ' + score + ' · ' : '') + 'Règle : ' + D.rule.text + (top.length ? ' · Meilleurs : ' + top.map(x => x.score).join(', ') : ''), btn('Réessayer', () => startDaily(D), 'big'), btn('Menu principal', showMenu));
}

// ================================================================ TOURNOI (4 / 8 / 16 participants, local ou en ligne)
let TOUR = null;
const shuffleArr = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cpuPart = lvl => ({ name:'CPU', kind:'cpu', char:randomForm(), shiny:Math.random() < .08, lvl:clampN((lvl || SET.game.cpu) + Math.floor(Math.random() * 3) - 1, 1, 9) });
function tourStart(parts, size, stage, stocks, online) {
  const P = shuffleArr(parts.slice()); while (P.length < size) P.push(cpuPart());
  const rounds = [Array.from({ length:size / 2 }, (_, i) => ({ a:P[2 * i], b:P[2 * i + 1], w:null }))];
  for (let n = size / 4; n >= 1; n /= 2) rounds.push(Array.from({ length:n }, () => ({ a:null, b:null, w:null })));
  TOUR = { size, rounds, stage, stocks:stocks || 2, online:!!online, cur:null, champion:null, statDone:false };
  tourAfter();
}
function tourFill() {
  for (let r = 0; r < TOUR.rounds.length - 1; r++) TOUR.rounds[r].forEach((M, i) => { if (M.w) { const nx = TOUR.rounds[r + 1][i >> 1]; if (i % 2 === 0) nx.a = M.w; else nx.b = M.w; } });
  const fin = TOUR.rounds[TOUR.rounds.length - 1][0]; if (fin.w) TOUR.champion = fin.w;
}
function tourNext() { for (let r = 0; r < TOUR.rounds.length; r++) for (let m = 0; m < TOUR.rounds[r].length; m++) { const M = TOUR.rounds[r][m]; if (M.a && M.b && !M.w) return [r, m]; } return null; }
const partAlive = p => p.kind !== 'remote' || NET.conns.some(c => c === p.conn);
const partHuman = p => p && (p.kind === 'human' || (p.kind === 'remote' && partAlive(p)));
function fcOf(p, forceCpu) {
  const human = !forceCpu && p.kind === 'human', remote = !forceCpu && p.kind === 'remote' && partAlive(p);
  return { char:p.char, shiny:!!p.shiny, kind:human ? 'human' : remote ? 'remote' : 'cpu', lvl:p.lvl || 5, slot:p.slot, conn:remote ? p.conn : null, team:0 };
}
function simMatch(M) {                                   // CPU contre CPU : combat simulé instantanément
  const saved = { i:SET.game.items, e:SET.game.evo, s:SET.game.smash }; SET.game.items = 'off'; SET.game.evo = 'off'; SET.game.smash = 'bar';
  const si = TOUR.stage >= 0 ? TOUR.stage : Math.floor(Math.random() * STAGES.length), wasNet = G.net;
  setupMatch({ fighters:[fcOf(M.a, true), fcOf(M.b, true)], stocks:TOUR.stocks, mode:'versus' }, si, [{ anims:{}, ok:false }, { anims:{}, ok:false }]);
  G.onEnd = null; G.cd = 0; G.net = null; let n = 0; while (G.winner < 0 && n < 22000) { stepGame(); n++; }
  const idx = G.winner >= 0 ? G.winner : (G.fighters[0].stocks >= G.fighters[1].stocks ? 0 : 1);
  M.w = idx === 1 ? M.b : M.a; Object.assign(SET.game, { items:saved.i, evo:saved.e, smash:saved.s }); G.scene = 'menu'; G.net = wasNet; G.winner = -1;
}
function tourPlay(pos) {
  const M = TOUR.rounds[pos[0]][pos[1]]; TOUR.cur = pos;
  launchMatch({ fighters:[fcOf(M.a), fcOf(M.b)], stage:TOUR.stage, stocks:TOUR.stocks, mode:TOUR.online ? 'host' : 'versus', tour:true });
}
function tourMatchDone() { const M = TOUR.rounds[TOUR.cur[0]][TOUR.cur[1]]; M.w = G.winner === 1 ? M.b : M.a; tourAfter(); }
function tourAfter() {
  tourFill();
  if (TOUR.champion && !TOUR.statDone) { TOUR.statDone = true; if (TOUR.champion.kind === 'human') stat('tour'); }
  if (TOUR.online) NET.broadcast({ t:'bracket', d:tourPublic() });
  showBracket();
}
function tourPublic() {
  const pp = p => p ? { n:p.name, c:refOf(p.char), s:!!p.shiny, k:p.kind } : null;
  return { size:TOUR.size, cur:TOUR.champion ? null : tourNext(), champ:TOUR.champion ? pp(TOUR.champion) : null,
    rounds:TOUR.rounds.map(R => R.map(M => ({ a:pp(M.a), b:pp(M.b), w:M.w ? (M.w === M.a ? 0 : 1) : null }))) };
}
function bracketView(rounds, cur, champ, getP) {
  const cols = rounds.map((R, ri) => h('div', { class:'bcol' }, h('div', { class:'bt' }, ri === rounds.length - 1 ? 'Finale' : ri === rounds.length - 2 && rounds.length > 2 ? 'Demi-finales' : 'Tour ' + (ri + 1)),
    R.map((M, mi) => h('div', { class:'bmatch' + (cur && cur[0] === ri && cur[1] === mi ? ' cur' : '') }, [0, 1].map(side => {
      const p = getP(M, side), win = M.w === side || (M.w && typeof M.w === 'object' && M.w === (side === 0 ? M.a : M.b));
      return h('div', { class:'bside' + (win ? ' win' : (M.w !== null && M.w !== undefined ? ' lose' : '')) }, p ? [portraitEl(CHARS[p.char], p.shiny, 'bp'), h('span', null, p.name + ' · ' + CHARS[p.char].name)] : h('span', { class:'hint' }, 'à venir'));
    })))));
  return h('div', { class:'bracket' }, cols, champ ? h('div', { class:'bcol' }, h('div', { class:'bt' }, '🏆 Champion'), h('div', { class:'bmatch cur' }, h('div', { class:'bside win' }, portraitEl(CHARS[champ.char], champ.shiny, 'bp'), h('span', null, champ.name + ' · ' + CHARS[champ.char].name)))) : null);
}
function showBracket() {
  G.scene = 'menu';
  const nx = TOUR.champion ? null : tourNext(), view = bracketView(TOUR.rounds, nx, TOUR.champion, (M, s) => s === 0 ? M.a : M.b), btns = [];
  const quit = () => { if (TOUR.online) { NET.broadcast({ t:'lobbyback' }); lobbySend(); } TOUR = null; showMenu(); };
  if (TOUR.champion) btns.push(btn('Menu principal', quit, 'big go'));
  else {
    const M = TOUR.rounds[nx[0]][nx[1]];
    if (partHuman(M.a) || partHuman(M.b)) btns.push(btn('▶ Jouer : ' + M.a.name + ' contre ' + M.b.name, () => tourPlay(nx), 'big go'));
    else btns.push(btn('⏩ Simuler les matchs de CPU', () => { let n; while ((n = tourNext()) && !(partHuman(TOUR.rounds[n[0]][n[1]].a) || partHuman(TOUR.rounds[n[0]][n[1]].b))) { simMatch(TOUR.rounds[n[0]][n[1]]); tourFill(); } tourAfter(); }, 'big go'));
    btns.push(btn('Abandonner le tournoi', quit, 'small'));
  }
  show(false, h('div', { class:'title sm' }, TOUR.champion ? '🏆 ' + TOUR.champion.name + ' remporte le tournoi !' : 'Tournoi à ' + TOUR.size), view, h('div', { class:'row' }, btns));
}
function showBracketRO(d) {
  G.scene = 'menu';
  const getP = (M, s) => { const p = s === 0 ? M.a : M.b; return p ? { name:p.n, char:idxOf(p.c), shiny:p.s } : null; };
  const champ = d.champ ? { name:d.champ.n, char:idxOf(d.champ.c), shiny:d.champ.s } : null;
  show(false, h('div', { class:'title sm' }, champ ? '🏆 ' + champ.name + ' remporte le tournoi !' : 'Tournoi à ' + d.size), bracketView(d.rounds, d.cur, champ, getP), h('div', { class:'sub' }, 'L\'hôte lance le prochain match…'), btn('Quitter', showMenu, 'small'));
}

