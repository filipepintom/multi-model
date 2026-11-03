const Database = require('better-sqlite3');

module.exports = new Database(process.env.DB_PATH || 'var/shop.db');
