'use strict';

const path = require('path');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

function send(res, status, body) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function sendError(res, status, message, details) {
  send(res, status, details ? { error: message, details } : { error: message });
}

const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
};

function contentTypeFor(file) {
  return CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

// One JSON object per line, so the log collector can parse it without configuration.
function write(stream, level, msg, fields) {
  if (process.env.LOG_LEVEL === 'silent') return;
  stream.write(`${JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields })}\n`);
}

const log = {
  info: (msg, fields) => write(process.stdout, 'info', msg, fields),
  warn: (msg, fields) => write(process.stderr, 'warn', msg, fields),
  error: (msg, fields) => write(process.stderr, 'error', msg, fields),
};

module.exports = { HttpError, send, sendError, contentTypeFor, log };
