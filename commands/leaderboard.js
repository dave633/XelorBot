// ═══════════════════════════════════════════
// Příkazy: Žebříčky (peníze) – leaderboard, daily
// Pouze v kanálu CHAT_COMMANDS
// POZNÁMKA: /weekly, /tweekly, /monthly, /yearly
//           jsou nyní v rewards.js (XP odměny s cooldownem)
// ═══════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const { loadDB, getUser, resetPeriodsIfNeeded } = require('../modules/economy');

// ─── Pomocná funkce – generuj žebříček embed ───
async function buildLeaderboard(interaction, period, title, emoji, color) {
    // Kontrola kanálu
    if (interaction.channel.id !== config.channels.CHAT_COMMANDS) {
        return interaction.reply({
            content: `❌ Tento příkaz lze použít pouze v <#${config.channels.CHAT_COMMANDS}>!`,
            ephemeral: true,
        });
    }

    await interaction.deferReply();

    const db = loadDB();
    const medals = ['🥇', '🥈', '🥉'];

    const entries = Object.entries(db)
        .map(([id, data]) => {
            const user = getUser(db, id);
            resetPeriodsIfNeeded(user);

            let value;
            if (period === 'wealth') {
                value = (data.wallet || 0) + (data.bank || 0);
            } else {
                value = (user.earnings && user.earnings[period]) ? user.earnings[period] : 0;
            }
            return { id, value };
        })
        .filter(e => e.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

    if (entries.length === 0) {
        return interaction.editReply({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`${emoji} ${title}`)
                    .setDescription('📭 Zatím zde nikdo není! Začni vydělávat pomocí `!work`, `!claim` nebo `!crime`.')
                    .setColor(color)
                    .setTimestamp()
                    .setFooter({ text: 'Xeloria Žebříček 🏆' }),
            ],
        });
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
        lines.push(`${medal} **${name}** — \`${e.value.toLocaleString('cs-CZ')} 💵\``);
    }

    const embed = new EmbedBuilder()
        .setTitle(`${emoji} ${title}`)
        .setDescription(lines.join('\n'))
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: 'Xeloria Žebříček 🏆 • Aktualizováno' });

    return interaction.editReply({ embeds: [embed] });
}

// ─── /leaderboard ───
const leaderboard = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 Žebříček nejbohatších hráčů (celkový majetek)'),
    async execute(interaction) {
        await buildLeaderboard(interaction, 'wealth', 'Žebříček nejbohatších hráčů', '🏆', 0xFFD700);
    },
};

// ─── /daily ───
const daily = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('📅 Žebříček TOP výdělků za dnešní den'),
    async execute(interaction) {
        await buildLeaderboard(interaction, 'daily', 'Denní žebříček výdělků', '📅', 0x00D26A);
    },
};

module.exports = [leaderboard, daily];
