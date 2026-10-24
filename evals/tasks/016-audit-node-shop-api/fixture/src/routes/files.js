'use strict';

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream');
const { HttpError, contentTypeFor, log } = require('../http');

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'var', 'uploads');

// Product manuals and spec sheets uploaded through the back office.
// Product pages link here using the product's "manual" field.
module.exports = function registerFileRoutes(router) {
  router.get('/files', async (req, res) => {
    const name = req.query.get('name');
    if (!name) throw new HttpError(400, 'query parameter "name" is required');

    const filePath = path.join(UPLOADS_DIR, name);
    const stat = await fs.promises.stat(filePath).catch(() => null);
    if (!stat || !stat.isFile()) throw new HttpError(404, 'file not found');

    res.writeHead(200, {
      'content-type': contentTypeFor(filePath),
      'content-length': stat.size,
    });
    pipeline(fs.createReadStream(filePath), res, (err) => {
      if (err) log.warn('file download interrupted', { name, error: err.message });
    });
  });
};
