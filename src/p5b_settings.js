// ================================================================ RÉGLAGES (clavier, manette, tactile, jeu, audio)
let KBMAP = null;                                   // disposition réelle du clavier (Chrome) pour afficher AZERTY/QWERTY correctement
try { if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { KBMAP = m; }).catch(() => {}); } catch (e) { /* ignoré */ }
const keyLabel = code => {
  if (!code) return '—';
  const m = { Space:'Espace', ArrowLeft:'←', ArrowRight:'→', ArrowUp:'↑', ArrowDown:'↓', ShiftLeft:'Maj G', ShiftRight:'Maj D', ControlLeft:'Ctrl G', ControlRight:'Ctrl D', Enter:'Entrée', Backspace:'Retour', Tab:'Tab', AltLeft:'Alt G', AltRight:'Alt D' };
  if (m[code]) return m[code];
  if (KBMAP && KBMAP.get(code)) return KBMAP.get(code).toUpperCase();
  return keyName(code);
};
function hintText(slot) {
  const k = SET.keys[slot]; if (!k) return 'manette';
  const g = a => keyLabel(k[a][0]);
  return g('left') + '/' + g('right') + ' bouger · ' + g('jump') + ' saut · ' + g('down') + ' bas · ' + g('attack') + ' attaque · ' + g('special') + ' spécial · ' + g('shield') + ' bouclier · ' + g('grab') + ' grab';
}

let setKP = 0, setTimer = null, touchPreview = false;
function stopSetTimer() { if (setTimer) { clearInterval(setTimer); setTimer = null; } padCapture = null; kbCapture = null; }
const optToggle = (label, get, set) => { const c = h('input', { type:'checkbox' }); c.checked = !!get(); c.onchange = () => { set(c.checked); saveSettings(); }; return h('label', { class:'opt' }, c, ' ' + label); };
const optSlider = (label, min, max, step, get, set, fmt) => {
  const v = h('span', { class:'val' }, fmt(get())), r = h('input', { type:'range', min:String(min), max:String(max), step:String(step) });
  r.value = get(); r.oninput = () => { set(parseFloat(r.value)); v.textContent = fmt(get()); }; r.onchange = () => saveSettings();
  return h('label', { class:'opt' }, label + ' ', r, ' ', v);
};
const optSelect = (label, opts, get, set) => h('label', { class:'opt' }, label + ' ',
  h('select', { onchange() { set(this.value); saveSettings(); } }, ...opts.map(([v, n]) => h('option', Object.assign({ value:String(v) }, String(get()) === String(v) ? { selected:'selected' } : {}), n))));

function showSettings(tab, back) {
  stopSetTimer();
  const tabs = [['keys', '⌨️ Clavier'], ['pad', '🎮 Manette'], ['touch', '📱 Tactile'], ['game', '🎯 Jeu'], ['audio', '🔊 Audio'], ['net', '🌐 Réseau']];
  const again = t => () => showSettings(t || tab, back);
  const body = h('div', { class:'panel set' });
  if (tab === 'keys') {
    const p = setKP;
    body.appendChild(h('div', { class:'row' }, ...[0, 1, 2, 3].map(i => h('button', { class:'btn small' + (i === p ? ' go' : ''), onclick() { setKP = i; showSettings('keys', back); } }, 'Joueur ' + (i + 1)))));
    body.appendChild(h('div', { class:'hint' }, 'Cliquez une case puis appuyez sur la touche voulue (Échap = annuler, Retour arrière = effacer). Deux touches possibles par action. Les touches sont des positions physiques : les noms affichés suivent votre disposition de clavier.'));
    const used = {};
    SET.keys.forEach((kp, pi) => KEYACTIONS.forEach(a => kp[a].forEach(c => { if (c) (used[c] = used[c] || []).push(pi + ':' + a); })));
    const rows = h('div', { class:'keytable' });
    for (const a of KEYACTIONS) {
      const cells = [0, 1].map(i => {
        const code = SET.keys[p][a][i], u = code ? used[code] : null;
        const conflict = u && u.some(x => x !== p + ':' + a && !(x.split(':')[0] === String(p) && ((x.endsWith(':up') && a === 'jump') || (x.endsWith(':jump') && a === 'up'))));
        return h('button', { class:'chip' + (conflict ? ' bad' : ''), title:conflict ? 'Cette touche est aussi utilisée ailleurs' : '',
          onclick() { this.textContent = 'Appuyez…'; kbCapture = c => { if (c !== 'Escape') { SET.keys[p][a][i] = c === 'Backspace' ? '' : c; saveSettings(); } showSettings('keys', back); }; } }, keyLabel(code));
      });
      rows.appendChild(h('div', { class:'krow' }, h('span', { class:'klab' }, ACTION_LABELS[a]), ...cells));
    }
    body.appendChild(rows);
    body.appendChild(btn('Rétablir les touches du joueur ' + (p + 1), () => { SET.keys[p] = JSON.parse(JSON.stringify(DEFAULTS.keys[p])); saveSettings(); showSettings('keys', back); }, 'small'));
    body.appendChild(h('div', { class:'hint' }, 'Grab : bouclier + attaque fonctionne toujours ; la touche Grab est un raccourci direct. Joueurs 3 et 4 : utilisez des manettes (ou attribuez-leur des touches ici).'));
  } else if (tab === 'pad') {
    const info = h('div', { class:'padinfo' }), live = h('div', { class:'padlive' });
    body.appendChild(info); body.appendChild(live);
    const refresh = () => {
      const ps = padInfo.pads;
      info.textContent = ps.length ? ps.map((g, i) => 'Manette ' + (i + 1) + ' → joueur ' + (i + SET.pad.start + 1) + ' : ' + (isPS(g.id) ? '🎮 PlayStation · ' : '🎮 ') + g.id.slice(0, 70) + ' · ' + (g.mapping || 'disposition non standard')).join('\n')
        : 'Aucune manette détectée. Branchez-la (USB ou Bluetooth) puis appuyez sur un bouton.';
      const on = [];
      ps.forEach((g, gi) => { g.buttons.forEach((b, i) => { if (b.pressed || b.value > .5) on.push('M' + (gi + 1) + ' ' + padLabel('b' + i, g.id) + ' (b' + i + ')'); }); g.axes.forEach((v, i) => { if (Math.abs(v) > .5) on.push('M' + (gi + 1) + ' axe ' + i + ' ' + (v > 0 ? '+' : '−')); }); });
      live.textContent = 'Test en direct : ' + (on.length ? on.join(' · ') : '—');
    };
    const id0 = padInfo.pads[0] ? padInfo.pads[0].id : '';
    refresh(); setTimer = setInterval(() => { const cur = padInfo.pads[0] ? padInfo.pads[0].id : ''; if (cur !== id0 && !padCapture) { showSettings('pad', back); return; } refresh(); }, 120);
    const rows = h('div', { class:'keytable' });
    for (const a of KEYACTIONS) {
      const chips = (SET.pad[a] || []).map((b, i) => h('span', { class:'chipx' },
        h('button', { class:'chip', onclick() { this.textContent = 'Appuyez sur la manette…'; padCapture = { armed:false, cb:nb => { SET.pad[a][i] = nb; saveSettings(); showSettings('pad', back); } }; } }, padLabel(b, id0)),
        h('button', { class:'chip x', title:'Supprimer', onclick() { SET.pad[a].splice(i, 1); saveSettings(); showSettings('pad', back); } }, '×')));
      chips.push(h('button', { class:'chip', title:'Ajouter un bouton', onclick() { this.textContent = 'Appuyez sur la manette…'; padCapture = { armed:false, cb:nb => { SET.pad[a].push(nb); saveSettings(); showSettings('pad', back); } }; } }, '＋'));
      rows.appendChild(h('div', { class:'krow' }, h('span', { class:'klab' }, ACTION_LABELS[a]), ...chips));
    }
    body.appendChild(rows);
    body.appendChild(optSlider('Zone morte des sticks', 0.05, 0.7, 0.05, () => SET.pad.dead, v => { SET.pad.dead = v; }, v => Math.round(v * 100) + ' %'));
    body.appendChild(optToggle('Stick haut = saut', () => SET.pad.flick, v => { SET.pad.flick = v; }));
    body.appendChild(optSelect('La première manette contrôle le joueur', [[0, '1'], [1, '2'], [2, '3'], [3, '4']], () => SET.pad.start, v => { SET.pad.start = parseInt(v, 10); }));
    body.appendChild(btn('Rétablir la configuration PS4 / PS5 / Xbox', () => { for (const a of KEYACTIONS) SET.pad[a] = DEFAULTS.pad[a].slice(); saveSettings(); showSettings('pad', back); }, 'small'));
    body.appendChild(h('div', { class:'hint' }, 'Manettes PS4/PS5 : ✕ saut, □ attaque, ○ spécial, L1/L2/R2 bouclier, R1 grab, croix et stick gauche pour bouger. Chrome/Edge/Android reconnaissent les manettes PlayStation et Xbox directement (en Bluetooth sur Android). Si votre manette a une disposition étrange (Firefox), reprogrammez chaque action avec les cases ci-dessus.'));
  } else if (tab === 'touch') {
    body.appendChild(optSelect('Touches tactiles à l\'écran', [['auto', 'Automatique (écrans tactiles)'], ['on', 'Toujours affichées'], ['off', 'Jamais']], () => SET.touch.mode, v => { SET.touch.mode = v; }));
    body.appendChild(optSlider('Taille des touches', .6, 1.6, .05, () => SET.touch.size, v => { SET.touch.size = v; buildTouch(); }, v => Math.round(v * 100) + ' %'));
    body.appendChild(optSlider('Opacité', .2, 1, .05, () => SET.touch.opacity, v => { SET.touch.opacity = v; buildTouch(); }, v => Math.round(v * 100) + ' %'));
    body.appendChild(optToggle('Mode gaucher (joystick à droite, boutons à gauche)', () => SET.touch.left, v => { SET.touch.left = v; buildTouch(); }));
    body.appendChild(optToggle('Joystick vers le haut = saut', () => SET.touch.flick, v => { SET.touch.flick = v; }));
    body.appendChild(optToggle('Afficher le bouton Grab', () => SET.touch.grabBtn, v => { SET.touch.grabBtn = v; buildTouch(); }));
    body.appendChild(optToggle('Vibration au toucher (Android)', () => SET.touch.vib, v => { SET.touch.vib = v; }));
    body.appendChild(btn(touchPreview ? '👁 Masquer l\'aperçu' : '👁 Aperçu des touches', () => { touchPreview = !touchPreview; showSettings('touch', back); }, 'small'));
    body.appendChild(h('div', { class:'hint' }, 'Joystick à gauche (bouger, viser haut/bas), boutons : Attaque, Spécial, Saut, Bouclier, Grab. Bouclier + Attaque = Grab. Astuce : bouton ⛶ du menu pour passer en plein écran.'));
  } else if (tab === 'game') {
    body.appendChild(optSelect('Fréquence des objets', [['off', 'Aucun'], ['rare', 'Rares'], ['normal', 'Normaux'], ['frequent', 'Fréquents']], () => SET.game.items, v => { SET.game.items = v; }));
    body.appendChild(h('div', { class:'chips' }, ...ITEM_KEYS.map(k => optToggle(ITEMS[k].emoji + ' ' + ITEMS[k].name, () => SET.game.itemTypes[k] !== false, v => { SET.game.itemTypes[k] = v; }))));
    body.appendChild(optSelect('Qualité graphique', [['auto', 'Automatique (s\'adapte aux performances)'], ['high', 'Haute'], ['mid', 'Moyenne'], ['low', 'Basse (téléphones lents)']], () => SET.game.quality, v => { SET.game.quality = v; }));
    body.appendChild(optToggle('Afficher les FPS', () => SET.game.fps, v => { SET.game.fps = v; }));
    body.appendChild(optSelect('Attaques ultimes', [['both', 'Barre Smash + Boule Smash'], ['ball', 'Boule Smash seulement'], ['bar', 'Barre Smash seulement'], ['off', 'Désactivées']], () => SET.game.smash, v => { SET.game.smash = v; }));
    body.appendChild(optSelect('Évolution en combat', [['on', 'Activée (à 60 % / 100 % de dégâts)'], ['off', 'Désactivée']], () => SET.game.evo, v => { SET.game.evo = v; }));
    body.appendChild(optToggle('Caméra automatique (zoom et suivi)', () => SET.game.camera, v => { SET.game.camera = v; }));
    body.appendChild(optToggle('Tremblements d\'écran', () => SET.game.shake, v => { SET.game.shake = v; }));
    body.appendChild(optToggle('Afficher les zones de coups (hitboxes)', () => SET.game.hitboxes, v => { SET.game.hitboxes = v; }));
    body.appendChild(optToggle('Afficher l\'aide des touches au début des combats', () => SET.game.hints, v => { SET.game.hints = v; }));
    body.appendChild(optSelect('Vies par défaut', [1, 2, 3, 4, 5].map(n => [n, n]), () => SET.game.stocks, v => { SET.game.stocks = parseInt(v, 10); }));
    body.appendChild(optSelect('Niveau CPU par défaut', [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => [n, n + ' · ' + LVL_NAMES[n]]), () => SET.game.cpu, v => { SET.game.cpu = parseInt(v, 10); }));
  } else if (tab === 'net') {
    const nick = h('input', { type:'text', class:'search', maxlength:'16', placeholder:'Votre pseudo (affiché dans les salons)' }); nick.value = SET.net.nick || ''; nick.oninput = () => { SET.net.nick = nick.value; saveSettings(); };
    const srv = h('input', { type:'text', class:'search', placeholder:'Adresse du serveur de salons (https://mon-jeu.onrender.com)' }); srv.value = SET.net.server || ''; srv.oninput = () => { SET.net.server = srv.value; saveSettings(); };
    const stat2 = h('div', { class:'hint' }, ''), pre = h('div', { class:'hint' }, '');
    body.appendChild(h('label', { class:'opt' }, 'Pseudo ', nick)); body.appendChild(h('label', { class:'opt' }, 'Serveur ', srv));
    body.appendChild(btn('Tester le serveur', async () => { stat2.textContent = 'Test…'; try { const r = await pubFetch('/api/health'); const j = await r.json(); stat2.textContent = j && j.pokesmash ? '✔ Serveur PokeSmash joignable' : '⚠ Réponse inattendue'; } catch (e) { stat2.textContent = '✖ Injoignable'; } }, 'small')); body.appendChild(stat2);
    body.appendChild(h('div', { class:'hint' }, 'Le serveur sert aux comptes, à la sauvegarde, aux amis et à la liste des salons publics. Laissez vide si vous jouez avec des codes de salon uniquement.'));
    body.appendChild(btn('⬇️ Précharger des Pokémon pour le hors-ligne', () => { preloadOffline(pre); }, 'small')); body.appendChild(pre);
    if (INSTALL_EVT) body.appendChild(btn('📲 Installer l\'application sur cet appareil', () => { INSTALL_EVT.prompt(); }, 'small'));
  } else {
    body.appendChild(optSlider('Volume des effets', 0, 1, .05, () => SET.audio.vol, v => { SET.audio.vol = v; }, v => Math.round(v * 100) + ' %'));
    body.appendChild(optSlider('Volume de la musique', 0, 1, .05, () => SET.audio.music, v => { SET.audio.music = v; }, v => Math.round(v * 100) + ' %'));
    body.appendChild(optToggle('Couper le son (touche M)', () => muted, v => { muted = v; }));
    body.appendChild(btn('🔊 Tester', () => { ensureAudio(); sfx('hit'); setTimeout(() => sfx('item'), 200); }, 'small'));
  }
  show(false, h('div', { class:'title sm' }, '⚙️ Paramètres'),
    h('div', { class:'row' }, ...tabs.map(([k, n]) => h('button', { class:'btn small' + (k === tab ? ' go' : ''), onclick() { showSettings(k, back); } }, n))),
    body,
    h('div', { class:'row' }, btn('Tout réinitialiser', () => { if (confirm('Réinitialiser tous les réglages ?')) { resetSettings(); buildTouch(); showSettings(tab, back); } }, 'small'),
      btn('← Retour', () => { stopSetTimer(); touchPreview = false; if (back) back(); }, 'big go')));
}

// ================================================================ COMMANDES TACTILES (Android / iOS)
const touchEl = document.getElementById('touch');
let touchShown = false;
const isTouchDevice = () => ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
const wantTouch = () => SET.touch.mode === 'on' || (SET.touch.mode === 'auto' && isTouchDevice());
function releaseTouch() { for (const a of KEYACTIONS) touchSet(a, false); }
function buildTouch() {
  touchEl.innerHTML = '';
  const s = SET.touch.size, L = SET.touch.left, side = L ? 'right' : 'left', bside = L ? 'left' : 'right';
  touchEl.style.opacity = String(SET.touch.opacity);
  const place = (el, sideName, off, bottom, size) => { el.style.cssText = sideName + ':' + Math.round(off * s) + 'px;bottom:' + Math.round(bottom * s) + 'px;width:' + Math.round(size * s) + 'px;height:' + Math.round(size * s) + 'px;'; return el; };
  const press = (el, action) => {
    const down = e => { e.preventDefault(); if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (_) { /* ignoré */ } } touchSet(action, true); el.classList.add('on'); if (SET.touch.vib && navigator.vibrate) { try { navigator.vibrate(8); } catch (_) { /* ignoré */ } } };
    const up = () => { touchSet(action, false); el.classList.remove('on'); };
    el.addEventListener('pointerdown', down); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  };
  const mk = (label, action, off, bottom, size, cls) => { const el = h('div', { class:'tbtn ' + (cls || '') }, label); place(el, bside, off, bottom, size); press(el, action); touchEl.appendChild(el); };
  mk('Attaque', 'attack', 26, 36, 92, 'ta');
  mk('Spécial', 'special', 134, 16, 78, 'tb');
  mk('Saut', 'jump', 66, 146, 80, 'tj');
  mk('🛡', 'shield', 172, 108, 66, 'ts');
  if (SET.touch.grabBtn) mk('Grab', 'grab', 246, 30, 56, 'tg');
  const knob = h('div', { class:'tknob' }), base = h('div', { class:'tstick' }, knob);
  place(base, side, 22, 22, 150); touchEl.appendChild(base);
  let id = null;
  const upd = e => {
    const r = base.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2;
    let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy); if (m > R) { dx *= R / m; dy *= R / m; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    const th = R * .35; touchSet('left', dx < -th); touchSet('right', dx > th);
    const was = keys.Touch_up; touchSet('up', dy < -R * .45); touchSet('down', dy > R * .45);
    if (SET.touch.flick && !was && keys.Touch_up) { touchSet('jump', true); setTimeout(() => touchSet('jump', false), 90); }
  };
  base.addEventListener('pointerdown', e => { e.preventDefault(); id = e.pointerId; if (base.setPointerCapture) { try { base.setPointerCapture(id); } catch (_) { /* ignoré */ } } upd(e); });
  base.addEventListener('pointermove', e => { if (e.pointerId === id) upd(e); });
  const end = e => { if (e.pointerId !== id) return; id = null; knob.style.transform = ''; for (const a of ['left', 'right', 'up', 'down']) touchSet(a, false); };
  base.addEventListener('pointerup', end); base.addEventListener('pointercancel', end);
  const pause = h('div', { class:'tbtn tp' }, '⏸'); pause.style.cssText = 'right:12px;top:12px;width:46px;height:46px;';
  pause.addEventListener('pointerdown', e => { e.preventDefault(); pauseGame(); });
  touchEl.appendChild(pause);
}
function updateTouchVisibility() {
  const show = touchPreview || (wantTouch() && G.scene === 'fight' && !G.paused);
  if (show === touchShown) return;
  touchShown = show; touchEl.style.display = show ? 'block' : 'none';
  if (show) buildTouch(); else releaseTouch();
}

function toggleFullscreen() {
  try {
    const d = document, e = d.documentElement;
    if (!d.fullscreenElement && !d.webkitFullscreenElement) {
      const p = (e.requestFullscreen || e.webkitRequestFullscreen).call(e);
      if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (_) { /* ignoré */ } }).catch(() => {});
    } else (d.exitFullscreen || d.webkitExitFullscreen).call(d);
  } catch (e) { /* plein écran indisponible */ }
}


