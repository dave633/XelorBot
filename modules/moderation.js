// ═══════════════════════════════════════════
// Modul: Moderation – Varování, Mute, TempBan
// ═══════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

const DATA_PATH = path.join(__dirname, '../data/moderation.json');

// Načtení dat
function loadModData() {
    if (!fs.existsSync(DATA_PATH)) {
        fs.writeFileSync(DATA_PATH, JSON.stringify({ warns: {}, bans: [] }, null, 2));
    }
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
}

// Uložení dat
function saveModData(data) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

// ─── PŘIDÁNÍ VAROVÁNÍ ───
async function addWarn(guild, userId, reason, moderatorId = 'System') {
    const data = loadModData();
    if (!data.warns[userId]) {
        data.warns[userId] = { count: 0, history: [] };
    }

    data.warns[userId].count += 1;
    data.warns[userId].history.push({
        reason,
        timestamp: Date.now(),
        moderatorId
    });

    const userWarns = data.warns[userId].count;
    saveModData(data);

    // Embed pro hráče
    const dmEmbed = new EmbedBuilder()
        .setTitle('⚠ Obdržel/a jsi varování!')
        .setDescription(`Byl/a jsi varován/a na serveru **${guild.name}**.`)
        .addFields(
            { name: '📌 Důvod', value: reason },
            { name: '🔢 Celkem varování', value: `${userWarns}` },
            { name: '👮 Moderátor', value: moderatorId === 'System' ? 'Automatický systém' : `<@${moderatorId}>` }
        )
        .setColor(0xFFAA00)
        .setTimestamp()
        .setFooter({ text: 'Xeloria Moderace' });

    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) await member.send({ embeds: [dmEmbed] }).catch(() => { });
    } catch { }

    // Kontrola 10 varování -> 1 den mute
    if (userWarns >= 10) {
        await applyMute(guild, userId, 24 * 60 * 60 * 1000, 'Dosažení 10 varování', 'System');
        // Resetovat/Snížit varování? Uživatel neřekl, ale obvykle se po 10. varování něco stane.
        // Necháme je tam, ale příští warn by zase mohl triggerovat mute pokud jich bude víc.
    }

    return userWarns;
}

// ─── APLIKACE MUTE (Timeout) ───
async function applyMute(guild, userId, durationMs, reason, moderatorId) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            await member.timeout(durationMs, `Moderace (${moderatorId}): ${reason}`);

            const dmEmbed = new EmbedBuilder()
                .setTitle('🔇 Byl/a jsi umlčen/a!')
                .setDescription(`Dostal/a jsi mute na serveru **${guild.name}**.`)
                .addFields(
                    { name: '📌 Důvod', value: reason },
                    { name: '⏳ Trvání', value: formatDuration(durationMs) },
                    { name: '👮 Moderátor', value: moderatorId === 'System' ? 'Automatický systém' : `<@${moderatorId}>` }
                )
                .setColor(0xFF0000)
                .setTimestamp()
                .setFooter({ text: 'Xeloria Moderace' });

            await member.send({ embeds: [dmEmbed] }).catch(() => { });
            return true;
        }
    } catch (err) {
        console.error('Chyba při aplikaci mute:', err);
    }
    return false;
}

// ─── ODSTRANĚNÍ MUTE (Unmute) ───
async function removeMute(guild, userId, moderatorId) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (member) {
            await member.timeout(null, `Unmute (${moderatorId})`);

            const dmEmbed = new EmbedBuilder()
                .setTitle('🔊 Byl/a jsi odmlčen/a!')
                .setDescription(`Tvůj mute na serveru **${guild.name}** byl zrušen.`)
                .addFields({ name: '👮 Moderátor', value: `<@${moderatorId}>` })
                .setColor(0x00FF00)
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] }).catch(() => { });
            return true;
        }
    } catch (err) {
        console.error('Chyba při unmute:', err);
    }
    return false;
}

// ─── APLIKACE TEMPBAN ───
async function applyTempBan(guild, userId, durationMs, reason, moderatorId) {
    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        const userTag = member ? member.user.tag : userId;

        // DM před banem
        if (member) {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🚫 Byl/a jsi zabanován/a!')
                .setDescription(`Dostal/a jsi dočasný ban na serveru **${guild.name}**.`)
                .addFields(
                    { name: '📌 Důvod', value: reason },
                    { name: '⏳ Trvání', value: formatDuration(durationMs) },
                    { name: '👮 Moderátor', value: `<@${moderatorId}>` }
                )
                .setColor(0x000000)
                .setTimestamp()
                .setFooter({ text: 'Xeloria Moderace' });

            await member.send({ embeds: [dmEmbed] }).catch(() => { });
        }

        const unbanTime = Date.now() + durationMs;
        await guild.members.ban(userId, { reason: `TempBan (${moderatorId}): ${reason}` });

        const data = loadModData();
        data.bans.push({
            userId,
            unbanTime,
            guildId: guild.id
        });
        saveModData(data);

        return true;
    } catch (err) {
        console.error('Chyba při tempbanu:', err);
    }
    return false;
}

// ─── ODSTRANĚNÍ BANU (Unban) ───
async function removeBan(guild, userId, moderatorId) {
    try {
        await guild.members.unban(userId, `Unban (${moderatorId})`);

        // Odstranit z databáze tempbanů (pokud tam je)
        const data = loadModData();
        const originalLength = data.bans.length;
        data.bans = data.bans.filter(b => b.userId !== userId || b.guildId !== guild.id);

        if (data.bans.length !== originalLength) {
            saveModData(data);
        }

        return true;
    } catch (err) {
        console.error('Chyba při unbanu:', err);
    }
    return false;
}

// ─── KONTROLA VYPRŠELÝCH BANŮ ───
async function checkExpiredBans(client) {
    const data = loadModData();
    const now = Date.now();
    const activeBans = [];
    let changed = false;

    for (const ban of data.bans) {
        if (now >= ban.unbanTime) {
            try {
                const guild = await client.guilds.fetch(ban.guildId).catch(() => null);
                if (guild) {
                    await guild.members.unban(ban.userId, 'Dočasný ban vypršel');
                    console.log(`🔓 Unban: Uživatel ${ban.userId} na serveru ${guild.name} byl odblokován.`);
                    changed = true;
                }
            } catch (err) {
                console.error(`Chyba při unbanu uživatele ${ban.userId}:`, err);
            }
        } else {
            activeBans.push(ban);
        }
    }

    if (changed || activeBans.length !== data.bans.length) {
        data.bans = activeBans;
        saveModData(data);
    }
}

// Pomocná funkce pro formátování času
function formatDuration(ms) {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} dní`;
    if (hours > 0) return `${hours} hodin`;
    const mins = Math.floor(ms / (1000 * 60));
    return `${mins} minut`;
}

// Pomocná funkce pro parsování trvání (např. 1h, 4h, 1d)
function parseDuration(str) {
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return null;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return null;
    }
}

module.exports = {
    addWarn,
    applyMute,
    removeMute,
    applyTempBan,
    removeBan,
    checkExpiredBans,
    parseDuration,
    formatDuration,
    loadModData
};
