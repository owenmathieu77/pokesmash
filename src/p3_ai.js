// ================================================================ IA (niveaux 1 à 9)
function nearestFoe(f) {
  let best = null, bd = 1e9;
  for (const o of G.fighters) {
    if (!isFoe(f, o) || o.stocks <= 0 || o.state === 'dead') continue;
    const d = Math.abs(o.x - f.x) + Math.abs(o.y - f.y) * 1.2;
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function nearestPlat(f) {
  let best = null, bd = 1e9;
  for (const p of G.plats) {
    const hx = Math.max(0, p.x - f.x, f.x - (p.x + p.w)), d = hx + Math.abs(p.y - f.y) * .3 + (p.soft ? 30 : 0);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
function nearestItem(f) {
  let best = null, bd = 1e9;
  for (const it of G.items) {
    if (!it.landed || Math.abs(it.y - f.y) > 130 || (f.held && ITEMS[it.type].kind !== 'use')) continue;
    const d = Math.abs(it.x - f.x); if (d < 520 && d < bd) { bd = d; best = it; }
  }
  return best;
}
function incomingProj(f) {
  for (const p of G.projs) {
    if (p.owner === f || p.mine) continue;
    const dx = f.x - p.x;
    if (Math.abs(dx) < 190 && Math.sign(dx) === Math.sign(p.vx) && Math.abs(p.y - (f.y - f.ch.h / 2)) < f.ch.h) return p;
  }
  return null;
}

function aiInput(f, dt) {
  const a = f.ai, inp = blank(), L = f.lvl, k = (L - 1) / 8, st = f.state, ty = f.ch.types;
  a.cool -= dt; a.jc -= dt; a.react -= dt; a.shT -= dt;
  const foe = nearestFoe(f);
  if (st === 'grabbed') { if (Math.random() < .04 + .25 * k) inp.pAttack = true; a.ps = st; return inp; }
  if (st === 'hold') {
    if (a.ps !== 'hold') a.hold = rnd(.35, 1.0);
    a.ps = st; a.hold -= dt;
    if (a.hold > 0) { if (Math.random() < .06) inp.pAttack = true; return inp; }
    const out = Math.sign(f.x) || 1, v = f.holdTarget, edge = Math.max(...G.plats.map(p => Math.abs(p.x + p.w / 2) + p.w / 2)) - 250;
    if (v && v.pct > 110 && Math.random() < .6) inp.up = true;
    else if (Math.abs(f.x) > edge * .6) { inp.right = out > 0; inp.left = out < 0; }
    else { const r = Math.random(); if (r < .4) inp.up = true; else if (r < .7) inp.right = true; else inp.left = true; }
    return inp;
  }
  a.ps = st;
  if (st === 'ledge') { a.lt = (a.lt || 0) + dt; if (!a.lw) a.lw = .35 + Math.random() * .6; if (a.lt > a.lw) { inp.up = true; a.lt = 0; a.lw = 0; } return inp; }
  if (st === 'shield') {
    const dist = foe ? Math.abs(foe.x - f.x) : 999;
    inp.shield = !(a.shT <= 0 || !foe || dist > 150);
    if (foe && dist < 85 && (foe.state === 'shield' || (foe.state === 'free' && Math.random() < .08 * k + (a.wantGrab ? 1 : 0)))) { inp.pAttack = true; a.wantGrab = false; }
    return inp;
  }
  if (st === 'attack' && f.move.kind === 'flap') {
    const P = nearestPlat(f), d = P.x + P.w / 2 - f.x; inp.left = d < -15; inp.right = d > 15; return inp;
  }
  if (st !== 'free') return inp;

  // ---- retour sur la scène
  const P = nearestPlat(f), hx = Math.max(0, P.x - f.x, f.x - (P.x + P.w));
  const off = !f.grounded && ((f.y > P.y + 10 && (hx > 0 || f.y > P.y + 60)) || hx > 40);
  if (off) {
    const d = P.x + P.w / 2 - f.x; inp.left = d < -15; inp.right = d > 15;
    if (a.jc <= 0) {
      if (Math.random() < .35 + .65 * k) {
        if (f.y > P.y - 40) {
          if (f.airJumps > 0) { inp.pJump = true; a.jc = .32; }
          else if (!f.usedRec) { inp.up = true; inp.pSpecial = true; a.jc = .5; }
        }
      } else a.jc = .15;
    }
    return inp;
  }
  if (!foe) return inp;

  const dx = foe.x - f.x, dy = foe.y - f.y, dist = Math.abs(dx), dir = dx > 0 ? 1 : -1;
  // ---- déplacement
  let want = dist > 60 ? dir : 0;
  const itm = nearestItem(f);
  if (itm && dist > 120) want = Math.abs(itm.x - f.x) > 14 ? Math.sign(itm.x - f.x) : 0;
  const P0 = f.plat;
  if (P0 && want) { const nx = f.x + want * 30; if (nx < P0.x + 6 || nx > P0.x + P0.w - 6) want = 0; }
  inp.left = want < 0; inp.right = want > 0;
  if (f.grounded && dy < -70 && a.jc <= 0 && Math.random() < .03 + .05 * k) { inp.pJump = true; a.jc = .4; }
  if (f.grounded && f.onSoft && dy > 80 && dist < 120) { inp.down = true; inp.pDown = true; }
  if (f.grounded && Math.random() < .003) inp.pJump = true;
  if (!f.grounded && f.airJumps > 0 && dy < -90 && f.vy > 0 && a.jc <= 0 && Math.random() < .08 * (.3 + k)) { inp.pJump = true; a.jc = .35; }

  // ---- Boule Smash : on la poursuit si l'adversaire n'est pas collé à nous
  if (G.ball && k > .25 && (dist > 240 || k > .6) && Math.abs(G.ball.x - f.x) < 650) {
    const b = G.ball, bx = b.x - f.x;
    inp.left = bx < -40; inp.right = bx > 40;
    if (b.y < f.y - 90 && a.jc <= 0 && (f.grounded || (f.airJumps > 0 && f.vy > 0))) { inp.pJump = true; a.jc = .35; }
    if (Math.abs(bx) < 90 && Math.abs(b.y - (f.y - f.ch.h / 2)) < 100 && a.cool <= 0) { f.face = bx > 0 ? 1 : -1; inp.pAttack = true; a.cool = .22; return inp; }
  }
  // ---- ATTAQUE ULTIME prête : spécial neutre
  if (f.ultReady && Math.random() < .05 + .06 * k) { f.face = dir; inp.left = inp.right = false; inp.pSpecial = true; a.cool = 1; return inp; }
  if (a.react > 0) return inp;
  a.react = rnd(.05, .28) * (1.25 - k);
  const near = dist < 95 && Math.abs(dy) < 95;

  // ---- défense
  if (k > .15 && f.grounded && f.shield > 20) {
    const pr = k > .4 ? incomingProj(f) : null;
    if ((foe.state === 'attack' && dist < 135 && Math.abs(dy) < 90 && Math.random() < .2 + .6 * k) || (pr && Math.random() < .5 * k)) {
      inp.shield = true; a.shT = rnd(.35, .75); inp.left = inp.right = false; return inp;
    }
  }
  if (k > .35 && foe.state === 'attack' && dist < 125 && Math.abs(dy) < 90 && ty.db === 'counter' && f.cds.db <= 0 && Math.random() < .35 * k + .1) {
    inp.left = inp.right = false; inp.down = true; inp.pSpecial = true; return inp;
  }
  if (a.cool > 0) return inp;
  if (L < 4 && Math.random() < .55 - .12 * L) { a.cool = rnd(.3, .8); return inp; }

  // ---- objet tenu : on le lance
  if (f.held && dist > 80 && dist < 360 && Math.abs(dy) < 150 && Math.random() < .4 + .4 * k) {
    f.face = dir; inp.left = inp.right = false; inp.pAttack = true; a.cool = rnd(.5, 1); return inp;
  }
  // ---- attaque
  if (near) {
    f.face = dir; inp.left = inp.right = false;
    if (foe.state === 'shield' && k > .2) { inp.shield = true; a.wantGrab = true; }
    else if (Math.random() < .18 * k) { inp.shield = true; a.wantGrab = true; }
    else if (ty.db === 'slam' && k > .3 && Math.random() < .12) { inp.down = true; inp.pSpecial = true; }
    else {
      const r = Math.random();
      if (dy < -60) inp.up = true; else if (dy > 55 && !f.grounded) inp.down = true;
      else if (r < .25) { inp.left = dir < 0; inp.right = dir > 0; }
      else if (r < .35 && f.grounded) inp.down = true;
      inp.pAttack = true;
    }
    a.cool = rnd(.25, .6) * (1.4 - k) + .1;
    return inp;
  }
  const r = Math.random();
  if (dist > 170 && dist < 560 && Math.abs(dy) < 100 && f.cds.nb <= 0 && r < .5 * (.4 + k)) {
    f.face = dir; inp.left = inp.right = false; inp.pSpecial = true; a.cool = rnd(.7, 1.3); return inp;
  }
  if (dist > 90 && dist < 270 && Math.abs(dy) < 90 && f.cds.sb <= 0 && r < .45 * (.3 + k)) {
    f.face = dir; inp.left = dir < 0; inp.right = dir > 0; inp.pSpecial = true; a.cool = rnd(.6, 1.1); return inp;
  }
  if (ty.db === 'boost' && f.buff <= 0 && f.cds.db <= 0 && dist > 220 && k > .2) { inp.left = inp.right = false; inp.down = true; inp.pSpecial = true; a.cool = 1; return inp; }
  if (ty.db === 'mine' && f.cds.db <= 0 && dist < 240 && dist > 60 && k > .2 && r < .15) { f.face = dir; inp.left = inp.right = false; inp.down = true; inp.pSpecial = true; a.cool = .8; return inp; }
  if (dist > 90 && dist < 200 && f.grounded && r < .08 * k) { inp.pAttack = true; a.cool = .5; }
  return inp;
}

