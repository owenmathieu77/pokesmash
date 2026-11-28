// ================================================================ LANCEMENT D'UNE PARTIE
function setupMatch(cfg, si, sps) {
  const def = STAGES[si]; G.stage = Object.assign({ rY:-330 }, def);
  G.plats = def.plats.map(p => Object.assign({}, p, { dx:0, mv:p.mv ? Object.assign({}, p.mv) : null }));
  const n = cfg.fighters.length;
  G.fighters = cfg.fighters.map((fc, i) => {
    const x = def.spawn[0] + (i - (n - 1) / 2) * Math.min(170, 640 / Math.max(1, n - 1));
    const f = makeFighter(i, CHARS[fc.char], fc.kind, fc.lvl || 5, sps[i], x, def.spawn[1], fc.stocks || cfg.stocks);
    f.slot = fc.slot; f.shiny = !!fc.shiny; f.conn = fc.conn || null; f.inv = 1; f.team = cfg.teams ? (fc.team || 0) : -1; if (fc.dmgM) f.dmgM = fc.dmgM;
    f.spdM = fc.spdM || 1; f.evoShift = fc.evoShift || 0; f.noShield = !!fc.noShield; f.noSpecial = !!fc.noSpecial; if (fc.giant) f.giant = fc.giant; if (fc.pct) f.pct = fc.pct;
    if (fc.smash) { f.ult = Math.min(100, fc.smash); if (f.ult >= 100) f.ultReady = true; }
    if (fc.startItem) { f.held = fc.startItem; f.uses = ITEMS[fc.startItem].uses || 0; }
    if (fc.hidden) { f.hidden = true; f.stocks = 0; f.state = 'dead'; f.dead = 1e9; } f.tx = x; f.ty = def.spawn[1];
    if (fc.big) f.ch = Object.assign({}, f.ch, { weight:Math.round(f.ch.weight * 1.15) });
    return f;
  });
  G.projs = []; G.sparks = []; G.hitstop = 0; G.shake = 0; G.winner = -1; G.endT = 0; G.time = 0; G.stepN = 0;
  G.hazards = []; G.ball = null; G.ballT = 22; G.cine = null; G.rain = null;
  G.items = []; G.texts = []; G.itemsMode = cfg.itemsOverride || null; G.itemT = (ITEM_INTERVAL[G.itemsMode || SET.game.items] || 10) * .6; cam.init = false;
  G.env = newEnv(); G.gravM = 1; repReset();
  G.cd = 2.4; G.go = 0; G.paused = false; G.localIn = [blank(), blank(), blank(), blank()]; netEvents = [];
  G.cfg = cfg; G.mode = cfg.mode; G.onEnd = onMatchEnd; G.me = -1; G.teamMode = !!cfg.teams; G.ff = !!cfg.ff; G.winTeam = -1; G.darkT = 0; G.evo = null; G.horde = cfg.horde ? { wave:0, score:0, kills:0, state:'prep', t:3, diff:cfg.diff || 'normal' } : null; G.banner = null;
  if (cfg.mode !== 'arcade') G.arcade = null;
  G.scene = 'fight'; hideUI();
}
async function launchMatch(cfg) {
  G.scene = 'loading'; G.cfg = cfg;
  show(false, h('div', { class:'title sm' }, 'Chargement des sprites…'), h('div', { class:'sub' }, 'Téléchargement depuis le dépôt PMDCollab'));
  const sps = await loadSpritesFast(cfg.fighters.map(f => ({ ch:CHARS[f.char], shiny:!!f.shiny })), 7000);
  const si = cfg.stage >= 0 ? cfg.stage : Math.floor(Math.random() * STAGES.length);
  if (cfg.mode === 'host') {
    for (const c of NET.conns) c.ready = false;
    const kinds = cfg.fighters.map(f => f.kind === 'cpu' ? 'c' : 'r'), lv = cfg.fighters.map(f => f.lvl || 5);
    for (const c of NET.conns) {
      NET.sendTo(c, { t:'start', hz:cfg.horde ? 1 : 0, df:cfg.diff || 'normal', hd:cfg.fighters.map(f => f.hidden ? 1 : 0), tm:cfg.teams ? cfg.fighters.map(f => f.team || 0) : null, ff:!!cfg.ff, you:cfg.fighters.findIndex(f => f.slot === c.slot), chars:cfg.fighters.map(f => refOf(f.char)), sh:cfg.fighters.map(f => !!f.shiny), kinds, lv, stage:si, stocks:cfg.stocks });
    }
    show(false, h('div', { class:'title sm' }, 'En attente des joueurs…'), h('div', { class:'sub' }, NET.conns.length + ' invité(s) connecté(s)'));
    await new Promise(res => { const t0 = Date.now(), iv = setInterval(() => { if (NET.conns.every(c => c.ready) || Date.now() - t0 > 20000) { clearInterval(iv); res(); } }, 50); });
    G.net = 'host';
  } else G.net = null;
  setupMatch(cfg, si, sps); statMatchStart(cfg);
}

// ================================================================ BOUCLE PRINCIPALE
let kbCapture = null;
addEventListener('keydown', e => {
  if (!kbCapture && navKey(e)) return;
  if (kbCapture) { e.preventDefault(); const cb = kbCapture; kbCapture = null; cb(e.code); return; }
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab'].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) pressed[e.code] = true;
  keys[e.code] = true; ensureAudio();
  if (e.code === 'KeyM' && !(e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT'))) muted = !muted;
  if (e.code === 'Escape') {
    if (G.paused) { G.paused = false; hideUI(); } else pauseGame();
  }
});
addEventListener('keyup', e => { keys[e.code] = false; });
// Perte de focus : on relâche toutes les touches (évite un personnage qui court tout seul) et on met en pause.
function lostFocus() { for (const k in keys) keys[k] = false; if (G.scene === 'fight' && !G.net && !G.paused) pauseGame(); }
addEventListener('blur', lostFocus);
document.addEventListener('visibilitychange', () => { if (document.hidden) lostFocus(); });

let last = performance.now(), acc = 0, tAbs = 0, slowT = 0, qCool = 3, qApplied = '';
function qualityStep(raw) {                           // qualité automatique : baisse les effets si le jeu rame
  const mode = SET.game.quality;
  if (mode !== qApplied) { qApplied = mode; slowT = 0; qCool = 3; applyQuality(mode === 'low' ? 0 : mode === 'mid' ? 1 : 2); }
  if (mode !== 'auto' || G.scene !== 'fight') return;
  qCool -= Math.min(raw, .1);
  if (qCool > 0) return;
  slowT = fpsAvg < 40 ? slowT + Math.min(raw, .1) : 0;
  if (slowT > 1.5 && QUAL > 0) { applyQuality(QUAL - 1); slowT = 0; qCool = 4; fpsAvg = 60; }
}
function frame(now) {
  requestAnimationFrame(frame);
  const raw = (now - last) / 1000; fdt = Math.min(.05, raw); last = now; tAbs += fdt; statTick(fdt); musicTick(); if (G.scene === 'fight') repRecord(fdt);
  if (raw > 0 && raw < .5) fpsAvg += (1 / raw - fpsAvg) * .05;
  qualityStep(raw);
  ctx.setTransform(rScale, 0, 0, rScale, 0, 0);
  pollPads(); updateTouchVisibility(); uiPadTick(fdt);
  let consume = true;
  if (G.scene === 'menu' || G.scene === 'loading') {
    drawBackground(null, tAbs);
  } else if (G.scene === 'replay') {
    repUpdate(fdt); drawFight(tAbs);
  } else {
    if (G.scene === 'fight' && !G.paused) {
      if (G.net === 'guest') {
        NET.send({ t:'in', b:packInput(readInput([0, 1])) });
        for (const f of G.fighters) { if (f.tx !== undefined) { f.x += (f.tx - f.x) * .55; f.y += (f.ty - f.y) * .55; } if (f.state === 'attack') f.mt += fdt; }
        G.time += fdt;
        for (const p of G.plats) if (p.mv) p.x = p.mv.x0 + Math.sin(G.time * p.mv.sp) * p.mv.ax;
        for (const s of G.sparks) { s.life -= fdt; s.x += s.vx * fdt; s.y += s.vy * fdt; s.vx *= .94; s.vy *= .94; }
        G.sparks = G.sparks.filter(s => s.life > 0); G.shake = Math.max(0, G.shake - 30 * fdt);
        for (const t of G.texts) { t.life -= fdt; t.y -= 26 * fdt; } G.texts = G.texts.filter(t => t.life > 0);
      } else {
        acc += fdt; consume = false;
        for (let i = 0; i < 4; i++) G.localIn[i] = readInput([i]);
        while (acc >= DT) {
          stepGame(); acc -= DT; consume = true;
          for (const i of G.localIn) clearEdges(i);
          if (G.net === 'host' && ++G.stepN % (NET.conns.length >= 4 ? 3 : 2) === 0) sendSnap();
          if (G.scene !== 'fight') break;
        }
      }
    } else if (G.paused) consume = true;
    drawFight(tAbs);
  }
  if (consume) for (const k in pressed) delete pressed[k];
}
requestAnimationFrame(frame);
showMenu();
window.__pb = { G, SET, saveStats, ACC, accAuth, showAccount, showFriends, saveBundle, mergeBundle, REP, MUS, startReplay, envTick, navMove, showPublicRooms, PS, applyStatus, evoInfo, evolveFighter, isFoe, startUlt, chargeBar, launch, chargeBar, launch, startUlt, hitBall, ultOf, ultTypeOf, TYPE_OF, ULT_BY_TYPE, updateHazards, onlineCount, lobbySend, hostConnClosed, MAXP, applyQuality, THEMES, fpsAvg: () => fpsAvg, qual: () => QUAL, makeCustom, evoMenu, showFusion, randomForm, BASE_FORMS, FAMILIES, FAM_OF, CHAR_BY_ID, CUSTOMS, refOf, idxOf, loadSprites, ITEMS, ITEM_KEYS, cam, saveSettings, showSettings, buildTouch, spawnItem, pickupItem, padInfo, keys, hintText, CHARS, STAGES, NET, launchMatch, setupMatch, stepGame, showMenu, showSelect, startArcade, aiInput, sendSnap, applySnap, drawFight, makeFighter, blank, arcadeRoute, showProfile, showDaily, STATS, packInput, unpackInput, readInput, keys, pressed, onMatchEnd };
