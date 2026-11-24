// ================================================================ MUSIQUE PROCÉDURALE (un thème par décor, intensité dynamique)
const MTHEMES = {
  menu:     { bpm:88,  root:57, sc:[0,2,4,7,9],        prog:[0,5,3,4], mood:'calm' },
  prairie:  { bpm:122, root:60, sc:[0,2,4,5,7,9,11],   prog:[0,3,4,0], mood:'happy' },
  space:    { bpm:100, root:52, sc:[0,3,5,7,10],       prog:[0,2,4,2], mood:'dream' },
  sky:      { bpm:112, root:62, sc:[0,2,4,6,7,9,11],   prog:[0,4,5,3], mood:'happy' },
  bridge:   { bpm:96,  root:55, sc:[0,2,3,5,7,9,10],   prog:[0,3,6,4], mood:'epic' },
  volcano:  { bpm:132, root:50, sc:[0,1,3,5,7,8,10],   prog:[0,1,0,4], mood:'drive' },
  forest:   { bpm:90,  root:53, sc:[0,2,3,5,7,8,10],   prog:[0,5,2,4], mood:'dream' },
  ice:      { bpm:104, root:57, sc:[0,2,3,5,7,8,10],   prog:[0,2,5,3], mood:'dream' },
  city:     { bpm:126, root:48, sc:[0,3,5,7,10],       prog:[0,0,3,4], mood:'drive' },
  beach:    { bpm:118, root:60, sc:[0,2,4,5,7,9,10],   prog:[0,4,3,4], mood:'happy' },
  crystal:  { bpm:106, root:59, sc:[0,2,4,6,7,9,11],   prog:[0,2,4,1], mood:'dream' },
  desert:   { bpm:110, root:53, sc:[0,1,4,5,7,8,10],   prog:[0,1,0,3], mood:'epic' },
  haunted:  { bpm:86,  root:50, sc:[0,2,3,5,7,8,11],   prog:[0,5,3,4], mood:'dark' },
};
const MUS = { theme:null, step:0, nextT:0, timer:null, master:null, noise:null, lead:null, intensity:0, cur:0 };
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
function musNoise() {
  if (MUS.noise) return MUS.noise;
  const b = AC.createBuffer(1, AC.sampleRate * 1, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return MUS.noise = b;
}
function mTone(f, t, dur, type, vol, dest) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(dest || MUS.master); o.start(t); o.stop(t + dur + .02);
}
function mNoise(t, dur, vol, hp) {
  const s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter(); s.buffer = musNoise(); f.type = 'highpass'; f.frequency.value = hp;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s.connect(f); f.connect(g); g.connect(MUS.master); s.start(t); s.stop(t + dur + .02);
}
function mKick(t, vol) {
  const o = AC.createOscillator(), g = AC.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(38, t + .14);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .2); o.connect(g); g.connect(MUS.master); o.start(t); o.stop(t + .22);
}
function musStep(step, t) {
  const th = MTHEMES[MUS.theme], I = MUS.cur, sd = 60 / th.bpm / 4, bar = Math.floor(step / 16) % th.prog.length, s16 = step % 16;
  const deg = (d, oct) => th.root + th.sc[((d % th.sc.length) + th.sc.length) % th.sc.length] + 12 * (oct + Math.floor(d / th.sc.length));
  const chordRoot = th.prog[bar], mood = th.mood, drive = mood === 'drive' || mood === 'epic';
  // basse + nappe (toujours)
  if (s16 % 4 === 0 || (drive && s16 % 2 === 0)) mTone(mtof(deg(chordRoot, -1)), t, sd * (drive ? 1.6 : 3.2), drive ? 'sawtooth' : 'triangle', drive ? .11 : .15);
  if (s16 === 0) { for (const k of [0, 2, 4]) mTone(mtof(deg(chordRoot + k, 0)), t, sd * 15, mood === 'dark' ? 'sawtooth' : 'sine', .05); }
  // rythme dès l'intensité 1
  if (I >= 1) {
    if (s16 % 4 === 0) mKick(t, .22);
    if (s16 % 2 === 1 && I >= 1) mNoise(t, .04, .05, 7000);
    if (s16 === 4 || s16 === 12) mNoise(t, .12, .09, 1800);
  }
  // mélodie / arpège dès l'intensité 2
  if (I >= 2) {
    const r = Math.sin((bar * 16 + s16) * 12.9898 + th.root * 4.1) * 43758.5453, rv = r - Math.floor(r);
    if (rv > (mood === 'calm' ? .75 : .42)) { const d = chordRoot + [0, 2, 4, 5, 7][Math.floor(rv * 5) % 5]; mTone(mtof(deg(d, 1)), t, sd * 1.7, mood === 'drive' ? 'square' : 'triangle', .07); }
  }
  // ultimes : couche épique
  if (I >= 3 && s16 % 2 === 0) { mTone(mtof(deg(chordRoot + (s16 % 8 < 4 ? 0 : 2), 2)), t, sd * 1.5, 'sawtooth', .05); mNoise(t, .05, .06, 5000); }
}
function musicSet(theme) {
  if (!AC || MUS.theme === theme) return;
  MUS.theme = theme; MUS.step = 0; if (!MUS.master) { MUS.master = AC.createGain(); MUS.master.connect(AC.destination); }
  MUS.nextT = AC.currentTime + .1;
  if (!MUS.timer) MUS.timer = setInterval(() => {
    if (!MUS.theme || !AC) return;
    MUS.master.gain.value = (muted || SET.audio.music <= 0) ? 0 : SET.audio.music * .45;
    if (muted || SET.audio.music <= 0) { MUS.nextT = AC.currentTime + .1; return; }
    const th = MTHEMES[MUS.theme]; if (!th) return;
    while (MUS.nextT < AC.currentTime + .15) { MUS.cur += (MUS.intensity - MUS.cur) * .5; musStep(MUS.step, MUS.nextT); MUS.nextT += 60 / th.bpm / 4; MUS.step++; }
  }, 30);
}
function musicTick() {                                   // appelée à chaque image : choisit le thème et l'intensité
  if (!AC) return;
  let th = 'menu', I = 0;
  if (G.scene === 'fight' || G.scene === 'over' || G.scene === 'replay') {
    th = G.stage && MTHEMES[G.stage.theme] ? G.stage.theme : 'menu';
    const fs = G.fighters.filter(f => !f.hidden && f.stocks > 0), avg = fs.length ? fs.reduce((a, f) => a + f.pct, 0) / fs.length : 0;
    I = G.cd > 0 ? 0 : avg < 35 ? 1 : avg < 90 ? 2 : 2;
    if (G.horde && G.horde.wave % 10 === 0 && G.horde.wave > 0) I = Math.max(I, 3);
    if ((G.cine && G.cine.t > -1) || G.fighters.some(f => f.state === 'attack' && f.mname === 'ult')) I = 3;
    if (G.scene === 'over') I = 0;
  }
  MUS.intensity = I; musicSet(th);
}

// ================================================================ CRIS SYNTHÉTIQUES PAR POKÉMON + BRUITAGES PAR TYPE
const cryLast = {};
function cryById(id, kind) {
  if (!AC || muted || SET.audio.vol <= 0) return;
  const now = AC.currentTime; if (cryLast[id] && now - cryLast[id] < .35) return; cryLast[id] = now;
  const ch = CHARS[CHAR_BY_ID[id]]; if (!ch) return;
  const hs = hashStr(id), size = { S:1.45, M:1, L:.75, XL:.55 }[ch.size] || 1;
  const base = (170 + (hs % 380)) * size, type = ['sine', 'triangle', 'sawtooth', 'square'][(hs >> 3) % 4], syl = 1 + (hs >> 5) % 3, vib = 5 + (hs >> 8) % 12;
  const f1 = 500 + (hs >> 11) % 1700, vol = (kind === 'atk' ? .05 : .08) * SET.audio.vol * 1.5;
  const total = { atk:.14, hurt:.24, ko:.7, ult:.9 }[kind] || .2, per = total / syl;
  for (let k = 0; k < syl; k++) {
    const t = now + k * per, up = kind === 'hurt' ? .8 : kind === 'ko' ? .6 : kind === 'ult' ? 1.6 : 1.15, contour = 1 + ((hs >> (14 + k)) % 3 - 1) * .18;
    const o = AC.createOscillator(), g = AC.createGain(), bp = AC.createBiquadFilter(), lfo = AC.createOscillator(), lg = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(base * contour, t); o.frequency.exponentialRampToValueAtTime(Math.max(60, base * contour * up), t + per);
    lfo.frequency.value = vib; lg.gain.value = base * .04; lfo.connect(lg); lg.connect(o.frequency); bp.type = 'bandpass'; bp.frequency.value = f1; bp.Q.value = 2.2;
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + per * .95);
    o.connect(bp); bp.connect(g); g.connect(AC.destination); o.start(t); lfo.start(t); o.stop(t + per); lfo.stop(t + per);
  }
}
function typeHit(type) {
  if (!AC || muted) return; const t = AC.currentTime, v = SET.audio.vol;
  const ton = (f0, f1, d, ty, vol) => beep(f0, f1, d, ty, vol);
  switch (type) {
    case 'Feu':      ton(260, 70, .18, 'sawtooth', .07); mNoiseOnce(.14, .06, 900); break;
    case 'Eau':      ton(500, 900, .08, 'sine', .06); setTimeout(() => ton(700, 1100, .07, 'sine', .05), 60); break;
    case 'Électrik': for (let i = 0; i < 4; i++) setTimeout(() => ton(300 + Math.random() * 1500, 200, .04, 'square', .05), i * 25); break;
    case 'Plante':   mNoiseOnce(.12, .07, 2500); ton(200, 120, .1, 'triangle', .05); break;
    case 'Glace':    ton(1800, 1200, .22, 'triangle', .05); ton(2400, 1700, .18, 'sine', .04); break;
    case 'Psy':      ton(420, 780, .22, 'sine', .07); ton(430, 770, .22, 'sine', .05); break;
    case 'Spectre': case 'Ténèbres': ton(160, 50, .3, 'sawtooth', .06); mNoiseOnce(.2, .04, 400); break;
    case 'Dragon':   ton(120, 45, .3, 'sawtooth', .09); ton(240, 90, .22, 'square', .04); break;
    case 'Combat':   ton(110, 40, .12, 'sine', .14); mNoiseOnce(.06, .08, 600); break;
    case 'Sol': case 'Roche': ton(80, 30, .26, 'sine', .15); mNoiseOnce(.14, .06, 200); break;
    case 'Acier':    ton(900, 640, .14, 'square', .05); ton(1300, 900, .1, 'square', .03); mNoiseOnce(.05, .05, 4000); break;
    case 'Vol':      mNoiseOnce(.2, .06, 1200); ton(500, 300, .15, 'triangle', .04); break;
    case 'Fée':      ton(1200, 1200, .09, 'sine', .05); setTimeout(() => ton(1600, 1600, .09, 'sine', .05), 70); setTimeout(() => ton(2000, 2000, .12, 'sine', .04), 140); break;
    case 'Insecte': case 'Poison': ton(380, 520, .1, 'sawtooth', .05); ton(560, 380, .1, 'square', .03); break;
    default:         ton(220, 60, .12, 'sawtooth', .07);
  }
}
function mNoiseOnce(dur, vol, hp) {
  if (!AC) return; if (!MUS.master) { MUS.master = AC.createGain(); MUS.master.connect(AC.destination); }
  const t = AC.currentTime, s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter(), gm = AC.createGain();
  s.buffer = musNoise(); f.type = 'highpass'; f.frequency.value = hp; g.gain.setValueAtTime(vol * SET.audio.vol * 1.4, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(AC.destination); s.start(t); s.stop(t + dur + .02);
}

