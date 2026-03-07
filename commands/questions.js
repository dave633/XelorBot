// ═══════════════════════════════════════════
// Příkaz: /questions
// Zobrazí hráči jeho aktivní quest.
// Pokud quest splnil (výzva /questions complete),
// bot přidělí nový náhodný quest + XP odměnu.
// Pouze v kanálu CHAT_COMMANDS
// ═══════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const {
    loadXP, saveXP, getXPUser,
    randomXP, assignQuest,
} = require('../modules/xp');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('questions')
        .setDescription('📜 Zobraz svůj aktuální quest nebo označ ho jako splněný')
        .addSubcommand(sub =>
            sub.setName('zobraz')
                .setDescription('📋 Zobraz svůj aktuální quest')
        )
        .addSubcommand(sub =>
            sub.setName('splnil')
                .setDescription('✅ Označ quest jako splněný a získej nový + XP odměnu')
        ),

    async execute(interaction) {
        // Kontrola kanálu
        if (interaction.channel.id !== config.channels.CHAT_COMMANDS) {
            return interaction.reply({
                content: `❌ Tento příkaz lze použít pouze v <#${config.channels.CHAT_COMMANDS}>!`,
                ephemeral: true,
            });
        }

        const sub = interaction.options.getSubcommand();
        const db = loadXP();
        const user = getXPUser(db, interaction.user.id);

        // ─── /questions zobraz ───
        if (sub === 'zobraz') {
            // Pokud nemá aktivní quest, přiřaď mu první
            if (!user.activeQuest) {
                assignQuest(user);
                saveXP(db);
            }

            const quest = user.activeQuest;
            const totalCompleted = user.completedQuests ? user.completedQuests.length : 0;

            const embed = new EmbedBuilder()
                .setTitle(`📜 Tvůj aktuální quest`)
                .setDescription(
                    `## ${quest.title}\n\n` +
                    `📋 **Úkol:** ${quest.description}\n\n` +
                    `💡 **Tip:** *${quest.tip}*\n\n` +
                    `🎁 **Odměna:** ${quest.reward}\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `✅ Po splnění: \`/questions splnil\``
                )
                .setColor(0x5865F2)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⭐ Tvoje XP', value: `\`${(user.xp || 0).toLocaleString('cs-CZ')} XP\``, inline: true },
                    { name: '🏅 Splněných questů', value: `\`${totalCompleted}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Xeloria Quest Systém 📜' });

            return interaction.reply({ embeds: [embed] });
        }

        // ─── /questions splnil ───
        if (sub === 'splnil') {
            if (!user.activeQuest) {
                assignQuest(user);
                saveXP(db);
                return interaction.reply({
                    content: '❓ Neměl/a jsi žádný aktivní quest. Byl ti přiřazen nový! Použij `/questions zobraz`.',
                    ephemeral: true,
                });
            }

            const completedQuest = user.activeQuest;

            // Přidej do splněných
            if (!user.completedQuests) user.completedQuests = [];
            user.completedQuests.push({ id: completedQuest.id, completedAt: Date.now() });

            // XP odměna za splnění questu (50–800 XP)
            const xpReward = randomXP(50, 800);
            user.xp = (user.xp || 0) + xpReward;

            // Přiřaď nový quest
            const newQuest = assignQuest(user);
            saveXP(db);

            const embed = new EmbedBuilder()
                .setTitle('🎉 Quest splněn!')
                .setDescription(
                    `Gratulujeme! Splnil/a jsi quest:\n**${completedQuest.title}**\n\n` +
                    `⭐ Získal/a jsi: **+${xpReward.toLocaleString('cs-CZ')} XP**\n` +
                    `📈 Celkem XP: **${user.xp.toLocaleString('cs-CZ')} XP**\n\n` +
                    `━━━━━━━━━━━━━━━━━━━━\n` +
                    `📜 **Tvůj nový quest:**\n` +
                    `## ${newQuest.title}\n` +
                    `${newQuest.description}\n\n` +
                    `💡 *${newQuest.tip}*`
                )
                .setColor(0x00D26A)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '⭐ Celkem XP', value: `\`${user.xp.toLocaleString('cs-CZ')} XP\``, inline: true },
                    { name: '🏅 Splněno questů', value: `\`${user.completedQuests.length}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Xeloria Quest Systém 📜 • Hodně štěstí!' });

            return interaction.reply({ embeds: [embed] });
        }
    },
};
