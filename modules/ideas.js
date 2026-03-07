// ═══════════════════════════════════════════
// Modul: Nápady
// ═══════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function handleNewIdea(message) {
    if (message.channel.id !== config.channels.NAPADY) return;
    if (message.author.bot) return;

    const ideaText = message.content;
    const author = message.author;

    try { await message.delete(); } catch { }

    const embed = new EmbedBuilder()
        .setTitle('💡 Nápad')
        .addFields(
            { name: '📝 Nápad', value: ideaText.substring(0, 1024) },
            { name: '👤 Od', value: `<@${author.id}>`, inline: true },
            { name: '📊 Stav', value: '🕐 Čeká se', inline: true },
        )
        .setColor(0xFFA500)
        .setTimestamp()
        .setFooter({ text: `AutorID: ${author.id} | Administrace: /schvalit, /zamitnout, /cekase` });

    const sentMsg = await message.channel.send({ embeds: [embed] });

    // Aktualizovat footer s ID zprávy
    const updatedEmbed = EmbedBuilder.from(sentMsg.embeds[0])
        .setFooter({ text: `ID: ${sentMsg.id} | AutorID: ${author.id} | Administrace: /schvalit, /zamitnout, /cekase` });

    await sentMsg.edit({ embeds: [updatedEmbed] });
}

async function updateIdeaStatus(channel, messageId, status, admin) {
    let message;
    try {
        message = await channel.messages.fetch(messageId);
    } catch {
        return null;
    }

    const embed = message.embeds[0];
    if (!embed) return null;

    let statusText, color, actionWord;
    switch (status) {
        case 'schvaleno':
            statusText = '✅ Schváleno';
            color = 0x00FF00;
            actionWord = 'Schválil';
            break;
        case 'zamitnuto':
            statusText = '❌ Zamítnuto';
            color = 0xFF0000;
            actionWord = 'Zamítl';
            break;
        case 'cekase':
            statusText = '🕐 Čeká se';
            color = 0xFFA500;
            actionWord = 'Resetoval';
            break;
    }

    statusText += `\n👮 ${actionWord}: <@${admin.id}>`;

    const fields = embed.fields.map(f => {
        if (f.name === '📊 Stav') {
            return { name: f.name, value: statusText, inline: true };
        }
        return { name: f.name, value: f.value, inline: f.inline || false };
    });

    const newEmbed = EmbedBuilder.from(embed)
        .setFields(fields)
        .setColor(color);

    await message.edit({ embeds: [newEmbed] });

    // Poslat DM autorovi nápadu
    try {
        const footerText = embed.footer?.text || '';
        const authorIdMatch = footerText.match(/AutorID:\s*(\d+)/);
        if (authorIdMatch) {
            const authorId = authorIdMatch[1];
            const author = await channel.guild.members.fetch(authorId);
            if (author) {
                const ideaText = embed.fields.find(f => f.name === '📝 Nápad')?.value || 'Neznámý nápad';
                const dmEmbed = new EmbedBuilder()
                    .setTitle('💡 Aktualizace tvého nápadu')
                    .addFields(
                        { name: '📝 Nápad', value: ideaText },
                        { name: '📊 Nový stav', value: statusText },
                    )
                    .setColor(color)
                    .setTimestamp()
                    .setFooter({ text: 'Xeloria – Systém nápadů' });
                await author.send({ embeds: [dmEmbed] });
            }
        }
    } catch (err) {
        console.error('Nepodařilo se poslat DM autorovi nápadu:', err.message);
    }

    return message;
}

module.exports = { handleNewIdea, updateIdeaStatus };
