'use strict';
// Test de bout en bout du serveur avec un faux GitHub : node test/server.test.js
const http = require('http'), { spawn } = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- faux GitHub (API Contents)
const store = { file:null, sha:0, puts:0 };
const mock = http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', () => {
    if (!/\/repos\/o\/r\/contents\/db\.json/.test(req.url) || req.headers.authorization !== 'Bearer TOK') { res.writeHead(401); return res.end('{}'); }
    if (req.method === 'GET') { if (!store.file) { res.writeHead(404); return res.end('{}'); } res.writeHead(200, { 'Content-Type':'application/json' }); return res.end(JSON.stringify({ content:store.file, encoding:'base64', sha:'s' + store.sha })); }
    if (req.method === 'PUT') { const j = JSON.parse(b); if (store.file && j.sha !== 's' + store.sha) { res.writeHead(409); return res.end('{}'); } store.file = j.content; store.sha++; store.puts++; res.writeHead(200, { 'Content-Type':'application/json' }); return res.end(JSON.stringify({ content:{ sha:'s' + store.sha } })); }
    res.writeHead(405); res.end();
  });
});

function start(port, dir, ghPort) {
  const env = Object.assign({}, process.env, { PORT:String(port), DATA_DIR:dir, GH_TOKEN:'TOK', GH_REPO:'o/r', GITHUB_API:'http://127.0.0.1:' + ghPort, SYNC_MS:'300' });
  const p = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], { env, stdio:['ignore', 'pipe', 'pipe'] }); p.stdout.on('data', () => {}); p.stderr.on('data', d => process.stderr.write(d)); return p;
}
async function call(port, method, url, body, token) {
  const r = await fetch('http://127.0.0.1:' + port + url, { method, headers:Object.assign({ 'Content-Type':'application/json' }, token ? { Authorization:'Bearer ' + token } : {}), body:body ? JSON.stringify(body) : undefined });
  let j = null; try { j = await r.json(); } catch (e) { /* vide */ } return { s:r.status, j };
}
(async () => {
  await new Promise(r => mock.listen(0, '127.0.0.1', r)); const gp = mock.address().port;
  const d1 = fs.mkdtempSync(path.join(os.tmpdir(), 'ps1-')), d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'ps2-'));
  let srv = start(4511, d1, gp); await sleep(700);
  console.log('Santé'); let r = await call(4511, 'GET', '/api/health'); ok(r.j.pokesmash && r.j.github, 'serveur actif, GitHub activé');
  console.log('Comptes');
  r = await call(4511, 'POST', '/api/register', { user:'ab', pass:'secret1' }); ok(r.s === 400, 'pseudo trop court refusé');
  r = await call(4511, 'POST', '/api/register', { user:'Alice', pass:'123' }); ok(r.s === 400, 'mot de passe trop court refusé');
  r = await call(4511, 'POST', '/api/register', { user:'Alice', pass:'secret1' }); ok(r.s === 200 && r.j.token, 'création du compte Alice'); const ta = r.j.token;
  r = await call(4511, 'POST', '/api/register', { user:'alice', pass:'autrepass' }); ok(r.s === 409, 'pseudo déjà pris (insensible à la casse)');
  r = await call(4511, 'POST', '/api/register', { user:'Bob', pass:'secret2' }); const tb = r.j.token; ok(!!tb, 'création du compte Bob');
  r = await call(4511, 'POST', '/api/login', { user:'alice', pass:'faux' }); ok(r.s === 401, 'mauvais mot de passe refusé');
  r = await call(4511, 'POST', '/api/login', { user:'ALICE', pass:'secret1' }); ok(r.s === 200 && r.j.user === 'Alice', 'connexion réussie'); const ta2 = r.j.token;
  console.log('Sauvegarde');
  r = await call(4511, 'GET', '/api/me'); ok(r.s === 401, 'accès sans jeton refusé');
  r = await call(4511, 'PUT', '/api/save', { save:{ v:1, stats:{ kos:42 } } }, ta); ok(r.s === 200, 'sauvegarde envoyée');
  r = await call(4511, 'GET', '/api/me', null, ta2); ok(r.j.save && r.j.save.stats.kos === 42, 'sauvegarde relue depuis une autre session');
  console.log('Amis et invitations');
  r = await call(4511, 'POST', '/api/friends/request', { to:'bob' }, ta); ok(r.s === 200, 'Alice demande Bob en ami');
  r = await call(4511, 'GET', '/api/friends', null, tb); ok(r.j.reqIn.includes('Alice'), 'Bob voit la demande');
  r = await call(4511, 'POST', '/api/invite', { to:'bob', code:'ABC123' }, ta); ok(r.s === 400, 'invitation refusée tant qu\'ils ne sont pas amis');
  r = await call(4511, 'POST', '/api/friends/accept', { from:'alice' }, tb); ok(r.s === 200, 'Bob accepte');
  await call(4511, 'POST', '/api/presence', { state:'lobby', code:'XYZ789' }, tb);
  r = await call(4511, 'GET', '/api/friends', null, ta); ok(r.j.friends.length === 1 && r.j.friends[0].online && r.j.friends[0].code === 'XYZ789', 'Alice voit Bob en ligne dans un salon (code visible)');
  r = await call(4511, 'POST', '/api/invite', { to:'bob', code:'ABC123' }, ta); ok(r.s === 200, 'Alice invite Bob');
  r = await call(4511, 'GET', '/api/inbox', null, tb); ok(r.j.invites.length === 1 && r.j.invites[0].from === 'Alice' && r.j.invites[0].code === 'ABC123', 'Bob reçoit l\'invitation');
  r = await call(4511, 'GET', '/api/inbox', null, tb); ok(r.j.invites.length === 0, 'l\'invitation n\'est livrée qu\'une fois');
  console.log('Salons publics');
  await call(4511, 'POST', '/api/rooms', { code:'QWERTY', name:'Salon test', players:2, max:8, state:'lobby' }); r = await call(4511, 'GET', '/api/rooms'); ok(r.j.rooms.length === 1 && r.j.rooms[0].code === 'QWERTY', 'salon public listé');
  console.log('Persistance GitHub');
  await sleep(900); ok(store.puts >= 1 && store.file, 'la base a été envoyée à GitHub (' + store.puts + ' envoi(s))');
  const dump = JSON.parse(Buffer.from(store.file, 'base64').toString('utf8')); ok(dump.users.alice && dump.users.alice.save.stats.kos === 42 && dump.users.alice.friends.includes('bob'), 'le dépôt contient le compte, la sauvegarde et les amis');
  ok(!JSON.stringify(dump).includes('secret1'), 'aucun mot de passe en clair dans la base');
  srv.kill('SIGKILL'); await sleep(300);
  srv = start(4512, d2, gp); await sleep(900);                      // nouveau serveur, disque vide : tout vient de GitHub
  r = await call(4512, 'POST', '/api/login', { user:'alice', pass:'secret1' }); ok(r.s === 200 && r.j.save && r.j.save.stats.kos === 42, 'après redémarrage sur disque vide, connexion et sauvegarde restaurées depuis GitHub');
  srv.kill('SIGKILL'); mock.close();
  console.log(fails ? '\n' + fails + ' ÉCHEC(S)' : '\nTOUS LES TESTS PASSENT'); process.exit(fails ? 1 : 0);
})();
