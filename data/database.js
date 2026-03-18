const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/db.json');

const defaultDB = {
  users: [],
  admins: [
    {
      id: "bas-admin-001",
      username: "BaşAdmin",
      password: "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
      role: "bas-admin",
      linkedUserId: null,
      createdAt: new Date().toISOString()
    }
  ],
  productKey: "GMPLT-X7K92-MN4RW-PQ8VZ-T3YJH",
  friendRequests: [],
  trades: [],
  messages: []
};

function loadDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
      return defaultDB;
    }
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return defaultDB;
  }
}

function saveDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

module.exports = { loadDB, saveDB };
