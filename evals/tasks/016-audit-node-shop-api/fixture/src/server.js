'use strict';

const http = require('http');
const { exec } = require('child_process');
const { Router } = require('./router');
const { send, log } = require('./http');
const { serveStatic } = require('./static');
const pkg = require('../package.json');

// Short hash of the deployed commit, shown by /version. Read once and cached.
let commit;
function currentCommit() {
  if (commit) return Promise.resolve(commit);
  return new Promise((resolve) => {
    exec('git rev-parse --short HEAD', { cwd: __dirname, timeout: 2000 }, (err, stdout) => {
      commit = err ? 'unknown' : stdout.trim();
      resolve(commit);
    });
  });
}

function createServer() {
  const router = new Router();

  router.get('/health', (req, res) => send(res, 200, { status: 'ok' }));
  router.get('/version', async (req, res) => {
    send(res, 200, { name: pkg.name, version: pkg.version, commit: await currentCommit() });
  });
  router.get('/assets/*', serveStatic);

  require('./routes/users')(router);
  require('./routes/products')(router);
  require('./routes/cart')(router);
  require('./routes/orders')(router);
  require('./routes/payments')(router);
  require('./routes/exports')(router);
  require('./routes/files')(router);

  return http.createServer((req, res) => router.handle(req, res));
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => log.info('shop-api listening', { port }));
}

module.exports = { createServer };
