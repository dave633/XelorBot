// ═══════════════════════════════════════════
// Modul: Chat příkazy (!ahoj, !ping, !server info)
// ═══════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function handleChatCommand(message) {
    if (message.channel.id !== config.channels.CHAT_COMMANDS) return;
    if (message.author.bot) return;

    const content = message.content.trim().toLowerCase();

    // !ahoj
    if (content === '!ahoj') {
        await message.reply('👋 Ahoj!');
        return;
    }

    // !cau
    if (content === '!cau') {
        await message.reply('Čaaaau :3');
        return;
    }

    // !cau
    if (content === '!cau') {
        await message.reply('Čaaaau :3');
        return;
    }

    // !ping
    if (content === '!ping') {
        await message.reply('🏓 Pong!');
        return;
    }

    // !web
    if (content === '!web') {
        const embed = new EmbedBuilder()
            .setTitle('🌐 Xeloria Web')
            .setDescription('Navštiv náš oficiální web!\n\n🔗 **[Náš web:](https://xelorbot.onrender.com/)**')
            .setColor(0x5865F2)
            .setTimestamp()
            .setFooter({ text: 'Xeloria Land' });

        await message.reply({ embeds: [embed] });
        return;
    }

    // !server info
    if (content === '!server info') {
        const embed = new EmbedBuilder()
            .setTitle('🎮 MINECRAFT SERVER')
            .addFields(
                { name: '🌐 IP', value: '```omega.goodhost.cz:4119```', inline: false },
                { name: '📦 Verze', value: '```1.21.10```', inline: false },
            )
            .setColor(0x00AA00)
            .setThumbnail('https://cdn.discordapp.com/emojis/1074681748244054168.webp')
            .setTimestamp()
            .setFooter({ text: 'Xeloria Server Info' });

        await message.reply({ embeds: [embed] });
        return;
    }
}

module.exports = { handleChatCommand };
