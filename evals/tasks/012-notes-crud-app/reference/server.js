const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PAGE = `<!doctype html>
<html lang="pt">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Notas</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 40rem; margin: 2rem auto; padding: 0 1rem; }
    form { display: grid; gap: .5rem; margin-bottom: 1.5rem; }
    input, textarea { font: inherit; padding: .4rem; }
    li { margin-bottom: 1rem; list-style: none; border: 1px solid #ccc; padding: .5rem; border-radius: 4px; }
    #erro { color: #b00020; }
  </style>
</head>
<body>
  <h1>Notas</h1>
  <form id="form">
    <input name="title" placeholder="Título" maxlength="100" required>
    <textarea name="body" placeholder="Texto" rows="3"></textarea>
    <button type="submit">Guardar nota</button>
    <span id="erro" role="alert"></span>
  </form>
  <ul id="lista"></ul>
  <script>
    const form = document.getElementById('form');
    const lista = document.getElementById('lista');
    const erro = document.getElementById('erro');

    async function api(method, url, data) {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
      });
      if (res.status === 204) return null;
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro');
      return json;
    }

    async function load() {
      const notes = await api('GET', '/api/notes');
      lista.replaceChildren(...notes.map((n) => {
        const li = document.createElement('li');
        const h = document.createElement('strong');
        h.textContent = n.title;
        const p = document.createElement('p');
        p.textContent = n.body;
        const edit = document.createElement('button');
        edit.textContent = 'Editar';
        edit.onclick = async () => {
          const title = prompt('Título', n.title);
          if (title === null) return;
          const body = prompt('Texto', n.body);
          if (body === null) return;
          try { await api('PUT', '/api/notes/' + n.id, { title, body }); erro.textContent = ''; } catch (e) { erro.textContent = e.message; }
          load();
        };
        const del = document.createElement('button');
        del.textContent = 'Apagar';
        del.onclick = async () => { await api('DELETE', '/api/notes/' + n.id); load(); };
        li.append(h, p, edit, del);
        return li;
      }));
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      try {
        await api('POST', '/api/notes', data);
        form.reset();
        erro.textContent = '';
      } catch (err) {
        erro.textContent = err.message;
      }
      load();
    });
    load();
  </script>
</body>
</html>`;

const DATA_FILE = path.resolve(process.env.DATA_FILE || './data.json');

function loadNotes() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, '[]');
    return [];
  }
  const text = fs.readFileSync(DATA_FILE, 'utf8').trim();
  return text ? JSON.parse(text) : [];
}

let notes = loadNotes();

function save() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(notes, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function send(res, status, payload) {
  if (status === 204) {
    res.writeHead(204);
    return res.end();
  }
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const fail = (res, status, error) => send(res, status, { error });

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (value === null || typeof value !== 'object' || Array.isArray(value)) return reject(new Error('o corpo tem de ser um objeto JSON'));
        resolve(value);
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function validate(input) {
  if (typeof input.title !== 'string' || !input.title.trim()) return 'title é obrigatório';
  if (input.title.length > 100) return 'title tem no máximo 100 caracteres';
  if (input.body !== undefined && typeof input.body !== 'string') return 'body tem de ser uma string';
  return null;
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(PAGE);
    }
    const m = pathname.match(/^\/api\/notes(?:\/([^/]+))?$/);
    if (!m) return fail(res, 404, 'rota não encontrada');
    const id = m[1] && decodeURIComponent(m[1]);

    if (!id) {
      if (req.method === 'GET') return send(res, 200, notes);
      if (req.method === 'POST') {
        let input;
        try { input = await readJson(req); } catch (e) { return fail(res, 400, e.message); }
        const problem = validate(input);
        if (problem) return fail(res, 400, problem);
        const now = new Date().toISOString();
        const note = { id: crypto.randomUUID(), title: input.title.trim(), body: input.body ?? '', createdAt: now, updatedAt: now };
        notes.push(note);
        save();
        return send(res, 201, note);
      }
      return fail(res, 405, 'método não suportado');
    }

    const note = notes.find((n) => n.id === id);
    if (req.method === 'GET') return note ? send(res, 200, note) : fail(res, 404, 'nota não encontrada');
    if (req.method === 'PUT') {
      let input;
      try { input = await readJson(req); } catch (e) { return fail(res, 400, e.message); }
      if (!note) return fail(res, 404, 'nota não encontrada');
      const problem = validate(input);
      if (problem) return fail(res, 400, problem);
      note.title = input.title.trim();
      note.body = input.body ?? '';
      note.updatedAt = new Date().toISOString();
      save();
      return send(res, 200, note);
    }
    if (req.method === 'DELETE') {
      if (!note) return fail(res, 404, 'nota não encontrada');
      notes = notes.filter((n) => n !== note);
      save();
      return send(res, 204);
    }
    return fail(res, 405, 'método não suportado');
  } catch (err) {
    console.error(err);
    if (!res.headersSent) fail(res, 500, 'erro interno');
  }
});

server.listen(process.env.PORT || 3000, () => console.log('a ouvir em http://localhost:' + server.address().port));
