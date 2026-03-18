const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, '../data');
const files = {
  accounts: path.join(DATA_DIR, 'accounts.json'),
  tokens: path.join(DATA_DIR, 'tokens.json'),
  badges: path.join(DATA_DIR, 'badges.json'),
  friends: path.join(DATA_DIR, 'friends.json'),
  trades: path.join(DATA_DIR, 'trades.json'),
  market: path.join(DATA_DIR, 'market.json'),
};

function readData(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return {}; }
}
function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

app.use(cors());
app.use(bodyParser.json());
app.use(session({
  secret: 'gameplatform-secret-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, '../public')));

function generateCode() {
  return '@' + Math.floor(1000 + Math.random() * 9000);
}

function checkBadges(userId) {
  const badgeData = readData(files.badges);
  const accountData = readData(files.accounts);
  const user = accountData.users.find(u => u.id === userId);
  if (!user) return;
  const wins = user.wins || 0;
  const userBadges = badgeData.userBadges[userId] || [];
  const winBadges = [
    { req: 10, id: 'badge_10' }, { req: 20, id: 'badge_20' },
    { req: 50, id: 'badge_50' }, { req: 100, id: 'badge_100' },
    { req: 200, id: 'badge_200' }, { req: 500, id: 'badge_500' },
    { req: 1000, id: 'badge_1000' },
  ];
  let changed = false;
  winBadges.forEach(b => {
    if (wins >= b.req) {
      const count = Math.floor(wins / b.req);
      const existing = userBadges.filter(ub => ub.id === b.id).length;
      if (count > existing) {
        for (let i = existing; i < count; i++) {
          userBadges.push({ id: b.id, earnedAt: new Date().toISOString(), index: i });
        }
        changed = true;
      }
    }
  });
  if (changed) {
    badgeData.userBadges[userId] = userBadges;
    writeData(files.badges, badgeData);
  }
}

// ===== AUTH =====
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.json({ success: false, message: 'Eksik bilgi' });

  // ===== USERNAME VALIDATION =====
  const ALLOWED = /^[A-Za-z0-9_]+$/;
  if (!ALLOWED.test(username))
    return res.json({ success: false, message: 'Kullanıcı adı sadece harf, rakam ve _ içerebilir.' });
  if (username.length < 9)
    return res.json({ success: false, message: 'Kullanıcı adı en az 9 karakter olmalı.' });
  if (username.length > 30)
    return res.json({ success: false, message: 'Kullanıcı adı en fazla 30 karakter olabilir.' });
  if ((username.match(/[A-Za-z]/g) || []).length < 5)
    return res.json({ success: false, message: 'Kullanıcı adında en az 5 harf bulunmalı.' });
  if (!username.includes('_'))
    return res.json({ success: false, message: 'Kullanıcı adında en az 1 alt çizgi ( _ ) bulunmalı.' });
  if ((username.match(/[0-9]/g) || []).length < 3)
    return res.json({ success: false, message: 'Kullanıcı adında en az 3 rakam bulunmalı.' });
  // ================================
  const data = readData(files.accounts);
  if (!data.users) data.users = [];
  if (data.users.find(u => u.username.toLowerCase() === username.toLowerCase()))
    return res.json({ success: false, message: 'Bu kullanıcı adı zaten alınmış' });
  const hashedPass = await bcrypt.hash(password, 10);
  let code;
  do { code = generateCode(); } while (data.users.find(u => u.code === code));
  const user = {
    id: uuidv4(), username, password: hashedPass, code,
    wins: 0, createdAt: new Date().toISOString(), banned: false,
    nameEffect: null, profileEffect: null
  };
  data.users.push(user);
  writeData(files.accounts, data);
  const tokenData = readData(files.tokens);
  tokenData[user.id] = 0;
  writeData(files.tokens, tokenData);
  const friendData = readData(files.friends);
  friendData[user.id] = [];
  writeData(files.friends, friendData);
  const badgeData = readData(files.badges);
  if (!badgeData.userBadges) badgeData.userBadges = {};
  badgeData.userBadges[user.id] = [];
  writeData(files.badges, badgeData);
  const marketData = readData(files.market);
  if (!marketData.purchases) marketData.purchases = {};
  marketData.purchases[user.id] = [];
  writeData(files.market, marketData);
  req.session.userId = user.id;
  req.session.userType = 'user';
  res.json({ success: true, user: { id: user.id, username: user.username, code: user.code } });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const data = readData(files.accounts);
  if (!data.users) return res.json({ success: false, message: 'Kullanıcı bulunamadı' });
  const user = data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return res.json({ success: false, message: 'Kullanıcı bulunamadı' });
  if (user.banned) return res.json({ success: false, message: 'Hesabınız yasaklanmış' });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ success: false, message: 'Yanlış şifre' });
  req.session.userId = user.id;
  req.session.userType = 'user';
  const tokenData = readData(files.tokens);
  const badgeData = readData(files.badges);
  const marketData = readData(files.market);
  res.json({ success: true, user: {
    id: user.id, username: user.username, code: user.code, wins: user.wins,
    nameEffect: user.nameEffect, profileEffect: user.profileEffect,
    tokens: tokenData[user.id] || 0,
    badges: (badgeData.userBadges || {})[user.id] || [],
    purchases: (marketData.purchases || {})[user.id] || []
  }});
});

app.post('/api/auth/admin-login', (req, res) => {
  const { productKey } = req.body;
  const BAS_ADMIN_KEY = 'GMPLT-XKQZ7-M9R4N-BW2VP-L8TJH';
  if (productKey === BAS_ADMIN_KEY) {
    req.session.adminId = 'basadmin-001';
    req.session.adminType = 'bas_admin';
    return res.json({ success: true, adminType: 'bas_admin', username: 'Baş Admin' });
  }
  const data = readData(files.accounts);
  const subAdmin = (data.subAdmins || []).find(a => a.productKey === productKey);
  if (subAdmin) {
    req.session.adminId = subAdmin.id;
    req.session.adminType = 'sub_admin';
    req.session.linkedUserId = subAdmin.linkedUserId;
    return res.json({ success: true, adminType: 'sub_admin', username: subAdmin.username });
  }
  return res.json({ success: false, message: 'Geçersiz ürün anahtarı' });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  if (req.session.userId) {
    const data = readData(files.accounts);
    const user = (data.users || []).find(u => u.id === req.session.userId);
    if (!user) return res.json({ loggedIn: false });
    const tokenData = readData(files.tokens);
    const badgeData = readData(files.badges);
    const marketData = readData(files.market);
    return res.json({ loggedIn: true, type: 'user', user: {
      id: user.id, username: user.username, code: user.code, wins: user.wins,
      nameEffect: user.nameEffect, profileEffect: user.profileEffect,
      tokens: tokenData[user.id] || 0,
      badges: (badgeData.userBadges || {})[user.id] || [],
      purchases: (marketData.purchases || {})[user.id] || []
    }});
  }
  if (req.session.adminId) {
    return res.json({ loggedIn: true, type: req.session.adminType, adminId: req.session.adminId });
  }
  res.json({ loggedIn: false });
});

// ===== USER =====
app.get('/api/user/:id', (req, res) => {
  const data = readData(files.accounts);
  const user = (data.users || []).find(u => u.id === req.params.id);
  if (!user) return res.json({ success: false });
  const tokenData = readData(files.tokens);
  const badgeData = readData(files.badges);
  res.json({ success: true, user: {
    id: user.id, username: user.username, code: user.code, wins: user.wins,
    nameEffect: user.nameEffect, profileEffect: user.profileEffect,
    tokens: tokenData[user.id] || 0,
    badges: (badgeData.userBadges || {})[user.id] || []
  }});
});

app.post('/api/friends/add', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'Giriş yapın' });
  const { code } = req.body;
  const data = readData(files.accounts);
  const target = (data.users || []).find(u => u.code === code);
  if (!target) return res.json({ success: false, message: 'Kullanıcı bulunamadı' });
  if (target.id === req.session.userId) return res.json({ success: false, message: 'Kendinizi ekleyemezsiniz' });
  const friendData = readData(files.friends);
  if (!friendData[req.session.userId]) friendData[req.session.userId] = [];
  if (friendData[req.session.userId].includes(target.id)) return res.json({ success: false, message: 'Zaten arkadaşsınız' });
  friendData[req.session.userId].push(target.id);
  if (!friendData[target.id]) friendData[target.id] = [];
  friendData[target.id].push(req.session.userId);
  writeData(files.friends, friendData);
  res.json({ success: true, friend: { id: target.id, username: target.username, code: target.code } });
});

app.get('/api/friends', (req, res) => {
  if (!req.session.userId) return res.json({ success: false });
  const friendData = readData(files.friends);
  const ids = friendData[req.session.userId] || [];
  const data = readData(files.accounts);
  const tokenData = readData(files.tokens);
  const friends = ids.map(id => {
    const u = (data.users || []).find(u => u.id === id);
    if (!u) return null;
    return { id: u.id, username: u.username, code: u.code, tokens: tokenData[id] || 0 };
  }).filter(Boolean);
  res.json({ success: true, friends });
});

app.post('/api/gift', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'Giriş yapın' });
  const { targetId, amount } = req.body;
  if (!targetId || !amount || amount <= 0) return res.json({ success: false, message: 'Geçersiz miktar' });
  const tokenData = readData(files.tokens);
  const myTokens = tokenData[req.session.userId] || 0;
  if (myTokens < amount) return res.json({ success: false, message: 'Yetersiz token' });
  tokenData[req.session.userId] = myTokens - amount;
  tokenData[targetId] = (tokenData[targetId] || 0) + amount;
  writeData(files.tokens, tokenData);
  res.json({ success: true, newBalance: tokenData[req.session.userId] });
});

app.post('/api/trade/create', (req, res) => {
  if (!req.session.userId) return res.json({ success: false });
  const { targetId, offeredBadge, wantedBadge } = req.body;
  const trades = readData(files.trades) || [];
  const tradeArr = Array.isArray(trades) ? trades : [];
  tradeArr.push({ id: uuidv4(), fromId: req.session.userId, targetId, offeredBadge, wantedBadge, status: 'pending', createdAt: new Date().toISOString() });
  writeData(files.trades, tradeArr);
  res.json({ success: true });
});

app.get('/api/trade/my', (req, res) => {
  if (!req.session.userId) return res.json({ success: false });
  const trades = readData(files.trades);
  const tradeArr = Array.isArray(trades) ? trades : [];
  const myTrades = tradeArr.filter(t => t.fromId === req.session.userId || t.targetId === req.session.userId);
  res.json({ success: true, trades: myTrades });
});

app.post('/api/trade/respond', (req, res) => {
  if (!req.session.userId) return res.json({ success: false });
  const { tradeId, accept } = req.body;
  const trades = readData(files.trades);
  const tradeArr = Array.isArray(trades) ? trades : [];
  const idx = tradeArr.findIndex(t => t.id === tradeId && t.targetId === req.session.userId);
  if (idx === -1) return res.json({ success: false });
  if (accept) {
    tradeArr[idx].status = 'accepted';
    const badgeData = readData(files.badges);
    const fromBadges = (badgeData.userBadges || {})[tradeArr[idx].fromId] || [];
    const toBadges = (badgeData.userBadges || {})[req.session.userId] || [];
    const offerIdx = fromBadges.findIndex(b => b.id === tradeArr[idx].offeredBadge);
    const wantIdx = toBadges.findIndex(b => b.id === tradeArr[idx].wantedBadge);
    if (offerIdx !== -1 && wantIdx !== -1) {
      const offered = fromBadges.splice(offerIdx, 1)[0];
      const wanted = toBadges.splice(wantIdx, 1)[0];
      fromBadges.push(wanted);
      toBadges.push(offered);
      badgeData.userBadges[tradeArr[idx].fromId] = fromBadges;
      badgeData.userBadges[req.session.userId] = toBadges;
      writeData(files.badges, badgeData);
    }
  } else { tradeArr[idx].status = 'rejected'; }
  writeData(files.trades, tradeArr);
  res.json({ success: true });
});

app.get('/api/market/items', (req, res) => {
  const marketData = readData(files.market);
  res.json({ success: true, items: marketData.items || [] });
});

app.post('/api/market/buy', (req, res) => {
  if (!req.session.userId) return res.json({ success: false, message: 'Giriş yapın' });
  const { itemId } = req.body;
  const marketData = readData(files.market);
  const item = (marketData.items || []).find(i => i.id === itemId);
  if (!item) return res.json({ success: false, message: 'Ürün bulunamadı' });
  const tokenData = readData(files.tokens);
  if ((tokenData[req.session.userId] || 0) < item.cost) return res.json({ success: false, message: 'Yetersiz token' });
  if (!marketData.purchases) marketData.purchases = {};
  if (!marketData.purchases[req.session.userId]) marketData.purchases[req.session.userId] = [];
  if (marketData.purchases[req.session.userId].includes(itemId)) return res.json({ success: false, message: 'Zaten sahipsiniz' });
  tokenData[req.session.userId] -= item.cost;
  marketData.purchases[req.session.userId].push(itemId);
  writeData(files.tokens, tokenData);
  writeData(files.market, marketData);
  res.json({ success: true, newBalance: tokenData[req.session.userId], item });
});

app.post('/api/market/equip', (req, res) => {
  if (!req.session.userId) return res.json({ success: false });
  const { itemId } = req.body;
  const marketData = readData(files.market);
  const owned = ((marketData.purchases || {})[req.session.userId] || []).includes(itemId);
  if (!owned) return res.json({ success: false, message: 'Bu ürüne sahip değilsiniz' });
  const item = (marketData.items || []).find(i => i.id === itemId);
  const data = readData(files.accounts);
  const userIdx = (data.users || []).findIndex(u => u.id === req.session.userId);
  if (item.type === 'name_effect') data.users[userIdx].nameEffect = item.css;
  else if (item.type === 'profile_effect') data.users[userIdx].profileEffect = item.css;
  else if (item.type === 'set') {
    data.users[userIdx].nameEffect = item.css + '-name';
    data.users[userIdx].profileEffect = item.css + '-profile';
  }
  writeData(files.accounts, data);
  res.json({ success: true });
});

app.post('/api/game/win', (req, res) => {
  if (!req.session.userId) return res.json({ success: false });
  const data = readData(files.accounts);
  const userIdx = (data.users || []).findIndex(u => u.id === req.session.userId);
  if (userIdx === -1) return res.json({ success: false });
  data.users[userIdx].wins = (data.users[userIdx].wins || 0) + 1;
  writeData(files.accounts, data);
  const tokenData = readData(files.tokens);
  tokenData[req.session.userId] = (tokenData[req.session.userId] || 0) + 5;
  writeData(files.tokens, tokenData);
  checkBadges(req.session.userId);
  const badgeData = readData(files.badges);
  res.json({ success: true, wins: data.users[userIdx].wins, tokens: tokenData[req.session.userId], badges: (badgeData.userBadges || {})[req.session.userId] || [] });
});

// ===== ADMIN =====
function requireBasAdmin(req, res, next) {
  if (req.session.adminType === 'bas_admin') return next();
  res.json({ success: false, message: 'Yetkisiz' });
}
function requireAnyAdmin(req, res, next) {
  if (req.session.adminType === 'bas_admin' || req.session.adminType === 'sub_admin') return next();
  res.json({ success: false, message: 'Yetkisiz' });
}

app.get('/api/admin/users', requireAnyAdmin, (req, res) => {
  const data = readData(files.accounts);
  const tokenData = readData(files.tokens);
  const badgeData = readData(files.badges);
  const users = (data.users || []).map(u => ({
    id: u.id, username: u.username, code: u.code, wins: u.wins,
    banned: u.banned, createdAt: u.createdAt,
    tokens: tokenData[u.id] || 0,
    badgeCount: ((badgeData.userBadges || {})[u.id] || []).length
  }));
  res.json({ success: true, users });
});

app.get('/api/admin/user/:id/credentials', requireAnyAdmin, (req, res) => {
  const data = readData(files.accounts);
  const user = (data.users || []).find(u => u.id === req.params.id);
  if (!user) return res.json({ success: false });
  res.json({ success: true, username: user.username, passwordHash: user.password });
});

app.post('/api/admin/user/:id/ban', requireAnyAdmin, (req, res) => {
  const data = readData(files.accounts);
  const idx = (data.users || []).findIndex(u => u.id === req.params.id);
  if (idx === -1) return res.json({ success: false });
  data.users[idx].banned = !data.users[idx].banned;
  writeData(files.accounts, data);
  res.json({ success: true, banned: data.users[idx].banned });
});

app.delete('/api/admin/user/:id', requireBasAdmin, (req, res) => {
  const data = readData(files.accounts);
  data.users = (data.users || []).filter(u => u.id !== req.params.id);
  writeData(files.accounts, data);
  res.json({ success: true });
});

app.post('/api/admin/user/:id/token', requireAnyAdmin, (req, res) => {
  const { amount, action } = req.body;
  const tokenData = readData(files.tokens);
  const current = tokenData[req.params.id] || 0;
  if (action === 'set') tokenData[req.params.id] = parseInt(amount);
  else if (action === 'add') tokenData[req.params.id] = current + parseInt(amount);
  else if (action === 'subtract') tokenData[req.params.id] = Math.max(0, current - parseInt(amount));
  writeData(files.tokens, tokenData);
  res.json({ success: true, tokens: tokenData[req.params.id] });
});

app.post('/api/admin/user/:id/badge', requireAnyAdmin, (req, res) => {
  const { badgeId, action } = req.body;
  const badgeData = readData(files.badges);
  if (!badgeData.userBadges) badgeData.userBadges = {};
  if (!badgeData.userBadges[req.params.id]) badgeData.userBadges[req.params.id] = [];
  if (action === 'give') {
    badgeData.userBadges[req.params.id].push({ id: badgeId, earnedAt: new Date().toISOString(), manual: true });
  } else {
    const idx = badgeData.userBadges[req.params.id].findIndex(b => b.id === badgeId);
    if (idx !== -1) badgeData.userBadges[req.params.id].splice(idx, 1);
  }
  writeData(files.badges, badgeData);
  res.json({ success: true });
});

app.post('/api/admin/create-subadmin', requireBasAdmin, (req, res) => {
  const { linkedUserId } = req.body;
  const data = readData(files.accounts);
  const user = (data.users || []).find(u => u.id === linkedUserId);
  if (!user) return res.json({ success: false, message: 'Kullanıcı bulunamadı' });
  if (!data.subAdmins) data.subAdmins = [];
  if (data.subAdmins.find(a => a.linkedUserId === linkedUserId))
    return res.json({ success: false, message: 'Bu kullanıcı zaten alt admin' });
  const key = 'SADM-' + Array.from({length: 4}, () =>
    Math.random().toString(36).toUpperCase().substring(2, 7)).join('-');
  const subAdmin = { id: uuidv4(), username: user.username, linkedUserId, productKey: key, createdAt: new Date().toISOString() };
  data.subAdmins.push(subAdmin);
  writeData(files.accounts, data);
  res.json({ success: true, productKey: key, subAdmin });
});

app.get('/api/admin/subadmins', requireBasAdmin, (req, res) => {
  const data = readData(files.accounts);
  res.json({ success: true, subAdmins: data.subAdmins || [] });
});

app.delete('/api/admin/subadmin/:id', requireBasAdmin, (req, res) => {
  const data = readData(files.accounts);
  data.subAdmins = (data.subAdmins || []).filter(a => a.id !== req.params.id);
  writeData(files.accounts, data);
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log('\n🎮 GamePlatform sunucusu başlatıldı!');
  console.log(`📡 http://localhost:${PORT}`);
  console.log('\n🔑 BAŞ ADMİN ANAHTARI: GMPLT-XKQZ7-M9R4N-BW2VP-L8TJH');
  console.log('\n✅ Sunucu hazır!\n');
});
