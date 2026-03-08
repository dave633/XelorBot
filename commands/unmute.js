const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('Zrušit umlčení (timeout) hráči')
        .addUserOption(option =>
            option.setName('hrac')
                .setDescription('Hráč, kterému chceš vrátit hlas')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duvod')
                .setDescription('Důvod zrušení trestu')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('hrac');
        const reason = interaction.options.getString('duvod');
        const member = await interaction.guild.members.fetch(target.id);

        if (!member) return interaction.reply({ content: '❌ Hráč nebyl nalezen na serveru.', ephemeral: true });

        if (!member.communicationDisabledUntilTimestamp || member.communicationDisabledUntilTimestamp < Date.now()) {
            return interaction.reply({ content: '❌ Tento hráč aktuálně není umlčen.', ephemeral: true });
        }

        try {
            await member.timeout(null, `${reason} | Moderátor: ${interaction.user.tag}`);

            // 1. DM HRÁČI
            const dmEmbed = new EmbedBuilder()
                .setColor(0x2ECC71) // Zelená pro un-mute
                .setAuthor({ name: 'SYSTÉM MODERACE • XELORIA LAND', iconURL: interaction.guild.iconURL() })
                .setTitle('🔊 TVOJE UMLČENÍ BYLO ZRUŠENO')
                .setDescription(
                    `\n` +
                    `Zdravíme, **${target.username}**,\n` +
                    `tvoje umlčení na serveru bylo předčasně ukončeno.\n\n` +
                    `> **Důvod zrušení:** ${reason}\n\n` +
                    `*Nyní můžeš opět psát a mluvit. Prosíme o dodržování pravidel.*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .setFooter({ text: 'Vítej zpět v diskuzi!' })
                .setTimestamp();

            try { await target.send({ embeds: [dmEmbed] }); } catch { }

            // 2. ODPOVĚĎ DO CHATU
            const publicEmbed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('🔊 Hráč byl odbáněn (Un-mute)')
                .addFields(
                    { name: '👤 Hráč', value: `${target.tag}`, inline: true },
                    { name: '🛡️ Moderátor', value: `${interaction.user.tag}`, inline: true },
                    { name: '📝 Důvod zrušení', value: reason }
                )
                .setThumbnail(target.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [publicEmbed] });

            // 3. LOG DO STAFF KANÁLU
            const logChannel = interaction.guild.channels.cache.get(config.channels.LOGS);
            if (logChannel) {
                await logChannel.send({ embeds: [publicEmbed] });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Nastala chyba při rušení trestu! Prověř oprávnění bota.', ephemeral: true });
        }
    },
};
