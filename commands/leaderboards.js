// ═══════════════════════════════════════════
// Příkaz: /leaderboards
// Zobrazí hráče s nejvíce XP body
// Pouze v kanálu CHAT_COMMANDS
// ═══════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { loadXP } = require('../modules/xp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboards')
        .setDescription('🏆 Žebříček hráčů s nejvíce XP body'),

    async execute(interaction) {
        // Kontrola kanálu
        if (interaction.channel.id !== config.channels.CHAT_COMMANDS) {
            return interaction.reply({
                content: `❌ Tento příkaz lze použít pouze v <#${config.channels.CHAT_COMMANDS}>!`,
                ephemeral: true,
            });
        }

        await interaction.deferReply();

        const db = loadXP();
        const medals = ['🥇', '🥈', '🥉'];

        // Seřadit hráče podle XP
        const entries = Object.entries(db)
            .map(([id, data]) => ({ id, xp: data.xp || 0 }))
            .filter(e => e.xp > 0)
            .sort((a, b) => b.xp - a.xp)
            .slice(0, 10);

        if (entries.length === 0) {
            const emptyEmbed = new EmbedBuilder()
                .setTitle('🏆 XP Žebříček')
                .setDescription('📭 Zatím zde nikdo není! Začni sbírat XP pomocí `/weekly`, `/monthly` a dalších odměn.')
                .setColor(0xFFD700)
                .setTimestamp()
                .setFooter({ text: 'Xeloria XP Žebříček ⭐' });
            return interaction.editReply({ embeds: [emptyEmbed] });
        }

        const lines = [];
        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            let name;
            try {
                const member = await interaction.guild.members.fetch(e.id).catch(() => null);
                name = member
                    ? (member.nickname || member.user.username)
                    : `Neznámý hráč`;
            } catch {
                name = `Hráč #${i + 1}`;
            }
            const medal = medals[i] || `**${i + 1}.**`;
            lines.push(`${medal} **${name}** — \`${e.xp.toLocaleString('cs-CZ')} ⭐ XP\``);
        }

        const embed = new EmbedBuilder()
            .setTitle('🏆 XP Žebříček – TOP hráči')
            .setDescription(lines.join('\n'))
            .setColor(0xFFD700)
            .setTimestamp()
            .setFooter({ text: 'Xeloria XP Žebříček ⭐ • Aktualizováno' });

        return interaction.editReply({ embeds: [embed] });
    },
};
