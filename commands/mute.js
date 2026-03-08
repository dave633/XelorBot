const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Udělit trvalé umlčení (Timeout na 28 dní) hráči')
        .addUserOption(option =>
            option.setName('hrac')
                .setDescription('Hráč, kterého chceš umlčet')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duvod')
                .setDescription('Důvod umlčení')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('hrac');
        const reason = interaction.options.getString('duvod');
        const member = await interaction.guild.members.fetch(target.id);

        if (!member) return interaction.reply({ content: '❌ Hráč nebyl nalezen na serveru.', ephemeral: true });
        if (target.bot) return interaction.reply({ content: '❌ Nemůžeš umlčet bota!', ephemeral: true });

        // Discord Timeout limit je 28 dní
        const durationMs = 28 * 24 * 60 * 60 * 1000;

        try {
            await member.timeout(durationMs, `${reason} | Moderátor: ${interaction.user.tag}`);

            // 1. DM HRÁČI
            const dmEmbed = new EmbedBuilder()
                .setColor(0x000000) // Černá pro "trvalý" pocit
                .setAuthor({ name: '🔐 SYSTÉM MODERACE • XELORIA LAND', iconURL: interaction.guild.iconURL() })
                .setTitle('🔇 BYLO TI UDĚLENO „TRVALÉ“ UMLČENÍ')
                .setDescription(
                    `\n` +
                    `Zdravíme, **${target.username}**,\n` +
                    `na základě tvého chování ti bylo uděleno umlčení na maximální dobu (28 dní).\n\n` +
                    `> **Důvod:** ${reason}\n` +
                    `> **Vyprší za:** 28 dní (Maximální limit)\n\n` +
                    `*Pokud chceš zažádat o un-mute dříve, využij náš Ticket systém na serveru.*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .setFooter({ text: 'Trest byl zapsán do globální databáze trestů.' })
                .setTimestamp();

            try { await target.send({ embeds: [dmEmbed] }); } catch { }

            // 2. ODPOVĚĎ DO CHATU
            const publicEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setTitle('🔇 Hráč byl umlčen (MAX)')
                .addFields(
                    { name: '👤 Hráč', value: `${target.tag}`, inline: true },
                    { name: '⏳ Doba', value: `\`28 dní (MAX)\``, inline: true },
                    { name: '🛡️ Moderátor', value: `${interaction.user.tag}`, inline: true },
                    { name: '📝 Důvod', value: reason }
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
            await interaction.reply({ content: '❌ Nastala chyba! Prověř oprávnění bota.', ephemeral: true });
        }
    },
};
