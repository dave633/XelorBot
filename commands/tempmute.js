const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempmute')
        .setDescription('Udělit dočasný mute (timeout) hráči')
        .addUserOption(option =>
            option.setName('hrac')
                .setDescription('Hráč, kterého chceš umlčet')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('cas')
                .setDescription('Doba (např: 10m, 1h, 1d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duvod')
                .setDescription('Důvod umlčení')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('hrac');
        const durationStr = interaction.options.getString('cas');
        const reason = interaction.options.getString('duvod');
        const member = await interaction.guild.members.fetch(target.id);

        if (!member) return interaction.reply({ content: '❌ Hráč nebyl nalezen na serveru.', ephemeral: true });
        if (target.bot) return interaction.reply({ content: '❌ Nemůžeš umlčet bota!', ephemeral: true });

        const durationMs = ms(durationStr);
        if (!durationMs || durationMs < 10000 || durationMs > 2419200000) { // Max 28 dní (Discord limit)
            return interaction.reply({ content: '❌ Neplatný čas! Použij např. `10m`, `1h`, `1d` (max 28 dní).', ephemeral: true });
        }

        try {
            await member.timeout(durationMs, `${reason} | Moderátor: ${interaction.user.tag}`);

            // 1. DM HRÁČI
            const dmEmbed = new EmbedBuilder()
                .setColor(0xE67E22) // Oranžová
                .setAuthor({ name: 'SYSTÉM MODERACE • XELORIA LAND', iconURL: interaction.guild.iconURL() })
                .setTitle('🔇 BYLO TI UDĚLENO UMLČENÍ (MUTE)')
                .setDescription(
                    `\n` +
                    `Zdravíme, **${target.username}**,\n` +
                    `byl jsi dočasně umlčen na našem serveru.\n\n` +
                    `> **Důvod:** ${reason}\n` +
                    `> **Doba trvání:** ${durationStr}\n\n` +
                    `*Během této doby nemůžeš psát do chatů ani se připojovat do voice channelů.*\n` +
                    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                )
                .setFooter({ text: 'Opakované porušování pravidel vede k přísnějším trestům.' })
                .setTimestamp();

            try { await target.send({ embeds: [dmEmbed] }); } catch { }

            // 2. ODPOVĚĎ DO CHATU
            const publicEmbed = new EmbedBuilder()
                .setColor(0xE67E22)
                .setTitle('🔇 Hráč byl umlčen')
                .addFields(
                    { name: '👤 Hráč', value: `${target.tag}`, inline: true },
                    { name: '⏳ Doba', value: `\`${durationStr}\``, inline: true },
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
            await interaction.reply({ content: '❌ Nastala chyba! Prověř, zda má bot roli nad daným uživatelem.', ephemeral: true });
        }
    },
};
