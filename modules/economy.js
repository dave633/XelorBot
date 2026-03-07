// ═══════════════════════════════════════════
// Modul: Ekonomika
// Příkazy: !work, !dep, !claim, !crime, !rob, !add-money, !remove-money
// ═══════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const config = require('../config');

// ═══ Databáze (JSON soubor) ═══
const DB_PATH = path.join(__dirname, '../data/economy.json');

function loadDB() {
    if (!fs.existsSync(DB_PATH)) {
        fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
        fs.writeFileSync(DB_PATH, JSON.stringify({}));
    }
    try {
        return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveDB(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getUser(db, userId) {
    if (!db[userId]) {
        db[userId] = {
            wallet: 0,
            bank: 0,
            lastWork: 0,
            lastClaim: 0,
            lastCrime: 0,
            lastRob: 0,
            earnings: {
                daily: 0, dailyReset: 0,
                weekly: 0, weeklyReset: 0,
                tweekly: 0, tweeklyReset: 0,
                monthly: 0, monthlyReset: 0,
                yearly: 0, yearlyReset: 0,
                alltime: 0,
            },
        };
    }
    // Ensure earnings exist for older users
    if (!db[userId].earnings) {
        db[userId].earnings = {
            daily: 0, dailyReset: 0,
            weekly: 0, weeklyReset: 0,
            tweekly: 0, tweeklyReset: 0,
            monthly: 0, monthlyReset: 0,
            yearly: 0, yearlyReset: 0,
            alltime: 0,
        };
    }
    return db[userId];
}

// ═══ Resetuj periody pokud uplynula ═══
function resetPeriodsIfNeeded(user) {
    const now = Date.now();
    const e = user.earnings;
    const DAY = 86400000;
    const WEEK = 7 * DAY;
    const TWEEK = 14 * DAY;
    const MON = 30 * DAY;
    const YEAR = 365 * DAY;
    if (now - e.dailyReset >= DAY) { e.daily = 0; e.dailyReset = now; }
    if (now - e.weeklyReset >= WEEK) { e.weekly = 0; e.weeklyReset = now; }
    if (now - e.tweeklyReset >= TWEEK) { e.tweekly = 0; e.tweeklyReset = now; }
    if (now - e.monthlyReset >= MON) { e.monthly = 0; e.monthlyReset = now; }
    if (now - e.yearlyReset >= YEAR) { e.yearly = 0; e.yearlyReset = now; }
}

// ═══ Přidej výdělek do statistik ═══
function earnForUser(user, amount) {
    resetPeriodsIfNeeded(user);
    user.earnings.daily += amount;
    user.earnings.weekly += amount;
    user.earnings.tweekly += amount;
    user.earnings.monthly += amount;
    user.earnings.yearly += amount;
    user.earnings.alltime += amount;
}

// ═══ Cooldown helper ═══
function formatTime(ms) {
    const totalSec = Math.ceil(ms / 1000);
    if (totalSec < 60) return `${totalSec}s`;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (min < 60) return `${min}m ${sec}s`;
    const hod = Math.floor(min / 60);
    const m = min % 60;
    return `${hod}h ${m}m`;
}

// ═══ Embed helper ═══
function econEmbed(title, desc, color = 0x00D26A) {
    return {
        embeds: [{
            title,
            description: desc,
            color,
            timestamp: new Date().toISOString(),
            footer: { text: 'Xeloria Ekonomika 💰' },
        }]
    };
}

// ═══ Hlavní handler ═══
async function handleEconomy(message) {
    const args = message.content.trim().split(/\s+/);
    const cmd = args[0].toLowerCase();
    const db = loadDB();
    const user = getUser(db, message.author.id);
    const now = Date.now();

    // ─── !work ───
    if (cmd === '!work') {
        const cooldown = 30 * 60 * 1000; // 30 minut
        const diff = now - user.lastWork;
        if (diff < cooldown) {
            return message.reply(econEmbed(
                '⏳ Cooldown práce',
                `Musíš si odpočinout! Pracovat můžeš až za **${formatTime(cooldown - diff)}**.`,
                0xFF6B00
            ));
        }

        const jobs = [
            { name: 'Horník', earn: [150, 400], emoji: '⛏️' },
            { name: 'Řidič', earn: [100, 300], emoji: '🚗' },
            { name: 'Programátor', earn: [200, 500], emoji: '💻' },
            { name: 'Kuchař', earn: [120, 350], emoji: '👨‍🍳' },
            { name: 'Lékař', earn: [300, 600], emoji: '🏥' },
            { name: 'Stavař', earn: [180, 450], emoji: '🏗️' },
            { name: 'Učitel', earn: [100, 250], emoji: '📚' },
            { name: 'Policista', earn: [200, 420], emoji: '👮' },
        ];
        const job = jobs[Math.floor(Math.random() * jobs.length)];
        const earned = Math.floor(Math.random() * (job.earn[1] - job.earn[0] + 1)) + job.earn[0];

        user.wallet += earned;
        user.lastWork = now;
        earnForUser(user, earned);
        saveDB(db);

        return message.reply(econEmbed(
            `${job.emoji} Práce: ${job.name}`,
            `Pracoval jsi jako **${job.name}** a vydělal jsi **${earned} 💵**!\n\n💼 Na ruce: **${user.wallet} 💵**`,
            0x00D26A
        ));
    }

    // ─── !dep ───
    if (cmd === '!dep') {
        const amount = args[1];
        if (!amount) {
            return message.reply(econEmbed('❓ Použití', '`!dep <částka>` nebo `!dep all`', 0xFF6B00));
        }

        let depositAmount;
        if (amount.toLowerCase() === 'all') {
            depositAmount = user.wallet;
        } else {
            depositAmount = parseInt(amount);
            if (isNaN(depositAmount) || depositAmount <= 0) {
                return message.reply(econEmbed('❌ Chyba', 'Zadej platnou částku nebo `all`.', 0xFF0000));
            }
        }

        if (depositAmount <= 0 || depositAmount > user.wallet) {
            return message.reply(econEmbed('❌ Chyba', `Nemáš dost peněz! Na ruce máš **${user.wallet} 💵**.`, 0xFF0000));
        }

        user.wallet -= depositAmount;
        user.bank += depositAmount;
        saveDB(db);

        return message.reply(econEmbed(
            '🏦 Vklad do banky',
            `Uložil jsi **${depositAmount} 💵** do banky!\n\n💼 Na ruce: **${user.wallet} 💵**\n🏦 Banka: **${user.bank} 💵**`,
            0x5865F2
        ));
    }

    // ─── !bal (bonus příkaz pro zůstatek) ───
    if (cmd === '!bal' || cmd === '!balance' || cmd === '!penize') {
        const target = message.mentions.users.first();
        const targetId = target ? target.id : message.author.id;
        const targetUser = getUser(db, targetId);
        const targetName = target ? target.username : message.author.username;
        saveDB(db);

        return message.reply(econEmbed(
            `💰 Zůstatek – ${targetName}`,
            `💼 **Na ruce:** ${targetUser.wallet} 💵\n🏦 **Banka:** ${targetUser.bank} 💵\n📊 **Celkem:** ${targetUser.wallet + targetUser.bank} 💵`,
            0xFFD700
        ));
    }

    // ─── !claim ───
    if (cmd === '!claim') {
        const cooldown = 24 * 60 * 60 * 1000; // 24 hodin
        const diff = now - user.lastClaim;
        if (diff < cooldown) {
            return message.reply(econEmbed(
                '⏳ Denní odměna',
                `Denní odměnu jsi už přijal! Další bude za **${formatTime(cooldown - diff)}**.`,
                0xFF6B00
            ));
        }

        const reward = Math.floor(Math.random() * 200) + 300; // 300–500
        user.wallet += reward;
        user.lastClaim = now;
        earnForUser(user, reward);
        saveDB(db);

        return message.reply(econEmbed(
            '🎁 Denní odměna',
            `Přijal jsi svou denní odměnu **${reward} 💵**!\n\n💼 Na ruce: **${user.wallet} 💵**`,
            0x00D26A
        ));
    }

    // ─── !crime ───
    if (cmd === '!crime') {
        const cooldown = 60 * 60 * 1000; // 1 hodina
        const diff = now - user.lastCrime;
        if (diff < cooldown) {
            return message.reply(econEmbed(
                '⏳ Cooldown zločinu',
                `Musíš si odpočinout! Zločin můžeš zkusit za **${formatTime(cooldown - diff)}**.`,
                0xFF6B00
            ));
        }

        const crimes = [
            { name: 'Kradení v obchodě', win: [100, 300], lose: [50, 150], emoji: '🛒' },
            { name: 'Vloupání do auta', win: [200, 500], lose: [100, 250], emoji: '🚗' },
            { name: 'Hack banky', win: [500, 1000], lose: [200, 500], emoji: '💻' },
            { name: 'Kapesní krádeže', win: [80, 200], lose: [30, 100], emoji: '👛' },
            { name: 'Loupež v kasinu', win: [300, 800], lose: [150, 400], emoji: '🎰' },
        ];

        const crime = crimes[Math.floor(Math.random() * crimes.length)];
        const success = Math.random() < 0.55; // 55% šance na úspěch
        user.lastCrime = now;

        if (success) {
            const earned = Math.floor(Math.random() * (crime.win[1] - crime.win[0] + 1)) + crime.win[0];
            user.wallet += earned;
            earnForUser(user, earned);
            saveDB(db);
            return message.reply(econEmbed(
                `✅ Zločin úspěšný – ${crime.emoji} ${crime.name}`,
                `Podařilo se ti provést **${crime.name}** a získal jsi **${earned} 💵**!\n\n💼 Na ruce: **${user.wallet} 💵**`,
                0x00D26A
            ));
        } else {
            const fine = Math.floor(Math.random() * (crime.lose[1] - crime.lose[0] + 1)) + crime.lose[0];
            const actualFine = Math.min(fine, user.wallet);
            user.wallet -= actualFine;
            saveDB(db);
            return message.reply(econEmbed(
                `❌ Zločin selhal – ${crime.emoji} ${crime.name}`,
                `Byl jsi přistižen při **${crime.name}** a zaplatil jsi pokutu **${actualFine} 💵**!\n\n💼 Na ruce: **${user.wallet} 💵**`,
                0xFF0000
            ));
        }
    }

    // ─── !rob ───
    if (cmd === '!rob') {
        const cooldown = 45 * 60 * 1000; // 45 minut
        const diff = now - user.lastRob;
        if (diff < cooldown) {
            return message.reply(econEmbed(
                '⏳ Cooldown loupeže',
                `Musíš počkat na další příležitost! Loupež můžeš zkusit za **${formatTime(cooldown - diff)}**.`,
                0xFF6B00
            ));
        }

        const target = message.mentions.users.first();
        if (!target) {
            return message.reply(econEmbed('❓ Použití', '`!rob @hráč` – Oloupíš hráče o část jeho peněz (z peněženky).', 0xFF6B00));
        }

        if (target.id === message.author.id) {
            return message.reply(econEmbed('😂 Chyba', 'Nemůžeš okrást sám sebe!', 0xFF6B00));
        }

        if (target.bot) {
            return message.reply(econEmbed('🤖 Chyba', 'Nelze okrást bota!', 0xFF6B00));
        }

        const victim = getUser(db, target.id);
        user.lastRob = now;

        if (victim.wallet <= 0) {
            saveDB(db);
            return message.reply(econEmbed(
                '💸 Loupež selhala',
                `**${target.username}** nemá žádné peníze na ruce! Smůla.`,
                0xFF0000
            ));
        }

        const success = Math.random() < 0.45; // 45% šance na úspěch

        if (success) {
            const maxRob = Math.floor(victim.wallet * 0.3); // 30% z peněženky
            const stolen = Math.floor(Math.random() * maxRob) + 1;
            victim.wallet -= stolen;
            user.wallet += stolen;
            earnForUser(user, stolen);
            saveDB(db);
            return message.reply(econEmbed(
                '🦹 Úspěšná loupež!',
                `Okradl jsi **${target.username}** o **${stolen} 💵**!\n\n💼 Tvoje peněženka: **${user.wallet} 💵**`,
                0x00D26A
            ));
        } else {
            const fine = Math.floor(victim.wallet * 0.1); // zaplatíš 10% z jejich peněz jako pokutu
            const actualFine = Math.min(fine, user.wallet);
            user.wallet -= actualFine;
            victim.wallet += actualFine;
            saveDB(db);
            return message.reply(econEmbed(
                '🚔 Loupež se nezdařila!',
                `Byl jsi přistižen při loupeži **${target.username}**! Zaplatil jsi pokutu **${actualFine} 💵** oběti.\n\n💼 Na ruce: **${user.wallet} 💵**`,
                0xFF0000
            ));
        }
    }

    // ─── !add-money (admin) ───
    if (cmd === '!add-money') {
        const isAdmin = config.adminRoles.some(r => message.member.roles.cache.has(r));
        if (!isAdmin) {
            return message.reply(econEmbed('❌ Přístup odepřen', 'Tento příkaz mohou používat pouze adminové.', 0xFF0000));
        }

        const targetMember = message.mentions.members.first();
        const amount = parseInt(args[2]);

        if (!targetMember || isNaN(amount) || amount <= 0) {
            return message.reply(econEmbed('❓ Použití', '`!add-money @hráč <částka>`', 0xFF6B00));
        }

        const targetUser = getUser(db, targetMember.id);
        targetUser.wallet += amount;
        saveDB(db);

        return message.reply(econEmbed(
            '➕ Přidáno peněz',
            `Přidal jsi **${amount} 💵** hráči **${targetMember.user.username}**.\n\n💼 Jeho peněženka: **${targetUser.wallet} 💵**`,
            0x00D26A
        ));
    }

    // ─── !remove-money (admin) ───
    if (cmd === '!remove-money') {
        const isAdmin = config.adminRoles.some(r => message.member.roles.cache.has(r));
        if (!isAdmin) {
            return message.reply(econEmbed('❌ Přístup odepřen', 'Tento příkaz mohou používat pouze adminové.', 0xFF0000));
        }

        const targetMember = message.mentions.members.first();
        const amount = parseInt(args[2]);

        if (!targetMember || isNaN(amount) || amount <= 0) {
            return message.reply(econEmbed('❓ Použití', '`!remove-money @hráč <částka>`', 0xFF6B00));
        }

        const targetUser = getUser(db, targetMember.id);
        const removed = Math.min(amount, targetUser.wallet + targetUser.bank);

        if (amount > targetUser.wallet) {
            const fromBank = amount - targetUser.wallet;
            targetUser.wallet = 0;
            targetUser.bank = Math.max(0, targetUser.bank - fromBank);
        } else {
            targetUser.wallet -= amount;
        }
        saveDB(db);

        return message.reply(econEmbed(
            '➖ Odebráno peněz',
            `Odebral jsi **${removed} 💵** hráči **${targetMember.user.username}**.\n\n💼 Jeho peněženka: **${targetUser.wallet} 💵** | 🏦 Banka: **${targetUser.bank} 💵**`,
            0xFF6B00
        ));
    }

    // ─── !top ───
    if (cmd === '!top') {
        const entries = Object.entries(db)
            .map(([id, data]) => ({
                id,
                total: (data.wallet || 0) + (data.bank || 0),
                wallet: data.wallet || 0,
                bank: data.bank || 0,
            }))
            .filter(e => e.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        if (entries.length === 0) {
            return message.reply(econEmbed('🏆 Žebříček', 'Zatím nikdo nic nevydělal!', 0xFFD700));
        }

        const medals = ['🥇', '🥈', '🥉'];
        const lines = [];

        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            let name;
            try {
                const member = await message.guild.members.fetch(e.id).catch(() => null);
                name = member ? (member.nickname || member.user.username) : `Neznámý (${e.id.slice(-4)})`;
            } catch {
                name = `Hráč #${i + 1}`;
            }
            const medal = medals[i] || `**${i + 1}.**`;
            lines.push(`${medal} **${name}** — ${e.total} 💵 *(💼 ${e.wallet} | 🏦 ${e.bank})*`);
        }

        return message.reply(econEmbed(
            '🏆 Žebříček nejbohatších hráčů',
            lines.join('\n'),
            0xFFD700
        ));
    }

    // ─── !help ekonomika ───
    if (cmd === '!ekohelp' || cmd === '!ehelp') {
        return message.reply(econEmbed(
            '📖 Ekonomika – Nápověda',
            [
                '💼 `!work` – Pracuj a vydělej peníze (cooldown: 30 min)',
                '🏦 `!dep <částka/all>` – Vlož peníze do banky',
                '💰 `!bal [@hráč]` – Zobraz zůstatek',
                '🎁 `!claim` – Denní odměna (cooldown: 24 hod)',
                '🦹 `!crime` – Zkus štěstí se zločinem (cooldown: 1 hod)',
                '🔫 `!rob @hráč` – Oloupíš hráče (cooldown: 45 min)',
                '🏆 `!top` – Žebříček nejbohatších hráčů',
                '',
                '🔐 **Admin příkazy:**',
                '`!add-money @hráč <částka>` – Přidej peníze',
                '`!remove-money @hráč <částka>` – Odeber peníze',
            ].join('\n'),
            0x5865F2
        ));
    }
}

module.exports = { handleEconomy, loadDB, getUser, resetPeriodsIfNeeded };
