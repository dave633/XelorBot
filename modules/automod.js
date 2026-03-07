// ═══════════════════════════════════════════
// Modul: AutoMod – Nadávky/Rasismus + Anti-Spam
// ═══════════════════════════════════════════

const config = require('../config');
const { containsBadWord } = require('../utils/badwords');
const { addWarn } = require('./moderation');
const { ChannelType, EmbedBuilder } = require('discord.js');

// ═══ MUTE ČASY ═══
const MUTE_BADWORD = 4 * 60 * 60 * 1000;  // 4 hodiny za nadávky/rasismus
const MUTE_SPAM_1 = 1 * 60 * 60 * 1000;   // 1 hodina za první spam
const MUTE_SPAM_2 = 4 * 60 * 60 * 1000;   // 4 hodiny za opakovaný spam

// ═══ ANTI-SPAM KONFIGURACE ═══
const SPAM_THRESHOLD = 5;       // Počet zpráv za časový interval
const SPAM_INTERVAL = 5000;     // 5 sekund – interval pro detekci spamu
const DUPLICATE_THRESHOLD = 3;  // Počet stejných zpráv za sebou = spam

// Sledování zpráv a spam trestů (in-memory)
const messageTracker = new Map();  // userId -> [{ timestamp, content }]
const spamStrikes = new Map();     // userId -> počet spam trestů

// Čištění starých dat každých 30 minut
setInterval(() => {
    const now = Date.now();
    for (const [userId, messages] of messageTracker.entries()) {
        const recent = messages.filter(m => now - m.timestamp < 60000);
        if (recent.length === 0) messageTracker.delete(userId);
        else messageTracker.set(userId, recent);
    }
}, 30 * 60 * 1000);

// ═══ DETEKCE SPAMU ═══
function isSpamming(message) {
    const userId = message.author.id;
    const now = Date.now();

    if (!messageTracker.has(userId)) {
        messageTracker.set(userId, []);
    }

    const userMessages = messageTracker.get(userId);
    userMessages.push({ timestamp: now, content: message.content });

    // Ponechat jen zprávy z posledních 30 sekund
    const recent = userMessages.filter(m => now - m.timestamp < 30000);
    messageTracker.set(userId, recent);

    // Kontrola 1: Příliš mnoho zpráv za krátký čas
    const recentBurst = recent.filter(m => now - m.timestamp < SPAM_INTERVAL);
    if (recentBurst.length >= SPAM_THRESHOLD) {
        return true;
    }

    // Kontrola 2: Opakující se stejné zprávy
    const recentSame = recent.filter(m =>
        m.content.toLowerCase() === message.content.toLowerCase() &&
        now - m.timestamp < 15000
    );
    if (recentSame.length >= DUPLICATE_THRESHOLD) {
        return true;
    }

    return false;
}

// ═══ HLAVNÍ HANDLER ═══
async function handleAutoMod(message) {
    if (message.author.bot) return false;
    if (!message.guild) return false;

    const member = message.member;
    if (!member) return false;

    // Staff nemá automod
    const isStaff = config.staffRoles.some(roleId => member.roles.cache.has(roleId));
    if (isStaff) return false;

    // ═══ 1) KONTROLA NADÁVEK/RASISMU ═══
    if (containsBadWord(message.content)) {
        await punishBadWord(message, member);
        return true;
    }

    // ═══ 2) KONTROLA SPAMU ═══
    // Přeskočit spam detekci pro příkazy (!ahoj, !ping...) a kanál chat-příkazů
    const isBotCommand = message.content.trim().startsWith('!');
    const isChatCommandsChannel = message.channel.id === config.channels.CHAT_COMMANDS;
    if (!isBotCommand && !isChatCommandsChannel) {
        if (isSpamming(message)) {
            await punishSpam(message, member);
            return true;
        }
    }

    return false;
}

// ═══ TREST: Nadávky/Rasismus (4h mute nebo Warn ve voice) ═══
async function punishBadWord(message, member) {
    const isVoiceChat = message.channel.type === ChannelType.GuildVoice || message.channel.type === ChannelType.GuildStageVoice;

    if (isVoiceChat) {
        // Voice moderation: dá varování
        const userWarns = await addWarn(message.guild, message.author.id, 'Nevhodný jazyk v chatu hlasového kanálu', 'System');

        try { await message.delete(); } catch { }

        const warnEmbed = new EmbedBuilder()
            .setTitle('🚫 Hlasová Moderace – Varování')
            .setDescription(
                `<@${message.author.id}> dostal/a **varování** za nevhodný jazyk.\n` +
                `🔢 **Počet varování:** ${userWarns}/10\n` +
                `⚠️ *Při dosažení 10 varování následuje mute na 1 den!*`
            )
            .setColor(0xFFAA00)
            .setTimestamp()
            .setFooter({ text: 'Xeloria Voice Mod' });

        try {
            const warnMsg = await message.channel.send({ embeds: [warnEmbed] });
            setTimeout(() => { warnMsg.delete().catch(() => { }); }, 10000);
        } catch { }

        // Logování
        await logAutoMod(message, 'Vulgární/rasistické výrazy (VOICE)', 'Varování (Auto)');
        return;
    }

    // Standardní trest (4h mute)
    try {
        await member.timeout(MUTE_BADWORD, 'AutoMod: Vulgární/rasistické výrazy');
    } catch (err) {
        console.error('AutoMod – Chyba při mute (badword):', err);
    }

    // Smazat zprávu
    try { await message.delete(); } catch { }

    // Varování v kanálu (smaže se po 10s)
    const warningEmbed = new EmbedBuilder()
        .setTitle('🚫 AutoMod – Nevhodný jazyk')
        .setDescription(
            `<@${message.author.id}> dostal/a **mute na 4 hodiny** za použití vulgárních nebo rasistických výrazů.`
        )
        .setColor(0xFF0000)
        .setTimestamp()
        .setFooter({ text: 'Xeloria AutoMod' });

    try {
        const warningMsg = await message.channel.send({ embeds: [warningEmbed] });
        setTimeout(() => { warningMsg.delete().catch(() => { }); }, 10000);
    } catch { }

    // DM uživateli
    try {
        const dmEmbed = new EmbedBuilder()
            .setTitle('🚫 Dostal/a jsi mute!')
            .setDescription(
                `Tvoje zpráva na serveru **${message.guild.name}** obsahovala vulgární nebo rasistické výrazy.\n\n` +
                `⚠️ **Trest:** Mute na **4 hodiny**\n` +
                `📌 **Důvod:** Nevhodný jazyk\n\n` +
                `*Opakované porušení může vést k přísnějšímu trestu!*`
            )
            .addFields(
                { name: '📝 Tvoje zpráva', value: `||${message.content.substring(0, 900)}||` },
                { name: '📍 Kanál', value: `#${message.channel.name}` },
            )
            .setColor(0xFF0000)
            .setTimestamp()
            .setFooter({ text: 'Xeloria AutoMod' });
        await message.author.send({ embeds: [dmEmbed] });
    } catch { }

    // Log
    await logAutoMod(message, 'Vulgární/rasistické výrazy', '4 hodiny');
}

// ═══ TREST: Spam (1h nebo 4h mute) ═══
async function punishSpam(message, member) {
    const userId = message.author.id;

    // Zvýšit počet spam trestů
    const strikes = (spamStrikes.get(userId) || 0) + 1;
    spamStrikes.set(userId, strikes);

    // Resetovat strike po 24 hodinách
    setTimeout(() => {
        const current = spamStrikes.get(userId) || 0;
        if (current > 0) spamStrikes.set(userId, current - 1);
    }, 24 * 60 * 60 * 1000);

    // Opakovaný spam = 4h, první = 1h
    const isRepeat = strikes >= 2;
    const muteDuration = isRepeat ? MUTE_SPAM_2 : MUTE_SPAM_1;
    const muteText = isRepeat ? '4 hodiny (opakovaný spam)' : '1 hodinu';

    // Pokus o mute
    let muteSuccess = false;
    try {
        await member.timeout(muteDuration, `AutoMod: Spam (${strikes}. porušení)`);
        muteSuccess = true;
    } catch (err) {
        console.error('AutoMod – Chyba při mute (spam):', err);
    }

    // Smazat spam zprávy
    try {
        const msgs = await message.channel.messages.fetch({ limit: 20 });
        const userMsgs = msgs.filter(m => m.author.id === userId);
        for (const msg of userMsgs.values()) {
            try { await msg.delete(); } catch { }
        }
    } catch { }

    // Vyčistit tracker pro tohoto uživatele
    messageTracker.delete(userId);

    // Varování v kanálu
    const warningEmbed = new EmbedBuilder()
        .setTitle(muteSuccess ? '🚫 AutoMod – Spam' : '⚠️ AutoMod – Pokus o Mute selhal')
        .setDescription(
            muteSuccess
                ? `<@${message.author.id}> dostal/a **mute na ${muteText}** za spamování.`
                : `⚠️ <@${message.author.id}> měl dostat mute za spam, ale **bot nemá dostatečná oprávnění**!\n*(Zkontroluj roli bota v nastavení serveru - musí být výše než role uživatele)*`
        )
        .addFields({ name: '🔢 Počet spam varování', value: `${strikes}` })
        .setColor(muteSuccess ? 0xFF6600 : 0xFFFF00)
        .setTimestamp()
        .setFooter({ text: 'Xeloria AutoMod' });

    try {
        const warningMsg = await message.channel.send({ embeds: [warningEmbed] });
        setTimeout(() => { warningMsg.delete().catch(() => { }); }, 15000);
    } catch { }

    // DM uživateli (pouze pokud se mute podařil)
    if (muteSuccess) {
        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('🚫 Dostal/a jsi mute za spam!')
                .setDescription(
                    `Byl/a jsi potrestán/a za spamování na serveru **${message.guild.name}**.\n\n` +
                    `⚠️ **Trest:** Mute na **${muteText}**\n` +
                    `📌 **Důvod:** Spamování v chatu\n` +
                    `🔢 **Počet varování:** ${strikes}\n\n` +
                    `*Opakovaný spam vede k přísnějším trestům!*`
                )
                .setColor(0xFF6600)
                .setTimestamp()
                .setFooter({ text: 'Xeloria AutoMod' });
            await message.author.send({ embeds: [dmEmbed] });
        } catch { }
    }

    // Log
    await logAutoMod(message, `Spam (${strikes}. porušení)`, muteSuccess ? muteText : 'SELHALO (Chybí práva)');
}

// ═══ LOG DO KANÁLU ═══
async function logAutoMod(message, reason, punishment) {
    try {
        const logChannel = message.guild.channels.cache.get(config.channels.ANONYM_LOG);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('🛡️ AutoMod Log')
                .addFields(
                    { name: '👤 Hráč', value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                    { name: '📍 Kanál', value: `<#${message.channel.id}>`, inline: true },
                    { name: '⚠️ Trest', value: punishment, inline: true },
                    { name: '📌 Důvod', value: reason },
                    { name: '📝 Zpráva', value: `||${message.content.substring(0, 1024) || '[prázdná]'}||` },
                )
                .setColor(0xFF0000)
                .setTimestamp()
                .setFooter({ text: 'Xeloria AutoMod Log' });
            await logChannel.send({ embeds: [logEmbed] });
        }
    } catch (err) {
        console.error('AutoMod – Chyba při logování:', err);
    }
}

module.exports = { handleAutoMod };
