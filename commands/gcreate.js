// ═══════════════════════════════════════════
// Příkaz: /gcreate
// ═══════════════════════════════════════════

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const config = require('../config');
const { storeGiveaway, scheduleGiveaway } = require('../modules/giveaway');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gcreate')
        .setDescription('Vytvoří nový giveaway')
        .addStringOption(opt => opt
            .setName('cena')
            .setDescription('O co se hraje? (např. VIP rank, 500 coinů...)')
            .setRequired(true)
        )
        .addIntegerOption(opt => opt
            .setName('minuty')
            .setDescription('Jak dlouho bude giveaway trvat (v minutách)?')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(43200) // max 30 dní
        ),

    async execute(interaction) {
        // Zkontrolovat oprávnění – GIVEAWAY_MOD nebo admin
        const hasGiveawayRole = interaction.member.roles.cache.has(config.roles.GIVEAWAY_MOD);
        const isAdmin = config.adminRoles.some(r => interaction.member.roles.cache.has(r));

        if (!hasGiveawayRole && !isAdmin) {
            return interaction.reply({
                content: '❌ Nemáš oprávnění k vytvoření giveaway! Potřebuješ roli <@&' + config.roles.GIVEAWAY_MOD + '>.',
                ephemeral: true,
            });
        }

        const cena = interaction.options.getString('cena');
        const minuty = interaction.options.getInteger('minuty');

        const endTime = Date.now() + minuty * 60 * 1000;
        const endTimestamp = Math.floor(endTime / 1000);

        const channel = interaction.guild.channels.cache.get(config.channels.GIVEAWAY);
        if (!channel) {
            return interaction.reply({ content: '❌ Giveaway kanál nebyl nalezen!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🎊 GIVEAWAY!')
            .setDescription(`## ${cena}`)
            .addFields(
                { name: '👤 Autor', value: `<@${interaction.user.id}>`, inline: true },
                { name: '⏰ Vyprší', value: `<t:${endTimestamp}:R> (<t:${endTimestamp}:f>)`, inline: true },
                { name: '🎟️ Účastníci', value: '**0** hráčů', inline: true },
            )
            .setColor(0xFF73FA)
            .setTimestamp(new Date(endTime))
            .setFooter({ text: '🎊 Pro zapojení klikni na tlačítko níže! • Giveaway končí' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('🎊 Zapojit se')
                .setStyle(ButtonStyle.Primary),
        );

        await interaction.reply({ content: `✅ Giveaway byl vytvořen v <#${channel.id}>!`, ephemeral: true });

        const msg = await channel.send({ embeds: [embed], components: [row] });

        // Uložit giveaway a naplánovat ukončení
        storeGiveaway(msg.id, {
            messageId: msg.id,
            channelId: channel.id,
            prize: cena,
            authorId: interaction.user.id,
            endTime,
            participants: [],
        });

        scheduleGiveaway(msg, endTime, cena);
    },
};
