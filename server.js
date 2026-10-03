'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const ROOT = __dirname;
const DATA_DIR = process.env.SOLARIS_DATA_DIR ? path.resolve(process.env.SOLARIS_DATA_DIR) : path.join(ROOT, 'data');
const STORE_PATH = path.join(DATA_DIR, 'accounts.json');
const PORT = Number(process.env.PORT) || 4173;
const HOST = '0.0.0.0';
const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_TOKEN_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_MS = 60 * 60 * 1000;
const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BODY = 3 * 1024 * 1024;
const STATIC_FILES = new Set(['index.html', 'list.html', 'games.html', 'project.html', 'artwork.html', 'updates.html', 'account.html', 'arts.html', 'groups.html', 'download.html', 'assets/hollow-shift-icon.webp', 'assets/gamma-frost-banner.webp', 'assets/golden-spiral-sun-icon.png', 'styles.css', 'app.js']);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png' };
const TEAM_SLOTS = {
  owner: { title: 'The Owner', roles: ['Coder', 'Mesh modeler', 'Tester', 'Updater', 'Announcer', 'The Owner'], projects: ['Gamma Frost', 'OmiWo: Collide'] },
  assistant: { title: 'The Assistant', roles: ['Coder', 'Tester', 'Announcer', 'Updater', 'The Assistant'], projects: ['Gamma Frost', 'OmiWo: Collide'] }
};

let accounts = [];
let pool = null;
let mailer = null;
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
function sessionHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
async function getAccount(req) {
  const token = parseCookies(req.headers.cookie).solaris_session;
  if (!token) return null;
  let session = sessions.get(token);
  if ((!session || session.expires < Date.now()) && pool) {
    const result = await pool.query('SELECT account_id, expires_at FROM solaris_sessions WHERE token_hash = $1 AND expires_at > $2', [sessionHash(token), Date.now()]);
    const row = result.rows[0];
    session = row ? { accountId: row.account_id, expires: Number(row.expires_at) } : null;
    if (session) sessions.set(token, session);
  }
  if (!session || session.expires < Date.now()) { sessions.delete(token); return null; }
  return accounts.find(account => account.id === session.accountId) || null;
}
function publicProfile(account) {
  const { id, profile } = account;
  return { id, ...profile, accountRole: account.role || 'member' };
}
function privateProfile(account) {
  return { ...publicProfile(account), email: account.email || '', pendingEmail: account.pendingEmail || '', emailVerified: account.emailVerified === true };
}
function normalizeAccount(account) {
  let changed = false;
  if (!account.role) { account.role = 'member'; changed = true; }
  if (typeof account.email !== 'string') { account.email = ''; changed = true; }
  if (typeof account.pendingEmail !== 'string') { account.pendingEmail = ''; changed = true; }
  if (account.emailVerified !== true) { if (account.emailVerified !== false) changed = true; account.emailVerified = false; }
  if (!account.pendingEmail && account.email && account.emailVerified !== true) { account.pendingEmail = account.email; changed = true; }
  if (!Number(account.profile.usernameLastChangedAt)) { account.profile.usernameLastChangedAt = Date.now(); changed = true; }
  if (!['owner', 'assistant'].includes(account.profile.teamKey) && account.profile.teamKey != null) { account.profile.teamKey = null; changed = true; }
  return changed;
}
function validUsername(value) {
  return typeof value === 'string' && value.length >= 3 && value.length <= 24 && /^[A-Za-z0-9_. -]+$/.test(value) && !/\s{2,}/.test(value);
}
function normalizeEmail(value) {
  return text(value, 254).toLowerCase();
}
function validEmail(value) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function secureEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function getMailer() {
  if (!process.env.SMTP_HOST || !process.env.EMAIL_FROM) return null;
  if (!mailer) {
    const { createTransport } = require('nodemailer');
    const port = Number(process.env.SMTP_PORT) || 587;
    mailer = createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE === 'true' || port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || '' } : undefined
    });
  }
  return mailer;
}
function siteBaseUrl(req) {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL).origin;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  return `${protocol}://${req.headers.host || 'localhost'}`;
}
async function sendAccountEmail(req, address, subject, token, kind) {
  const transport = getMailer();
  if (!transport) throw Object.assign(new Error('Email delivery is not configured. Add SMTP settings to the server first.'), { status: 503 });
  const target = new URL('/account.html', siteBaseUrl(req));
  target.searchParams.set(kind === 'verify' ? 'verify' : 'reset', token);
  const instructions = kind === 'verify' ? 'Verify your email address' : 'Choose a new password';
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: address,
    subject,
    text: `${instructions} for your Solaris Studio account by opening this link:\n\n${target.href}\n\nIf you did not request this, you can ignore this message.`
  });
}
async function setSession(res, accountId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = Date.now() + SESSION_MS;
  sessions.set(token, { accountId, expires });
  if (pool) await pool.query('INSERT INTO solaris_sessions (token_hash, account_id, expires_at) VALUES ($1, $2, $3)', [sessionHash(token), accountId, expires]);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `solaris_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${Math.floor(SESSION_MS / 1000)}${secure}`);
}
async function clearSession(req, res) {
  const token = parseCookies(req.headers.cookie).solaris_session;
  if (token) sessions.delete(token);
  if (token && pool) await pool.query('DELETE FROM solaris_sessions WHERE token_hash = $1', [sessionHash(token)]);
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
    username: text(input.username, 24) || existing.username || '',
    usernameLastChangedAt: Number(existing.usernameLastChangedAt) || Date.now(),
    teamKey: existing.teamKey || null,
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
  const snapshot = JSON.stringify(accounts);
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    if (pool) {
      await pool.query('INSERT INTO solaris_account_store (store_id, accounts) VALUES (1, $1::jsonb) ON CONFLICT (store_id) DO UPDATE SET accounts = EXCLUDED.accounts', [snapshot]);
      return;
    }
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
    const account = await getAccount(req);
    return send(res, 200, { user: account ? privateProfile(account) : null });
  }
  if (req.method === 'GET' && pathname === '/api/public-profile') {
    const query = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams;
    const account = accounts.find(item => item.id === query.get('id') && (!item.pendingEmail || item.emailVerified === true));
    return account ? send(res, 200, { user: publicProfile(account) }) : send(res, 404, { error: 'This profile could not be found.' });
  }
  if (req.method === 'GET' && pathname === '/api/team') {
    const team = accounts.filter(account => account.emailVerified === true && TEAM_SLOTS[account.profile.teamKey]).map(account => {
      const slot = TEAM_SLOTS[account.profile.teamKey];
      return { id: account.id, online: account.profile.username, real: account.profile.realName || 'Not shared', avatarImage: account.profile.avatarImage, title: slot.title, roles: slot.roles, projects: slot.projects };
    });
    return send(res, 200, { members: team });
  }
  if (req.method === 'GET' && pathname === '/api/admin/accounts') {
    const owner = await getAccount(req);
    if (!owner || owner.role !== 'owner') return send(res, 403, { error: 'Only the Solaris Owner can manage team accounts.' });
    const list = accounts.map(account => ({ id: account.id, username: account.profile.username, emailVerified: account.emailVerified === true, accountRole: account.role || 'member', teamKey: account.profile.teamKey || '' }));
    return send(res, 200, { accounts: list });
  }
  if (req.method === 'POST' && pathname === '/api/verify-email') {
    const input = await readBody(req);
    const tokenHash = crypto.createHash('sha256').update(text(input.token, 128)).digest('hex');
    const account = accounts.find(item => item.emailVerificationTokenHash === tokenHash && Number(item.emailVerificationExpiresAt) > Date.now());
    if (!account) return send(res, 400, { error: 'This verification link is invalid or has expired. Request a new one.' });
    if (account.pendingEmail) account.email = account.pendingEmail;
    account.pendingEmail = '';
    account.emailVerified = true;
    account.emailVerificationTokenHash = '';
    account.emailVerificationExpiresAt = 0;
    await saveAccounts();
    await setSession(res, account.id);
    return send(res, 200, { user: privateProfile(account) });
  }
  if (req.method === 'POST' && pathname === '/api/request-email-verification') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Please log in to update your email.' });
    const input = await readBody(req);
    const email = normalizeEmail(input.email);
    if (!validEmail(email)) return send(res, 400, { error: 'Enter a valid email address.' });
    if (accounts.some(item => item.id !== account.id && (item.email === email || item.pendingEmail === email))) return send(res, 409, { error: 'That email address is already connected to another account.' });
    if (account.email === email && account.emailVerified) return send(res, 200, { message: 'That email is already verified.' });
    const token = crypto.randomBytes(32).toString('base64url');
    const previous = { pendingEmail: account.pendingEmail, emailVerificationTokenHash: account.emailVerificationTokenHash, emailVerificationExpiresAt: account.emailVerificationExpiresAt };
    account.pendingEmail = email;
    account.emailVerificationTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    account.emailVerificationExpiresAt = Date.now() + EMAIL_TOKEN_MS;
    try {
      await saveAccounts();
      await sendAccountEmail(req, email, 'Verify your Solaris Studio email', token, 'verify');
    } catch (error) {
      Object.assign(account, previous);
      await saveAccounts();
      return send(res, error.status || 503, { error: error.status ? error.message : 'The verification email could not be sent. Check the mail server settings and try again.' });
    }
    return send(res, 200, { message: `A verification link was sent to ${email}.` });
  }
  if (req.method === 'POST' && pathname === '/api/resend-verification') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many verification requests. Please try again later.' });
    const input = await readBody(req);
    const email = normalizeEmail(input.email);
    const account = accounts.find(item => item.pendingEmail === email && item.emailVerified !== true);
    if (account && getMailer()) {
      const token = crypto.randomBytes(32).toString('base64url');
      account.emailVerificationTokenHash = crypto.createHash('sha256').update(token).digest('hex');
      account.emailVerificationExpiresAt = Date.now() + EMAIL_TOKEN_MS;
      await saveAccounts();
      try { await sendAccountEmail(req, email, 'Verify your Solaris Studio account', token, 'verify'); }
      catch (error) { console.error('Verification email could not be sent:', error.message); }
    }
    return send(res, 200, { message: 'If an unverified account uses that email, a new verification link will be sent.' });
  }
  if (req.method === 'POST' && pathname === '/api/forgot-password') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many reset requests. Please try again later.' });
    const input = await readBody(req);
    const email = normalizeEmail(input.email);
    const account = accounts.find(item => item.email === email && item.emailVerified === true);
    if (account && getMailer()) {
      const token = crypto.randomBytes(32).toString('base64url');
      account.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
      account.passwordResetExpiresAt = Date.now() + RESET_TOKEN_MS;
      await saveAccounts();
      try { await sendAccountEmail(req, email, 'Reset your Solaris Studio password', token, 'reset'); }
      catch (error) { console.error('Password reset email could not be sent:', error.message); }
    }
    return send(res, 200, { message: 'If a verified account uses that email, a password reset link will be sent.' });
  }
  if (req.method === 'POST' && pathname === '/api/reset-password') {
    const input = await readBody(req);
    const tokenHash = crypto.createHash('sha256').update(text(input.token, 128)).digest('hex');
    if (typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 200) return send(res, 400, { error: 'Use a password between 10 and 200 characters.' });
    const account = accounts.find(item => item.passwordResetTokenHash === tokenHash && Number(item.passwordResetExpiresAt) > Date.now());
    if (!account) return send(res, 400, { error: 'This password reset link is invalid or has expired. Request a new one.' });
    account.salt = crypto.randomBytes(16).toString('hex');
    account.passwordHash = Buffer.from(await scrypt(input.password, account.salt, 64)).toString('hex');
    account.passwordResetTokenHash = '';
    account.passwordResetExpiresAt = 0;
    for (const [sessionToken, session] of sessions) if (session.accountId === account.id) sessions.delete(sessionToken);
    if (pool) await pool.query('DELETE FROM solaris_sessions WHERE account_id = $1', [account.id]);
    await saveAccounts();
    return send(res, 200, { message: 'Your password was changed. You can now log in.' });
  }
  if (req.method === 'POST' && pathname === '/api/signup') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many sign-up attempts. Please try again later.' });
    const input = await readBody(req);
    const username = text(input.username, 24);
    if (!validUsername(username)) return send(res, 400, { error: 'Use 3–24 letters, numbers, dots, dashes, underscores, or single spaces.' });
    if (accounts.some(account => account.profile.username.toLowerCase() === username.toLowerCase())) return send(res, 409, { error: 'That username is already taken.' });
    const email = normalizeEmail(input.email);
    if (!validEmail(email)) return send(res, 400, { error: 'Enter a valid email address.' });
    if (accounts.some(account => account.email === email || account.pendingEmail === email)) return send(res, 409, { error: 'That email address is already connected to an account.' });
    if (!getMailer()) return send(res, 503, { error: 'Email verification is not ready yet. The studio needs to configure its email service first.' });
    if (typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 200) return send(res, 400, { error: 'Use a password between 10 and 200 characters.' });
    const ownerUsername = text(process.env.SOLARIS_OWNER_USERNAME, 24);
    const setupCode = String(input.ownerSetupCode || '');
    const ownerExists = accounts.some(account => account.role === 'owner');
    const reservedOwnerName = !ownerExists && ownerUsername && username.toLowerCase() === ownerUsername.toLowerCase();
    if (reservedOwnerName && !setupCode) return send(res, 403, { error: 'This username is reserved for the studio owner. Enter the owner setup code.' });
    let claimOwner = false;
    if (setupCode) {
      if (ownerExists || !ownerUsername || !process.env.SOLARIS_OWNER_SETUP_TOKEN || !secureEqual(setupCode, process.env.SOLARIS_OWNER_SETUP_TOKEN) || username.toLowerCase() !== ownerUsername.toLowerCase()) return send(res, 403, { error: 'The owner setup code or username is not valid.' });
      claimOwner = true;
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = Buffer.from(await scrypt(input.password, salt, 64)).toString('hex');
    const id = crypto.randomUUID();
    const verificationToken = crypto.randomBytes(32).toString('base64url');
    const account = { id, salt, passwordHash, role: claimOwner ? 'owner' : 'member', email, emailVerified: false, pendingEmail: email,
      emailVerificationTokenHash: crypto.createHash('sha256').update(verificationToken).digest('hex'), emailVerificationExpiresAt: Date.now() + EMAIL_TOKEN_MS,
      profile: cleanProfile({ ...input.profile, username }) };
    if (claimOwner) account.profile.teamKey = 'owner';
    accounts.push(account);
    try {
      await saveAccounts();
      await sendAccountEmail(req, email, 'Verify your Solaris Studio account', verificationToken, 'verify');
    } catch (error) {
      console.error('EMAIL SEND ERROR:', error);
      accounts = accounts.filter(item => item.id !== id);
      await saveAccounts();
      return send(res, error.status || 503, { error: error.status ? error.message : 'The verification email could not be sent. Try again later.' });
    }
    return send(res, 201, { message: `Check ${email} for a link to verify your account.` });
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
    if (account.email && account.emailVerified !== true) return send(res, 403, { error: 'Verify your email address before logging in.' });
    await setSession(res, account.id);
    return send(res, 200, { user: privateProfile(account) });
  }
  if (req.method === 'POST' && pathname === '/api/logout') {
    await clearSession(req, res);
    return send(res, 200, { user: null });
  }
  if (req.method === 'PUT' && pathname === '/api/profile') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Please log in to update your profile.' });
    const input = await readBody(req);
    const username = text(input.username, 24);
    if (!validUsername(username)) return send(res, 400, { error: 'Use 3–24 letters, numbers, dots, dashes, underscores, or single spaces for your username.' });
    const usernameChanged = username.toLowerCase() !== account.profile.username.toLowerCase();
    if (usernameChanged && accounts.some(item => item.id !== account.id && item.profile.username.toLowerCase() === username.toLowerCase())) return send(res, 409, { error: 'That username is already taken.' });
    if (usernameChanged) {
      const lastChanged = Number(account.profile.usernameLastChangedAt) || Date.now();
      if (Date.now() - lastChanged < USERNAME_COOLDOWN_MS && input.useNamecardTicket !== true) return send(res, 429, { error: 'Username changes have a one-week cooldown. Use a free Namecard ticket to change it now.' });
    }
    const realName = text(input.realName, 80);
    if (account.profile.realName && realName !== account.profile.realName && input.useWhoTicket !== true) return send(res, 403, { error: 'Your real name is permanent. Use a free WHO? ticket to change it.' });
    if (usernameChanged) account.profile.usernameLastChangedAt = Date.now();
    account.profile = cleanProfile(input, account.profile);
    await saveAccounts();
    return send(res, 200, { user: privateProfile(account) });
  }
  if (req.method === 'PUT' && pathname === '/api/admin/team-member') {
    const owner = await getAccount(req);
    if (!owner || owner.role !== 'owner') return send(res, 403, { error: 'Only the Solaris Owner can manage team accounts.' });
    const input = await readBody(req);
    const target = accounts.find(item => item.id === input.accountId);
    const teamKey = input.teamKey === 'owner' || input.teamKey === 'assistant' ? input.teamKey : '';
    if (!target) return send(res, 404, { error: 'That account could not be found.' });
    if (teamKey && target.emailVerified !== true) return send(res, 403, { error: 'Only accounts with verified email can be added to the Solaris List.' });
    if (target.role === 'owner' && teamKey !== 'owner') return send(res, 403, { error: 'The Owner account must keep the Owner team position.' });
    if (teamKey === 'owner' && target.role !== 'owner') return send(res, 403, { error: 'Only the verified Owner account can hold the Owner team position.' });
    if (teamKey && accounts.some(item => item.id !== target.id && item.profile.teamKey === teamKey)) return send(res, 409, { error: 'That team position is already connected to an account.' });
    target.profile.teamKey = teamKey || null;
    await saveAccounts();
    return send(res, 200, { account: { id: target.id, username: target.profile.username, teamKey: target.profile.teamKey || '' } });
  }
  return send(res, 404, { error: 'Not found.' });
}

async function loadFileStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    const stored = JSON.parse(await fs.readFile(STORE_PATH, 'utf8'));
    accounts = Array.isArray(stored) ? stored.filter(account => account && account.id && account.profile && account.passwordHash && account.salt) : [];
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    accounts = [];
  }
  if (accounts.reduce((changed, account) => normalizeAccount(account) || changed, false)) await saveAccounts();
}

async function loadStore() {
  if (!process.env.DATABASE_URL) return loadFileStore();

  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('CREATE TABLE IF NOT EXISTS solaris_account_store (store_id SMALLINT PRIMARY KEY CHECK (store_id = 1), accounts JSONB NOT NULL)');
  await pool.query('CREATE TABLE IF NOT EXISTS solaris_sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires_at BIGINT NOT NULL)');
  const result = await pool.query('SELECT accounts FROM solaris_account_store WHERE store_id = 1');
  if (result.rows.length) {
    accounts = Array.isArray(result.rows[0].accounts) ? result.rows[0].accounts : [];
    if (accounts.reduce((changed, account) => normalizeAccount(account) || changed, false)) await saveAccounts();
  } else {
    // Import the existing JSON account store once when attaching a database.
    await loadFileStore();
    await saveAccounts();
  }
  await pool.query('DELETE FROM solaris_sessions WHERE expires_at <= $1', [Date.now()]);
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

loadStore().then(() => {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL && !process.env.SOLARIS_DATA_DIR) {
    console.warn('Account data is using local files and may be lost after a restart. Configure DATABASE_URL or a persistent SOLARIS_DATA_DIR.');
  }
  server.listen(PORT, HOST, () => console.log(`Solaris Studio is running at http://localhost:${PORT}`));
}).catch(async error => {
  if (pool) await pool.end().catch(() => {});
  console.error('Could not load the account store:', error.message);
  process.exitCode = 1;
});

