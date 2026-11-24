'use strict';
/*
 * POKESMASH – jeu de combat de plateforme (fan game non commercial) – fait par Mathieu Owen
 * Sprites : PMDCollab / SpriteCollab (CC BY-NC 4.0), chargés depuis GitHub au lancement.
 * Pokémon © Nintendo / Game Freak / Creatures Inc. Projet sans lien avec ces sociétés.
 * En ligne : WebRTC via PeerJS (serveur de signalisation public gratuit).
 */
const W = 960, H = 540, DT = 1 / 60, GRAV = 1900, SC = 2;
const BASE = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/';
const PCOL = ['#4aa8ff', '#ff5a5a', '#5ad06a', '#e8c53a', '#c070ff', '#ff9a3a', '#40d8c8', '#ff7ac0'];

// ---------------------------------------------------------------- ROSTER (37 combattants)
// [id, nom, couleur, taille S/M/L/XL, style fast/bal/heavy/reach, spécial neutre, latéral, haut, bas]
const ROSTER = [
 ['0025','Pikachu','#ffd93b','S','fast','straight','dash','teleport','mine'],
 ['0006','Dracaufeu','#ff7a2b','L','heavy','beam','slash','rocket','slam'],
 ['0448','Lucario','#4aa8ff','M','bal','orb','dash','rocket','counter'],
 ['0094','Ectoplasma','#8a4bd6','M','fast','arc','pounce','teleport','mine'],
 ['0658','Amphinobi','#7be3ff','M','fast','boomerang','dash','teleport','counter'],
 ['0150','Mewtwo','#ff7ad9','L','reach','orb','slash','teleport','boost'],
 ['0003','Florizarre','#5bbf5b','L','heavy','spread','slash','flap','slam'],
 ['0009','Tortank','#4a90e2','L','heavy','beam','dash','spin','counter'],
 ['0133','Évoli','#c58f5a','S','fast','straight','dash','flap','boost'],
 ['0143','Ronflex','#3f6a78','XL','heavy','orb','pounce','spin','slam'],
 ['0068','Mackogneur','#8a93b5','L','heavy','arc','dash','rocket','counter'],
 ['0065','Alakazam','#e8c35a','M','reach','spread','slash','teleport','boost'],
 ['0130','Léviator','#3b7dd8','XL','heavy','beam','dash','flap','slam'],
 ['0149','Dracolosse','#f0a050','L','heavy','boomerang','dash','rocket','boost'],
 ['0059','Arcanin','#ff9c3a','L','bal','arc','dash','rocket','counter'],
 ['0039','Rondoudou','#ffb3d1','S','bal','straight','pounce','flap','boost'],
 ['0151','Mew','#ffa8e0','S','fast','spread','pounce','teleport','mine'],
 ['0249','Lugia','#cfd8e8','XL','reach','beam','slash','flap','counter'],
 ['0250','Ho-Oh','#ff6a3a','XL','reach','arc','dash','rocket','boost'],
 ['0248','Tyranocif','#6a8a4a','XL','heavy','orb','dash','spin','slam'],
 ['0208','Steelix','#9aa5b5','XL','heavy','straight','pounce','spin','counter'],
 ['0142','Ptéra','#a58fc2','L','fast','straight','dash','flap','mine'],
 ['0445','Carchacrok','#3a5fa8','L','bal','boomerang','dash','rocket','slam'],
 ['0282','Gardevoir','#e6e6f2','M','reach','orb','slash','teleport','counter'],
 ['0254','Jungko','#4cb86a','M','fast','spread','slash','rocket','boost'],
 ['0257','Braségali','#e0583a','M','bal','arc','dash','rocket','slam'],
 ['0260','Laggron','#3a7bd5','L','heavy','beam','dash','spin','counter'],
 ['0376','Métalosse','#5a6a88','XL','heavy','orb','pounce','spin','slam'],
 ['0384','Rayquaza','#3ba86a','XL','reach','beam','dash','rocket','boost'],
 ['0381','Latios','#5a86d9','M','fast','spread','dash','teleport','boost'],
 ['0778','Mimiqui','#e8d28a','S','bal','straight','slash','teleport','mine'],
 ['0359','Absol','#d0d6e6','M','fast','boomerang','slash','rocket','counter'],
 ['0571','Zoroark','#b24a4a','M','fast','arc','dash','teleport','counter'],
 ['0700','Nymphali','#ffb0d8','M','reach','spread','pounce','flap','boost'],
 ['0212','Cizayox','#d04a4a','M','heavy','straight','dash','rocket','counter'],
 ['0197','Noctali','#4a4a7a','S','bal','orb','pounce','teleport','counter'],
 ['0131','Lokhlass','#5ab0d0','XL','bal','beam','dash','flap','mine'],
 // --- Starters de toutes les générations
 ['0001','Bulbizarre','#5fbf6f','S','bal','spread','dash','flap','boost'],
 ['0004','Salamèche','#ff8a3a','S','fast','arc','dash','rocket','counter'],
 ['0007','Carapuce','#6ab0f0','S','bal','beam','pounce','spin','counter'],
 ['0152','Germignon','#8fd46a','S','bal','boomerang','slash','flap','boost'],
 ['0155','Héricendre','#f0a050','S','fast','arc','dash','rocket','slam'],
 ['0158','Kaiminus','#4a8ad8','S','bal','straight','pounce','spin','counter'],
 ['0252','Arcko','#7bcf6a','S','fast','straight','slash','rocket','mine'],
 ['0255','Poussifeu','#ff7a3a','S','fast','arc','dash','rocket','boost'],
 ['0258','Gobou','#5aa8e8','S','bal','beam','dash','spin','slam'],
 ['0387','Tortipouss','#7a9a4a','M','heavy','spread','dash','flap','slam'],
 ['0390','Ouisticram','#e8a04a','S','fast','arc','dash','rocket','counter'],
 ['0393','Tiplouf','#4a7ad8','S','bal','beam','pounce','flap','boost'],
 ['0495','Vipélierre','#6ac05a','S','fast','boomerang','slash','teleport','counter'],
 ['0498','Gruikui','#e0703a','M','heavy','arc','dash','spin','slam'],
 ['0501','Moustillon','#4a90d0','S','bal','boomerang','slash','flap','counter'],
 ['0650','Marisson','#9a7a4a','S','bal','spread','dash','flap','slam'],
 ['0653','Feunnec','#e8a04a','S','fast','arc','slash','teleport','mine'],
 ['0656','Grenousse','#6ab0e8','S','fast','boomerang','dash','teleport','counter'],
 ['0722','Brindibou','#a8c878','S','fast','boomerang','dash','flap','mine'],
 ['0725','Flamiaou','#e86a4a','S','fast','arc','slash','rocket','counter'],
 ['0728','Otaquin','#5a9ae8','S','bal','beam','pounce','flap','boost'],
 ['0810','Ouistempo','#6ac07a','S','fast','straight','dash','spin','boost'],
 ['0813','Flambino','#e8a05a','S','fast','arc','dash','rocket','slam'],
 ['0816','Larméléon','#7ab0d8','S','fast','straight','slash','teleport','mine'],
 ['0906','Poussacha','#7acf7a','S','fast','spread','slash','flap','boost'],
 ['0909','Chochodile','#e8603a','S','heavy','arc','pounce','rocket','slam'],
 ['0912','Coiffeton','#4a8ae8','S','fast','beam','dash','flap','counter'],
 // --- Axoloto et sa famille
 ['0194','Axoloto','#6a9ae8','S','bal','arc','pounce','flap','slam'],
 ['0195','Maraiste','#6a8ad8','M','heavy','beam','dash','flap','slam'],
 // --- Évolutions d'Évoli
 ['0134','Aquali','#5ab0e8','M','bal','beam','dash','flap','counter'],
 ['0135','Voltali','#ffe45a','M','fast','straight','dash','teleport','mine'],
 ['0136','Pyroli','#f08a4a','M','bal','arc','dash','rocket','boost'],
 ['0196','Mentali','#c88ae8','M','reach','orb','slash','teleport','counter'],
 ['0470','Phyllali','#8ad46a','M','fast','boomerang','slash','flap','boost'],
 ['0471','Givrali','#8ad8f0','M','reach','spread','slash','teleport','counter'],
 // --- Pokémon populaires et légendaires
 ['0382','Kyogre','#3a6ad8','XL','reach','beam','dash','flap','slam'],
 ['0383','Groudon','#d84a3a','XL','heavy','arc','dash','spin','slam'],
 ['0487','Giratina','#6a4a8a','XL','reach','orb','pounce','teleport','counter'],
 ['0483','Dialga','#4a7ad8','XL','heavy','beam','dash','flap','boost'],
 ['0484','Palkia','#d88ae8','XL','reach','orb','slash','teleport','boost'],
 ['0491','Darkrai','#4a3a5a','L','fast','arc','pounce','teleport','mine'],
 ['0493','Arceus','#e8e0c8','XL','reach','orb','slash','flap','boost'],
 ['0807','Zeraora','#e8d83a','M','fast','straight','dash','teleport','counter'],
 ['0468','Togekiss','#f0f0f8','M','reach','spread','slash','flap','boost'],
 ['0373','Drattak','#6a8ae8','L','heavy','arc','dash','rocket','slam'],
 ['0745','Lougaroc','#c88a5a','M','fast','boomerang','dash','rocket','counter'],
 ['0038','Feunard','#e8d08a','M','reach','arc','slash','teleport','mine'],
 ['0815','Pyrobut','#f0f0f0','M','fast','arc','dash','rocket','slam'],
 ['0727','Félinferno','#e8603a','L','heavy','beam','dash','spin','slam'],
 ['0724','Archéduc','#7a9a4a','M','fast','straight','slash','flap','mine'],
];

// ---------------------------------------------------------------- VARIÉTÉ DES KITS (chaque Pokémon a ses spéciaux)
const POOLS = {
  nb:['straight','arc','spread','boomerang','orb','beam','homing','wave','fan','rain'],
  sb:['dash','slash','pounce','spin','tackle','blink'],
  ub:['rocket','teleport','spin','flap','burst','glide','warp'],
  db:['counter','mine','boost','slam','reflect','heal','quake'],
};
const KIT_OVR = {
  '0025':['homing','blink','teleport','mine'],   '0006':['fan','tackle','rocket','slam'],      '0448':['orb','dash','burst','counter'],
  '0094':['homing','pounce','teleport','mine'],  '0658':['boomerang','blink','teleport','reflect'], '0150':['orb','slash','warp','reflect'],
  '0133':['straight','spin','flap','boost'],     '0143':['wave','tackle','burst','quake'],     '0130':['beam','tackle','flap','quake'],
  '0384':['beam','dash','burst','boost'],        '0151':['spread','blink','warp','heal'],      '0249':['beam','slash','glide','reflect'],
  '0003':['rain','slash','glide','quake'],       '0009':['beam','tackle','spin','counter'],    '0149':['boomerang','dash','glide','boost'],
  '0059':['fan','tackle','rocket','counter'],    '0445':['wave','tackle','burst','slam'],      '0282':['orb','slash','warp','heal'],
};
function hashStr(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
ROSTER.forEach(r => {
  const o = KIT_OVR[r[0]];
  if (o) { for (let i = 0; i < 4; i++) r[5 + i] = o[i]; return; }
  ['nb', 'sb', 'ub', 'db'].forEach((k, i) => { if (hashStr(r[0] + k) % 100 < 55) { const p = POOLS[k]; r[5 + i] = p[hashStr(r[0] + k + 'x') % p.length]; } });
});

// ---------------------------------------------------------------- FAMILLES D'ÉVOLUTION
// Chaque famille = liste de stades ; un stade = liste de formes possibles (ex. Évoli a 8 évolutions).
const FAMILIES = [
  [['0001'],['0002'],['0003']], [['0004'],['0005'],['0006']], [['0007'],['0008'],['0009']],
  [['0152'],['0153'],['0154']], [['0155'],['0156'],['0157']], [['0158'],['0159'],['0160']],
  [['0252'],['0253'],['0254']], [['0255'],['0256'],['0257']], [['0258'],['0259'],['0260']],
  [['0387'],['0388'],['0389']], [['0390'],['0391'],['0392']], [['0393'],['0394'],['0395']],
  [['0495'],['0496'],['0497']], [['0498'],['0499'],['0500']], [['0501'],['0502'],['0503']],
  [['0650'],['0651'],['0652']], [['0653'],['0654'],['0655']], [['0656'],['0657'],['0658']],
  [['0722'],['0723'],['0724']], [['0725'],['0726'],['0727']], [['0728'],['0729'],['0730']],
  [['0810'],['0811'],['0812']], [['0813'],['0814'],['0815']], [['0816'],['0817'],['0818']],
  [['0906'],['0907'],['0908']], [['0909'],['0910'],['0911']], [['0912'],['0913'],['0914']],
  [['0172'],['0025'],['0026']], [['0133'],['0134','0135','0136','0196','0197','0470','0471','0700']],
  [['0092'],['0093'],['0094']], [['0447'],['0448']], [['0446'],['0143']], [['0066'],['0067'],['0068']],
  [['0063'],['0064'],['0065']], [['0129'],['0130']], [['0147'],['0148'],['0149']], [['0058'],['0059']],
  [['0174'],['0039'],['0040']], [['0246'],['0247'],['0248']], [['0095'],['0208']], [['0443'],['0444'],['0445']],
  [['0280'],['0281'],['0282']], [['0374'],['0375'],['0376']], [['0570'],['0571']], [['0123'],['0212']],
  [['0194'],['0195']], [['0175'],['0176'],['0468']], [['0371'],['0372'],['0373']], [['0744'],['0745']], [['0037'],['0038']],
  [['0150']], [['0151']], [['0249']], [['0250']], [['0142']], [['0384']], [['0381']], [['0778']], [['0359']], [['0131']],
  [['0382']], [['0383']], [['0487']], [['0483']], [['0484']], [['0491']], [['0493']], [['0807']],
];
const EXTRA_NAMES = {
  '0002':'Herbizarre','0005':'Reptincel','0008':'Carabaffe','0153':'Macronium','0154':'Méganium','0156':'Feurisson','0157':'Typhlosion','0159':'Crocrodil','0160':'Aligatueur',
  '0253':'Massko','0256':'Galifeu','0259':'Flobio','0388':'Boskara','0389':'Torterra','0391':'Chimpenfeu','0392':'Simiabraz','0394':'Prinplouf','0395':'Pingoléon',
  '0496':'Lianaja','0497':'Majaspic','0499':'Grotichon','0500':'Roitiflam','0502':'Mateloutre','0503':'Clamiral','0651':'Boguérisse','0652':'Blindépique','0654':'Roussil','0655':'Goupelin',
  '0657':'Croâporal','0723':'Efflèche','0726':'Matoufeu','0729':'Otarlette','0730':'Oratoria','0811':'Badabouin','0812':'Gorythmic','0814':'Lapyro','0817':'Arrozard','0818':'Lézargus',
  '0907':'Matourago','0908':'Miascarade','0910':'Crocalor','0911':'Skelokrok','0913':'Canarbello','0914':'Palmaval',
  '0172':'Pichu','0026':'Raichu','0092':'Fantominus','0093':'Spectrum','0447':'Riolu','0446':'Goinfrex','0066':'Machoc','0067':'Machopeur','0063':'Abra','0064':'Kadabra',
  '0129':'Magicarpe','0147':'Minidraco','0148':'Draco','0058':'Caninos','0174':'Toudoudou','0040':'Grodoudou','0246':'Embrylex','0247':'Ymphect','0095':'Onix',
  '0443':'Griknot','0444':'Carmache','0280':'Tarsal','0281':'Kirlia','0374':'Terhal','0375':'Métang','0570':'Zorua','0123':'Insécateur','0175':'Togepi','0176':'Togetic',
  '0371':'Draby','0372':'Drackhaus','0744':'Rocabot','0037':'Goupix',
};
(function deriveForms() {
  const have = {}; ROSTER.forEach(r => { have[r[0]] = r; });
  const order = ['S', 'M', 'L', 'XL'];
  for (const fam of FAMILIES) {
    const found = [];                                       // [stade, ligne] des formes qui existent déjà
    fam.forEach((st, si) => st.forEach(id => { if (have[id]) found.push([si, have[id]]); }));
    fam.forEach((st, si) => st.forEach(id => {
      if (have[id]) return;
      let tpl = found.find(f => f[0] > si) || found[found.length - 1] || null;
      if (!tpl) tpl = [si, ['0000', '?', '#cccccc', 'M', 'bal', 'straight', 'dash', 'flap', 'counter']];
      const t = tpl[1], k = si - tpl[0];                    // k < 0 : forme plus jeune que le modèle
      const sz = clampN(order.indexOf(t[3]) + (k < 0 ? k : 1), 0, 3);
      const row = [id, EXTRA_NAMES[id] || id, t[2], order[sz], k < 0 ? (t[4] === 'heavy' ? 'bal' : t[4]) : t[4], t[5], t[6], t[7], t[8],
                   k < 0 ? { d:Math.max(.7, 1 + .1 * k), wt:Math.max(.7, 1 + .12 * k), sp:1 + .04 * -k } : { d:1.08, wt:1.05, sp:.98 }];
      ROSTER.push(row); have[id] = row;
    }));
  }
})();
function clampN(v, a, b) { return Math.max(a, Math.min(b, v)); }

const SIZES = {
  S:  { w:30, h:44, weight:82,  speed:340, jump:650, k:.9  },
  M:  { w:34, h:54, weight:98,  speed:310, jump:640, k:1   },
  L:  { w:44, h:66, weight:115, speed:275, jump:610, k:1.15 },
  XL: { w:54, h:80, weight:135, speed:235, jump:585, k:1.3 },
};
const STYLES = { fast:{ d:.9, t:.85, b:1, spd:1.05 }, bal:{ d:1, t:1, b:1, spd:1 }, heavy:{ d:1.2, t:1.15, b:1, spd:.95 }, reach:{ d:1, t:1.05, b:1.2, spd:1 } };

const NORMALS = {
  jab:   { dur:.30, hs:.06, he:.17, dmg:5,  base:170, gr:2.4, ang:40,  box:{x:10, y:-48, w:50, h:36}, anim:['Attack','Strike','Swing'], next:'jab2', cancel:true },
  jab2:  { dur:.28, hs:.05, he:.15, dmg:4,  base:160, gr:2.2, ang:45,  box:{x:10, y:-46, w:54, h:34}, anim:['Strike','Attack','Swing'], next:'jab3', cancel:true },
  jab3:  { dur:.40, hs:.09, he:.22, dmg:7,  base:250, gr:3.3, ang:38,  box:{x:10, y:-48, w:64, h:38}, anim:['Swing','Strike','Attack'], cancel:true },
  ftilt: { dur:.40, hs:.10, he:.26, dmg:9,  base:230, gr:3.3, ang:35,  box:{x:12, y:-50, w:64, h:34}, anim:['Strike','Attack','Swing'], chg:true, cancel:true },
  utilt: { dur:.38, hs:.08, he:.26, dmg:8,  base:250, gr:3.3, ang:88,  box:{x:-22,y:-100,w:60,h:58}, anim:['Swing','Attack','Strike'], chg:true, cancel:true },
  dtilt: { dur:.34, hs:.06, he:.20, dmg:7,  base:210, gr:2.8, ang:32,  box:{x:8,  y:-24, w:62, h:24}, anim:['Strike','Attack','Swing'], chg:true, cancel:true },
  dash:  { dur:.46, hs:.06, he:.30, dmg:8,  base:220, gr:3.0, ang:42,  box:{x:6,  y:-48, w:56, h:40}, anim:['Attack','Strike','Swing'], lunge:{ t1:.30, vx:430 }, cancel:true },
  nair:  { dur:.36, hs:.05, he:.26, dmg:7,  base:190, gr:2.9, ang:50,  box:{x:-36,y:-62, w:72, h:66}, anim:['Rotate','Attack','Swing'], cancel:true },
  fair:  { dur:.42, hs:.10, he:.24, dmg:10, base:250, gr:3.7, ang:38,  box:{x:8,  y:-56, w:58, h:42}, anim:['Strike','Attack','Swing'], cancel:true },
  bair:  { dur:.40, hs:.08, he:.24, dmg:11, base:260, gr:3.8, ang:36,  box:{x:-66,y:-56, w:56, h:42}, anim:['Swing','Strike','Attack'], flip:true, cancel:true },
  uair:  { dur:.36, hs:.06, he:.22, dmg:8,  base:230, gr:3.1, ang:88,  box:{x:-26,y:-106,w:52, h:48}, anim:['Swing','Attack'], cancel:true },
  dair:  { dur:.46, hs:.12, he:.28, dmg:9,  base:230, gr:3.0, ang:-72, box:{x:-24,y:-8,  w:48, h:46}, anim:['Attack','Strike'], cancel:true },
};
// Armes tenues (objets) : épée laser et marteau
const WEAPONS = {
  sword:  { dur:.36, hs:.08, he:.22, dmg:12, base:280, gr:3.6, ang:35, box:{x:6, y:-70, w:120, h:54}, anim:['Swing','Strike','Attack'] },
  hammer: { dur:.72, hs:.34, he:.5,  dmg:22, base:380, gr:5.0, ang:22, box:{x:6, y:-80, w:96,  h:80}, anim:['Swing','Strike','Attack'] },
};
const THROWS = {
  f: { dmg:8, base:250, gr:3.2, ang:40, flip:false },
  b: { dmg:9, base:260, gr:3.3, ang:38, flip:true  },
  u: { dmg:7, base:230, gr:3.0, ang:88, flip:false },
  d: { dmg:6, base:150, gr:1.6, ang:75, flip:false },
};
const GRAB = { kind:'grab', dur:.46, hs:.10, he:.24, box:{x:8, y:-50, w:46, h:42}, anim:['Pull','Strike','Attack'] };
const ANY_ATK = ['Strike','Attack','Swing'];

// Spéciaux : projectiles (neutre), mouvements latéraux, recoveries, spéciaux bas.
const NB = {
  straight:  { kind:'proj', dur:.5,  fire:.18, cd:.6,  n:1, p:{ speed:560, r:9,  dmg:6,  base:200, gr:2.4, ang:25, life:.9,  grav:0 } },
  arc:       { kind:'proj', dur:.55, fire:.2,  cd:.8,  n:1, p:{ speed:380, vy0:-260, r:13, dmg:9, base:240, gr:3.0, ang:45, life:1.5, grav:700 } },
  spread:    { kind:'proj', dur:.55, fire:.2,  cd:.9,  n:3, p:{ speed:480, r:8,  dmg:5,  base:170, gr:2.0, ang:30, life:.7,  grav:0, spread:.28 } },
  boomerang: { kind:'proj', dur:.55, fire:.2,  cd:1.0, n:1, p:{ speed:520, r:11, dmg:6,  base:190, gr:2.4, ang:35, life:1.3, grav:0, boom:true } },
  orb:       { kind:'proj', dur:.7,  fire:.3,  cd:1.2, n:1, p:{ speed:260, r:22, dmg:13, base:270, gr:3.6, ang:45, life:1.6, grav:0 } },
  homing:    { kind:'proj', dur:.55, fire:.22, cd:1.0, n:1, p:{ speed:330, r:11, dmg:7, base:210, gr:2.6, ang:40, life:1.9, grav:0, home:true } },
  wave:      { kind:'proj', dur:.6,  fire:.24, cd:1.0, n:1, p:{ speed:430, r:15, dmg:8, base:200, gr:2.4, ang:70, life:.95, grav:0, low:true } },
  fan:       { kind:'proj', dur:.5,  fire:.18, cd:.9,  n:5, p:{ speed:520, r:9,  dmg:4, base:150, gr:1.8, ang:30, life:.34, grav:0, spread:.3 } },
  rain:      { kind:'proj', dur:.6,  fire:.22, cd:1.1, n:3, p:{ speed:300, vy0:-620, r:10, dmg:6, base:190, gr:2.4, ang:70, life:1.5, grav:1500, rain:true } },
  beam:      { kind:'beam', dur:.65, hs:.16, he:.32, cd:1.0, dmg:9, base:230, gr:3.0, ang:30, box:{x:16, y:-50, w:280, h:30} },
};
const SB = {
  dash:   { kind:'dash', dur:.55, hs:.08, he:.36, cd:.9, dmg:10, base:260, gr:3.2, ang:35, box:{x:6, y:-50, w:50, h:44}, lunge:{ t1:.34, vx:620 } },
  slash:  { kind:'dash', dur:.6,  hs:.15, he:.32, cd:.9, dmg:12, base:270, gr:3.4, ang:40, box:{x:8, y:-72, w:92, h:72}, lunge:{ t1:.2, vx:200 } },
  spin:   { kind:'dash', dur:.72, hs:.08, he:.62, rehit:.13, cd:1.0, dmg:3.5, base:120, gr:1.2, ang:60, box:{x:-34, y:-62, w:80, h:62}, lunge:{ t1:.58, vx:380 } },
  tackle: { kind:'dash', dur:.68, hs:.10, he:.42, cd:1.1, dmg:13, base:300, gr:3.8, ang:30, box:{x:4, y:-58, w:62, h:58}, lunge:{ t1:.42, vx:800 } },
  blink:  { kind:'blink', dur:.55, tele:.10, dist:260, hs:.18, he:.38, cd:1.0, invA:.04, invB:.2, dmg:9, base:250, gr:3.3, ang:35, box:{x:-10, y:-60, w:80, h:60} },
  pounce: { kind:'dash', dur:.75, hs:.26, he:.55, cd:1.0, dmg:11, base:250, gr:3.2, ang:32, box:{x:4, y:-60, w:64, h:60}, impulse:{ vx:380, vy:-420 } },
};
const UB = {
  rocket:   { kind:'rocket',   dur:.5,  hs:.05, he:.30, dmg:6, base:240, gr:2.4, ang:80, box:{x:-22, y:-76, w:44, h:64}, impulse:{ vx:150, vy:-660 } },
  teleport: { kind:'teleport', dur:.6,  tele:.16, dist:150, invA:.06, invB:.42 },
  spin:     { kind:'spin',     dur:.75, hs:.05, he:.62, rehit:.16, dmg:4, base:160, gr:1.6, ang:85, box:{x:-34, y:-76, w:68, h:78}, climb:{ t1:.52, vy:-430 } },
  burst:    { kind:'rocket', dur:.55, hs:.02, he:.34, dmg:9, base:280, gr:3, ang:85, box:{x:-42, y:-96, w:84, h:104}, impulse:{ vx:0, vy:-720 } },
  glide:    { kind:'glide', dur:1.0, impulse:{ vx:0, vy:-430 } },
  warp:     { kind:'teleport', dur:.7, tele:.2, dist:250, invA:.08, invB:.5 },
  flap:     { kind:'flap',     dur:.45, impulse:{ vx:0, vy:-640 } },
};
const DB = {
  counter: { kind:'counter', dur:.75, win0:.05, win1:.45, cd:1.3 },
  mine:    { kind:'mine',    dur:.45, fire:.2, cd:1.2, p:{ r:16, dmg:11, base:250, gr:3.2, ang:60, life:9 } },
  boost:   { kind:'boost',   dur:.6,  cd:9, buff:8 },
  reflect: { kind:'reflect', dur:.7, win0:.05, win1:.5, cd:1.4 },
  heal:    { kind:'heal',    dur:.95, cd:9 },
  quake:   { kind:'quake',   dur:.65, fire:.26, cd:1.3, p:{ speed:480, r:15, dmg:9, base:230, gr:3, ang:72, life:.75, grav:0, low:true } },
  slam:    { kind:'slam',    dur:.6,  hs:.12, he:.40, cd:1.0, dmg:10, base:240, gr:3.0, ang:70, box:{x:-78, y:-34, w:156, h:34}, impulse:{ vx:0, vy:800, air:true } },
};

function buildChar(row, idx) {
  const [id, name, color, size, style, nb, sb, ub, db, tune] = row;
  const tn = Object.assign({ d:1, wt:1, sp:1 }, tune || {});
  const sz = SIZES[size], st = STYLES[style];
  const ch = { idx, id, name, color, size, style, w:sz.w, h:sz.h, weight:Math.round(sz.weight * (style === 'heavy' ? 1.05 : 1) * tn.wt),
               speed:sz.speed * st.spd * tn.sp, jump:sz.jump, air:2, types:{ nb, sb, ub, db }, moves:{} };
  const scaleBox = (b, k, bw) => ({ x:b.x * k, y:b.y * k, w:b.w * k * bw, h:b.h * k });
  const mk = (t, boxW) => {
    const m = JSON.parse(JSON.stringify(t));
    if (m.dmg !== undefined) m.dmg = Math.round(m.dmg * st.d * tn.d * 10) / 10;
    if (m.p && m.p.dmg !== undefined) m.p.dmg = Math.round(m.p.dmg * st.d * tn.d * 10) / 10;
    m.dur *= st.t; if (m.hs !== undefined) { m.hs *= st.t; m.he *= st.t; }
    if (m.box) m.box = scaleBox(m.box, sz.k, m.kind === 'beam' ? 1 : (boxW || 1));
    if (!m.anim) m.anim = ANY_ATK;
    return m;
  };
  for (const k in NORMALS) ch.moves[k] = mk(NORMALS[k], st.b);
  for (const k in WEAPONS) ch.moves[k] = mk(WEAPONS[k], 1);
  ch.moves.grab = mk(GRAB, 1);
  ch.moves.nb = mk(NB[nb], st.b); ch.moves.nb.anim = ['Shoot','Charge','Attack','Strike'];
  ch.moves.sb = mk(SB[sb], st.b); ch.moves.sb.anim = sb === 'pounce' ? ['LeapForth','Hop','Strike','Attack'] : sb === 'spin' ? ['Rotate','Strike','Attack'] : sb === 'blink' ? ['LeapForth','Strike','Attack'] : ['Strike','Attack','LeapForth','Swing'];
  ch.moves.ub = mk(UB[ub], 1); ch.moves.ub.anim = ['LeapForth','Hop','Float','Strike'];
  ch.moves.db = mk(DB[db], 1); ch.moves.db.anim = (db === 'slam' || db === 'quake') ? ['Strike','HitGround','Attack'] : ['Pose','Charge','Idle'];
  ch.moves.throw = { kind:'throw', dur:.32, anim:['Strike','Swing','Attack'] };
  ch.moves.ult = { kind:'ult', dur:3, anim:['Charge','Attack','Strike','Pose'] };
  return ch;
}
const CHARS = ROSTER.map(buildChar);
const CHAR_BY_ID = {}; CHARS.forEach((c, i) => { CHAR_BY_ID[c.id] = i; });
const FAM_OF = {}; FAMILIES.forEach((fam, fi) => fam.forEach(st => st.forEach(id => { FAM_OF[id] = fi; })));
const BASE_FORMS = FAMILIES.map(fam => CHAR_BY_ID[fam[0][0]]);          // formes affichées dans le menu de sélection
const BASE_COUNT = CHARS.length;                                         // les Pokémon créés (fusion) sont ajoutés après
function familyChars(i) { return FAMILIES[FAM_OF[CHARS[i].id]].map(st => st.map(id => CHAR_BY_ID[id])); }
function shinyHue(ch) { return 40 + (hashStr(ch.id) % 280); }


// ---------------------------------------------------------------- TYPES ET ATTAQUES ULTIMES
const TYPE_STR = `0001:Plante 0002:Plante 0003:Plante 0004:Feu 0005:Feu 0006:Feu 0007:Eau 0008:Eau 0009:Eau 0025:Électrik 0026:Électrik 0172:Électrik
0037:Feu 0038:Feu 0039:Fée 0040:Fée 0174:Fée 0058:Feu 0059:Feu 0063:Psy 0064:Psy 0065:Psy 0066:Combat 0067:Combat 0068:Combat
0092:Spectre 0093:Spectre 0094:Spectre 0095:Roche 0208:Acier 0123:Insecte 0212:Insecte 0129:Eau 0130:Eau 0131:Glace
0133:Normal 0134:Eau 0135:Électrik 0136:Feu 0196:Psy 0197:Ténèbres 0470:Plante 0471:Glace 0700:Fée 0142:Vol 0143:Normal 0446:Normal
0147:Dragon 0148:Dragon 0149:Dragon 0150:Psy 0151:Psy 0152:Plante 0153:Plante 0154:Plante 0155:Feu 0156:Feu 0157:Feu 0158:Eau 0159:Eau 0160:Eau
0175:Fée 0176:Fée 0468:Fée 0194:Eau 0195:Eau 0246:Roche 0247:Roche 0248:Roche 0249:Vol 0250:Feu
0252:Plante 0253:Plante 0254:Plante 0255:Feu 0256:Feu 0257:Feu 0258:Eau 0259:Eau 0260:Eau 0280:Psy 0281:Psy 0282:Psy
0359:Ténèbres 0371:Dragon 0372:Dragon 0373:Dragon 0374:Acier 0375:Acier 0376:Acier 0381:Dragon 0382:Eau 0383:Sol 0384:Dragon
0387:Plante 0388:Plante 0389:Plante 0390:Feu 0391:Feu 0392:Feu 0393:Eau 0394:Eau 0395:Eau 0443:Dragon 0444:Dragon 0445:Dragon 0447:Combat 0448:Combat
0483:Dragon 0484:Dragon 0487:Spectre 0491:Ténèbres 0493:Normal 0495:Plante 0496:Plante 0497:Plante 0498:Feu 0499:Feu 0500:Feu 0501:Eau 0502:Eau 0503:Eau
0570:Ténèbres 0571:Ténèbres 0650:Plante 0651:Plante 0652:Plante 0653:Feu 0654:Feu 0655:Feu 0656:Eau 0657:Eau 0658:Eau
0722:Plante 0723:Plante 0724:Plante 0725:Feu 0726:Feu 0727:Feu 0728:Eau 0729:Eau 0730:Eau 0744:Roche 0745:Roche 0778:Spectre
0810:Plante 0811:Plante 0812:Plante 0813:Feu 0814:Feu 0815:Feu 0816:Eau 0817:Eau 0818:Eau 0807:Électrik
0906:Plante 0907:Plante 0908:Plante 0909:Feu 0910:Feu 0911:Feu 0912:Eau 0913:Eau 0914:Eau`;
const TYPE_OF = {}; TYPE_STR.split(/\s+/).forEach(p => { const [id, t] = p.split(':'); TYPE_OF[id] = t; });
// moteur : sweep (jet horizontal), tide (vague), vines (lianes ciblées), strike (foudre ciblée), rain (pluie de projectiles),
//          quake (ondes de choc), blast (rayon géant), nova (ondes radiales), swarm (essaim guidé), storm (tornades)
const ULT_BY_TYPE = {
  Feu:      { e:'sweep',  name:'Tourbillon de flammes', color:'#ff7a2b', dur:2.4 },
  Eau:      { e:'tide',   name:'Raz-de-marée',          color:'#3a9aff', dur:2.9 },
  Plante:   { e:'vines',  name:'Jungle déchaînée',      color:'#4cc04a', dur:2.7 },
  Électrik: { e:'strike', name:'Foudre divine',         color:'#ffe84a', dur:2.5 },
  Glace:    { e:'rain',   name:'Blizzard polaire',      color:'#9fe8ff', dur:2.7, rock:false },
  Roche:    { e:'rain',   name:'Pluie de météores',     color:'#c0a070', dur:2.7, rock:true },
  Sol:      { e:'quake',  name:'Séisme titanesque',     color:'#d8a03a', dur:2.6 },
  Acier:    { e:'blast',  name:'Flash canon',           color:'#d8e0f0', dur:2.4, len:1200, hh:150 },
  Dragon:   { e:'blast',  name:'Colère draconique',     color:'#8a6aff', dur:2.8, len:1500, hh:210 },
  Combat:   { e:'nova',   name:'Déferlante d\'aura',    color:'#ff8a4a', dur:2.5, n:5, gap:.36, r1:380 },
  Psy:      { e:'nova',   name:'Psycho-onde',           color:'#ff7ad9', dur:2.6, n:3, gap:.56, r1:560 },
  Normal:   { e:'nova',   name:'Ultra-impact',          color:'#f0e8d0', dur:2.6, n:3, gap:.56, r1:480 },
  Fée:      { e:'nova',   name:'Rayon de lune',         color:'#ffb0e0', dur:2.7, n:3, gap:.56, r1:600, heal:20 },
  Spectre:  { e:'swarm',  name:'Cauchemar éternel',     color:'#9a5ae0', dur:2.6 },
  Ténèbres: { e:'swarm',  name:'Éclipse maudite',       color:'#6a5aa0', dur:2.6 },
  Poison:   { e:'swarm',  name:'Tempête toxique',       color:'#c05ae0', dur:2.6 },
  Insecte:  { e:'swarm',  name:'Nuée dévorante',        color:'#a8d83a', dur:2.6 },
  Vol:      { e:'storm',  name:'Ouragan céleste',       color:'#bfe0ff', dur:3.2 },
};
const ultTypeOf = ch => TYPE_OF[ch.custom ? ch.custom.head : ch.id] || 'Normal';

// Ultimes signatures (en plus de l'ultime par type) : nom et combinaison d'effets propres à chaque Pokémon populaire
const SIG_ULT = {
  '0025': { name:'Tonnerre Méga-Volt',      color:'#ffe84a', dur:3.5, parts:[{ e:'strike', at:0 }, { e:'nova', at:1.9, n:2, gap:.5, r1:540 }] },
  '0448': { name:'Aura Sphère Ultime',      color:'#4aa8ff', dur:3.3, parts:[{ e:'nova', at:0, n:2, gap:.45, r1:320 }, { e:'blast', at:1.0, len:1300, hh:190 }] },
  '0150': { name:'Psycho-Apocalypse',       color:'#ff7ad9', dur:3.5, parts:[{ e:'swarm', at:0 }, { e:'nova', at:1.3, n:3, gap:.5, r1:640 }] },
  '0094': { name:'Cauchemar Abyssal',       color:'#8a4bd6', dur:3.5, dark:true, parts:[{ e:'swarm', at:0 }, { e:'swarm', at:.9 }] },
  '0658': { name:'Hydro-Shuriken Ténébreux',color:'#5ad0ff', dur:3.3, parts:[{ e:'rain', at:0, rock:false }, { e:'tide', at:1.2 }] },
  '0249': { name:'Aéropique Cataclysme',    color:'#bfe0ff', dur:3.7, parts:[{ e:'storm', at:0 }, { e:'blast', at:1.1, len:1300, hh:170 }] },
  '0384': { name:'Colère Céleste',          color:'#3ba86a', dur:3.5, parts:[{ e:'strike', at:0 }, { e:'blast', at:1.1, len:1500, hh:220 }] },
  '0493': { name:'Jugement Divin',          color:'#f0e8c0', dur:3.9, parts:[{ e:'nova', at:0, n:4, gap:.4, r1:560 }, { e:'blast', at:1.9, len:1400, hh:200 }] },
  '0151': { name:'Pluie Cosmique',          color:'#ffa8e0', dur:3.5, parts:[{ e:'rain', at:0, rock:false }, { e:'nova', at:1.4, n:2, gap:.5, r1:520 }] },
  '0571': { name:'Illusion Mortelle',       color:'#b24a4a', dur:3.3, dark:true, parts:[{ e:'swarm', at:0 }, { e:'strike', at:1.0 }] },
  '0383': { name:'Séisme Primordial',       color:'#d84a3a', dur:3.3, parts:[{ e:'quake', at:0 }, { e:'sweep', at:1.3 }] },
  '0382': { name:'Déluge Primordial',       color:'#3a6ad8', dur:3.5, parts:[{ e:'tide', at:0 }, { e:'rain', at:1.0, rock:false }] },
  '0257': { name:'Pyro-Fracas Enflammé',    color:'#e0583a', dur:3.3, parts:[{ e:'sweep', at:0 }, { e:'nova', at:1.2, n:2, gap:.45, r1:420 }] },
  '0445': { name:'Draco-Fracas',            color:'#3a5fa8', dur:3.3, parts:[{ e:'quake', at:0 }, { e:'blast', at:1.3, len:1200, hh:180 }] },
  '0282': { name:'Pleine Lune Éternelle',   color:'#e6e6f2', dur:3.1, parts:[{ e:'nova', at:0, n:3, gap:.5, r1:580, heal:25 }] },
  '0133': { name:'Furie Évolutive',         color:'#c58f5a', dur:3.1, parts:[{ e:'nova', at:0, n:2, gap:.5, r1:440 }, { e:'swarm', at:.8 }] },
  '0143': { name:'Sieste Cataclysmique',    color:'#3f6a78', dur:3.2, parts:[{ e:'quake', at:0 }, { e:'quake', at:1.0 }] },
  '0197': { name:'Lune Sanglante',          color:'#6a5ab0', dur:3.3, dark:true, parts:[{ e:'swarm', at:0 }, { e:'nova', at:1.2, n:2, gap:.5, r1:480 }] },
  '0700': { name:'Rubans Féeriques',        color:'#ffb0d8', dur:3.2, parts:[{ e:'swarm', at:0 }, { e:'nova', at:1.0, n:2, gap:.5, r1:500, heal:12 }] },
  '0807': { name:'Plasma Dévastateur',      color:'#e8d83a', dur:3.4, parts:[{ e:'strike', at:0 }, { e:'strike', at:.9 }, { e:'nova', at:1.8, n:2, gap:.5, r1:480 }] },
  '0487': { name:'Monde Distorsion',        color:'#7a5ab0', dur:3.4, dark:true, parts:[{ e:'swarm', at:0 }, { e:'quake', at:1.0 }] },
  '0483': { name:'Chrono-Canon',            color:'#6a8aff', dur:3.4, parts:[{ e:'blast', at:0, len:1500, hh:200 }, { e:'nova', at:1.5, n:2, gap:.5, r1:520 }] },
  '0484': { name:'Spatio-Fissure',          color:'#e08af0', dur:3.4, parts:[{ e:'nova', at:0, n:3, gap:.45, r1:640 }, { e:'blast', at:1.6, len:1400, hh:190 }] },
  '0130': { name:'Tsunami Mégadraco',       color:'#3b7dd8', dur:3.5, parts:[{ e:'tide', at:0 }, { e:'tide', at:1.0 }] },
  '0149': { name:'Colère du Dragon Suprême',color:'#f0a050', dur:3.4, parts:[{ e:'storm', at:0 }, { e:'blast', at:1.1, len:1400, hh:200 }] },
  '0248': { name:'Fracas Titanesque',       color:'#8a9a5a', dur:3.3, parts:[{ e:'quake', at:0 }, { e:'rain', at:1.0, rock:true }] },
  '0003': { name:'Floraison Cataclysmique', color:'#6bd36b', dur:3.4, parts:[{ e:'vines', at:0 }, { e:'nova', at:1.9, n:2, gap:.5, r1:480 }] },
  '0009': { name:'Hydro-Canon Final',       color:'#4a90e2', dur:3.3, parts:[{ e:'blast', at:0, len:1300, hh:180 }, { e:'tide', at:1.5 }] },
  '0212': { name:'Tranche-Lune',            color:'#d04a4a', dur:3.1, parts:[{ e:'sweep', at:0 }, { e:'swarm', at:1.0 }] },
  '0359': { name:'Prémonition Fatale',      color:'#d0d6e6', dur:3.2, dark:true, parts:[{ e:'strike', at:0 }, { e:'swarm', at:1.0 }] },
  '0373': { name:'Draco-Ouragan',           color:'#6a8ae8', dur:3.5, parts:[{ e:'storm', at:0 }, { e:'blast', at:1.2, len:1300, hh:190 }] },
};
const ultOf = ch => {
  const base = ULT_BY_TYPE[ultTypeOf(ch)] || ULT_BY_TYPE.Normal, sg = SIG_ULT[ch.custom ? ch.custom.head : ch.id];
  return sg ? Object.assign({}, base, sg) : base;
};


// ---------------------------------------------------------------- DÉCORS
// Coordonnées du monde : x = 0 au centre du décor, y = 0 au niveau de la plateforme principale.
// La caméra suit les combattants et dézoome automatiquement.
const mainP = (x, w, y, style) => ({ x, y:y || 0, w, soft:false, style });
const softP = (x, y, w, mv, style) => ({ x, y, w, soft:true, mv, style });
const STAGES = [
  { id:'prairie', name:'Prairie fleurie', theme:'prairie', bg:['#5aa8f0','#bfe4ff','#e8f6d0'], top:'#6bd36b', body:'#6a4a2a', soft:'#b08a50', bounds:{ l:-1250, r:1250, t:-900, b:650 }, spawn:[0, 0],
    plats:[ mainP(-560, 1120), softP(-470, -135, 190), softP(280, -135, 190), softP(-95, -270, 190) ] },
  { id:'finale', name:'Dimension finale', theme:'space', bg:['#05061a','#1a1245','#2a0f4a'], top:'#9aa7ff', body:'#1c1a4a', soft:'#5a5ab8', bounds:{ l:-1350, r:1350, t:-900, b:650 }, spawn:[0, 0],
    plats:[ mainP(-650, 1300, 0, 'space') ] },
  { id:'ciel', name:'Cité du ciel', theme:'sky', bg:['#3a7ad8','#9ccaf5','#f4ead0'], top:'#ffffff', body:'#c8d8f0', soft:'#f0f4ff', bounds:{ l:-1350, r:1350, t:-950, b:700 }, spawn:[0, 0],
    plats:[ mainP(-380, 760, 0, 'cloud'), softP(-780, -130, 240, null, 'cloud'), softP(540, -130, 240, null, 'cloud'), softP(-130, -270, 260, null, 'cloud'), softP(-1000, -280, 160, { x0:-1000, ax:60, sp:.6 }, 'cloud'), softP(840, -280, 160, { x0:840, ax:-60, sp:.6 }, 'cloud') ] },
  { id:'pont', name:'Pont suspendu', theme:'bridge', bg:['#2a1840','#8a3a5a','#f0a050'], top:'#b0804a', body:'#3a2418', soft:'#c89a60', bounds:{ l:-1400, r:1400, t:-900, b:650 }, spawn:[0, 0],
    plats:[ mainP(-760, 1520, 0, 'bridge'), softP(-520, -150, 200), softP(320, -150, 200), softP(-100, -285, 200) ] },
  { id:'volcan', name:'Volcan en éruption', theme:'volcano', bg:['#1a0505','#6a1a0a','#c0400a'], top:'#a06040', body:'#2a1210', soft:'#d0652a', bounds:{ l:-1300, r:1300, t:-900, b:700 }, spawn:[0, 0],
    plats:[ mainP(-420, 840, 0, 'rock'), softP(-800, -140, 220, { x0:-800, ax:120, sp:.7 }), softP(580, -140, 220, { x0:580, ax:-120, sp:.7 }), softP(-110, -280, 220, { x0:-110, ax:190, sp:1 }) ] },
  { id:'foret', name:'Forêt mystique', theme:'forest', bg:['#0a1a22','#16402e','#2a6a3a'], top:'#5aa84a', body:'#3a2a1a', soft:'#7a5a30', bounds:{ l:-1300, r:1300, t:-950, b:650 }, spawn:[0, 0],
    plats:[ mainP(-600, 1200, 0, 'grass'), softP(-720, -160, 220, null, 'wood'), softP(500, -160, 220, null, 'wood'), softP(-380, -300, 200, null, 'wood'), softP(180, -300, 200, null, 'wood'), softP(-110, -150, 220, null, 'wood') ] },
  { id:'glace', name:'Temple glacé', theme:'ice', bg:['#0a1a3a','#2a5a9a','#a8d8f0'], top:'#d8f4ff', body:'#6a9ac8', soft:'#a8dcf8', bounds:{ l:-1250, r:1250, t:-900, b:650 }, spawn:[0, 0],
    plats:[ mainP(-540, 1080, 0, 'ice'), softP(-460, -140, 180, null, 'ice'), softP(280, -140, 180, null, 'ice'), softP(-90, -280, 180, { x0:-90, ax:220, sp:.8 }, 'ice') ] },
  { id:'ville', name:'Ville néon', theme:'city', bg:['#0a0620','#2a0a4a','#6a1a6a'], top:'#8a8aa8', body:'#1a1a2a', soft:'#ff4ad8', bounds:{ l:-1450, r:1450, t:-950, b:700 }, spawn:[0, 0],
    plats:[ mainP(-360, 720, 0, 'roof'), mainP(-940, 380, -70, 'roof'), mainP(560, 380, -70, 'roof'), softP(-90, -200, 220), softP(-700, -240, 180), softP(520, -240, 180), softP(-1100, -300, 160, { x0:-1100, ax:50, sp:.9 }), softP(940, -300, 160, { x0:940, ax:-50, sp:.9 }) ] },
  { id:'plage', name:'Plage ensoleillée', theme:'beach', bg:['#2a9ae8','#8ad8f8','#fff0c0'], top:'#f0d890', body:'#b89a5a', soft:'#c89860', bounds:{ l:-1300, r:1300, t:-900, b:650 }, spawn:[0, 0],
    plats:[ mainP(-620, 1240, 0, 'sand'), softP(-540, -140, 200, null, 'wood'), softP(340, -140, 200, null, 'wood'), softP(-120, -250, 240, { x0:-120, ax:250, sp:.5 }, 'wood') ] },
  { id:'cristal', name:'Grotte de cristaux', theme:'crystal', bg:['#080418','#150a3a','#241060'], top:'#8a7aff', body:'#1c1450', soft:'#7a6aff', bounds:{ l:-1250, r:1250, t:-900, b:650 }, spawn:[0, 0],
    plats:[ mainP(-520, 1040, 0, 'crystal'), softP(-460, -135, 180, null, 'crystal'), softP(280, -135, 180, null, 'crystal'), softP(-90, -270, 180, { x0:-90, ax:160, sp:.9 }, 'crystal'), softP(-860, -250, 150, null, 'crystal'), softP(710, -250, 150, null, 'crystal') ] },
  { id:'desert', name:'Ruines du désert', theme:'desert', bg:['#c8502a','#f0a050','#ffe0a0'], top:'#e8c07a', body:'#a8743c', soft:'#c88e54', bounds:{ l:-1300, r:1300, t:-900, b:650 }, spawn:[0, 0],
    plats:[ mainP(-600, 1200, 0, 'ruin'), softP(-500, -140, 200, null, 'ruin'), softP(300, -140, 200, null, 'ruin'), softP(-100, -280, 200, null, 'ruin') ] },
  { id:'manoir', name:'Manoir hanté', theme:'haunted', bg:['#05040e','#201a3a','#3a2a5a'], top:'#6a7a5a', body:'#2a2638', soft:'#5a5670', bounds:{ l:-1250, r:1250, t:-900, b:650 }, spawn:[0, 0],
    plats:[ mainP(-560, 1120, 0, 'grave'), softP(-480, -140, 190, null, 'grave'), softP(290, -140, 190, null, 'grave'), softP(-95, -270, 190, { x0:-95, ax:140, sp:.7 }, 'grave') ] },
];

// ---------------------------------------------------------------- OBJETS
const ITEMS = {
  heal:    { name:'Baie Sitrus',   emoji:'🍒', w:24, kind:'use',  text:'-25 %' },
  maxheal: { name:'Potion Max',    emoji:'💊', w:6,  kind:'use',  text:'-60 %' },
  power:   { name:'Pilule Force',  emoji:'💪', w:15, kind:'use',  text:'Puissance !' },
  speed:   { name:'Plume Vitesse', emoji:'👟', w:12, kind:'use',  text:'Vitesse !' },
  star:    { name:'Étoile',        emoji:'⭐', w:5,  kind:'use',  text:'Invincible !' },
  barrier: { name:'Barrière',      emoji:'🛡️', w:12, kind:'use',  text:'Barrière !' },
  heart:   { name:'Cœur',          emoji:'💖', w:3,  kind:'use',  text:'+1 vie' },
  bomb:    { name:'Bombe',         emoji:'💣', w:18, kind:'throw', text:'Bombe : attaque pour lancer' },
  ball:    { name:'Poké Ball',     emoji:'🔴', w:12, kind:'throw', text:'Ball : attaque pour lancer' },
  freeze:  { name:'Glaçon',        emoji:'🧊', w:9,  kind:'throw', text:'Glaçon : lance-le !' },
  banana:  { name:'Banane',        emoji:'🍌', w:10, kind:'throw', text:'Banane : piège !' },
  mushroom:{ name:'Champi géant',  emoji:'🍄', w:6,  kind:'use',   text:'GÉANT !' },
  bolt:    { name:'Éclair',        emoji:'⚡', w:5,  kind:'use',   text:'Éclair !' },
  sword:   { name:'Épée laser',    emoji:'⚔️', w:8,  kind:'wield', uses:5, text:'Épée : attaque !' },
  hammer:  { name:'Marteau',       emoji:'🔨', w:5,  kind:'wield', uses:3, text:'Marteau !' },
  regen:   { name:'Herbe soin',    emoji:'🌿', w:10, kind:'use',   text:'Régénération' },
  jumps:   { name:'Bottes fusée',  emoji:'🚀', w:8,  kind:'use',   text:'Sauts +2 !' },
  meteor:  { name:'Météores',      emoji:'☄️', w:4,  kind:'use',   text:'Pluie de météores !' },
};
const ITEM_KEYS = Object.keys(ITEMS);

