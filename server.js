'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const STORE_PATH = path.join(DATA_DIR, 'accounts.json');
const PORT = Number(process.env.PORT) || 4173;
const HOST = '0.0.0.0';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_BODY = 3 * 1024 * 1024;
const STATIC_FILES = new Set(['index.html', 'list.html', 'games.html', 'project.html', 'artwork.html', 'updates.html', 'account.html', 'arts.html', 'groups.html', 'download.html', 'assets/hollow-shift-icon.webp', 'assets/gamma-frost-banner.webp', 'assets/golden-spiral-sun-icon.png', 'styles.css', 'app.js']);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png' };

let accounts = [];
const sessions = new Map();
const attempts = new Map();
let writeQueue = Promise.resolve();

function send(res, status, value, headers = {}) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (Buffer.byteLength(data) > MAX_BODY) { reject(Object.assign(new Error('Request is too large.'), { status: 413 })); req.destroy(); }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { reject(Object.assign(new Error('Please send valid form data.'), { status: 400 })); }
    });
    req.on('error', reject);
  });
}
function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.host === req.headers.host;
  } catch { return false; }
}
function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim().split(/=(.*)/s).slice(0, 2)).filter(pair => pair.length === 2));
}
function getAccount(req) {
  const token = parseCookies(req.headers.cookie).solaris_session;
  const session = token && sessions.get(token);
  if (!session || session.expires < Date.now()) { if (token) sessions.delete(token); return null; }
  return accounts.find(account => account.id === session.accountId) || null;
}
function publicProfile(account) {
  const { id, profile } = account;
  return { id, ...profile };
}
function setSession(res, accountId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_MS;
  sessions.set(token, { accountId, expires });
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `solaris_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_MS / 1000)}${secure}`);
}
function clearSession(req, res) {
  const token = parseCookies(req.headers.cookie).solaris_session;
  if (token) sessions.delete(token);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `solaris_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}
function allowAttempt(req) {
  const key = `${req.socket.remoteAddress || 'unknown'}:${req.url.split('?')[0]}`;
  const now = Date.now();
  const entry = attempts.get(key) || { start: now, count: 0 };
  if (now - entry.start > 15 * 60 * 1000) { entry.start = now; entry.count = 0; }
  entry.count++;
  attempts.set(key, entry);
  return entry.count <= 10;
}
function text(value, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function imageData(value) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.length > 950_000 || !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw Object.assign(new Error('That image could not be saved. Choose a smaller JPG, PNG, or WebP image.'), { status: 400 });
  }
  return value;
}
function validateSocials(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map(item => {
    const label = text(item && item.label, 30);
    const raw = text(item && item.url, 240);
    if (!label || !raw) return null;
    try {
      const url = new URL(raw);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      return { label, url: url.href };
    } catch { return null; }
  }).filter(Boolean);
}
function validateFavorite(item, type) {
  if (!item || typeof item !== 'object') return null;
  const title = text(item.title, 80);
  if (!title) return null;
  return { type, title, comment: text(item.comment, 240) };
}
function cleanProfile(input, existing = {}) {
  const socials = validateSocials(input.socials);
  const favorites = ['game', 'developer', 'artwork'].map(type => validateFavorite(input.favorites && input.favorites[type], type)).filter(Boolean);
  const installedGames = Array.isArray(input.installedGames) ? [...new Set(input.installedGames.map(value => text(value, 80)).filter(Boolean))].slice(0, 20) : [];
  return {
    username: existing.username || text(input.username, 24),
    avatarImage: imageData(input.avatarImage),
    bannerImage: imageData(input.bannerImage),
    bannerRatio: input.bannerRatio === '16:9' ? '16:9' : '21:9',
    realName: text(input.realName, 80),
    pronouns: text(input.pronouns, 32),
    notes: text(input.notes, 160),
    bio: text(input.bio, 500),
    socials,
    likes: text(input.likes, 400),
    dislikes: text(input.dislikes, 400),
    favorites: Object.fromEntries(['game', 'developer', 'artwork'].map(type => [type, favorites.find(item => item.type === type) || null])),
    installedGames
  };
}
async function saveAccounts() {
  const snapshot = JSON.stringify(accounts, null, 2);
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const temporary = `${STORE_PATH}.${process.pid}.tmp`;
    await fs.writeFile(temporary, snapshot, { mode: 0o600 });
    await fs.rename(temporary, STORE_PATH);
  });
  return writeQueue;
}
async function handleApi(req, res, pathname) {
  if (!checkOrigin(req)) return send(res, 403, { error: 'This request was not accepted.' });
  if (req.method === 'GET' && pathname === '/api/me') {
    const account = getAccount(req);
    return send(res, 200, { user: account ? publicProfile(account) : null });
  }
  if (req.method === 'POST' && pathname === '/api/signup') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many sign-up attempts. Please try again later.' });
    const input = await readBody(req);
    const username = text(input.username, 24);
    if (!/^[a-zA-Z0-9_.-]{3,24}$/.test(username)) return send(res, 400, { error: 'Use a username with 3–24 letters, numbers, dots, dashes, or underscores.' });
    if (accounts.some(account => account.profile.username.toLowerCase() === username.toLowerCase())) return send(res, 409, { error: 'That username is already taken.' });
    if (typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 200) return send(res, 400, { error: 'Use a password between 10 and 200 characters.' });
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = Buffer.from(await scrypt(input.password, salt, 64)).toString('hex');
    const id = crypto.randomUUID();
    const account = { id, salt, passwordHash, profile: cleanProfile({ ...input.profile, username }) };
    accounts.push(account);
    await saveAccounts();
    setSession(res, id);
    return send(res, 201, { user: publicProfile(account) });
  }
  if (req.method === 'POST' && pathname === '/api/login') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many login attempts. Please try again later.' });
    const input = await readBody(req);
    const username = text(input.username, 24).toLowerCase();
    const account = accounts.find(item => item.profile.username.toLowerCase() === username);
    const salt = account ? account.salt : '00000000000000000000000000000000';
    const expected = account ? Buffer.from(account.passwordHash, 'hex') : Buffer.alloc(64);
    const candidate = Buffer.from(await scrypt(typeof input.password === 'string' ? input.password.slice(0, 200) : '', salt, 64));
    if (!account || candidate.length !== expected.length || !crypto.timingSafeEqual(candidate, expected)) return send(res, 401, { error: 'The username or password is incorrect.' });
    setSession(res, account.id);
    return send(res, 200, { user: publicProfile(account) });
  }
  if (req.method === 'POST' && pathname === '/api/logout') {
    clearSession(req, res);
    return send(res, 200, { user: null });
  }
  if (req.method === 'PUT' && pathname === '/api/profile') {
    const account = getAccount(req);
    if (!account) return send(res, 401, { error: 'Please log in to update your profile.' });
    const input = await readBody(req);
    account.profile = cleanProfile(input, account.profile);
    await saveAccounts();
    return send(res, 200, { user: publicProfile(account) });
  }
  return send(res, 404, { error: 'Not found.' });
}

async function loadStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const stored = JSON.parse(await fs.readFile(STORE_PATH, 'utf8'));
    accounts = Array.isArray(stored) ? stored.filter(account => account && account.id && account.profile && account.passwordHash && account.salt) : [];
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    accounts = [];
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url.pathname);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
    const requested = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    if (!STATIC_FILES.has(requested)) return send(res, 404, { error: 'Not found.' });
    const filePath = path.join(ROOT, requested);
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': requested.endsWith('.html') ? 'no-cache' : 'public, max-age=3600' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch (error) {
    if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'The server could not complete that request.' });
    else res.destroy();
  }
});

loadStore().then(() => server.listen(PORT, HOST, () => {
  console.log(`Solaris Studio is running at http://localhost:${PORT}`);
})).catch(error => {
  console.error('Could not load the account store:', error.message);
  process.exitCode = 1;
});

