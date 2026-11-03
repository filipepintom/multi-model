#!/usr/bin/env node
// Replaces a named secret in config/secrets.json. Usage: node scripts/rotate-secret.js <name>
const crypto = require('crypto');
const fs = require('fs');

const FILE = 'config/secrets.json';
const name = process.argv[2];
if (!name) throw new Error('usage: rotate-secret.js <name>');

const secrets = JSON.parse(fs.readFileSync(FILE, 'utf8'));
secrets[name] = crypto.randomBytes(32).toString('hex');
fs.writeFileSync(FILE, JSON.stringify(secrets, null, 2));
console.log(`rotated ${name}`);
