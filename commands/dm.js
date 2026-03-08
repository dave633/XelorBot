const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('Odeslat soukromou zprávu v absolutním prémiovém herním stylu')
        .addUserOption(option =>
            option.setName('uzivatel')
                .setDescription('Hráč, kterému chceš napsat')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('zprava')
                .setDescription('Obsah sdělení')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('banner')
                .setDescription('Odkaz na horní banner (pokud chceš vlastní)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const user = interaction.options.getUser('uzivatel');
        const zprava = interaction.options.getString('zprava');
        const customBanner = interaction.options.getString('banner');

        await interaction.deferReply({ ephemeral: true });

        // Získání banneru serveru nebo defaultu
        const serverBanner = interaction.guild.bannerURL({ size: 1024 }) || interaction.guild.discoverySplashURL({ size: 1024 });

        try {
            const embed = new EmbedBuilder()
                .setColor(0x2B2D31) // Splynutí s Discord pozadím
                .setAuthor({
                    name: `SYSTÉMOVÉ UPOZORNĚNÍ • XELORIA LAND`,
                    iconURL: interaction.guild.iconURL({ dynamic: true })
                })
                .setTitle('💎 DŮLEŽITÉ SDĚLENÍ VEDENÍ')
                .setDescription(
                    `\n` +
                    ` Zdravíme, **${user.username}**,obdržel(a) jsi novou zprávu od administrativy:\n\n` +
                    `> **${zprava}**\n\n` +
                    `*Prosíme o respektování pokynů vedení serveru.*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .addFields(
                    { name: '🛰️ Odesláno z', value: `\`${interaction.guild.name}\``, inline: true },
                    { name: '🛡️ Autorita', value: `\`${interaction.user.username}\``, inline: true }
                )
                .setFooter({
                    text: 'xelorialand.eu • Oficiální automatizovaný systém',
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            // Nastavení banneru – buď uživatelský, nebo serverový
            if (customBanner && customBanner.startsWith('http')) {
                embed.setImage(customBanner);
            } else if (serverBanner) {
                embed.setImage(serverBanner);
            }

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('VSTOUPIT NA SERVER')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://discord.gg/xeloria`),
                new ButtonBuilder()
                    .setLabel('NÁPOVĚDA / PODPORA')
                    .setStyle(ButtonStyle.Link)
                    .setURL(`https://xelorialand.eu`)
            );

            await user.send({ embeds: [embed], components: [row] });
            await interaction.editReply({ content: `✨ **ZPRÁVA DORUČENA** ✨\nHráč **${user.tag}** obdržel oznámení v nejvyšší kvalitě.` });

            // LOGOVÁNÍ
            const logChannel = interaction.guild.channels.cache.get(config.channels.LOGS);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📧 Log: Odeslaná DM')
                    .setColor(0x3498DB)
                    .addFields(
                        { name: '🛡️ Moderátor', value: `${interaction.user.tag}`, inline: true },
                        { name: '👤 Příjemce', value: `${user.tag} (${user.id})`, inline: true },
                        { name: '📝 Zpráva', value: zprava }
                    )
                    .setTimestamp();
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (error) {
            console.error(`Chyba při DM pro ${user.tag}:`, error);
            await interaction.editReply({ content: `❌ **CHYBA DORUČENÍ**\nUživatel má pravděpodobně zakázané zprávy od cizích lidí nebo bota.` });
        }
    },
};
