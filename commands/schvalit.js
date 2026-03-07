// ═══════════════════════════════════════════
// Příkaz: /schvalit
// ═══════════════════════════════════════════

const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { updateIdeaStatus } = require('../modules/ideas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('schvalit')
        .setDescription('Schválit nápad')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID zprávy s nápadem')
                .setRequired(true)),

    async execute(interaction) {
        const isAdmin = config.adminRoles.some(r => interaction.member.roles.cache.has(r));
        if (!isAdmin) {
            return interaction.reply({ content: '❌ Nemáš oprávnění!', ephemeral: true });
        }

        const messageId = interaction.options.getString('id');
        const channel = interaction.guild.channels.cache.get(config.channels.NAPADY);

        if (!channel) {
            return interaction.reply({ content: '❌ Kanál pro nápady nebyl nalezen!', ephemeral: true });
        }

        const result = await updateIdeaStatus(channel, messageId, 'schvaleno', interaction.user);

        if (result) {
            await interaction.reply({ content: `✅ Nápad **${messageId}** byl schválen!`, ephemeral: true });
        } else {
            await interaction.reply({ content: '❌ Nápad nebyl nalezen!', ephemeral: true });
        }
    },
};
