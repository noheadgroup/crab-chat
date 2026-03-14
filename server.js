const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const messages = []; // {id, user, sender, text, time}
let nextId = 1;

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, 'http://localhost');

  // Serve index.html
  if (url.pathname === '/' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
    return;
  }

  // POST /send - user sends a message
  if (url.pathname === '/send' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const msg = { id: nextId++, user: body.user || 'anon', sender: 'user', text: body.text, time: new Date().toLocaleTimeString() };
    messages.push(msg);
    console.log(`[MSG] ${msg.user}: ${msg.text}`);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ok: true, id: msg.id}));
    return;
  }

  // GET /poll?user=X&after=ID - poll for new messages
  if (url.pathname === '/poll' && req.method === 'GET') {
    const after = parseInt(url.searchParams.get('after') || '0');
    const newMsgs = messages.filter(m => m.id > after);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({messages: newMsgs}));
    return;
  }

  // GET /admin - see all messages (for Crab to read)
  if (url.pathname === '/admin' && req.method === 'GET') {
    const after = parseInt(url.searchParams.get('after') || '0');
    const newMsgs = messages.filter(m => m.id > after && m.sender === 'user');
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({messages: newMsgs}));
    return;
  }

  // POST /reply - Crab sends a reply
  if (url.pathname === '/reply' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const msg = { id: nextId++, user: 'crab', sender: 'crab', text: body.text, time: new Date().toLocaleTimeString() };
    messages.push(msg);
    console.log(`[CRAB]: ${body.text}`);
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({ok: true, id: msg.id}));
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => console.log(`🦀 Crab Chat running on port ${PORT}`));
