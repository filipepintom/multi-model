'use strict';

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { HttpError, contentTypeFor, log } = require('./http');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

// Serves /assets/* from public/ (logo, stylesheet used by the e-mail templates).
async function serveStatic(req, res) {
  const target = path.resolve(PUBLIC_DIR, req.params.rest);
  if (!target.startsWith(PUBLIC_DIR + path.sep)) throw new HttpError(404, 'not found');

  const stat = await fs.promises.stat(target).catch(() => null);
  if (!stat || !stat.isFile()) throw new HttpError(404, 'not found');

  res.writeHead(200, {
    'content-type': contentTypeFor(target),
    'content-length': stat.size,
    'cache-control': 'public, max-age=3600',
  });
  pipeline(fs.createReadStream(target), res, (err) => {
    if (err) log.warn('asset stream failed', { path: req.path, error: err.message });
  });
}

module.exports = { serveStatic };
