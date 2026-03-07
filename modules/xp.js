// ═══════════════════════════════════════════
// Modul: XP systém
// Správa XP bodů, cooldownů odměn a questů
// ═══════════════════════════════════════════

const fs = require('fs');
const path = require('path');

const XP_DB_PATH = path.join(__dirname, '../data/xp.json');

// ═══ Načtení / uložení DB ═══
function loadXP() {
    if (!fs.existsSync(XP_DB_PATH)) {
        fs.mkdirSync(path.dirname(XP_DB_PATH), { recursive: true });
        fs.writeFileSync(XP_DB_PATH, JSON.stringify({}));
    }
    try {
        return JSON.parse(fs.readFileSync(XP_DB_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveXP(db) {
    fs.writeFileSync(XP_DB_PATH, JSON.stringify(db, null, 2));
}

function getXPUser(db, userId) {
    if (!db[userId]) {
        db[userId] = {
            xp: 0,
            lastWeekly: 0,
            lastTweekly: 0,
            lastMonthly: 0,
            lastYearly: 0,
            activeQuest: null,
            completedQuests: [],
        };
    }
    return db[userId];
}

// ═══ Cooldowny ═══
const COOLDOWNS = {
    weekly: 7 * 24 * 60 * 60 * 1000,   // 7 dní
    tweekly: 14 * 24 * 60 * 60 * 1000,   // 14 dní
    monthly: 30 * 24 * 60 * 60 * 1000,   // 30 dní
    yearly: 365 * 24 * 60 * 60 * 1000,   // 365 dní
};

const COOLDOWN_LABELS = {
    weekly: 'Jednou za týden',
    tweekly: 'Jednou za 2 týdny',
    monthly: 'Jednou za měsíc',
    yearly: 'Jednou za rok',
};

// Formátuj zbývající čas
function formatRemaining(ms) {
    const sec = Math.ceil(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min} min ${sec % 60}s`;
    const hod = Math.floor(min / 60);
    const m = min % 60;
    if (hod < 24) return `${hod}h ${m}m`;
    const dny = Math.floor(hod / 24);
    const h = hod % 24;
    return `${dny}d ${h}h`;
}

// Zkontroluj cooldown a vrať { ok, remaining }
function checkCooldown(user, type) {
    const now = Date.now();
    const lastKey = `last${type.charAt(0).toUpperCase() + type.slice(1)}`;
    const last = user[lastKey] || 0;
    const cd = COOLDOWNS[type];
    const diff = now - last;
    if (diff < cd) {
        return { ok: false, remaining: cd - diff };
    }
    return { ok: true };
}

// Nastav cooldown
function setCooldown(user, type) {
    const lastKey = `last${type.charAt(0).toUpperCase() + type.slice(1)}`;
    user[lastKey] = Date.now();
}

// Generuj náhodné XP (1 – 4000)
function randomXP(min = 50, max = 4000) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ═══ Questy ═══
const ALL_QUESTS = [
    {
        id: 'q1',
        title: '⛏️ Horník',
        description: 'Vytěž 64 kusů uhlí na Xeloria serveru.',
        reward: 'Splněním získáš odměnu od admina nebo XP body.',
        tip: 'Jdi do mines světa a hledej uhlí!',
    },
    {
        id: 'q2',
        title: '🌾 Farmář',
        description: 'Skliz 128 kusů pšenice na svém poli.',
        reward: 'Splněním získáš odměnu od admina nebo XP body.',
        tip: 'Postav si farmu a začni pěstovat!',
    },
    {
        id: 'q3',
        title: '🗡️ Bojovník',
        description: 'Zab 30 zombie v dungeonu.',
        reward: 'Splněním získáš odměnu od admina nebo XP body.',
        tip: 'Dungeon najdeš na koordinátech X:100, Z:200.',
    },
    {
        id: 'q4',
        title: '🏗️ Stavitel',
        description: 'Postav dům o velikosti alespoň 10x10 bloků.',
        reward: 'Splněním získáš odměnu od admina nebo XP body.',
        tip: 'Domy jsou hodnoceny esteticky, buď kreativní!',
    },
    {
        id: 'q5',
        title: '🐟 Rybář',
        description: 'Ulovi 20 ryb v řece nebo oceánu.',
        reward: 'Splněním získáš odměnu od admina nebo XP body.',
        tip: 'Vezmi prut a najdi vodu – oceán je blízko spawnu!',
    },
    {
        id: 'q6',
        title: '💎 Dobrodruh',
        description: 'Najdi a prozkoumej alespoň 3 různé biomy.',
        reward: 'Splněním získáš odměnu od admina nebo XP body.',
        tip: 'Biomy jsou různé oblasti světa – les, poušť, sníh...',
    },
    {
        id: 'q7',
        title: '🔮 Alchymista',
        description: 'Uvař 5 lektvarů síly nebo léčení.',
        reward: 'Splněním získáš odměnu od admina nebo XP body.',
        tip: 'Potřebuješ brewing stand a potřebné materiály!',
    },
    {
        id: 'q8',
        title: '🐄 Pastevec',
        description: 'Chov aspoň 10 zvířat (krávy, ovce, prasata).',
        reward: 'Splněním získáš odměnu od admina nebo XP body.',
        tip: 'Ohraď si koutek a přilákej zvířata pomocí jídla!',
    },
    {
        id: 'q9',
        title: '🌋 Průzkumník Netheru',
        description: 'Vstup do Netheru a přežij alespoň 10 minut.',
        reward: 'Splněním získáš odměnu od admina nebo XP body.',
        tip: 'Postav Nether portál z obsidiánu a zapal ho křesadlem!',
    },
    {
        id: 'q10',
        title: '📚 Knihovník',
        description: 'Vytvoř enchantment table a zkus enchantovat předmět.',
        reward: 'Splněním získáš odměnu od admina nebo XP body.',
        tip: 'Enchantment table potřebuješ diamanty, obsidián a knihu!',
    },
];

// Vyber náhodný quest pro hráče (jiný než aktuální a ne z posledních 3)
function assignQuest(user) {
    const recentIds = user.completedQuests.slice(-3).map(q => q.id);
    const currentId = user.activeQuest ? user.activeQuest.id : null;
    const available = ALL_QUESTS.filter(q => q.id !== currentId && !recentIds.includes(q.id));
    const pool = available.length > 0 ? available : ALL_QUESTS;
    const quest = pool[Math.floor(Math.random() * pool.length)];
    user.activeQuest = quest;
    return quest;
}

module.exports = {
    loadXP,
    saveXP,
    getXPUser,
    checkCooldown,
    setCooldown,
    randomXP,
    formatRemaining,
    COOLDOWN_LABELS,
    assignQuest,
    ALL_QUESTS,
};
