import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'users.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

const loadDb = () => {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erro ao ler banco de dados:', error);
        return {};
    }
};

const saveDb = (data) => {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Erro ao salvar banco de dados:', error);
    }
};

export const getUser = (phone) => {
    const db = loadDb();
    if (!db[phone]) {
        db[phone] = {
            phone,
            credits: 0,
            freeEditsUsed: 0,
            createdAt: Date.now()
        };
        saveDb(db);
    }
    return db[phone];
};

export const hasCredit = (phone) => {
    const user = getUser(phone);
    // User has credit if they have paid credits OR haven't used all free edits (2)
    return user.credits > 0 || user.freeEditsUsed < 2;
};

export const consumeCredit = (phone) => {
    const db = loadDb();
    const user = db[phone] || getUser(phone);

    if (user.credits > 0) {
        user.credits -= 1;
    } else if (user.freeEditsUsed < 2) {
        user.freeEditsUsed += 1;
    } else {
        return false; // Should not happen if checked before
    }

    db[phone] = user;
    saveDb(db);
    return true;
};

export const addCredits = (phone, amount) => {
    const db = loadDb();
    if (!db[phone]) {
        getUser(phone); // Initialize
        // Reload to get the object reference in db
        Object.assign(db, loadDb());
    }

    db[phone].credits = (db[phone].credits || 0) + amount;
    saveDb(db);
    return db[phone].credits;
};

export const getStatus = (phone) => {
    const user = getUser(phone);
    const freeRemaining = Math.max(0, 2 - user.freeEditsUsed);
    return {
        credits: user.credits,
        freeRemaining,
        canEdit: user.credits > 0 || freeRemaining > 0
    };
};
