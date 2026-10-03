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
const PAUSE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const USERNAME_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_BODY = 3 * 1024 * 1024;
const STATIC_FILES = new Set(['index.html', 'list.html', 'members.html', 'games.html', 'project.html', 'artwork.html', 'updates.html', 'account.html', 'arts.html', 'groups.html', 'download.html', 'shop.html', 'assets/hollow-shift-icon.webp', 'assets/gamma-frost-banner.webp', 'assets/golden-spiral-sun-icon.png', 'styles.css', 'app.js']);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png' };
const PRIMARY_ROLES = {
  assistant: { label: 'Assistant', explanation: 'Supports studio coordination and helps keep Solaris projects moving.' },
  'ai-assistant': { label: 'AI Assistant', explanation: 'An AI contributor that helps with Solaris Studio work under human direction.' },
  developer: { label: 'Developer', explanation: 'Builds, tests, or maintains Solaris Studio projects.' },
  member: { label: 'Member', explanation: 'A member of the Solaris Studio community.' }
};
const PROJECT_TAGS = ['Gamma Frost', 'OmiWo: Collide'];
const FRIEND_CARD_STROKES = new Set(['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge']);
const FRIEND_CARD_EFFECTS = new Set(['none', 'glow', 'lift', 'shine']);

let accounts = [];
let pausedAccounts = [];
let pool = null;
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
  const ownerUsername = text(process.env.SOLARIS_OWNER_USERNAME || 'Fritzz Xenon', 24);
  const ownerExists = accounts.some(item => item.role === 'owner') || pausedAccounts.some(item => item.account.role === 'owner');
  const canClaimOwner = Boolean(process.env.SOLARIS_OWNER_SETUP_TOKEN && !ownerExists && account.profile.username.toLowerCase() === ownerUsername.toLowerCase());
  return { ...publicProfile(account), tickets: account.tickets || { namecard: 0, who: 0 }, canClaimOwner };
}
function normalizeAccount(account) {
  let changed = false;
  if (!account.role) { account.role = 'member'; changed = true; }
  if (!account.tickets || typeof account.tickets !== 'object') { account.tickets = { namecard: 0, who: 0 }; changed = true; }
  for (const kind of ['namecard', 'who']) {
    const count = Math.min(99, Math.max(0, Math.floor(Number(account.tickets[kind]) || 0)));
    if (account.tickets[kind] !== count) { account.tickets[kind] = count; changed = true; }
  }
  if (!Object.hasOwn(PRIMARY_ROLES, account.profile.primaryRole)) {
    account.profile.primaryRole = account.profile.teamKey === 'assistant' ? 'assistant' : 'member';
    changed = true;
  }
  if (Object.hasOwn(account.profile, 'teamKey')) { delete account.profile.teamKey; changed = true; }
  const secondaryRoles = account.role === 'owner' || account.profile.primaryRole !== 'member' ? cleanSecondaryRoles(account.profile.secondaryRoles) : [];
  if (JSON.stringify(secondaryRoles) !== JSON.stringify(account.profile.secondaryRoles || [])) { account.profile.secondaryRoles = secondaryRoles; changed = true; }
  const friendCard = account.role !== 'owner' && account.profile.primaryRole === 'member' ? cleanFriendCard(account.profile.friendCard) : emptyFriendCard();
  if (!account.profile.friendCard || JSON.stringify(friendCard) !== JSON.stringify(account.profile.friendCard)) { account.profile.friendCard = friendCard; changed = true; }
  if (!Number(account.profile.usernameLastChangedAt)) { account.profile.usernameLastChangedAt = Date.now(); changed = true; }
  return changed;
}
function validUsername(value) {
  return typeof value === 'string' && value.length >= 3 && value.length <= 24 && /^[A-Za-z0-9_. -]+$/.test(value) && !/\s{2,}/.test(value);
}
async function passwordMatches(account, password) {
  if (typeof password !== 'string' || password.length > 200) return false;
  const expected = Buffer.from(account.passwordHash, 'hex');
  const candidate = Buffer.from(await scrypt(password, account.salt, 64));
  return expected.length === candidate.length && crypto.timingSafeEqual(expected, candidate);
}
function secureEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
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
function cleanSecondaryRoles(value) {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set();
  return source.map(item => text(item, 32).replace(/\s+/g, ' ')).filter(item => {
    if (!item || !/[A-Za-z0-9]/.test(item) || !/^[A-Za-z0-9][A-Za-z0-9 .+\/#&'-]*$/.test(item)) return false;
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}
function imageData(value, maxLength = 950_000) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.length > maxLength || !/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw Object.assign(new Error('That image could not be saved. Choose a smaller JPG, PNG, or WebP image.'), { status: 400 });
  }
  return value;
}
function emptyFriendCard() {
  return { likes: '', dislikes: '', favoriteThing: '', lookingFor: '', personalityTags: [], backgroundImage: '', backgroundColor: '#fff8e9', borderStyle: 'solid', borderColor: '#dcae55', borderWidth: 2, buttonColor: '#3c315b', buttonTextColor: '#ffffff', buttonBorderStyle: 'solid', buttonBorderColor: '#3c315b', effect: 'glow' };
}
function cleanPersonalityTags(value) {
  const source = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const seen = new Set();
  return source.map(item => text(item, 28).replace(/\s+/g, ' ')).filter(item => {
    if (!item || !/^[A-Za-z0-9][A-Za-z0-9 ._'&+-]*$/.test(item)) return false;
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 20);
}
function safeColor(value, fallback) {
  const color = text(value, 7);
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color.toLowerCase() : fallback;
}
function cleanFriendCard(value) {
  const input = value && typeof value === 'object' ? value : {};
  const defaults = emptyFriendCard();
  const borderWidth = Math.min(8, Math.max(1, Math.round(Number(input.borderWidth) || defaults.borderWidth)));
  const borderStyle = FRIEND_CARD_STROKES.has(input.borderStyle) ? input.borderStyle : defaults.borderStyle;
  const buttonBorderStyle = FRIEND_CARD_STROKES.has(input.buttonBorderStyle) ? input.buttonBorderStyle : defaults.buttonBorderStyle;
  const effect = FRIEND_CARD_EFFECTS.has(input.effect) ? input.effect : defaults.effect;
  return {
    likes: text(input.likes, 400), dislikes: text(input.dislikes, 400), favoriteThing: text(input.favoriteThing, 160), lookingFor: text(input.lookingFor, 300),
    personalityTags: cleanPersonalityTags(input.personalityTags), backgroundImage: imageData(input.backgroundImage, 400_000),
    backgroundColor: safeColor(input.backgroundColor, defaults.backgroundColor), borderStyle, borderColor: safeColor(input.borderColor, defaults.borderColor), borderWidth,
    buttonColor: safeColor(input.buttonColor, defaults.buttonColor), buttonTextColor: safeColor(input.buttonTextColor, defaults.buttonTextColor),
    buttonBorderStyle, buttonBorderColor: safeColor(input.buttonBorderColor, defaults.buttonBorderColor), effect
  };
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
function cleanProfile(input, existing = {}, allowMemberFriendCard = true) {
  const socials = validateSocials(input.socials);
  const favorites = ['game', 'developer', 'artwork'].map(type => validateFavorite(input.favorites && input.favorites[type], type)).filter(Boolean);
  const installedGames = Array.isArray(input.installedGames) ? [...new Set(input.installedGames.map(value => text(value, 80)).filter(Boolean))].slice(0, 20) : [];
  return {
    username: text(input.username, 24) || existing.username || '',
    usernameLastChangedAt: Number(existing.usernameLastChangedAt) || Date.now(),
    primaryRole: existing.primaryRole || 'member',
    secondaryRoles: cleanSecondaryRoles(existing.secondaryRoles),
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
    friendCard: allowMemberFriendCard ? cleanFriendCard(input.friendCard) : emptyFriendCard(),
    favorites: Object.fromEntries(['game', 'developer', 'artwork'].map(type => [type, favorites.find(item => item.type === type) || null])),
    installedGames
  };
}
async function saveAccounts() {
  const snapshot = JSON.stringify({ accounts, pausedAccounts });
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
async function restoreExpiredAccounts() {
  const now = Date.now();
  const expired = pausedAccounts.filter(item => Number(item.resumeAt) <= now && item.account?.id);
  if (!expired.length) return;
  for (const item of expired) {
    if (!accounts.some(account => account.id === item.account.id)) accounts.push(item.account);
  }
  pausedAccounts = pausedAccounts.filter(item => Number(item.resumeAt) > now);
  await saveAccounts();
}
async function removeAccountSessions(accountId, req, res) {
  for (const [token, session] of sessions) if (session.accountId === accountId) sessions.delete(token);
  if (pool) await pool.query('DELETE FROM solaris_sessions WHERE account_id = $1', [accountId]);
  await clearSession(req, res);
}
async function handleApi(req, res, pathname) {
  if (!checkOrigin(req)) return send(res, 403, { error: 'This request was not accepted.' });
  await restoreExpiredAccounts();
  if (req.method === 'GET' && pathname === '/api/me') {
    const account = await getAccount(req);
    return send(res, 200, { user: account ? privateProfile(account) : null });
  }
  if (req.method === 'GET' && pathname === '/api/public-profile') {
    const query = new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams;
    const account = accounts.find(item => item.id === query.get('id'));
    return account ? send(res, 200, { user: publicProfile(account) }) : send(res, 404, { error: 'This profile could not be found.' });
  }
  if (req.method === 'GET' && pathname === '/api/team') {
    const team = accounts.filter(account => account.role === 'owner' || ['assistant', 'ai-assistant', 'developer'].includes(account.profile.primaryRole)).map(account => {
      const primaryRole = account.role === 'owner' ? 'Owner' : PRIMARY_ROLES[account.profile.primaryRole]?.label || 'Member';
      return { id: account.id, online: account.profile.username, real: account.profile.realName || 'Not shared', avatarImage: account.profile.avatarImage, primaryRole, roles: [primaryRole, ...cleanSecondaryRoles(account.profile.secondaryRoles)], projects: PROJECT_TAGS };
    });
    return send(res, 200, { members: team });
  }
  if (req.method === 'GET' && pathname === '/api/members') {
    const members = accounts.filter(account => account.role !== 'owner' && account.profile.primaryRole === 'member').map(account => ({
      id: account.id,
      username: account.profile.username,
      avatarImage: account.profile.avatarImage,
      friendCard: cleanFriendCard(account.profile.friendCard)
    }));
    return send(res, 200, { members });
  }
  if (req.method === 'GET' && pathname === '/api/admin/accounts') {
    const owner = await getAccount(req);
    if (!owner || owner.role !== 'owner') return send(res, 403, { error: 'Only the Solaris Owner can assign account roles.' });
    const list = accounts.map(account => ({ id: account.id, username: account.profile.username, accountRole: account.role || 'member', primaryRole: account.role === 'owner' ? 'owner' : (account.profile.primaryRole || 'member'), secondaryRoles: cleanSecondaryRoles(account.profile.secondaryRoles) }));
    return send(res, 200, { accounts: list });
  }
  if (req.method === 'PUT' && pathname === '/api/admin/account-roles') {
    const owner = await getAccount(req);
    if (!owner || owner.role !== 'owner') return send(res, 403, { error: 'Only the Solaris Owner can assign account roles.' });
    const input = await readBody(req);
    const target = accounts.find(item => item.id === input.accountId);
    if (!target) return send(res, 404, { error: 'That account could not be found.' });
    const primaryRole = text(input.primaryRole, 32);
    if (target.role === 'owner' && primaryRole !== 'owner') return send(res, 403, { error: 'The Owner permission cannot be changed here.' });
    if (target.role !== 'owner' && !Object.hasOwn(PRIMARY_ROLES, primaryRole)) return send(res, 400, { error: 'Choose Assistant, AI Assistant, Developer, or Member. Visitor is reserved for guests.' });
    const assignedPrimaryRole = target.role === 'owner' ? 'owner' : primaryRole;
    const previousPrimaryRole = target.profile.primaryRole;
    const previousSecondaryRoles = target.profile.secondaryRoles;
    const previousFriendCard = target.profile.friendCard;
    if (target.role !== 'owner') target.profile.primaryRole = assignedPrimaryRole;
    target.profile.secondaryRoles = assignedPrimaryRole === 'member' ? [] : cleanSecondaryRoles(input.secondaryRoles);
    if (assignedPrimaryRole !== 'member' || target.role === 'owner') target.profile.friendCard = emptyFriendCard();
    try { await saveAccounts(); }
    catch (error) {
      target.profile.primaryRole = previousPrimaryRole;
      target.profile.secondaryRoles = previousSecondaryRoles;
      target.profile.friendCard = previousFriendCard;
      throw error;
    }
    return send(res, 200, { account: { id: target.id, username: target.profile.username, primaryRole: assignedPrimaryRole, secondaryRoles: target.profile.secondaryRoles } });
  }
  if (req.method === 'POST' && pathname === '/api/owner/claim') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many Owner setup attempts. Please try again later.' });
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to claim the Solaris Owner account.' });
    const input = await readBody(req);
    const ownerUsername = text(process.env.SOLARIS_OWNER_USERNAME || 'Fritzz Xenon', 24);
    const ownerExists = accounts.some(item => item.role === 'owner') || pausedAccounts.some(item => item.account.role === 'owner');
    if (ownerExists || account.profile.username.toLowerCase() !== ownerUsername.toLowerCase()) return send(res, 403, { error: 'This account is not eligible to claim the Owner role.' });
    if (!process.env.SOLARIS_OWNER_SETUP_TOKEN || !secureEqual(input.ownerSetupCode, process.env.SOLARIS_OWNER_SETUP_TOKEN)) return send(res, 403, { error: 'The Owner setup code is not valid.' });
    const previousRole = account.role;
    account.role = 'owner';
    try { await saveAccounts(); }
    catch (error) { account.role = previousRole; throw error; }
    return send(res, 200, { user: { ...privateProfile(account), canClaimOwner: false } });
  }
  if (req.method === 'POST' && pathname === '/api/shop/purchase-ticket') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Log in to add a ticket to your account.' });
    const input = await readBody(req);
    if (!['namecard', 'who'].includes(input.ticketType)) return send(res, 400, { error: 'Choose a valid ticket.' });
    account.tickets ||= { namecard: 0, who: 0 };
    const type = input.ticketType;
    if (Number(account.tickets[type]) >= 99) return send(res, 409, { error: 'Your ticket inventory is full.' });
    const previousCount = Number(account.tickets[type]) || 0;
    account.tickets[type] = (Number(account.tickets[type]) || 0) + 1;
    try { await saveAccounts(); }
    catch (error) { account.tickets[type] = previousCount; throw error; }
    return send(res, 200, { user: privateProfile(account), message: `${type === 'namecard' ? 'Namecard' : 'WHO?'} ticket added for free.` });
  }
  if (req.method === 'POST' && pathname === '/api/signup') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many sign-up attempts. Please try again later.' });
    const input = await readBody(req);
    const username = text(input.username, 24);
    if (!validUsername(username)) return send(res, 400, { error: 'Use 3–24 letters, numbers, dots, dashes, underscores, or single spaces.' });
    if (accounts.some(account => account.profile.username.toLowerCase() === username.toLowerCase()) || pausedAccounts.some(item => item.account.profile.username.toLowerCase() === username.toLowerCase())) return send(res, 409, { error: 'That username is already taken or temporarily reserved by a paused account.' });
    if (typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 200) return send(res, 400, { error: 'Use a password between 10 and 200 characters.' });
    const ownerUsername = text(process.env.SOLARIS_OWNER_USERNAME || 'Fritzz Xenon', 24);
    const setupCode = String(input.ownerSetupCode || '');
    const ownerExists = accounts.some(account => account.role === 'owner') || pausedAccounts.some(item => item.account.role === 'owner');
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
    const account = { id, salt, passwordHash, role: claimOwner ? 'owner' : 'member', tickets: { namecard: 0, who: 0 },
      profile: cleanProfile({ ...input.profile, username }) };
    accounts.push(account);
    try { await saveAccounts(); }
    catch (error) { accounts = accounts.filter(item => item.id !== id); throw error; }
    await setSession(res, account.id);
    return send(res, 201, { user: privateProfile(account), message: 'Your account is ready.' });
  }
  if (req.method === 'POST' && pathname === '/api/login') {
    if (!allowAttempt(req)) return send(res, 429, { error: 'Too many login attempts. Please try again later.' });
    const input = await readBody(req);
    const username = text(input.username, 24).toLowerCase();
    const account = accounts.find(item => item.profile.username.toLowerCase() === username);
    const salt = account ? account.salt : '00000000000000000000000000000000';
    const expected = account ? Buffer.from(account.passwordHash, 'hex') : Buffer.alloc(64);
    const candidate = Buffer.from(await scrypt(typeof input.password === 'string' ? input.password.slice(0, 200) : '', salt, 64));
    if (!account) {
      const paused = pausedAccounts.find(item => item.account.profile.username.toLowerCase() === username);
      if (paused && await passwordMatches(paused.account, input.password)) return send(res, 403, { error: `This account is paused until ${new Date(paused.resumeAt).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC.` });
    }
    if (!account || candidate.length !== expected.length || !crypto.timingSafeEqual(candidate, expected)) return send(res, 401, { error: 'The username or password is incorrect.' });
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
    if (usernameChanged && (accounts.some(item => item.id !== account.id && item.profile.username.toLowerCase() === username.toLowerCase()) || pausedAccounts.some(item => item.account.profile.username.toLowerCase() === username.toLowerCase()))) return send(res, 409, { error: 'That username is already taken or reserved by a paused account.' });
    const lastChanged = Number(account.profile.usernameLastChangedAt) || Date.now();
    const onUsernameCooldown = usernameChanged && Date.now() - lastChanged < USERNAME_COOLDOWN_MS;
    const useNamecardTicket = usernameChanged && input.useNamecardTicket === true;
    if (onUsernameCooldown && (!useNamecardTicket || Number(account.tickets?.namecard) < 1)) return send(res, 429, { error: 'Username changes have a one-week cooldown. Get a Namecard ticket in the Shop to change it now.' });
    if (useNamecardTicket && Number(account.tickets?.namecard) < 1) return send(res, 403, { error: 'You do not have a Namecard ticket. Get one in the Shop.' });
    const realName = text(input.realName, 80);
    const realNameChanged = Boolean(account.profile.realName) && realName !== account.profile.realName;
    if (realNameChanged && (input.useWhoTicket !== true || Number(account.tickets?.who) < 1)) return send(res, 403, { error: 'Your real name is permanent. Get a WHO? ticket in the Shop to change it.' });
    const previousProfile = account.profile;
    const previousTickets = { ...(account.tickets || {}) };
    const updatedProfile = cleanProfile(input, account.profile, account.role !== 'owner' && account.profile.primaryRole === 'member');
    if (usernameChanged) updatedProfile.usernameLastChangedAt = Date.now();
    if (useNamecardTicket) account.tickets.namecard--;
    if (realNameChanged) account.tickets.who--;
    account.profile = updatedProfile;
    try { await saveAccounts(); }
    catch (error) { account.profile = previousProfile; account.tickets = previousTickets; throw error; }
    return send(res, 200, { user: privateProfile(account) });
  }
  if (req.method === 'POST' && pathname === '/api/account/pause') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Please log in to pause your account.' });
    const input = await readBody(req);
    if (input.confirmation !== 'PAUSE') return send(res, 400, { error: 'Type PAUSE exactly to confirm this action.' });
    if (!await passwordMatches(account, input.password)) return send(res, 401, { error: 'Your password is incorrect.' });
    const now = Date.now();
    const backup = JSON.parse(JSON.stringify(account));
    const previousAccounts = accounts;
    const previousPaused = pausedAccounts;
    accounts = accounts.filter(item => item.id !== account.id);
    pausedAccounts = [...pausedAccounts.filter(item => item.account.id !== account.id), { account: backup, pausedAt: now, resumeAt: now + PAUSE_DURATION_MS }];
    try {
      await saveAccounts();
      await removeAccountSessions(account.id, req, res);
    } catch (error) {
      accounts = previousAccounts;
      pausedAccounts = previousPaused;
      await saveAccounts();
      throw error;
    }
    return send(res, 200, { message: `Your account is paused for 30 days. You can log back in after ${new Date(now + PAUSE_DURATION_MS).toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' })} UTC.` });
  }
  if (req.method === 'POST' && pathname === '/api/account/delete') {
    const account = await getAccount(req);
    if (!account) return send(res, 401, { error: 'Please log in to delete your account.' });
    const input = await readBody(req);
    if (input.confirmation !== 'DELETE') return send(res, 400, { error: 'Type DELETE exactly to confirm permanent deletion.' });
    if (!await passwordMatches(account, input.password)) return send(res, 401, { error: 'Your password is incorrect.' });
    const previousAccounts = accounts;
    const previousPaused = pausedAccounts;
    accounts = accounts.filter(item => item.id !== account.id);
    pausedAccounts = pausedAccounts.filter(item => item.account.id !== account.id);
    try {
      await saveAccounts();
      await removeAccountSessions(account.id, req, res);
    } catch (error) {
      accounts = previousAccounts;
      pausedAccounts = previousPaused;
      await saveAccounts();
      throw error;
    }
    return send(res, 200, { message: 'Your account and Solaris pause backups have been permanently deleted.' });
  }
  return send(res, 404, { error: 'Not found.' });
}

async function loadFileStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  let stored;
  try {
    stored = JSON.parse(await fs.readFile(STORE_PATH, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') { accounts = []; pausedAccounts = []; return; }
    throw error;
  }
  const savedAccounts = Array.isArray(stored) ? stored : Array.isArray(stored?.accounts) ? stored.accounts : [];
  accounts = savedAccounts.filter(account => account && account.id && account.profile && account.passwordHash && account.salt);
  pausedAccounts = Array.isArray(stored?.pausedAccounts) ? stored.pausedAccounts.filter(item => item?.account?.id && item.account.profile && item.account.passwordHash && item.account.salt && Number(item.resumeAt) > 0) : [];
  let changed = Array.isArray(stored);
  changed = accounts.reduce((didChange, account) => normalizeAccount(account) || didChange, changed);
  changed = pausedAccounts.reduce((didChange, item) => normalizeAccount(item.account) || didChange, changed);
  // Migrate legacy account arrays without dropping any existing profile data.
  if (changed) await saveAccounts();
}

async function loadStore() {
  if (!process.env.DATABASE_URL) return loadFileStore();

  const { Pool } = require('pg');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('CREATE TABLE IF NOT EXISTS solaris_account_store (store_id SMALLINT PRIMARY KEY CHECK (store_id = 1), accounts JSONB NOT NULL)');
  await pool.query('CREATE TABLE IF NOT EXISTS solaris_sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL, expires_at BIGINT NOT NULL)');
  const result = await pool.query('SELECT accounts FROM solaris_account_store WHERE store_id = 1');
  if (result.rows.length) {
    const stored = result.rows[0].accounts;
    const savedAccounts = Array.isArray(stored) ? stored : Array.isArray(stored?.accounts) ? stored.accounts : [];
    accounts = savedAccounts.filter(account => account && account.id && account.profile && account.passwordHash && account.salt);
    pausedAccounts = Array.isArray(stored?.pausedAccounts) ? stored.pausedAccounts.filter(item => item?.account?.id && item.account.profile && item.account.passwordHash && item.account.salt && Number(item.resumeAt) > 0) : [];
    let changed = Array.isArray(stored);
    changed = accounts.reduce((didChange, account) => normalizeAccount(account) || didChange, changed);
    changed = pausedAccounts.reduce((didChange, item) => normalizeAccount(item.account) || didChange, changed);
    if (changed) await saveAccounts();
  } else {
    // Import the existing JSON account store once when attaching a database.
    await loadFileStore();
    await saveAccounts();
  }
  await pool.query('DELETE FROM solaris_sessions WHERE expires_at <= $1', [Date.now()]);
}

const server = http.createServer(async (req, res) => {
  const requestLabel = `${req.method} ${(req.url || '/').split('?')[0]}`;
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
    console.error(`[REQUEST ERROR] ${requestLabel}`, error);
    if (!res.headersSent) send(res, error.status || 500, { error: error.status ? error.message : 'The server could not complete that request.' });
    else res.destroy();
  }
});

loadStore().then(async () => {
  await restoreExpiredAccounts();
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL && !process.env.SOLARIS_DATA_DIR) {
    console.warn('Account data is using local files and may be lost after a restart. Configure DATABASE_URL or a persistent SOLARIS_DATA_DIR.');
  }
  server.listen(PORT, HOST, () => console.log(`Solaris Studio is running at http://localhost:${PORT}`));
}).catch(async error => {
  if (pool) await pool.end().catch(() => {});
  console.error('Could not load the account store:', error);
  process.exitCode = 1;
});

