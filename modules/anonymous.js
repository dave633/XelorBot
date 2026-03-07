// ═══════════════════════════════════════════
// Modul: Anonymní zprávy
// ═══════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const config = require('../config');
const { containsBadWord } = require('../utils/badwords');

// Ochrana proti duplicitnímu zpracování
const processedAnon = new Set();

// ═══ Systém warnů (userId → počet) ═══
const anonWarns = new Map(); // userId → { count, timeout }
const MUTE_DURATION = (1 * 60 + 45) * 60 * 1000; // 1h 45min v ms
const MAX_WARNS = 3;

function addWarn(userId) {
    const existing = anonWarns.get(userId) || { count: 0 };

    // Zrušit případný starý timeout resetu
    if (existing.resetTimer) clearTimeout(existing.resetTimer);

    const count = existing.count + 1;

    // Warny se resetují po 24h od posledního warnu
    const resetTimer = setTimeout(() => anonWarns.delete(userId), 24 * 60 * 60 * 1000);
    anonWarns.set(userId, { count, resetTimer });

    return count;
}

// ═══ Zprávy v kanálu – smazat + warn systém ═══
async function handleAnonymousMessage(message) {
    if (message.channel.id !== config.channels.ANONYM) return;
    if (message.author.bot) return;

    if (processedAnon.has(message.id)) return;
    processedAnon.add(message.id);
    setTimeout(() => processedAnon.delete(message.id), 15000);

    const content = message.content;
    const author = message.author;

    // Smazat zprávu okamžitě
    try {
        await message.delete();
    } catch (err) {
        console.error(`[Anonym] Nelze smazat zprávu (${message.id}) od ${author.tag}:`, err.message);
        // Bot nemá Manage Messages v tomto kanálu – nic neodesílat dál
        return;
    }

    // Kontrola nadávek (priorita – rovnou mute na 1 den, žádné warny)
    if (containsBadWord(content)) {
        try {
            const member = await message.guild.members.fetch(author.id);
            await member.timeout(24 * 60 * 60 * 1000, 'Vulgární/rasistické výrazy v anonymním kanálu');
        } catch (err) {
            console.error('Chyba při mute (badword):', err);
        }

        const logChannel = message.guild.channels.cache.get(config.channels.ANONYM_LOG);
        if (logChannel) {
            await logChannel.send({
                embeds: [new EmbedBuilder()
                    .setTitle('🚫 Anonym – Porušení pravidel (nadávky)')
                    .addFields(
                        { name: '👤 Autor', value: `<@${author.id}> (${author.tag})` },
                        { name: '📝 Zpráva', value: content.substring(0, 1024) },
                        { name: '⚠️ Trest', value: 'Mute na 1 den' },
                    )
                    .setColor(0xFF0000)
                    .setTimestamp()]
            });
        }

        try {
            await author.send({
                embeds: [new EmbedBuilder()
                    .setTitle('🚫 Dostal/a jsi trest!')
                    .setDescription('Tvoje zpráva obsahovala vulgární nebo rasistické výrazy.')
                    .setColor(0xFF0000)
                    .setTimestamp()
                    .setFooter({ text: 'xelorialand • Anonymní systém' })]
            });
        } catch { }
        return;
    }

    // ══ Warn systém pro psaní přímo do kanálu ══
    const warnCount = addWarn(author.id);

    if (warnCount >= MAX_WARNS) {
        // 3. warn → mute 1h 45min + reset warnů
        anonWarns.delete(author.id);

        try {
            const member = await message.guild.members.fetch(author.id);
            await member.timeout(MUTE_DURATION, 'Anonym kanál: 3 warny za psaní mimo /anonym příkaz');
        } catch (err) {
            console.error('Chyba při mute (3 warny):', err);
        }

        // Log
        const logChannel = message.guild.channels.cache.get(config.channels.ANONYM_LOG);
        if (logChannel) {
            await logChannel.send({
                embeds: [new EmbedBuilder()
                    .setTitle('🔇 Anonym – Mute za 3 warny')
                    .addFields(
                        { name: '👤 Autor', value: `<@${author.id}> (${author.tag})` },
                        { name: '⚠️ Trest', value: 'Mute na 1 hodinu 45 minut' },
                        { name: '📌 Důvod', value: 'Opakované psaní přímo do anonym kanálu (3 warny)' },
                    )
                    .setColor(0xFF6600)
                    .setTimestamp()]
            });
        }

        // DM uživateli
        try {
            await author.send({
                embeds: [new EmbedBuilder()
                    .setTitle('🔇 Dostal/a jsi mute!')
                    .setDescription(
                        `Obdržel/a jsi **3 warny** za psaní přímo do anonymního kanálu.\n\n` +
                        `⚠️ **Trest:** Mute na **1 hodinu 45 minut**\n` +
                        `📌 **Důvod:** Psaní mimo příkaz \`/anonym\`\n\n` +
                        `*Pro anonymní zprávy vždy používej: \`/anonym text:<zpráva>\`*`
                    )
                    .setColor(0xFF6600)
                    .setTimestamp()
                    .setFooter({ text: 'xelorialand • Anonymní systém' })]
            });
        } catch { }

    } else {
        // Warn 1 nebo 2 → informovat DM
        try {
            await author.send({
                embeds: [new EmbedBuilder()
                    .setTitle(`⚠️ Warn ${warnCount}/${MAX_WARNS} – Anonymní kanál`)
                    .setDescription(
                        `V **#anonym** kanálu **nelze psát přímo**.\n\n` +
                        `Použij příkaz:\n> \`/anonym text:<tvoje zpráva>\`\n\n` +
                        `${warnCount >= 2 ? '🚨 **Další warn = mute na 1h 45min!**' : `*Při ${MAX_WARNS} warnech dostaneš mute na 1h 45min.*`}`
                    )
                    .setColor(warnCount >= 2 ? 0xFF6600 : 0xFEE75C)
                    .setTimestamp()
                    .setFooter({ text: `xelorialand • Anonym chat • Warn ${warnCount}/${MAX_WARNS}` })]
            });
        } catch { }
    }
}

// ═══ Slash příkaz /anonym ═══
async function sendAnonymSlash(interaction) {
    const text = interaction.options.getString('text');
    const author = interaction.user;

    // Ephemeral potvrzení
    await interaction.reply({ content: '✅ Tvoje anonymní zpráva byla odeslána!', ephemeral: true });

    // Kontrola nadávek
    if (containsBadWord(text)) {
        try {
            const member = await interaction.guild.members.fetch(author.id);
            await member.timeout(24 * 60 * 60 * 1000, 'Vulgární/rasistické výrazy v anonymním kanálu (/anonym)');
        } catch (err) {
            console.error('Chyba při mute (/anonym):', err);
        }

        const logChannel = interaction.guild.channels.cache.get(config.channels.ANONYM_LOG);
        if (logChannel) {
            await logChannel.send({
                embeds: [new EmbedBuilder()
                    .setTitle('🚫 /anonym – Porušení pravidel')
                    .addFields(
                        { name: '👤 Autor', value: `<@${author.id}> (${author.tag})` },
                        { name: '📝 Zpráva', value: text.substring(0, 1024) },
                        { name: '⚠️ Trest', value: 'Mute na 1 den' },
                    )
                    .setColor(0xFF0000)
                    .setTimestamp()]
            });
        }
        return;
    }

    // Odeslat embed do anonym kanálu
    const anonChannel = interaction.guild.channels.cache.get(config.channels.ANONYM);
    if (!anonChannel) return;

    await anonChannel.send({
        embeds: [new EmbedBuilder()
            .setAuthor({ name: 'Anonym', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(text)
            .setColor(0x2B2D31)
            .setTimestamp()
            .setFooter({ text: 'xelorialand • Anonym chat • Použitý příkaz: /anonym • Identita? Neexistuje.' })]
    });

    // Log
    const logChannel = interaction.guild.channels.cache.get(config.channels.ANONYM_LOG);
    if (logChannel) {
        await logChannel.send({
            embeds: [new EmbedBuilder()
                .setTitle('📋 /anonym – Log')
                .addFields(
                    { name: '👤 Autor', value: `<@${author.id}> (${author.tag})` },
                    { name: '📝 Zpráva', value: text.substring(0, 1024) },
                    { name: '📌 Způsob', value: 'Slash příkaz /anonym' },
                )
                .setColor(0x808080)
                .setTimestamp()]
        });
    }
}

module.exports = { handleAnonymousMessage, sendAnonymSlash };
