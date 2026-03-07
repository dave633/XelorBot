// ═══════════════════════════════════════════
// Příkaz: /oznameni
// ═══════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oznameni')
        .setDescription('Odeslat oznámení')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Text oznámení')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('odkaz')
                .setDescription('Text odkazu do odkaz kanálu (volitelné)')
                .setRequired(false)),

    async execute(interaction) {
        const isAdmin = config.adminRoles.some(r => interaction.member.roles.cache.has(r));
        if (!isAdmin) {
            return interaction.reply({ content: '❌ Nemáš oprávnění!', ephemeral: true });
        }

        const text = interaction.options.getString('text');
        const odkazText = interaction.options.getString('odkaz');

        const oznameniChannel = interaction.guild.channels.cache.get(config.channels.OZNAMENI);
        if (!oznameniChannel) {
            return interaction.reply({ content: '❌ Kanál pro oznámení nebyl nalezen!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('📢 OZNÁMENÍ')
            .setDescription(text)
            .setColor(0xFF6B00)
            .setTimestamp()
            .setFooter({ text: `Oznámení od ${interaction.user.username}` })
            .setAuthor({ name: 'Xeloria', iconURL: interaction.guild.iconURL() });

        const sentMsg = await oznameniChannel.send({ embeds: [embed] });

        // Odkaz do odkaz kanálu
        if (odkazText) {
            const odkazChannel = interaction.guild.channels.cache.get(config.channels.OZNAMENI_ODKAZ);
            if (odkazChannel) {
                const linkEmbed = new EmbedBuilder()
                    .setTitle('🔗 Nové oznámení')
                    .setDescription(`${odkazText}\n\n[➡️ Přejít na oznámení](${sentMsg.url})`)
                    .setColor(0x5865F2)
                    .setTimestamp();
                await odkazChannel.send({ embeds: [linkEmbed] });
            }
        }

        await interaction.reply({ content: '✅ Oznámení bylo odesláno!', ephemeral: true });
    },
};
