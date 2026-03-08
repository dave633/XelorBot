const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dmall')
        .setDescription('Odeslat hromadnou zprávu všem v Ultra-Premium stylu')
        .addStringOption(option =>
            option.setName('zprava')
                .setDescription('Text zprávy pro všechny')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('obrazek')
                .setDescription('URL adresa obrázku (volitelné)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const zprava = interaction.options.getString('zprava');
        const obrazek = interaction.options.getString('obrazek');

        await interaction.deferReply({ ephemeral: true });

        try {
            const members = await interaction.guild.members.fetch();
            let success = 0;
            let fail = 0;

            await interaction.editReply(`⏳ **Zpracovávám hromadné vysílání pro ${members.size} uživatelů...**`);

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C) // Výrazná červená
                .setAuthor({
                    name: `GLOBÁLNÍ OZNÁMENÍ SERVERU XELORIA`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTitle('📢 Důležité sdělení pro celou komunitu')
                .setDescription(`\n${zprava}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true, size: 256 }))
                .setFooter({ text: 'Toto je hromadné vysílání autorizované vedením serveru.', iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            if (obrazek) {
                if (obrazek.startsWith('http')) embed.setImage(obrazek);
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Připojit se na Server')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.gg/xeloria`),
                new ButtonBuilder()
                    .setLabel('Oficiální Web')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`http://localhost:3005`)
            );

            for (const [id, member] of members) {
                if (member.user.bot) continue;
                try {
                    await member.send({ embeds: [embed], components: [row] });
                    success++;
                } catch (err) {
                    fail++;
                }

                if ((success + fail) % 10 === 0) {
                    await new Promise(r => setTimeout(r, 1500));
                }
            }

            await interaction.editReply({ content: `🏆 **Hromadné vysílání dokončeno!**\n✅ Doručeno: **${success}** uživatelům\n❌ Selhalo: **${fail}** (uzavřené DM)` });

            // LOGOVÁNÍ
            const logChannel = interaction.guild.channels.cache.get(config.channels.LOGS);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📢 Log: Hromadné oznámení')
                    .setColor(0xE74C3C)
                    .addFields(
                        { name: '🛡️ Moderátor', value: `${interaction.user.tag}`, inline: true },
                        { name: '📊 Statistiky', value: `Úspěšně: ${success} | Selhalo: ${fail}`, inline: true },
                        { name: '📝 Zpráva', value: zprava }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error('Chyba u /dmall:', error);
            await interaction.editReply({ content: `❌ Nastala kritická chyba při odesílání hromadné zprávy.` });
        }
    },
};
