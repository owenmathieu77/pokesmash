// faux GitHub pour les tests locaux : node test/mockgh.js [port]
const http = require('http'); const store = { file:null, sha:0, puts:0 };
http.createServer((req, res) => { let b = ''; req.on('data', c => b += c); req.on('end', () => {
  if (req.url === '/_state') { res.writeHead(200, { 'Content-Type':'application/json' }); return res.end(JSON.stringify({ puts:store.puts, db:store.file ? JSON.parse(Buffer.from(store.file, 'base64').toString()) : null })); }
  if (!/\/contents\/db\.json/.test(req.url) || req.headers.authorization !== 'Bearer TOK') { res.writeHead(401); return res.end('{}'); }
  if (req.method === 'GET') { if (!store.file) { res.writeHead(404); return res.end('{}'); } res.writeHead(200, { 'Content-Type':'application/json' }); return res.end(JSON.stringify({ content:store.file, encoding:'base64', sha:'s' + store.sha })); }
  if (req.method === 'PUT') { const j = JSON.parse(b); store.file = j.content; store.sha++; store.puts++; res.writeHead(200, { 'Content-Type':'application/json' }); return res.end(JSON.stringify({ content:{ sha:'s' + store.sha } })); }
  res.writeHead(405); res.end(); }); }).listen(parseInt(process.argv[2] || '4601', 10), '127.0.0.1');
