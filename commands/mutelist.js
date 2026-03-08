const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mutelist')
        .setDescription('Zobrazit seznam aktuálně umlčených hráčů (timeouts)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const members = await interaction.guild.members.fetch();
            const mutedMembers = members.filter(m => m.communicationDisabledUntilTimestamp > Date.now());

            if (mutedMembers.size === 0) {
                return interaction.editReply('✅ Aktuálně není na serveru žádný umlčený hráč.');
            }

            const embed = new EmbedBuilder()
                .setColor(0xE67E22)
                .setTitle(`📊 Seznam umlčených hráčů (${mutedMembers.size})`)
                .setThumbnail(interaction.guild.iconURL())
                .setTimestamp();

            const list = mutedMembers.map(m => {
                const timeLeft = Math.round((m.communicationDisabledUntilTimestamp - Date.now()) / 1000 / 60);
                return `**${m.user.tag}**\n🕒 Zbývá: \`${timeLeft} min\`\n🆔 ID: \`${m.id}\``;
            }).join('\n\n');

            embed.setDescription(list.substring(0, 4096));

            await interaction.editReply({ embeds: [embed] });

            // LOG do Staff kanálu (oznámení o kontrole listu)
            const logChannel = interaction.guild.channels.cache.get(config.channels.LOGS);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('🔍 Log: Kontrola Mute Listu')
                    .setDescription(`Moderátor **${interaction.user.tag}** vyžádal seznam umlčených hráčů.`)
                    .setColor(0x808080)
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Nastala chyba při načítání členů.');
        }
    },
};
