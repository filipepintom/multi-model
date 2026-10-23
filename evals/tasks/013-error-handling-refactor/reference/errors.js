class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const validation = (message) => new HttpError(400, 'VALIDATION_ERROR', message);
const invalidJson = () => new HttpError(400, 'INVALID_JSON', 'Request body is not valid JSON');
const notFound = (message) => new HttpError(404, 'NOT_FOUND', message);
const conflict = (message) => new HttpError(409, 'CONFLICT', message);

function sendError(res, err) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Internal server error';
  if (err instanceof HttpError) {
    ({ status, code, message } = err);
  } else {
    console.error(err);
  }
  if (res.headersSent) return res.end();
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: { code, message } }));
}

// Lê o corpo e faz parse; lança INVALID_JSON ou VALIDATION_ERROR (se não for um objeto).
async function readJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw invalidJson();
  }
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    throw validation('Request body must be a JSON object');
  }
  return body;
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

module.exports = { HttpError, validation, invalidJson, notFound, conflict, sendError, readJson, sendJson };
