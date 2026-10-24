'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const { exec } = require('child_process');
const db = require('../db');
const { send } = require('../http');
const { readJson } = require('../middleware/body');
const { requireAuth } = require('../auth');

const execAsync = promisify(exec);
const EXPORT_DIR = path.resolve(__dirname, '..', '..', 'var', 'exports');

// Customers can ask for an archive of their order history. The archive is
// written to var/exports and a separate job e-mails it to them.
module.exports = function registerExportRoutes(router) {
  router.post('/exports', requireAuth, async (req, res) => {
    const { name } = await readJson(req);
    const label = typeof name === 'string' && name.trim() ? name.trim() : `orders-${req.user.id}-${Date.now()}`;
    const orders = [...db.orders.values()].filter((order) => order.userId === req.user.id);

    const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'shop-export-'));
    try {
      await fs.writeFile(path.join(workDir, 'orders.json'), JSON.stringify(orders, null, 2));
      await fs.mkdir(EXPORT_DIR, { recursive: true });
      await execAsync(`tar -czf "${EXPORT_DIR}/${label}.tgz" -C "${workDir}" orders.json`);
    } finally {
      await fs.rm(workDir, { recursive: true, force: true });
    }

    send(res, 201, { file: `${label}.tgz`, orders: orders.length });
  });
};
