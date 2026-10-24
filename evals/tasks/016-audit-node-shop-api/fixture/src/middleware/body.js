'use strict';

const { HttpError } = require('../http');

// Reads the request body and parses it as a JSON object. An empty body is {}.
function readJson(req) {
  const type = req.headers['content-type'] || '';
  if (type && !type.startsWith('application/json')) {
    return Promise.reject(new HttpError(415, 'expected application/json'));
  }

  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw.trim()) return resolve({});
      let body;
      try {
        body = JSON.parse(raw);
      } catch {
        return reject(new HttpError(400, 'invalid JSON body'));
      }
      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        return reject(new HttpError(400, 'JSON body must be an object'));
      }
      resolve(body);
    });
    req.on('error', reject);
  });
}

module.exports = { readJson };
