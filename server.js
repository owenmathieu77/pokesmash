'use strict';
/*
 * PokeSmash — serveur : fichiers du jeu + comptes + sauvegardes + amis + invitations + salons publics.
 * Aucune dépendance (Node 18+). La base de données est un fichier JSON, copié en continu dans un dépôt GitHub (privé conseillé).
 */
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto'), { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const GH = {
  token:process.env.GH_TOKEN || '', repo:process.env.GH_REPO || '', branch:process.env.GH_BRANCH || 'main',
  file:process.env.GH_PATH || 'db.json', api:(process.env.GITHUB_API || 'https://api.github.com').replace(/\/$/, ''),
  sha:null, ok:false, last:null, err:null,
};
const ghOn = !!(GH.token && GH.repo);

// ------------------------------------------------------------------ base de données (persistante) et état temporaire
let db = { users:{}, sessions:{} };
const mem = { rooms:{}, presence:{}, invites:{}, rate:new Map() };
let dirty = false;
const now = () => Date.now();
const markDirty = () => { dirty = true; };
function loadLocal() { try { const j = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); if (j && j.users) db = Object.assign({ users:{}, sessions:{} }, j); } catch (e) { /* première exécution */ } }
function saveLocal() {
  try { fs.mkdirSync(DATA_DIR, { recursive:true }); const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_FILE); } catch (e) { console.error('sauvegarde locale impossible :', e.message); }
}

// ------------------------------------------------------------------ synchronisation avec GitHub (API « Contents »)
async function gh(method, urlPath, body, raw) {
  const r = await fetch(GH.api + urlPath, { method, headers:Object.assign({ Authorization:'Bearer ' + GH.token, 'User-Agent':'pokesmash-server', Accept:raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28' }, body ? { 'Content-Type':'application/json' } : {}), body:body ? JSON.stringify(body) : undefined });
  return r;
}
async function ghLoad() {
  if (!ghOn) return;
  try {
    const q = '/repos/' + GH.repo + '/contents/' + encodeURIComponent(GH.file).replace(/%2F/g, '/') + '?ref=' + encodeURIComponent(GH.branch);
    const r = await gh('GET', q);
    if (r.status === 404) { GH.ok = true; GH.sha = null; return; }
    if (!r.ok) throw new Error('GitHub ' + r.status);
    const j = await r.json(); GH.sha = j.sha;
    let text = j.encoding === 'base64' && j.content ? Buffer.from(j.content, 'base64').toString('utf8') : '';
    if (!text) { const rr = await gh('GET', q, null, true); text = await rr.text(); }
    const d = JSON.parse(text); if (d && d.users) { db = Object.assign({ users:{}, sessions:{} }, d); saveLocal(); }
    GH.ok = true; GH.err = null; console.log('base chargée depuis GitHub :', Object.keys(db.users).length, 'comptes');
  } catch (e) { GH.err = e.message; console.error('chargement GitHub impossible :', e.message); }
}
async function ghPush() {
  if (!ghOn) return true;
  const body = { message:'sauvegarde auto ' + new Date().toISOString(), content:Buffer.from(JSON.stringify(db)).toString('base64'), branch:GH.branch };
  const url = '/repos/' + GH.repo + '/contents/' + encodeURIComponent(GH.file).replace(/%2F/g, '/');
  for (let attempt = 0; attempt < 2; attempt++) {
    if (GH.sha) body.sha = GH.sha; else delete body.sha;
    const r = await gh('PUT', url, body);
    if (r.ok) { const j = await r.json(); GH.sha = j.content && j.content.sha; GH.ok = true; GH.last = now(); GH.err = null; return true; }
    if (r.status === 409 || r.status === 422) {       // sha périmé : on le relit puis on réessaie
      const g = await gh('GET', '/repos/' + GH.repo + '/contents/' + encodeURIComponent(GH.file).replace(/%2F/g, '/') + '?ref=' + encodeURIComponent(GH.branch));
      GH.sha = g.ok ? (await g.json()).sha : null; continue;
    }
    GH.err = 'GitHub ' + r.status; return false;
  }
  return false;
}
let syncing = false;
async function flush() {
  if (!dirty || syncing) return; syncing = true; dirty = false;
  try { saveLocal(); const ok = await ghPush(); if (!ok) dirty = true; } catch (e) { GH.err = e.message; dirty = true; }
  syncing = false;
}
setInterval(flush, parseInt(process.env.SYNC_MS || '20000', 10)).unref();

// ------------------------------------------------------------------ utilitaires HTTP
const CORS = { 'Access-Control-Allow-Origin':'*', 'Access-Control-Allow-Headers':'Content-Type, Authorization', 'Access-Control-Allow-Methods':'GET, POST, PUT, DELETE, OPTIONS' };
function send(res, code, obj) { const b = JSON.stringify(obj); res.writeHead(code, Object.assign({ 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }, CORS)); res.end(b); }
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > (limit || 1e6)) { reject(new Error('trop gros')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); } catch (e) { reject(new Error('JSON invalide')); } });
    req.on('error', reject);
  });
}
function limited(key, max, windowMs) {
  const t = now(), a = (mem.rate.get(key) || []).filter(x => t - x < windowMs); a.push(t); mem.rate.set(key, a); return a.length > max;
}
const ipOf = req => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const validUser = u => typeof u === 'string' && /^[A-Za-z0-9_-]{3,16}$/.test(u);
function auth(req) {
  const h = req.headers.authorization || ''; if (!h.startsWith('Bearer ')) return null;
  const s = db.sessions[sha(h.slice(7))]; if (!s || now() - s.ts > 90 * 864e5) return null;
  const u = db.users[s.user]; if (!u) return null; u.lastSeen = now(); return { key:s.user, user:u };
}
function newSession(key) {
  const token = crypto.randomBytes(32).toString('hex'), mine = Object.entries(db.sessions).filter(([, v]) => v.user === key).sort((a, b) => a[1].ts - b[1].ts);
  while (mine.length >= 8) delete db.sessions[mine.shift()[0]];
  db.sessions[sha(token)] = { user:key, ts:now() }; markDirty(); return token;
}
const publicUser = (key, u) => ({ name:u.name, created:u.created });
const online = key => { const p = mem.presence[key]; return !!p && now() - p.ts < 45000; };

// ------------------------------------------------------------------ API
async function api(req, res, url) {
  const p = url.pathname, m = req.method;
  if (m === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (p === '/api/health') return send(res, 200, { pokesmash:true, accounts:true, github:ghOn, githubOk:GH.ok, githubLast:GH.last, githubErr:GH.err, users:Object.keys(db.users).length });

  // ----- salons publics
  if (p === '/api/rooms' && m === 'GET') {
    const t = now(); for (const k of Object.keys(mem.rooms)) if (t - mem.rooms[k].ts > 20000) delete mem.rooms[k];
    return send(res, 200, { rooms:Object.values(mem.rooms).filter(r => r.state === 'lobby').map(r => ({ code:r.code, name:r.name, players:r.players, max:r.max })).slice(0, 50) });
  }
  if (p === '/api/rooms' && m === 'POST') {
    if (limited('room:' + ipOf(req), 60, 60000)) return send(res, 429, { error:'trop de requêtes' });
    const b = await readBody(req, 4000); if (!/^[A-Z0-9]{6}$/.test(String(b.code || ''))) return send(res, 400, { error:'code invalide' });
    mem.rooms[b.code] = { code:b.code, name:String(b.name || 'Salon').slice(0, 40), players:clampInt(b.players, 1, 8), max:clampInt(b.max, 2, 8), state:b.state === 'playing' ? 'playing' : 'lobby', ts:now() };
    return send(res, 200, { ok:true });
  }
  if (p.startsWith('/api/rooms/') && m === 'DELETE') { delete mem.rooms[p.slice(11)]; return send(res, 200, { ok:true }); }

  // ----- comptes
  if (p === '/api/register' && m === 'POST') {
    if (limited('reg:' + ipOf(req), 8, 3600000)) return send(res, 429, { error:'Trop de créations de compte depuis cette adresse, réessayez plus tard.' });
    const b = await readBody(req, 4000), name = String(b.user || ''), pass = String(b.pass || '');
    if (!validUser(name)) return send(res, 400, { error:'Pseudo : 3 à 16 caractères (lettres, chiffres, _ ou -).' });
    if (pass.length < 6 || pass.length > 64) return send(res, 400, { error:'Mot de passe : 6 à 64 caractères.' });
    const key = name.toLowerCase(); if (db.users[key]) return send(res, 409, { error:'Ce pseudo existe déjà.' });
    const salt = crypto.randomBytes(16).toString('hex'), hash = (await scrypt(pass, salt, 32)).toString('hex');
    db.users[key] = { name, salt, hash, created:now(), save:null, saveTs:0, friends:[], reqIn:[], reqOut:[], lastSeen:now() };
    markDirty(); return send(res, 200, { token:newSession(key), user:name, save:null, saveTs:0 });
  }
  if (p === '/api/login' && m === 'POST') {
    if (limited('log:' + ipOf(req), 20, 600000)) return send(res, 429, { error:'Trop de tentatives, patientez quelques minutes.' });
    const b = await readBody(req, 4000), key = String(b.user || '').toLowerCase(), u = db.users[key];
    if (!u) return send(res, 401, { error:'Pseudo ou mot de passe incorrect.' });
    const h = (await scrypt(String(b.pass || ''), u.salt, 32)).toString('hex');
    if (!crypto.timingSafeEqual(Buffer.from(h), Buffer.from(u.hash))) return send(res, 401, { error:'Pseudo ou mot de passe incorrect.' });
    return send(res, 200, { token:newSession(key), user:u.name, save:u.save, saveTs:u.saveTs });
  }
  const a = auth(req);
  if (p === '/api/logout' && m === 'POST') { const h = req.headers.authorization || ''; delete db.sessions[sha(h.slice(7))]; markDirty(); return send(res, 200, { ok:true }); }
  if (!a) return send(res, 401, { error:'Connexion requise.' });
  const { key, user } = a;

  if (p === '/api/me' && m === 'GET') return send(res, 200, { user:user.name, save:user.save, saveTs:user.saveTs, reqIn:user.reqIn.length });
  if (p === '/api/save' && m === 'PUT') {
    const b = await readBody(req, 450000); if (!b.save || typeof b.save !== 'object') return send(res, 400, { error:'sauvegarde invalide' });
    user.save = b.save; user.saveTs = now(); markDirty(); return send(res, 200, { ok:true, ts:user.saveTs });
  }
  if (p === '/api/save' && m === 'GET') return send(res, 200, { save:user.save, ts:user.saveTs });

  // ----- amis
  if (p === '/api/friends' && m === 'GET') {
    const info = k => { const u = db.users[k], pr = mem.presence[k], on = online(k); return { name:u.name, online:on, state:on ? pr.state : 'off', code:on && pr.state === 'lobby' ? pr.code : null }; };
    return send(res, 200, { friends:user.friends.filter(k => db.users[k]).map(info), reqIn:user.reqIn.filter(k => db.users[k]).map(k => db.users[k].name), reqOut:user.reqOut.filter(k => db.users[k]).map(k => db.users[k].name) });
  }
  if (p === '/api/friends/request' && m === 'POST') {
    const b = await readBody(req, 2000), to = String(b.to || '').toLowerCase(), t = db.users[to];
    if (!t || to === key) return send(res, 404, { error:'Joueur introuvable.' });
    if (user.friends.includes(to)) return send(res, 200, { ok:true, already:true });
    if (user.reqIn.includes(to)) { acceptFriend(key, to); return send(res, 200, { ok:true, accepted:true }); }
    if (!user.reqOut.includes(to)) { user.reqOut.push(to); if (!t.reqIn.includes(key)) t.reqIn.push(key); markDirty(); }
    return send(res, 200, { ok:true });
  }
  if (p === '/api/friends/accept' && m === 'POST') { const b = await readBody(req, 2000), from = String(b.from || '').toLowerCase(); if (!user.reqIn.includes(from)) return send(res, 404, { error:'Aucune demande.' }); acceptFriend(key, from); return send(res, 200, { ok:true }); }
  if (p === '/api/friends/decline' && m === 'POST') { const b = await readBody(req, 2000), from = String(b.from || '').toLowerCase(); user.reqIn = user.reqIn.filter(x => x !== from); const o = db.users[from]; if (o) o.reqOut = o.reqOut.filter(x => x !== key); markDirty(); return send(res, 200, { ok:true }); }
  if (p.startsWith('/api/friends/') && m === 'DELETE') {
    const other = decodeURIComponent(p.slice(13)).toLowerCase(), o = db.users[other];
    user.friends = user.friends.filter(x => x !== other); user.reqOut = user.reqOut.filter(x => x !== other); user.reqIn = user.reqIn.filter(x => x !== other);
    if (o) { o.friends = o.friends.filter(x => x !== key); o.reqOut = o.reqOut.filter(x => x !== key); o.reqIn = o.reqIn.filter(x => x !== key); } markDirty(); return send(res, 200, { ok:true });
  }
  if (p === '/api/presence' && m === 'POST') { const b = await readBody(req, 1000); mem.presence[key] = { ts:now(), state:['menu', 'lobby', 'playing'].includes(b.state) ? b.state : 'menu', code:/^[A-Z0-9]{6}$/.test(String(b.code || '')) ? b.code : null }; return send(res, 200, { ok:true }); }
  if (p === '/api/invite' && m === 'POST') {
    const b = await readBody(req, 2000), to = String(b.to || '').toLowerCase();
    if (!user.friends.includes(to) || !/^[A-Z0-9]{6}$/.test(String(b.code || ''))) return send(res, 400, { error:'Invitation impossible (vous devez être amis).' });
    const box = mem.invites[to] = (mem.invites[to] || []).filter(i => now() - i.ts < 180000).slice(-9); box.push({ from:user.name, code:b.code, ts:now() });
    return send(res, 200, { ok:true });
  }
  if (p === '/api/inbox' && m === 'GET') {
    const box = (mem.invites[key] || []).filter(i => now() - i.ts < 180000); mem.invites[key] = [];
    return send(res, 200, { invites:box, reqIn:user.reqIn.length });
  }
  return send(res, 404, { error:'inconnu' });
}
function acceptFriend(me, other) {
  const a = db.users[me], b = db.users[other]; if (!a || !b) return;
  for (const [x, y, kx, ky] of [[a, b, me, other], [b, a, other, me]]) { if (!x.friends.includes(ky)) x.friends.push(ky); x.reqIn = x.reqIn.filter(k => k !== ky); x.reqOut = x.reqOut.filter(k => k !== ky); }
  markDirty();
}
const clampInt = (v, a, b) => Math.max(a, Math.min(b, parseInt(v, 10) || a));

// ------------------------------------------------------------------ fichiers statiques
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.txt':'text/plain; charset=utf-8' };
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname); if (rel === '/') rel = '/index.html';
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type':'text/plain' }); return res.end('Introuvable'); }
    const ext = path.extname(file), nocache = ext === '.html' || rel === '/sw.js';
    res.writeHead(200, { 'Content-Type':MIME[ext] || 'application/octet-stream', 'Cache-Control':nocache ? 'no-cache' : 'public, max-age=86400' }); res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try { if (url.pathname.startsWith('/api/')) await api(req, res, url); else serveStatic(req, res, url); }
  catch (e) { if (!res.headersSent) send(res, 400, { error:e.message || 'erreur' }); else res.end(); }
});
async function main() {
  loadLocal(); await ghLoad();
  server.listen(PORT, () => console.log('PokeSmash : http://localhost:' + PORT + ' — GitHub ' + (ghOn ? 'activé (' + GH.repo + ')' : 'désactivé (sauvegarde locale seulement)')));
}
if (require.main === module) { main(); process.on('SIGTERM', async () => { dirty = true; await flush(); process.exit(0); }); }
module.exports = { server, main, flush, get db() { return db; }, GH };
