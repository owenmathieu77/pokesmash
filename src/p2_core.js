// ================================================================ UTILITAIRES
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
const rnd = (a, b) => a + Math.random() * (b - a);
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const bodyRect = f => { const s = f.giant > 0 ? 1.3 : 1; return { x:f.x - f.ch.w * s / 2, y:f.y - f.ch.h * s, w:f.ch.w * s, h:f.ch.h * s }; };

// ================================================================ PARAMÈTRES (sauvegardés dans le navigateur)
const KEYACTIONS = ['left','right','up','down','jump','attack','special','shield','grab'];
const ACTION_LABELS = { left:'Gauche', right:'Droite', up:'Haut', down:'Bas', jump:'Saut', attack:'Attaque', special:'Spécial', shield:'Bouclier', grab:'Grab' };
const NOKEYS = () => ({ left:['',''], right:['',''], up:['',''], down:['',''], jump:['',''], attack:['',''], special:['',''], shield:['',''], grab:['',''] });
const DEFAULTS = {
  keys:[
    { left:['KeyA',''], right:['KeyD',''], up:['KeyW',''], down:['KeyS',''], jump:['KeyW',''], attack:['KeyF',''], special:['KeyG',''], shield:['KeyH',''], grab:['KeyT',''] },
    { left:['ArrowLeft',''], right:['ArrowRight',''], up:['ArrowUp',''], down:['ArrowDown',''], jump:['ArrowUp',''], attack:['KeyK','Numpad1'], special:['KeyL','Numpad2'], shield:['Semicolon','Numpad3'], grab:['KeyO','Numpad4'] },
    NOKEYS(), NOKEYS(),
  ],
  // Manette : 'b12' = bouton 12, 'a0-' = axe 0 vers le négatif, 'a0+' = axe 0 vers le positif.
  pad:{ left:['b14','a0-'], right:['b15','a0+'], up:['b12','a1-'], down:['b13','a1+'], jump:['b0','b3'], attack:['b2'], special:['b1'], shield:['b4','b6','b7'], grab:['b5'], dead:.3, flick:false, start:0 },
  touch:{ mode:'auto', size:1, opacity:.65, left:false, flick:false, vib:true, grabBtn:true },
  audio:{ vol:.7, music:.5 },
  net:{ nick:'', server:'' },
  game:{ items:'normal', itemTypes:{}, shake:true, hitboxes:false, hints:true, stocks:3, cpu:5, camera:true, quality:'auto', fps:false, smash:'both', evo:'on' },
};
function mergeInto(a, b) {
  for (const k in b) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') mergeInto(a[k], b[k]); else a[k] = b[k];
  }
}
function loadSettings() {
  const d = JSON.parse(JSON.stringify(DEFAULTS));
  try { const s = JSON.parse(localStorage.getItem('pokebrawl2.settings') || 'null'); if (s) mergeInto(d, s); } catch (e) { /* stockage indisponible */ }
  return d;
}
let SET = loadSettings();
function saveSettings() { SET.settingsTs = Date.now(); try { localStorage.setItem('pokebrawl2.settings', JSON.stringify(SET)); } catch (e) { /* ignoré */ } if (typeof accDirty === 'function') accDirty(); }
function resetSettings() { SET = JSON.parse(JSON.stringify(DEFAULTS)); saveSettings(); }

// ================================================================ AUDIO
let AC = null, muted = false;
function ensureAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume();
}
function beep(f0, f1, dur, type, vol) {
  if (!AC || muted || SET.audio.vol <= 0) return;
  try {
    const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime;
    o.type = type || 'square';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime((vol || .05) * SET.audio.vol * 1.4, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + dur);
  } catch (e) { /* audio indisponible */ }
}
function sfx(n) {
  if (n.indexOf('hit:') === 0) { typeHit(n.slice(4)); return; }
  if (n.indexOf('cry:') === 0) { const q = n.split(':'); cryById(q[1], q[2]); return; }
  switch (n) {
    case 'hit':    beep(220, 60, .12, 'sawtooth', .07); break;
    case 'jump':   beep(300, 560, .09, 'square', .03); break;
    case 'shoot':  beep(700, 300, .15, 'triangle', .05); break;
    case 'upb':    beep(250, 900, .2, 'triangle', .05); break;
    case 'ko':     beep(400, 40, .6, 'sawtooth', .09); break;
    case 'shield': beep(500, 420, .08, 'sine', .06); break;
    case 'break':  beep(900, 80, .5, 'sawtooth', .08); break;
    case 'grab':   beep(180, 260, .1, 'square', .05); break;
    case 'item':   beep(600, 1200, .18, 'triangle', .06); break;
    case 'boom':   beep(160, 30, .45, 'sawtooth', .1); break;
    case 'ult':    beep(200, 900, .5, 'sawtooth', .09); setTimeout(() => beep(900, 120, .5, 'square', .07), 380); break;
    case 'evo':    beep(300, 1200, .6, 'triangle', .08); setTimeout(() => beep(1200, 600, .4, 'sine', .06), 500); break;
    case 'ui':     beep(500, 700, .06, 'square', .04); break;
  }
}

// ================================================================ ENTRÉES (clavier, manette, tactile)
const keys = {}, pressed = {};
const padInfo = { pads:[] };               // pour l'écran de réglages
let padCapture = null;                     // {cb, armed} : attend un bouton de manette
const BTN_PS = ['✕','○','□','△','L1','R1','L2','R2','Share','Options','L3','R3','↑','↓','←','→','PS','Pavé'];
const BTN_XB = ['A','B','X','Y','LB','RB','LT','RT','Vue','Menu','LS','RS','↑','↓','←','→','Guide','—'];
const isPS = id => /054c|dualshock|dualsense|wireless controller|playstation|ps4|ps5/i.test(id || '');
function padLabel(b, id) {
  if (!b) return '—';
  const L = isPS(id) ? BTN_PS : BTN_XB;
  if (b[0] === 'b') return L[+b.slice(1)] || ('Bouton ' + b.slice(1));
  return 'Axe ' + b.slice(1, -1) + (b.slice(-1) === '+' ? ' +' : ' −');
}
function padActive(g, b, dead) {
  if (b[0] === 'b') { const btn = g.buttons[+b.slice(1)]; return !!btn && (btn.pressed || btn.value > .5); }
  if (b[0] === 'a') { const v = g.axes[+b.slice(1, -1)] || 0; return b.slice(-1) === '+' ? v > dead : v < -dead; }
  return false;
}
function hatDir(g) {                        // croix directionnelle « chapeau » (axe 9) des manettes non standard
  if (g.mapping === 'standard' || g.axes.length < 10) return null;
  const v = g.axes[9]; if (v === undefined || v > 1.05 || v < -1.05) return null;
  return ['up','upright','right','downright','down','downleft','left','upleft'][Math.round((v + 1) * 3.5)] || null;
}
const padPrev = [{}, {}, {}, {}];
function pollPads() {
  const gps = ((navigator.getGamepads ? navigator.getGamepads() : []) || []);
  const list = []; for (const g of gps) if (g && g.connected) list.push(g);
  padInfo.pads = list;
  if (padCapture) {
    let any = false, hit = null;
    for (const g of list) {
      g.buttons.forEach((b, i) => { if (b.pressed || b.value > .6) { any = true; if (!hit) hit = 'b' + i; } });
      g.axes.forEach((v, i) => { if (Math.abs(v) > .7) { any = true; if (!hit) hit = 'a' + i + (v > 0 ? '+' : '-'); } });
    }
    if (!any) padCapture.armed = true; else if (padCapture.armed && hit) { const cb = padCapture.cb; padCapture = null; cb(hit); }
  }
  for (let slot = 0; slot < 4; slot++) {
    const g = list[slot - SET.pad.start], cur = {};
    if (g) {
      for (const a of KEYACTIONS) cur[a] = (SET.pad[a] || []).some(b => padActive(g, b, SET.pad.dead));
      const hd = hatDir(g);
      if (hd) { if (/left/.test(hd)) cur.left = true; if (/right/.test(hd)) cur.right = true; if (/^up/.test(hd)) cur.up = true; if (/^down/.test(hd)) cur.down = true; }
      if (SET.pad.flick && cur.up) cur.jump = true;
    }
    for (const k of KEYACTIONS) {
      const code = 'Pad' + slot + k;
      if (cur[k] && !padPrev[slot][k]) pressed[code] = true;
      keys[code] = !!cur[k];
    }
    padPrev[slot] = cur;
  }
}
function touchSet(action, down) {
  const code = 'Touch_' + action;
  if (down && !keys[code]) pressed[code] = true;
  keys[code] = down;
}
function blank() { return { left:false, right:false, up:false, down:false, shield:false, atk:false, pJump:false, pDown:false, pAttack:false, pSpecial:false, pLeft:false, pRight:false, pGrab:false }; }
const codesFor = (p, a) => ((SET.keys[p] && SET.keys[p][a]) || []).filter(Boolean).concat(['Pad' + p + a], p === 0 ? ['Touch_' + a] : []);
function readInput(slots) {
  const inp = blank();
  for (const p of slots) {
    const h = a => codesFor(p, a).some(c => keys[c]), e = a => codesFor(p, a).some(c => pressed[c]);
    inp.left = inp.left || h('left'); inp.right = inp.right || h('right'); inp.up = inp.up || h('up'); inp.down = inp.down || h('down');
    inp.shield = inp.shield || h('shield'); inp.atk = inp.atk || h('attack');
    inp.pJump = inp.pJump || e('jump'); inp.pDown = inp.pDown || e('down'); inp.pAttack = inp.pAttack || e('attack');
    inp.pSpecial = inp.pSpecial || e('special'); inp.pLeft = inp.pLeft || e('left'); inp.pRight = inp.pRight || e('right'); inp.pGrab = inp.pGrab || e('grab');
  }
  return inp;
}
const EDGES = ['pJump','pDown','pAttack','pSpecial','pLeft','pRight','pGrab'];
const HELD = ['left','right','up','down','shield','atk'];
function packInput(i) { let b = 0, k = 0; for (const n of HELD) { if (i[n]) b |= 1 << k; k++; } for (const n of EDGES) { if (i[n]) b |= 1 << k; k++; } return b; }
function unpackInput(b) { const i = blank(); let k = 0; for (const n of HELD) { i[n] = !!(b & (1 << k)); k++; } for (const n of EDGES) { i[n] = !!(b & (1 << k)); k++; } return i; }
function clearEdges(i) { for (const n of EDGES) i[n] = false; }
function keyName(code) {
  if (!code) return '—';
  const m = { Space:'Espace', ArrowLeft:'←', ArrowRight:'→', ArrowUp:'↑', ArrowDown:'↓', Semicolon:';', Comma:',', Period:'.', Slash:'/', Quote:"'", Backquote:'`', ShiftLeft:'Maj G', ShiftRight:'Maj D', ControlLeft:'Ctrl G', ControlRight:'Ctrl D', Enter:'Entrée', Backspace:'Retour', Tab:'Tab' };
  if (m[code]) return m[code];
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Pavé ');
}

// ================================================================ CHARGEMENT DES SPRITES PMD
function withTimeout(p, ms) {
  return new Promise(res => { const t = setTimeout(() => res(null), ms); p.then(v => { clearTimeout(t); res(v); }, () => { clearTimeout(t); res(null); }); });
}
function loadImage(url) {
  return withTimeout(new Promise((res, rej) => {
    const im = new Image(); im.crossOrigin = 'anonymous';
    im.onload = () => res(im); im.onerror = () => rej(new Error('img')); im.src = url;
  }), 12000);
}
function fetchText(url) { return withTimeout(fetch(url).then(r => { if (!r.ok) throw new Error('http'); return r.text(); }), 12000); }
function parseAnimData(txt) {
  const doc = new DOMParser().parseFromString(txt, 'text/xml'), out = {};
  doc.querySelectorAll('Anim').forEach(a => {
    const g = t => { const n = a.querySelector(t); return n ? n.textContent.trim() : null; };
    const name = g('Name'); if (!name) return;
    out[name] = { copyOf:g('CopyOf'), fw:parseInt(g('FrameWidth'), 10), fh:parseInt(g('FrameHeight'), 10),
                  durs:Array.from(a.querySelectorAll('Duration')).map(d => parseInt(d.textContent, 10) || 4) };
  });
  return out;
}
function shadowAnchors(img, fw, fh, n) {
  try {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const data = x.getImageData(0, 0, c.width, c.height).data, res = {};
    for (const row of [2, 6]) {            // 2 = droite, 6 = gauche
      res[row] = [];
      for (let f = 0; f < n; f++) {
        let sx = 0, sy = 0, cnt = 0;
        for (let yy = 0; yy < fh; yy++) for (let xx = 0; xx < fw; xx++) {
          if (data[((row * fh + yy) * c.width + f * fw + xx) * 4 + 3] > 0) { sx += xx; sy += yy; cnt++; }
        }
        res[row].push(cnt ? { x:sx / cnt + .5, y:sy / cnt + .5 } : null);
      }
    }
    return res;
  } catch (e) { return null; }
}
const WANT = ['Idle','Walk','Attack','Strike','Swing','Shoot','Charge','Hurt','Pain','Cringe','Hop','Faint','Sleep','Pose','LeapForth','Float','Rotate','Pull','LostBalance','Sit','HitGround','Double'];
const spriteCache = {}, spriteObj = {};
function recolor(img, deg) {                      // fausse « chromatique » : rotation de teinte (si le vrai sprite shiny n'existe pas)
  try {
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const x = cv.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, cv.width, cv.height), p = d.data, sh = deg / 360;
    for (let i = 0; i < p.length; i += 4) {
      if (!p[i + 3]) continue;
      const r = p[i] / 255, g = p[i + 1] / 255, b = p[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, dd = mx - mn;
      if (dd < .08) continue;                      // gris, blanc, noir : inchangés
      const s = l > .5 ? dd / (2 - mx - mn) : dd / (mx + mn);
      let hh = mx === r ? (g - b) / dd + (g < b ? 6 : 0) : mx === g ? (b - r) / dd + 2 : (r - g) / dd + 4; hh = (hh / 6 + sh) % 1;
      const q = l < .5 ? l * (1 + s) : l + s - l * s, pp = 2 * l - q;
      const f = t => { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? pp + (q - pp) * 6 * t : t < .5 ? q : t < 2 / 3 ? pp + (q - pp) * (2 / 3 - t) * 6 : pp; };
      p[i] = f(hh + 1 / 3) * 255; p[i + 1] = f(hh) * 255; p[i + 2] = f(hh - 1 / 3) * 255;
    }
    x.putImageData(d, 0, 0); return cv;
  } catch (e) { return img; }
}
function loadSprites(ch, shiny) {
  if (ch.custom) return loadCustomSprites(ch, shiny);
  const key = ch.id + (shiny ? '*' : '');
  if (spriteCache[key]) return spriteCache[key];
  const out = spriteObj[key] = { anims:{}, ok:false };
  return spriteCache[key] = (async () => {
    const base = BASE + 'sprite/' + ch.id + '/', sbase = base + '0000/0001/', hue = shinyHue(ch);
    try {
      let txt = null, realShiny = false;
      if (shiny) { txt = await fetchText(sbase + 'AnimData.xml'); realShiny = !!txt; }
      if (!txt) txt = await fetchText(base + 'AnimData.xml');
      if (!txt) return out;
      const raw = parseAnimData(txt);
      const real = (n, d = 0) => { const a = raw[n]; if (!a) return null; return (a.copyOf && d < 4) ? real(a.copyOf, d + 1) : n; };
      const byReal = {};
      for (const w of WANT) { const r = real(w); if (r && raw[r].fw > 0) (byReal[r] = byReal[r] || []).push(w); }
      await Promise.all(Object.keys(byReal).map(async r => {
        let img, sh;
        if (shiny && realShiny) {
          [img, sh] = await Promise.all([loadImage(sbase + r + '-Anim.png'), loadImage(sbase + r + '-Shadow.png')]);
          if (!img) { img = await loadImage(base + r + '-Anim.png'); if (img) img = recolor(img, hue); }
          if (!sh) sh = await loadImage(base + r + '-Shadow.png');
        } else {
          [img, sh] = await Promise.all([loadImage(base + r + '-Anim.png'), loadImage(base + r + '-Shadow.png')]);
          if (img && shiny) img = recolor(img, hue);
        }
        if (!img) return;
        const a = raw[r], an = { fw:a.fw, fh:a.fh, durs:a.durs, img, anch:sh ? shadowAnchors(sh, a.fw, a.fh, a.durs.length) : null };
        for (const w of byReal[r]) out.anims[w] = an;
        out.ok = true;
      }));
    } catch (e) { /* hors-ligne : formes de remplacement */ }
    return out;
  })();
}
// ---- Pokémon fusionnés : tête d'un Pokémon + corps d'un autre + queue d'un troisième (découpés dans les vrais sprites)
const bboxCache = new Map(); let tmpCv = null;
function cellBBox(an, row, fi) {
  let m = bboxCache.get(an); if (!m) { m = {}; bboxCache.set(an, m); }
  const k = row * 100 + fi; if (m[k]) return m[k];
  let res = { x:0, y:0, w:an.fw, h:an.fh };
  try {
    if (!tmpCv) tmpCv = document.createElement('canvas');
    tmpCv.width = an.fw; tmpCv.height = an.fh; const g = tmpCv.getContext('2d'); g.clearRect(0, 0, an.fw, an.fh);
    g.drawImage(an.img, fi * an.fw, row * an.fh, an.fw, an.fh, 0, 0, an.fw, an.fh);
    const d = g.getImageData(0, 0, an.fw, an.fh).data; let x0 = an.fw, y0 = an.fh, x1 = -1, y1 = -1;
    for (let y = 0; y < an.fh; y++) for (let x = 0; x < an.fw; x++) if (d[(y * an.fw + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 >= 0) res = { x:x0, y:y0, w:x1 - x0 + 1, h:y1 - y0 + 1 };
  } catch (e) { /* image protégée : boîte entière */ }
  return m[k] = res;
}
function composeAnim(B, A, C) {
  const n = B.durs.length, fw = Math.ceil(B.fw * 1.5), fh = Math.ceil(B.fh * 1.7);
  const cv = document.createElement('canvas'); cv.width = fw * n; cv.height = fh * 8;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; const anch = { 2:[], 6:[] };
  for (const row of [2, 6]) for (let fi = 0; fi < n; fi++) {
    const fa = Math.min(A.durs.length - 1, Math.floor(fi * A.durs.length / n)), fc = Math.min(C.durs.length - 1, Math.floor(fi * C.durs.length / n));
    const bb = cellBBox(B, row, fi), ha = cellBBox(A, row, fa), tc = cellBBox(C, row, fc);
    const ox = fi * fw, oy = row * fh, footY = oy + fh - 6, cx = ox + fw / 2;
    const bodyH = bb.h * .7, bodyX = cx - bb.w / 2, bodyY = footY - bodyH;
    // queue : bande arrière du troisième Pokémon, derrière le corps
    const tw = tc.w * .45, th = tc.h * .6, ts = Math.max(.5, Math.min(1.4, bodyH * .9 / th)), dW = tw * ts, dH = th * ts;
    const sx = row === 2 ? tc.x : tc.x + tc.w - tw, dX = row === 2 ? bodyX - dW * .6 : bodyX + bb.w - dW * .4;
    g.drawImage(C.img, fc * C.fw + sx, row * C.fh + tc.y + tc.h * .35, tw, th, dX, footY - dH - 2, dW, dH);
    // corps : torse et pattes du deuxième Pokémon
    g.drawImage(B.img, fi * B.fw + bb.x, row * B.fh + bb.y + bb.h * .3, bb.w, bodyH, bodyX, bodyY, bb.w, bodyH);
    // tête : haut du premier Pokémon, posé sur le corps
    const hh = ha.h * .45, hs = Math.max(.6, Math.min(1.5, bb.w * .95 / ha.w)), dW2 = ha.w * hs, dH2 = hh * hs, shift = (row === 2 ? 1 : -1) * bb.w * .08;
    g.drawImage(A.img, fa * A.fw + ha.x, row * A.fh + ha.y, ha.w, hh, cx - dW2 / 2 + shift, bodyY - dH2 + 4, dW2, dH2);
    anch[row].push({ x:fw / 2, y:fh - 6 });
  }
  return { fw, fh, durs:B.durs, img:cv, anch };
}
function loadCustomSprites(ch, shiny) {
  const key = 'cu:' + ch.id + (shiny ? '*' : '');
  if (spriteCache[key]) return spriteCache[key];
  const out = spriteObj[key] = { anims:{}, ok:false };
  return spriteCache[key] = (async () => {
    try {
      const [h, b, t] = await Promise.all(['head', 'body', 'tail'].map(k => loadSprites(CHARS[CHAR_BY_ID[ch.custom[k]]], shiny)));
      for (const name of Object.keys(b.anims)) {
        const B = b.anims[name], A = h.anims[name] || h.anims.Idle, C = t.anims[name] || t.anims.Idle;
        out.anims[name] = (A && C) ? composeAnim(B, A, C) : B;
      }
      out.ok = Object.keys(out.anims).length > 0;
    } catch (e) { /* ignoré */ }
    return out;
  })();
}
// Attend le chargement, mais pas plus de ms : les sprites manquants apparaîtront ensuite.
async function loadSpritesFast(list, ms) {          // list : [{ch, shiny}]
  const all = Promise.all(list.map(o => loadSprites(o.ch, o.shiny)));
  await Promise.race([all, new Promise(r => setTimeout(r, ms))]);
  return list.map(o => o.ch.custom ? spriteObj['cu:' + o.ch.id + (o.shiny ? '*' : '')] : spriteObj[o.ch.id + (o.shiny ? '*' : '')]);
}
const portraitURL = ch => BASE + 'portrait/' + ch.id + '/Normal.png';

// ================================================================ ÉTAT DE PARTIE
const G = {
  mode:'none', net:null, scene:'menu', stage:null, plats:[], time:0,
  fighters:[], projs:[], sparks:[], items:[], texts:[], rain:null, itemT:8, itemsMode:null, gravM:1, env:{ lavaY:null, wind:0 }, banner:null, horde:null, teamMode:false, ff:false, winTeam:-1, darkT:0, evo:null, hazards:[], ball:null, ballT:24, cine:null, hitstop:0, shake:0, winner:-1, endT:0, paused:false,
  warn:false, cd:0, go:0, ping:0, stepN:0, arcade:null, cfg:null, onEnd:null, localIn:[], t0:0,
};
let netEvents = [];
function fxSparks(x, y, color, n, spd) {
  if (G.sparks.length > 260) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = rnd(.3, 1) * spd;
    G.sparks.push({ x, y, vx:Math.cos(a) * s, vy:Math.sin(a) * s, life:rnd(.25, .6), max:.6, color, r:rnd(2, 5) });
  }
  if (G.net === 'host') netEvents.push(['sp', Math.round(x), Math.round(y), color, n, spd]);
}
function fxSfx(n) { sfx(n); if (G.net === 'host') netEvents.push(['sf', n]); }
function fxShake(v) { if (!SET.game.shake) return; G.shake = Math.max(G.shake, v); if (G.net === 'host') netEvents.push(['sk', v]); }
function fxText(x, y, text, color) { G.texts.push({ x, y, text, color:color || '#fff', life:1.1, max:1.1 }); if (G.net === 'host') netEvents.push(['tx', Math.round(x), Math.round(y), text, color || '#fff']); }

function makeFighter(idx, ch, kind, lvl, sp, x, y, stocks) {
  return {
    idx, ch, kind, lvl, sp, x, y, vx:0, vy:0, face:x < 0 ? 1 : -1, pct:0, stocks, maxStocks:stocks, state:'free', st:0,
    grounded:true, onSoft:false, plat:null, airJumps:ch.air, dropT:0, inv:1.2, move:null, mname:'', mt:0,
    hitSet:null, fired:false, usedRec:false, cds:{ nb:0, sb:0, db:0 }, hurtT:0, dead:0, fast:false, shield:100,
    hidden:false, noShield:false, noSpecial:false, spdM:1, evoShift:0, team:-1, status:null, statusT:0, statusTick:0, charge:0, cm:1, atkHold:0, ledge:null, ledgeT:0, ledgeCd:0, baseCh:null, baseSp:null, evoPre:false, dmgM:1, ult:0, ultReady:false, ultDef:null, ultF:{}, buff:0, haste:0, barrier:0, star:0, held:null, uses:0, giant:0, regen:0, jumpB:0, coyote:0, frozen:0, shiny:false, buf:{}, holdT:0, holdTarget:null, heldBy:null, stunT:0, dodgeV:0, lastRe:0, teled:false, teleDir:null, ghost:0,
    at:0, akey:'', ai:kind === 'cpu' ? { cool:.6, jc:0, react:.2, shT:0, hold:0 } : null, netIn:blank(), countered:false,
  };
}

// ================================================================ COMBAT : DÉGÂTS, BOUCLIER, GRAB
const TEAMCOL = ['#4aa8ff', '#ff5a5a'];
const tcol = f => (G.teamMode && f.team >= 0) ? TEAMCOL[f.team] : PCOL[f.idx];
const isFoe = (a, b) => a !== b && (a.team < 0 || b.team < 0 || a.team !== b.team || G.ff);
const vulnerable = f => f.state !== 'dead' && f.state !== 'spawn' && f.inv <= 0;

function launch(victim, att, dmg, base, gr, ang, dirSign, px, py, quiet) {
  if (victim.state === 'ledge') leaveLedge(victim);
  if (victim.barrier > 0) dmg *= .5;
  if (!quiet) { chargeBar(att, dmg * .6); chargeBar(victim, dmg * .4); }
  victim.pct += dmg;
  let kb = (base + victim.pct * gr) * (100 / victim.ch.weight);
  if (victim.barrier > 0) kb *= .7;
  if (victim.giant > 0) kb *= .78;
  victim.frozen = 0;
  const r = ang * Math.PI / 180;
  let vx = Math.cos(r) * dirSign * kb, vy = -Math.sin(r) * kb;
  if (victim.grounded && vy > 0) vy = -vy * .4;
  victim.vx = vx; victim.vy = vy; victim.grounded = false; victim.state = 'hurt'; victim.st = 0;
  victim.hurtT = clamp(kb / 1700, .16, .7); victim.move = null; victim.face = -dirSign; victim.heldBy = null; victim.lastHit = att.idx;
  if (quiet) { fxSparks(px, py, att.ch.color, 3, 180); return; }
  G.hitstop = Math.min(.11, .03 + dmg * .0045);
  fxShake(Math.min(10, dmg * .6 + kb / 220));
  fxSparks(px, py, '#ffffff', 8, 260); fxSparks(px, py, att.ch.color, 8, 200);
  fxSfx('hit:' + ultTypeOf(att.ch)); if (Math.random() < .55) fxSfx('cry:' + victim.ch.id + ':hurt');
}
function stunFoe(foe, t, frozen) {
  if (!['free', 'attack', 'shield', 'dodge', 'hurt', 'stun'].includes(foe.state)) return;
  foe.state = 'stun'; foe.st = 0; foe.stunT = t; foe.frozen = frozen ? t : 0; foe.move = null; foe.vx *= .3;
}
function shieldBreak(f) {
  f.state = 'stun'; f.st = 0; f.stunT = 2.2; f.vy = -520; f.grounded = false; f.vx = 0; f.shield = 0;
  fxSfx('break'); fxShake(8); fxSparks(f.x, f.y - f.ch.h / 2, '#9fd8ff', 24, 400);
}
const STATUS_OF_TYPE = { Feu:'burn', Électrik:'para', Glace:'freeze', Plante:'poison', Poison:'poison', Insecte:'poison', Spectre:'poison' };
function applyStatus(v, st) {
  if (!v || v.state === 'dead' || v.barrier > 0 || v.state === 'spawn') return;
  if (st === 'freeze') { stunFoe(v, 1.3, true); return; }
  v.status = st; v.statusT = st === 'burn' ? 5 : st === 'para' ? 4.5 : 7; v.statusTick = 0;
  fxText(v.x, v.y - v.ch.h - 22, st === 'burn' ? '🔥 Brûlé !' : st === 'para' ? '⚡ Paralysé !' : '☠️ Empoisonné !', st === 'burn' ? '#ff9a4a' : st === 'para' ? '#ffe84a' : '#c070ff');
}
function maybeStatus(att, v, chance) {
  const st = STATUS_OF_TYPE[ultTypeOf(att.ch)]; if (!st || att === v || Math.random() >= chance) return;
  applyStatus(v, st);
}
function applyHit(victim, att, dmg, base, gr, ang, dirSign, px, py, spec) {
  if (att.buff > 0) dmg *= 1.35;
  if (att.giant > 0) dmg *= 1.2;
  if (att.dmgM && att.dmgM !== 1) dmg *= att.dmgM;
  const m = victim.move;
  if (victim.state === 'attack' && m && m.kind === 'counter' && victim.mt >= m.win0 && victim.mt <= m.win1 && !att.countered) {
    victim.inv = .4; victim.mt = Math.max(victim.mt, m.dur * .75);
    att.countered = true;
    const d = Math.sign(att.x - victim.x) || victim.face;
    launch(att, victim, Math.max(10, dmg * 1.3), 280, 3.4, 40, d, att.x, att.y - att.ch.h / 2);
    att.countered = false; fxSparks(victim.x, victim.y - victim.ch.h / 2, '#ffffff', 16, 300);
    return;
  }
  if (victim.state === 'shield') {
    victim.shield -= dmg * 1.3 + 4;
    victim.vx += dirSign * 150; if (att.state === 'attack') att.vx -= dirSign * 90;
    fxSparks(px, py, '#9fd8ff', 6, 160); fxSfx('shield');
    if (victim.shield <= 0) shieldBreak(victim);
    return;
  }
  launch(victim, att, dmg, base, gr, ang, dirSign, px, py);
  maybeStatus(att, victim, spec ? .3 : .07);
}
function doThrow(f, key) {
  const v = f.holdTarget, t = THROWS[key];
  const mult = (f.buff > 0 ? 1.35 : 1) * (f.giant > 0 ? 1.2 : 1);
  const d = key === 'b' ? -f.face : f.face;
  v.state = 'free'; v.heldBy = null;
  launch(v, f, t.dmg * mult, t.base, t.gr, t.ang, d, v.x, v.y - v.ch.h / 2);
  f.holdTarget = null; f.state = 'attack'; f.move = f.ch.moves.throw; f.mname = 'throw'; f.mt = 0; f.st = 0; f.hitSet = new Set();
}
function releaseHold(f) {
  const v = f.holdTarget;
  if (v && v.state === 'grabbed') { v.state = 'free'; v.heldBy = null; v.st = 0; v.vx = -f.face * 160; v.inv = .25; }
  f.holdTarget = null; f.state = 'free'; f.st = 0; f.vx = f.face * -120;
}

// ================================================================ ATTAQUES
function startMove(f, m, name, inp) {
  f.charge = 0; f.cm = 1;
  f.state = 'attack'; f.move = m; f.mname = name; f.mt = 0; f.st = 0; f.hitSet = new Set(); f.fired = false; f.lastRe = 0; f.teled = false;
  if (m.cd) f.cds[name] = m.cd;
  if (Math.random() < .3 || m.cd) fxSfx('cry:' + f.ch.id + ':atk');
  if (m.impulse && !(m.impulse.air && f.grounded)) {
    f.vx = (m.impulse.vx || 0) * f.face; f.vy = m.impulse.vy; if (m.impulse.vy < 0) f.grounded = false;
  }
  if (name === 'ub') { if (!f.grounded) f.usedRec = true; fxSfx('upb'); }
  if (m.kind === 'teleport') {
    const dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    f.teleDir = dx ? { x:dx * .87, y:-.5 } : { x:0, y:-1 };
  }
  if (m.kind === 'blink') f.teleDir = { x:f.face, y:0 };
  if (m.kind === 'grab') fxSfx('grab');
}
function pickNormal(f, inp, dir, oldFace) {
  if (f.grounded) {
    if (inp.up) return 'utilt';
    if (inp.down) return 'dtilt';
    if (dir && Math.abs(f.vx) > f.ch.speed * .7) return 'dash';
    if (dir) return 'ftilt';
    return 'jab';
  }
  if (inp.up) return 'uair';
  if (inp.down) return 'dair';
  if (dir && dir === oldFace) return 'fair';
  if (dir && dir !== oldFace) return 'bair';
  return 'nair';
}
function spawnProj(f, p, vx, vy, extra) {
  const pr = Object.assign({ x:f.x + f.face * (f.ch.w / 2 + 6), y:p.low ? f.y - p.r - 2 : f.y - f.ch.h * .6, vx, vy, r:p.r, owner:f, life:p.life, max:p.life, p, dir:Math.sign(vx) || f.face }, extra || {});
  G.projs.push(pr); return pr;
}
function fireMove(f, m) {
  if (m.kind === 'proj') {
    const p = m.p; fxSfx('shoot');
    for (let i = 0; i < m.n; i++) {
      const a = (i - (m.n - 1) / 2) * (p.spread || 0);
      if (p.rain) spawnProj(f, p, f.face * (200 + i * 120), p.vy0);
      else spawnProj(f, p, f.face * Math.cos(a) * p.speed, Math.sin(a) * p.speed + (p.vy0 || 0));
    }
  } else if (m.kind === 'quake') {
    fxSfx('boom'); fxShake(5);
    for (const s of [-1, 1]) G.projs.push({ x:f.x + s * (f.ch.w / 2 + 8), y:f.y - m.p.r - 2, vx:s * m.p.speed, vy:0, r:m.p.r, owner:f, life:m.p.life, max:m.p.life, p:m.p, dir:s });
  } else if (m.kind === 'mine') {
    fxSfx('shoot');
    const mine = G.projs.filter(q => q.mine && q.owner === f);
    if (mine.length >= 2) mine[0].life = 0;
    spawnProj(f, m.p, 0, -120, { mine:true, x:f.x + f.face * (f.ch.w / 2 + 12), y:f.y - 20, life:m.p.life, max:m.p.life, still:false });
  }
}

function stepFighter(f, inp, dt) {
  const ch = f.ch;
  f.inv = Math.max(0, f.inv - dt); f.ledgeCd = Math.max(0, f.ledgeCd - dt); f.atkHold = inp.atk ? f.atkHold + dt : 0; f.st += dt; f.dropT = Math.max(0, f.dropT - dt); f.fast = false;
  for (const k in f.cds) f.cds[k] = Math.max(0, f.cds[k] - dt);
  if (SET.game.evo !== 'off' && G.hitstop <= 0 && ['free', 'hurt', 'attack', 'shield', 'stun', 'dodge'].includes(f.state)) {
    const e = evoInfo(f);
    if (e) {
      if (!f.evoPre && f.pct >= e.thr - 25) { f.evoPre = true; e.next.slice(0, 3).forEach(i => void loadSprites(CHARS[i], f.shiny)); }
      if (f.pct >= e.thr) { evolveFighter(f, e.next[Math.floor(Math.random() * e.next.length)]); f.evoPre = false; }
    }
  }
  f.buff = Math.max(0, f.buff - dt); f.haste = Math.max(0, f.haste - dt); f.barrier = Math.max(0, f.barrier - dt);
  f.giant = Math.max(0, f.giant - dt); f.jumpB = Math.max(0, f.jumpB - dt); f.regen = Math.max(0, f.regen - dt);
  if (f.regen > 0) f.pct = Math.max(0, f.pct - 1.6 * dt);
  // tampon d'entrées : une touche pressée en fin d'action est jouée dès que le personnage est libre (combats plus nerveux)
  const late = (f.state === 'attack' && f.move && f.mt > f.move.dur * .35) || (f.state === 'hurt' && f.st > f.hurtT * .55) || f.state === 'dodge';
  for (const e of EDGES) { if (inp[e] && late) f.buf[e] = .14; else if (f.buf[e] > 0) f.buf[e] -= dt; }
  if (f.state === 'free') for (const e of EDGES) if (f.buf[e] > 0) { inp[e] = true; f.buf[e] = 0; }
  if (f.star > 0) { f.star -= dt; f.inv = Math.max(f.inv, .05); }
  if (f.status) {
    f.statusT -= dt; f.statusTick += dt;
    if (f.status === 'burn') f.pct += 2.4 * dt; else if (f.status === 'poison') f.pct = Math.min(f.pct + 1.7 * dt, Math.max(f.pct, 120));
    else if (f.status === 'para' && f.state === 'free' && Math.random() < .45 * dt) stunFoe(f, .28, false);
    if (f.statusT <= 0) f.status = null;
  }
  if (f.state !== 'shield') f.shield = Math.min(100, f.shield + 14 * dt);
  f.ghost = 0;

  switch (f.state) {
    case 'dead':
      f.dead -= dt; if (f.dead <= 0 && f.stocks > 0) respawn(f); return;
    case 'spawn':
      f.vx = f.vy = 0; f.y = G.stage.rY;
      if (f.st > 1.4 || inp.pAttack || inp.pSpecial || inp.pJump || inp.pLeft || inp.pRight) { f.state = 'free'; f.st = 0; }
      return;
    case 'grabbed':
      if (EDGES.some(e => inp[e]) && f.heldBy) f.heldBy.holdT -= .14;
      return;
    case 'hold': {
      const v = f.holdTarget;
      if (!v || v.state !== 'grabbed' || v.heldBy !== f) { f.holdTarget = null; f.state = 'free'; f.st = 0; break; }
      v.x = f.x + f.face * (f.ch.w / 2 + v.ch.w / 2 + 4); v.y = f.y; v.vx = v.vy = 0; v.face = -f.face; v.grounded = true;
      f.holdT -= dt; f.vx = 0;
      if (f.holdT <= 0) { releaseHold(f); break; }
      if (inp.pAttack) { v.pct += 1.5; fxSparks(v.x, v.y - v.ch.h / 2, '#ffffff', 4, 120); fxSfx('hit'); }
      else if (f.st > .3) {
        const fw = (f.face > 0 ? inp.right : inp.left), bk = (f.face > 0 ? inp.left : inp.right);
        if (inp.up) doThrow(f, 'u'); else if (inp.down) doThrow(f, 'd'); else if (fw) doThrow(f, 'f'); else if (bk) doThrow(f, 'b');
      }
      break;
    }
    case 'hurt':
      f.vx = approach(f.vx, 0, (f.grounded ? 900 : 120) * dt);
      if (f.st >= f.hurtT) { f.state = 'free'; f.st = 0; }
      break;
    case 'stun':
      f.vx = approach(f.vx, 0, 600 * dt); f.stunT -= dt; f.frozen = Math.max(0, f.frozen - dt);
      if (f.stunT <= 0) { f.state = 'free'; f.st = 0; f.shield = 40; }
      break;
    case 'dodge':
      f.vx = f.dodgeV; f.inv = Math.max(f.inv, .05);
      if (f.st >= .34) { f.state = 'free'; f.st = 0; f.vx = 0; }
      break;
    case 'shield':
      f.vx = approach(f.vx, 0, 3000 * dt); f.shield -= 22 * dt;
      if (inp.pAttack) { startMove(f, ch.moves.grab, 'grab', inp); break; }
      if (inp.pJump) { f.state = 'free'; f.vy = -ch.jump; f.grounded = false; fxSfx('jump'); break; }
      if (inp.pLeft || inp.pRight) { f.state = 'dodge'; f.st = 0; f.dodgeV = (inp.pRight ? 1 : -1) * 340; f.inv = .34; break; }
      if (inp.pDown) { f.state = 'dodge'; f.st = 0; f.dodgeV = 0; f.inv = .34; break; }
      if (f.shield <= 0) shieldBreak(f); else if (!inp.shield) { f.state = 'free'; f.st = 0; }
      break;
    case 'free': stepFree(f, inp, dt); break;
    case 'attack': stepAttack(f, inp, dt); break;
    case 'ledge': stepLedge(f, inp, dt); if (f.state === 'ledge') return; break;
  }
  physics(f, dt);
}

function leaveLedge(f) {
  const L = f.ledge; if (!L) return;
  if (L.side < 0 && L.p.ledgeL === f) L.p.ledgeL = null; if (L.side > 0 && L.p.ledgeR === f) L.p.ledgeR = null;
  f.ledge = null;
}
function tryLedge(f) {                               // s'accroche au rebord d'une plateforme principale en tombant
  if (f.ledgeCd > 0 || f.grounded || f.vy < 0 || f.state !== 'free') return false;
  for (const p of G.plats) {
    if (p.soft) continue;
    const Lf = f.x > p.x - 42 && f.x < p.x + 8, Rt = f.x > p.x + p.w - 8 && f.x < p.x + p.w + 42;
    if (!(Lf || Rt) || f.y < p.y + 2 || f.y > p.y + 120) continue;
    const side = Lf ? -1 : 1, occ = side < 0 ? p.ledgeL : p.ledgeR;
    if (occ && occ !== f && occ.state === 'ledge') continue;
    if (side < 0) p.ledgeL = f; else p.ledgeR = f;
    f.state = 'ledge'; f.ledge = { p, side }; f.st = 0; f.ledgeT = 0; f.vx = f.vy = 0; f.face = -side; f.airJumps = f.ch.air; f.usedRec = false; f.inv = Math.max(f.inv, .9);
    f.fast = false; fxSfx('grab'); fxSparks(f.x, p.y + 4, '#ffffff', 6, 120); statLedge(f);
    return true;
  }
  return false;
}
function stepLedge(f, inp, dt) {
  const L = f.ledge, p = L && L.p; if (!p) { f.state = 'free'; return; }
  f.vx = f.vy = 0; f.ledgeT += dt; f.grounded = false;
  f.x = p.x + (L.side < 0 ? -f.ch.w * .15 : p.w + f.ch.w * .15); f.y = p.y + f.ch.h * .95;
  if (f.ledgeT < 1.2) f.inv = Math.max(f.inv, .05);
  const side = L.side, toward = side < 0 ? inp.right : inp.left, away = side < 0 ? inp.left : inp.right;
  const climb = atk => {
    leaveLedge(f); f.x = p.x + (side < 0 ? 38 : p.w - 38); f.y = p.y; f.grounded = true; f.plat = p; f.face = -side; f.inv = Math.max(f.inv, atk ? .45 : .55); f.state = 'free'; f.st = 0; f.ledgeCd = .5;
    fxSparks(f.x, f.y, '#ffffff', 8, 160);
    if (atk) startMove(f, f.ch.moves.ftilt, 'ftilt', inp);
  };
  if (inp.pAttack) climb(true);
  else if (inp.pJump && !inp.up && !toward) { leaveLedge(f); f.state = 'free'; f.st = 0; f.vy = -f.ch.jump; f.vx = -side * 120; f.grounded = false; f.ledgeCd = .5; f.inv = Math.max(f.inv, .3); fxSfx('jump'); }
  else if (inp.up || inp.pJump || toward) climb(false);
  else if (inp.down || away || f.ledgeT > 3.4) { leaveLedge(f); f.state = 'free'; f.st = 0; f.ledgeCd = .6; f.inv = Math.max(f.inv, .12); }
}
function stepFree(f, inp, dt) {
  if (tryLedge(f)) return;
  if (f.cm !== 1) { f.cm = 1; f.charge = 0; }
  const ch = f.ch, dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0), oldFace = f.face;
  if (dir && !(inp.pAttack && !f.grounded)) f.face = dir;
  const spd = ch.speed * (f.buff > 0 ? 1.12 : 1) * (f.haste > 0 ? 1.35 : 1) * (f.status === 'para' ? .55 : 1) * (f.spdM || 1);
  if (dir) f.vx = approach(f.vx, dir * spd, (f.grounded ? 2600 : 1100) * dt);
  else f.vx = approach(f.vx, 0, (f.grounded ? 2200 : 300) * dt);
  if (inp.shield && f.grounded && f.shield > 8 && !f.noShield) { f.state = 'shield'; f.st = 0; fxSfx('shield'); return; }
  if (inp.pJump) {
    if (f.grounded || f.coyote > 0) { f.vy = -ch.jump * (f.haste > 0 ? 1.08 : 1); f.grounded = false; f.coyote = 0; fxSfx('jump'); fxSparks(f.x, f.y, '#ffffff', 4, 90); }
    else if (f.airJumps > 0) { f.airJumps--; f.vy = -ch.jump * .9; fxSfx('jump'); fxSparks(f.x, f.y, '#ffffff', 6, 120); }
  }
  if (inp.pDown && f.grounded && f.onSoft) { f.dropT = .25; f.grounded = false; f.y += 3; }
  if (inp.down && !f.grounded && f.vy > 0) f.fast = true;
  if (inp.pGrab && f.grounded && !f.held) { startMove(f, ch.moves.grab, 'grab', inp); return; }
  if (inp.pAttack && f.held) {
    const it = ITEMS[f.held];
    if (it.kind === 'throw') { throwItem(f, inp); return; }
    const w = f.held; if (--f.uses <= 0) f.held = null;
    startMove(f, ch.moves[w], w, inp); return;
  }
  if (inp.pAttack) { const n = pickNormal(f, inp, dir, oldFace); startMove(f, ch.moves[n], n, inp); }
  else if (inp.pSpecial && !f.noSpecial) {
    let slot = 'nb';
    if (inp.up) slot = 'ub'; else if (inp.down) slot = 'db'; else if (dir) slot = 'sb';
    if (slot === 'nb' && f.ultReady) { startUlt(f); return; }
    if (slot === 'ub') { if (!(f.grounded || !f.usedRec)) slot = null; }
    else if (f.cds[slot] > 0) slot = null;
    if (slot) { if (slot === 'sb') f.face = dir; startMove(f, ch.moves[slot], slot, inp); }
  }
}

function stepAttack(f, inp, dt) {
  const m = f.move, ch = f.ch;
  if (m.chg && f.mt >= m.hs * .45 && f.mt < m.hs * .9 && inp.atk && f.charge < 1 && f.grounded) {   // attaque maintenue : le coup se fige puis se charge
    if (f.atkHold >= .14) { f.charge = Math.min(1, f.charge + dt / .85); f.cm = 1 + .65 * f.charge; if (Math.random() < .35) fxSparks(f.x + f.face * 14, f.y - f.ch.h / 2, f.charge > .9 ? '#ff5a3a' : '#ffe45a', 1, 120); }
    f.vx = approach(f.vx, 0, 2400 * dt);
    return;
  }
  f.mt += dt;
  if (m.kind === 'ult') {
    f.vx = 0; f.inv = Math.max(f.inv, .1); if (!f.grounded) f.vy = -GRAV * dt;
    ultTick(f, dt); if (f.mt >= m.dur) { f.state = 'free'; f.move = null; f.st = 0; }
    return;
  }
  if (m.lunge && f.mt < m.lunge.t1) f.vx = f.face * m.lunge.vx;
  else if (m.climb && f.mt < m.climb.t1) f.vy = m.climb.vy;
  else if (m.kind === 'flap') { const d = (inp.right ? 1 : 0) - (inp.left ? 1 : 0); f.vx = approach(f.vx, d * ch.speed, 900 * dt); }
  else if (m.kind === 'glide') { const d = (inp.right ? 1 : 0) - (inp.left ? 1 : 0); f.vx = approach(f.vx, d * ch.speed * 1.15, 1500 * dt); if (f.mt > .12 && f.vy > 50) f.vy = 50; if (d) f.face = d; }
  else f.vx = f.grounded ? approach(f.vx, 0, 2400 * dt) : approach(f.vx, 0, 140 * dt);

  if (m.kind === 'teleport' || m.kind === 'blink') {
    if (f.mt >= m.invA && f.mt <= m.invB) f.inv = Math.max(f.inv, .05);
    f.ghost = f.mt < m.tele ? 1 : (f.mt < m.invB ? 2 : 0);
    if (!f.teled && f.mt >= m.tele) {
      f.teled = true; fxSparks(f.x, f.y - ch.h / 2, ch.color, 12, 260);
      f.x = clamp(f.x + f.teleDir.x * m.dist, G.stage.bounds.l + 80, G.stage.bounds.r - 80); f.y += f.teleDir.y * m.dist; f.vx = 0; f.vy = m.kind === 'blink' ? 0 : -100;
      fxSparks(f.x, f.y - ch.h / 2, ch.color, 12, 260);
    }
  }
  if (!f.fired && m.fire !== undefined && f.mt >= m.fire) { f.fired = true; fireMove(f, m); }
  if (m.kind === 'heal' && !f.fired && f.mt >= .3) { f.fired = true; f.pct = Math.max(0, f.pct - 12); fxSparks(f.x, f.y - ch.h / 2, '#7affa0', 22, 220); fxSfx('item'); fxText(f.x, f.y - ch.h - 20, '💚 -12 %', '#9affb0'); }
  if (m.kind === 'boost' && !f.fired && f.mt >= .2) { f.fired = true; f.buff = m.buff; fxSparks(f.x, f.y - ch.h / 2, ch.color, 24, 300); fxSfx('upb'); }

  if (m.hs !== undefined && f.mt >= m.hs && f.mt <= m.he) {
    if (m.rehit && f.mt - f.lastRe >= m.rehit) { f.hitSet.clear(); f.lastRe = f.mt; }
    const b = m.box, bx = f.face > 0 ? f.x + b.x : f.x - b.x - b.w, A = { x:bx, y:f.y + b.y, w:b.w, h:b.h };
    for (const foe of G.fighters) {
      if (foe === f || f.hitSet.has(foe) || !isFoe(f, foe)) continue;
      if (m.kind === 'grab') {
        if (['dead','spawn','grabbed','hold','dodge'].includes(foe.state) || foe.inv > 0 || !overlap(A, bodyRect(foe))) continue;
        f.hitSet.add(foe); f.state = 'hold'; f.holdTarget = foe; f.holdT = 1.3 + foe.pct * .012; f.st = 0; f.vx = 0;
        foe.state = 'grabbed'; foe.heldBy = f; foe.move = null; foe.vx = foe.vy = 0; fxSfx('grab');
        break;
      }
      if (!vulnerable(foe) || !overlap(A, bodyRect(foe))) continue;
      f.hitSet.add(foe);
      const ds = (m.flip ? -f.face : f.face), rad = (m.kind === 'slam') ? (Math.sign(foe.x - f.x) || f.face) : ds;
      applyHit(foe, f, m.dmg * f.cm, m.base * (1 + (f.cm - 1) * .8), m.gr, m.ang, rad, A.x + A.w / 2, A.y + A.h / 2, !!m.kind);
    }
    if (G.ball && m.kind !== 'grab' && !f.hitSet.has('ball') && overlap(A, { x:G.ball.x - 30, y:G.ball.y - 30, w:60, h:60 })) { f.hitSet.add('ball'); hitBall(f); }
  }
  if (f.state === 'attack') {
    if (m.next && f.grounded && f.mt >= m.he && (f.buf.pAttack > 0 || inp.pAttack)) { f.buf.pAttack = 0; startMove(f, ch.moves[m.next], m.next, inp); return; }
    if (m.cancel && f.hitSet && f.hitSet.size && f.mt > m.he && (inp.pJump || inp.pSpecial || inp.pGrab)) { f.state = 'free'; f.move = null; f.st = 0; stepFree(f, inp, dt); return; }
    if (f.mt >= m.dur) { f.state = 'free'; f.move = null; f.st = 0; }
  }
}

function respawn(f) {
  f.state = 'spawn'; f.st = 0; f.x = G.stage.spawn[0]; f.y = G.stage.rY; f.vx = f.vy = 0; f.pct = 0;
  f.inv = 2.6; f.airJumps = f.ch.air; f.usedRec = false; f.grounded = false; f.shield = 100; f.buff = f.haste = f.barrier = f.star = f.giant = f.regen = f.jumpB = f.frozen = 0; f.held = null; f.move = null; f.status = null; f.charge = 0; f.cm = 1; f.ledge = null;
}
function ko(f) {
  repMark('ko', f); statKo(f); fxSfx('cry:' + f.ch.id + ':ko');
  f.stocks--; fxSfx('ko'); fxShake(14);
  const bd = G.stage.bounds, sx = clamp(f.x, bd.l, bd.r), sy = clamp(f.y, bd.t, bd.b);
  fxSparks(sx, sy, '#ffffff', 30, 520); fxSparks(sx, sy, f.ch.color, 30, 420);
  if (f.heldBy && f.heldBy.holdTarget === f) { f.heldBy.holdTarget = null; f.heldBy.state = 'free'; }
  if (f.holdTarget) { const v = f.holdTarget; if (v.state === 'grabbed') { v.state = 'free'; v.heldBy = null; } f.holdTarget = null; }
  if (f.state === 'ledge') leaveLedge(f);
  f.status = null; f.charge = 0; f.cm = 1;
  f.state = 'dead'; f.st = 0; f.dead = 1.1; f.vx = f.vy = 0; f.move = null; f.ultReady = false; f.ult = 0;
  if (f.ch !== f.baseCh && f.baseCh) revertEvo(f);
  const aliveN = G.fighters.filter(x => x.stocks > 0);
  if (G.horde) { hordeKo(f); return; }
  if (G.teamMode) {
    const teams = new Set(aliveN.map(x => x.team));
    if (teams.size <= 1 && G.winner < 0) { G.winner = aliveN.length ? aliveN[0].idx : f.idx; G.winTeam = aliveN.length ? aliveN[0].team : f.team; G.endT = 1.6; }
  } else if (aliveN.length <= 1 && G.winner < 0 && G.fighters.length > 1) { G.winner = aliveN.length ? aliveN[0].idx : f.idx; G.endT = 1.6; }
}

function physics(f, dt) {
  const prevY = f.y;
  if (f.grounded && f.plat && f.plat.dx) f.x += f.plat.dx;
  f.vy += GRAV * (G.gravM || 1) * dt * (f.state === 'hurt' ? .8 : 1);
  const maxFall = f.fast ? 900 : 640;
  if (f.state !== 'hurt' && f.state !== 'attack' && f.vy > maxFall) f.vy = maxFall;
  if (f.state === 'attack' && f.vy > 900) f.vy = 900;
  f.x += f.vx * dt; f.y += f.vy * dt;
  f.grounded = false; f.onSoft = false; f.plat = null;
  if (f.vy >= 0) {
    for (const p of G.plats) {
      if (p.soft && f.dropT > 0) continue;
      if (f.x > p.x - 6 && f.x < p.x + p.w + 6 && prevY <= p.y + 1 && f.y >= p.y) {
        f.y = p.y; f.vy = 0; f.grounded = true; f.onSoft = p.soft; f.plat = p; break;
      }
    }
  }
  if (f.grounded) { f.airJumps = f.ch.air + (f.jumpB > 0 ? 2 : 0); f.usedRec = false; f.coyote = .1; } else f.coyote = Math.max(0, f.coyote - dt);
  const bd = G.stage.bounds;
  if (f.x < bd.l || f.x > bd.r || f.y > bd.b || f.y < bd.t) ko(f);
}


// ================================================================ OBJETS
const ITEM_INTERVAL = { off:0, rare:20, normal:11, frequent:5 };
function pickItemType() {
  const ks = ITEM_KEYS.filter(k => SET.game.itemTypes[k] !== false);
  if (!ks.length) return null;
  let tot = 0; for (const k of ks) tot += ITEMS[k].w;
  let r = Math.random() * tot; for (const k of ks) { r -= ITEMS[k].w; if (r <= 0) return k; }
  return ks[0];
}
function spawnItem() {
  const type = pickItemType(); if (!type) return;
  const ps = G.plats.filter(p => p.w > 120), p = ps[Math.floor(Math.random() * ps.length)];
  G.items.push({ x:p.x + 30 + Math.random() * (p.w - 60), y:G.stage.bounds.t + 200, vy:0, type, life:22, landed:false, plat:null });
  fxSfx('ui');
}
function pickupItem(f, it) {
  const d = ITEMS[it.type];
  if (d.kind === 'throw' || d.kind === 'wield') { if (f.held) return false; f.held = it.type; f.uses = d.uses || 0; }
  else {
    switch (it.type) {
      case 'heal':    f.pct = Math.max(0, f.pct - 25); f.status = null; break;
      case 'maxheal': f.pct = Math.max(0, f.pct - 60); break;
      case 'power':   f.buff = 12; break;
      case 'speed':   f.haste = 10; break;
      case 'star':    f.star = 6; break;
      case 'barrier': f.barrier = 10; break;
      case 'heart':   if (f.stocks < f.maxStocks + 1) { f.stocks++; f.maxStocks = Math.max(f.maxStocks, f.stocks); } break;
      case 'mushroom': f.giant = 10; break;
      case 'regen':   f.regen = 8; f.status = null; break;
      case 'jumps':   f.jumpB = 15; f.airJumps += 2; break;
      case 'bolt':    for (const o of G.fighters) if (isFoe(f, o) && vulnerable(o)) { o.pct += 7; stunFoe(o, .9, false); fxSparks(o.x, o.y - o.ch.h / 2, '#fff36a', 18, 360); } fxShake(8); break;
      case 'meteor':  G.rain = { t:3.2, k:0, owner:f }; break;
    }
  }
  fxSfx('item'); fxSparks(f.x, f.y - f.ch.h / 2, '#ffe45a', 14, 260); fxText(f.x, f.y - f.ch.h - 30, d.emoji + ' ' + d.text, '#ffffff');
  return true;
}
function updateItems() {
  updateBall();
  const im = G.itemsMode || SET.game.items, freq = ITEM_INTERVAL[im] || 0, bd = G.stage.bounds;
  if (freq) {
    G.itemT -= DT;
    if (G.itemT <= 0) { if (G.items.length < (im === 'frequent' ? 5 : 3)) spawnItem(); G.itemT = freq * (.7 + Math.random() * .6); }
  }
  for (const it of G.items) {
    if (!it.landed) {
      it.vy = Math.min(560, it.vy + 900 * DT); const py = it.y; it.y += it.vy * DT;
      for (const p of G.plats) if (it.x > p.x && it.x < p.x + p.w && py <= p.y + 1 && it.y >= p.y) { it.y = p.y; it.landed = true; it.plat = p; break; }
      if (it.y > bd.b) it.life = 0;
    } else { if (it.plat) it.x += it.plat.dx; it.life -= DT; }
    if (it.life > 0) for (const f of G.fighters) {
      if (['dead', 'spawn', 'grabbed', 'hold'].includes(f.state)) continue;
      if (overlap({ x:it.x - 16, y:it.y - 34, w:32, h:34 }, bodyRect(f)) && pickupItem(f, it)) { it.life = 0; break; }
    }
  }
  G.items = G.items.filter(it => it.life > 0);
  for (const t of G.texts) { t.life -= DT; t.y -= 26 * DT; }
  G.texts = G.texts.filter(t => t.life > 0);
  if (G.rain) {
    G.rain.t -= DT; G.rain.k -= DT;
    if (G.rain.k <= 0) {
      G.rain.k = .2; const cx = G.fighters.length ? G.fighters[Math.floor(Math.random() * G.fighters.length)].x : 0, x = cx + (Math.random() - .5) * 700;
      G.projs.push({ x, y:bd.t + 80, vx:(Math.random() - .5) * 60, vy:700, r:17, owner:G.rain.owner, life:3, max:3, dir:1, p:{ color:'#ff8a3a', dmg:9, base:230, gr:3, ang:-60, life:3, grav:500 } });
    }
    if (G.rain.t <= 0) G.rain = null;
  }
}
function throwItem(f, inp) {
  const kind = f.held, dir = f.face; f.held = null;
  let vx = dir * 480, vy = -260;
  if (inp.up) { vx = dir * 120; vy = -720; } else if (inp.down) { vx = dir * 50; vy = 0; }
  G.projs.push({ x:f.x + dir * (f.ch.w / 2 + 6), y:f.y - f.ch.h * .6, vx, vy, r:11, owner:f, life:kind === 'banana' ? 12 : 6, max:12, dir,
                 p:{ color:kind === 'bomb' ? '#333' : '#ff5a5a', dmg:0, base:0, gr:0, ang:0, grav:0 }, item:kind, arm:.12, fuse:0, still:false, plat:null });
  f.state = 'attack'; f.move = f.ch.moves.throw; f.mname = 'throw'; f.mt = 0; f.st = 0; f.hitSet = new Set(); fxSfx('shoot');
}
function explodeItem(p) {
  const o = p.owner;
  fxSparks(p.x, p.y, '#ffcc66', 30, 480); fxSparks(p.x, p.y, '#ffffff', 12, 300); fxShake(9); fxSfx('boom');
  if (p.item === 'bomb') {
    for (const foe of G.fighters) {
      if (!isFoe(o, foe) || !(vulnerable(foe) || (foe.state === 'shield' && foe.inv <= 0))) continue;
      const b = bodyRect(foe), cx = clamp(p.x, b.x, b.x + b.w), cy = clamp(p.y, b.y, b.y + b.h);
      if ((p.x - cx) ** 2 + (p.y - cy) ** 2 <= 95 * 95) applyHit(foe, o, 14, 300, 3.8, 55, Math.sign(foe.x - p.x) || 1, p.x, p.y);
    }
  } else {
    const spec = { color:'#ffd93b', speed:430, r:10, dmg:7, base:220, gr:2.6, ang:45, life:.7, grav:0 };
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, cs = Math.cos(a);
      G.projs.push({ x:p.x, y:p.y - 14, vx:cs * spec.speed, vy:Math.sin(a) * spec.speed, r:spec.r, owner:o, life:spec.life, max:spec.life, p:spec, dir:cs >= 0 ? 1 : -1 });
    }
  }
}


// ================================================================ ATTAQUES ULTIMES : jauge Smash, Boule Smash, dangers
const ultBarOn = () => SET.game.smash === 'both' || SET.game.smash === 'bar';
const ultBallOn = () => SET.game.smash === 'both' || SET.game.smash === 'ball';
function chargeBar(f, amt) {
  if (!ultBarOn() || f.ultReady || amt <= 0 || (f.state === 'attack' && f.mname === 'ult')) return;
  f.ult = Math.min(100, f.ult + amt);
  if (f.ult >= 100) readyUlt(f);
}
function readyUlt(f) {
  f.ult = 100; f.ultReady = true; fxSfx('item'); fxSparks(f.x, f.y - f.ch.h / 2, '#ffe45a', 26, 380);
  fxText(f.x, f.y - f.ch.h - 30, '⭐ SMASH PRÊT : spécial neutre !', '#ffe45a');
}
function startUlt(f) {
  repMark('ult', f); statUlt(f); fxSfx('cry:' + f.ch.id + ':ult');
  const u = ultOf(f.ch);
  f.ultDef = u; f.ultReady = false; f.ult = 0; f.ultF = {}; f.state = 'attack'; f.move = { kind:'ult', dur:u.dur, anim:['Charge','Attack','Strike','Pose'] };
  f.mname = 'ult'; f.mt = 0; f.st = 0; f.hitSet = new Set(); f.inv = Math.max(f.inv, u.dur + .8); f.vx = 0; f.vy = 0;
  G.hitstop = .9; G.cine = { t:.9, max:.9, name:u.name, color:u.color, idx:f.idx, who:f.ch.name };
  fxSfx('ult'); if (G.net === 'host') netEvents.push(['ci', u.name, u.color, f.idx, f.ch.name]);
}
const foesOf = f => G.fighters.filter(o => isFoe(f, o) && o.state !== 'dead' && o.stocks > 0);
function addHaz(o) {
  const h = Object.assign({ kind:'beam', x:0, y:0, w:100, h:100, vx:0, vy:0, life:1, t:0, age:0, delay:0, dmg:4, base:120, gr:1, ang:45, rehit:.14, hit:{}, hitAt:{}, push:0, pull:0, lift:false,
                            radial:false, ring:false, r0:0, r1:0, follow:false, face:1, fin:null, color:'#fff', owner:null }, o);
  G.hazards.push(h); return h;
}
function ultProj(f, x, y, vx, vy, p) { G.projs.push({ x, y, vx, vy, r:p.r, owner:f, life:p.life, max:p.life, dir:vx >= 0 ? 1 : -1, p }); }
function ultTick(f, dt) {
  const u = f.ultDef, t = f.mt;
  if (u.dark && !f.ultF.dk) { f.ultF.dk = 1; G.darkT = u.dur; if (G.net === 'host') netEvents.push(['dk', u.dur]); }
  if (u.parts) u.parts.forEach((pt, i) => { if (t >= pt.at) runEngine(f, Object.assign({}, u, pt, { dur:pt.dur || (u.dur - pt.at) }), t - pt.at, (f.ultF['p' + i] = f.ultF['p' + i] || {}), dt); });
  else runEngine(f, u, t, f.ultF, dt);
}
function runEngine(f, u, t, F, dt) {
  const bd = G.stage.bounds, foes = foesOf(f);
  const mx = foes.length ? foes.reduce((a, o) => a + o.x, 0) / foes.length : f.x;
  const times = (arr, key) => { F[key] = F[key] || 0; let n = 0; while (F[key] < arr.length && t >= arr[F[key]]) { F[key]++; n++; } return n; };
  switch (u.e) {
    case 'sweep':
      if (!F.a) { F.a = 1; addHaz({ kind:'flame', follow:true, w:950, h:110, life:1.9, dmg:3.5, base:140, gr:1.2, ang:25, rehit:.12, push:300 * f.face, face:f.face, color:u.color, owner:f, fin:{ dmg:9, base:430, gr:4, ang:28 } }); fxShake(6); fxSfx('boom'); }
      break;
    case 'tide':
      if (!F.a) { F.a = 1; addHaz({ kind:'wave', x:f.face > 0 ? f.x - 400 : f.x + 60, y:f.y - 330, w:340, h:340, vx:f.face * 560, life:2.3, dmg:3.8, base:140, gr:1.3, ang:45, rehit:.15, push:f.face * 560, face:f.face, color:u.color, owner:f, fin:{ dmg:10, base:440, gr:4, ang:40 } }); fxShake(6); fxSfx('boom'); }
      if (!F.b && t > 1.1) { F.b = 1; addHaz({ kind:'wave', x:f.x + f.face * 900, y:f.y - 330, w:340, h:340, vx:-f.face * 560, life:2.0, dmg:3.8, base:140, gr:1.3, ang:45, rehit:.15, push:-f.face * 560, face:-f.face, color:u.color, owner:f, fin:{ dmg:10, base:440, gr:4, ang:40 } }); fxShake(6); }
      break;
    case 'vines':
      for (let k = times([.1, .9, 1.7], 'i'); k > 0; k--) for (const o of foes) addHaz({ kind:'vine', delay:.45, x:o.x - 46, w:92, y:o.y - 390, h:400, life:.55, dmg:7, base:300, gr:3.2, ang:85, rehit:.9, color:u.color, owner:f });
      break;
    case 'strike':
      for (let k = times([.1, .65, 1.2, 1.75], 'i'); k > 0; k--) for (const o of foes) addHaz({ kind:'bolt', delay:.4, x:o.x - 36, w:72, y:bd.t, h:o.y + 70 - bd.t, life:.22, dmg:8, base:320, gr:3.4, ang:80, rehit:.9, color:u.color, owner:f });
      break;
    case 'rain':
      if (t > .15 && t < u.dur - .5) { F.acc = (F.acc || 0) + dt; while (F.acc >= .055) { F.acc -= .055; const p = { color:u.color, dmg:u.rock ? 8 : 6, base:u.rock ? 250 : 210, gr:2.8, ang:-55, life:3.2, grav:600, r:u.rock ? 22 : 15 }; const tg = foes.length && Math.random() < .75 ? foes[Math.floor(Math.random() * foes.length)].x : mx; ultProj(f, tg + (Math.random() - .5) * (foes.length && tg !== mx ? 240 : 1300), bd.t + 60, (Math.random() - .5) * 60, 560 + Math.random() * 350, p); } }
      if (t > .15 && Math.floor(t * 8) !== F.sk) { F.sk = Math.floor(t * 8); fxShake(3); }
      break;
    case 'quake':
      for (let k = times([.25, .95, 1.65], 'i'); k > 0; k--) { fxShake(11); fxSfx('boom'); for (const s of [-1, 1]) ultProj(f, f.x + s * 30, f.y - 26, s * 680, 0, { color:u.color, dmg:10, base:280, gr:3.4, ang:72, life:1.4, grav:0, r:26 }); }
      if (t > .2 && t < 2.0) { F.acc = (F.acc || 0) + dt; while (F.acc >= .12) { F.acc -= .12; ultProj(f, mx + (Math.random() - .5) * 1100, bd.t + 60, 0, 600 + Math.random() * 200, { color:'#b08a5a', dmg:6, base:200, gr:2.4, ang:-55, life:3, grav:500, r:18 }); } }
      break;
    case 'blast':
      if (t < .55 && Math.random() < .5) fxSparks(f.x + f.face * 24, f.y - f.ch.h / 2, u.color, 2, 220);
      if (!F.a && t >= .55) { F.a = 1; addHaz({ kind:'beam', follow:true, w:u.len, h:u.hh, life:1.35, dmg:4, base:130, gr:1, ang:15, rehit:.1, push:120 * f.face, face:f.face, color:u.color, owner:f, fin:{ dmg:14, base:520, gr:4.4, ang:25 } }); fxShake(9); fxSfx('boom'); }
      break;
    case 'nova': {
      const n = u.n, ts = []; for (let i = 0; i < n; i++) ts.push(.15 + i * u.gap);
      for (let k = times(ts, 'i'); k > 0; k--) {
        const last = F.i >= n; fxShake(8); fxSfx('boom');
        addHaz({ kind:'ring', ring:true, radial:true, x:f.x, y:f.y - f.ch.h / 2, r0:40, r1:u.r1, life:.5, dmg:last ? 12 : (n > 3 ? 5.5 : 6.5), base:last ? 470 : 200, gr:last ? 4.4 : 2.4, ang:last ? 38 : 50, rehit:2, color:u.color, owner:f });
      }
      if (u.heal && !F.h && t > u.dur - .5) { F.h = 1; f.pct = Math.max(0, f.pct - u.heal); fxSparks(f.x, f.y - f.ch.h / 2, '#9affb0', 24, 260); fxText(f.x, f.y - f.ch.h - 20, '💚 -' + u.heal + ' %', '#9affb0'); }
      break;
    }
    case 'swarm':
      if (t > .15 && t < 1.35) { F.acc = (F.acc || 0) + dt; while (F.acc >= .08) { F.acc -= .08; const a = Math.random() * Math.PI * 2; ultProj(f, f.x + Math.cos(a) * 70, f.y - f.ch.h / 2 + Math.sin(a) * 70, Math.cos(a) * 240, Math.sin(a) * 240, { color:u.color, speed:520, r:12, dmg:5, base:190, gr:2.4, ang:45, life:2.7, grav:0, home:true }); fxSparks(f.x, f.y - f.ch.h / 2, u.color, 2, 160); } }
      break;
    case 'storm':
      if (!F.a && t > .15) { F.a = 1; fxSfx('boom'); for (const s of [-1, 1]) addHaz({ kind:'vortex', x:s * 700 - 70, y:f.y - 430, w:140, h:460, vx:-s * 300, life:3.0, dmg:3, base:150, gr:1, ang:80, rehit:.16, pull:280, lift:true, color:u.color, owner:f, fin:{ dmg:8, base:380, gr:3.6, ang:70 } }); }
      break;
  }
}
function updateHazards() {
  for (const h of G.hazards) {
    h.age += DT;
    if (h.delay > 0) { h.delay -= DT; continue; }
    if (h.follow && h.owner) { h.x = h.face > 0 ? h.owner.x : h.owner.x - h.w; h.y = h.owner.y - h.owner.ch.h * .55 - h.h / 2; }
    h.x += h.vx * DT; h.y += h.vy * DT;
    const rc = h.ring ? h.r0 + (h.r1 - h.r0) * Math.min(1, h.t / h.life) : 0;
    for (const foe of G.fighters) {
      if (!isFoe(h.owner, foe) || foe.state === 'dead' || foe.state === 'spawn' || foe.inv > .04) continue;
      const b = bodyRect(foe); let hit;
      if (h.ring) { const cx = clamp(h.x, b.x, b.x + b.w), cy = clamp(h.y, b.y, b.y + b.h); hit = (h.x - cx) ** 2 + (h.y - cy) ** 2 <= rc * rc; }
      else hit = overlap({ x:h.x, y:h.y, w:h.w, h:h.h }, b);
      if (!hit) continue;
      if (h.push) foe.vx = h.push * .9;
      if (h.pull) foe.vx += ((h.x + h.w / 2) - foe.x) * 5 * DT + Math.sign((h.x + h.w / 2) - foe.x) * 60 * DT;
      if (h.lift) { foe.vy = Math.max(foe.vy - 1500 * DT, -360); foe.grounded = false; }
      if (h.t - (h.hit[foe.idx] === undefined ? -9 : h.hit[foe.idx]) >= h.rehit) {
        h.hit[foe.idx] = h.t; h.hitAt[foe.idx] = h.t;
        launch(foe, h.owner, h.dmg, h.base, h.gr, h.ang, h.radial ? (Math.sign(foe.x - h.x) || 1) : (h.face || 1), foe.x, foe.y - foe.ch.h / 2, true);
        if (h.lift) { foe.vy = Math.max(foe.vy, -200); }
        foe.hurtT = Math.min(foe.hurtT, .22);
      }
    }
    h.t += DT;
    if (h.t >= h.life) {
      h.dead = true;
      if (h.fin) for (const foe of G.fighters) if (h.hitAt[foe.idx] !== undefined && h.t - h.hitAt[foe.idx] < .4 && foe.state !== 'dead' && foe.inv <= .04) {
        launch(foe, h.owner, h.fin.dmg, h.fin.base, h.fin.gr, h.fin.ang, h.radial ? (Math.sign(foe.x - h.x) || 1) : (h.face || 1), foe.x, foe.y - foe.ch.h / 2, false);
        if (h.owner && h.owner.ch) maybeStatus(h.owner, foe, 1);
      }
    }
  }
  G.hazards = G.hazards.filter(h => !h.dead);
}
// ---------------------------------------------------------------- BOULE SMASH : flotte, se brise en plusieurs coups
function hitBall(f) {
  const b = G.ball; if (!b || !f) return;
  b.hp--; b.flash = .3; b.last = f; b.vx += (b.x - f.x > 0 ? 1 : -1) * 220; b.vy -= 90;
  fxSparks(b.x, b.y, '#ffffff', 10, 320); fxSparks(b.x, b.y, '#ffe45a', 8, 260); fxSfx('hit'); fxShake(3);
  if (b.hp <= 0) breakBall(f);
}
function breakBall(f) {
  const b = G.ball; G.ball = null; G.ballT = 40 + Math.random() * 25;
  fxSparks(b.x, b.y, '#ffe45a', 40, 520); fxSparks(b.x, b.y, '#ff7ad9', 24, 420); fxSparks(b.x, b.y, '#7ae8ff', 24, 420); fxShake(10); fxSfx('ko');
  statBall(f);
  if (f.state !== 'dead') { f.ult = 100; f.ultReady = true; fxText(f.x, f.y - f.ch.h - 30, '⭐ BOULE SMASH ! spécial neutre = ULTIME', '#ffe45a'); }
}
function updateBall() {
  const bd = G.stage.bounds;
  if (G.ball) {
    const b = G.ball; b.life -= DT; b.flash = Math.max(0, b.flash - DT); b.tt -= DT;
    if (b.tt <= 0) { b.tx = (Math.random() - .5) * 1100; b.ty = -(70 + Math.random() * 330); b.tt = 1.3 + Math.random() * 1.3; }
    const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, 1.6 * DT);
    b.vx += (dx / d * 150 - b.vx) * k; b.vy += (dy / d * 150 - b.vy) * k; b.x += b.vx * DT; b.y += b.vy * DT; b.x = clamp(b.x, bd.l + 200, bd.r - 200);
    if (b.life <= 0) { G.ball = null; G.ballT = 35; }
  } else if (ultBallOn() && G.fighters.length > 1 && G.cd <= 0) {
    G.ballT -= DT;
    if (G.ballT <= 0) { const s = Math.random() < .5 ? -1 : 1; G.ball = { x:s * 700, y:-220, vx:-s * 120, vy:0, hp:5, hpMax:5, life:30, flash:0, tt:0, tx:0, ty:-200, last:null }; fxSfx('item'); fxText(s * 600, -260, '⭐ BOULE SMASH !', '#ffe45a'); }
  }
}


// ================================================================ ÉVOLUTION EN COMBAT
function evoInfo(f) {
  if (f.ch.custom || f.ch.isCustom) return null;
  const fi = FAM_OF[f.ch.id]; if (fi === undefined) return null;
  const fam = FAMILIES[fi], si = fam.findIndex(st => st.includes(f.ch.id)); if (si < 0) return null;
  const rem = fam.length - 1 - si; if (rem <= 0) return null;
  return { thr:(rem >= 2 ? 60 : 100) - (f.evoShift || 0), next:fam[si + 1].map(id => CHAR_BY_ID[id]) };
}
function swapChar(f, idx) {
  const nc = CHARS[idx]; f.ch = nc; void loadSprites(nc, f.shiny);
  f.sp = spriteObj[nc.id + (f.shiny ? '*' : '')] || { anims:{}, ok:false };
}
function evolveFighter(f, idx) {
  statEvo(f);
  const old = f.ch; if (!f.baseCh) { f.baseCh = old; f.baseSp = f.sp; }
  swapChar(f, idx);
  f.pct = Math.max(0, f.pct - 30); f.inv = Math.max(f.inv, 1.6); f.shield = 100; f.status = null; f.airJumps = f.ch.air;
  if (f.state === 'attack' || f.state === 'hurt' || f.state === 'stun' || f.state === 'dodge' || f.state === 'shield') { f.state = 'free'; f.move = null; f.st = 0; }
  G.hitstop = Math.max(G.hitstop, .85); G.evo = { t:.85, max:.85, idx:f.idx, from:old.name, to:f.ch.name };
  fxSfx('evo'); fxShake(8); fxSparks(f.x, f.y - f.ch.h / 2, '#ffffff', 40, 520); fxSparks(f.x, f.y - f.ch.h / 2, f.ch.color, 24, 400);
  fxText(f.x, f.y - f.ch.h - 36, '✨ ' + old.name + ' → ' + f.ch.name + ' !', '#ffffff');
  if (G.net === 'host') netEvents.push(['ev', f.idx, idx, 1]);
}
function revertEvo(f) {
  if (!f.baseCh) return;
  f.ch = f.baseCh; f.sp = f.baseSp; f.baseCh = null; f.baseSp = null; f.evoPre = false;
  if (G.net === 'host') netEvents.push(['ev', f.idx, f.ch.idx, 0]);
}

// ================================================================ SIMULATION
function getInput(f) {
  if (f.kind === 'human') return G.localIn[f.slot] || blank();
  if (f.kind === 'cpu') return aiInput(f, DT);
  return f.netIn;
}
function stepGame() {
  if (G.cd > 0) { G.cd -= DT; if (G.cd <= 0) G.go = .7; return; }
  if (G.hitstop > 0) { G.hitstop -= DT; return; }
  G.time += DT;
  for (const p of G.plats) {
    if (p.mv) { const nx = p.mv.x0 + Math.sin(G.time * p.mv.sp) * p.mv.ax; p.dx = nx - p.x; p.x = nx; } else p.dx = 0;
  }
  for (const f of G.fighters) { const inp = getInput(f); stepFighter(f, inp, DT); if (f.kind === 'remote') clearEdges(f.netIn); }
  if (G.horde) updateHorde();
  envTick(DT); updateItems(); updateHazards();
  for (const p of G.projs) {
    p.life -= DT;
    if (p.p.home && !p.item) {
      let t = null, bd2 = 1e9;
      for (const o of G.fighters) { if (o === p.owner || o.state === 'dead') continue; const d = Math.abs(o.x - p.x) + Math.abs(o.y - p.y); if (d < bd2) { bd2 = d; t = o; } }
      if (t) { const sp = Math.hypot(p.vx, p.vy) || p.p.speed, dx = t.x - p.x, dy = t.y - t.ch.h / 2 - p.y, d = Math.hypot(dx, dy) || 1, k = Math.min(1, 4 * DT); p.vx += (dx / d * sp - p.vx) * k; p.vy += (dy / d * sp - p.vy) * k; }
    }
    if (G.ball && !p.item && !p.mine && (p.x - G.ball.x) ** 2 + (p.y - G.ball.y) ** 2 <= (p.r + 28) ** 2) { hitBall(p.owner); p.life = 0; continue; }
    if (p.item) {
      p.arm -= DT;
      if (!p.still) {
        p.vy += 1000 * DT; const py = p.y; p.x += p.vx * DT; p.y += p.vy * DT;
        for (const pl of G.plats) if (p.vy >= 0 && p.x > pl.x && p.x < pl.x + pl.w && py <= pl.y - p.r + 2 && p.y >= pl.y - p.r) { p.y = pl.y - p.r; p.vy = 0; p.vx *= .2; p.still = true; p.fuse = .7; p.plat = pl; if (p.item === 'freeze') { p.life = 0; fxSparks(p.x, p.y, '#9fe8ff', 14, 260); } break; }
      } else { if (p.plat) p.x += p.plat.dx; if (p.item === 'bomb' || p.item === 'ball') { p.fuse -= DT; if (p.fuse <= 0) { explodeItem(p); p.life = 0; continue; } } }
      if (p.arm <= 0) for (const foe of G.fighters) {
        if (!isFoe(p.owner, foe) || !(vulnerable(foe) || (foe.state === 'shield' && foe.inv <= 0))) continue;
        const d = bodyRect(foe), cx = clamp(p.x, d.x, d.x + d.w), cy = clamp(p.y, d.y, d.y + d.h);
        if ((p.x - cx) ** 2 + (p.y - cy) ** 2 <= (p.r + 4) ** 2) {
          if (p.item === 'freeze') { stunFoe(foe, 1.6, true); fxSparks(p.x, p.y, '#9fe8ff', 20, 300); fxSfx('break'); foe.pct += 2; }
          else if (p.item === 'banana') { stunFoe(foe, 1.1, false); foe.pct += 3; fxSparks(p.x, p.y, '#ffe45a', 12, 220); fxSfx('hit'); }
          else explodeItem(p);
          p.life = 0; break;
        }
      }
      continue;
    }
    if (p.p.boom) p.vx -= p.dir * 1100 * DT;
    if (p.mine) {
      if (!p.still) {
        p.vy += 1500 * DT; const py = p.y; p.y += p.vy * DT;
        for (const pl of G.plats) if (p.vy >= 0 && p.x > pl.x && p.x < pl.x + pl.w && py <= pl.y - p.r + 2 && p.y >= pl.y - p.r) { p.y = pl.y - p.r; p.vy = 0; p.still = true; p.plat = pl; break; }
      } else if (p.plat) p.x += p.plat.dx;
    } else { p.vy += (p.p.grav || 0) * DT; p.x += p.vx * DT; p.y += p.vy * DT; }
    if (p.mine && !p.still) continue;
    for (const foe of G.fighters) {
      if (!isFoe(p.owner, foe)) continue;
      const fm = foe.move;
      if (foe.state === 'attack' && fm && fm.kind === 'reflect' && foe.mt >= fm.win0 && foe.mt <= fm.win1 && !p.mine) {
        const rb = bodyRect(foe), rx = clamp(p.x, rb.x - 22, rb.x + rb.w + 22), ry = clamp(p.y, rb.y - 14, rb.y + rb.h + 14);
        if ((p.x - rx) ** 2 + (p.y - ry) ** 2 <= p.r * p.r) {
          p.owner = foe; p.vx = -p.vx * 1.25; p.vy = -p.vy * 1.1; p.life = Math.max(p.life, .8); p.dir = -p.dir;
          p.p = Object.assign({}, p.p, { dmg:p.p.dmg * 1.25, home:false }); fxSparks(p.x, p.y, '#ffffff', 14, 300); fxSfx('shield'); break;
        }
      }
      if (!(vulnerable(foe) || foe.state === 'shield' && foe.inv <= 0)) continue;
      const d = bodyRect(foe), cx = clamp(p.x, d.x, d.x + d.w), cy = clamp(p.y, d.y, d.y + d.h);
      if ((p.x - cx) ** 2 + (p.y - cy) ** 2 <= p.r * p.r) {
        const ds = p.mine ? (Math.sign(foe.x - p.x) || 1) : (Math.sign(p.vx) || 1);
        applyHit(foe, p.owner, p.p.dmg, p.p.base, p.p.gr, p.p.ang, ds, p.x, p.y, true);
        if (p.mine) fxSparks(p.x, p.y, '#ffcc66', 20, 380);
        p.life = 0; break;
      }
    }
  }
  const pb = G.stage.bounds;
  G.projs = G.projs.filter(p => p.life > 0 && p.x > pb.l - 100 && p.x < pb.r + 100 && p.y > pb.t - 100 && p.y < pb.b + 100);
  for (const s of G.sparks) { s.life -= DT; s.x += s.vx * DT; s.y += s.vy * DT; s.vx *= .94; s.vy *= .94; }
  G.sparks = G.sparks.filter(s => s.life > 0);
  G.shake = Math.max(0, G.shake - 30 * DT);
  if (G.winner >= 0) { G.endT -= DT; if (G.endT <= 0) { G.scene = 'over'; if (G.onEnd) G.onEnd(); } }
}

