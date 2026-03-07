// ═══════════════════════════════════════════
// Příkaz: /hlasovani create
// ═══════════════════════════════════════════

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hlasovani')
        .setDescription('Systém hlasování')
        .addSubcommand(sub => sub
            .setName('create')
            .setDescription('Vytvoří nové hlasování v hlasovacím kanálu')
            .addStringOption(opt => opt
                .setName('text')
                .setDescription('Otázka nebo téma hlasování')
                .setRequired(true)
            )
        ),

    async execute(interaction) {
        // Jen adminové mohou tvořit hlasování
        const isAdmin = config.adminRoles.some(r => interaction.member.roles.cache.has(r));
        if (!isAdmin) {
            return interaction.reply({ content: '❌ Nemáš oprávnění vytvářet hlasování!', ephemeral: true });
        }

        const sub = interaction.options.getSubcommand();
        if (sub !== 'create') return;

        const text = interaction.options.getString('text');
        const channel = interaction.guild.channels.cache.get(config.channels.HLASOVANI);

        if (!channel) {
            return interaction.reply({ content: '❌ Hlasovací kanál nebyl nalezen!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle('🗳️ Hlasování')
            .setDescription(`**${text}**`)
            .addFields(
                { name: '✅ Pro', value: '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n**0 hlasů** (0%)', inline: true },
                { name: '❌ Proti', value: '⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛\n**0 hlasů** (0%)', inline: true },
                { name: '📊 Celkem', value: '**0 hlasů**', inline: true },
            )
            .setColor(0x5865F2)
            .setTimestamp()
            .setFooter({ text: `Vytvořil: ${interaction.user.tag}` });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('vote_ano')
                .setLabel('✅ Ano')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('vote_ne')
                .setLabel('❌ Ne')
                .setStyle(ButtonStyle.Danger),
        );

        await channel.send({ embeds: [embed], components: [row] });
        await interaction.reply({ content: `✅ Hlasování bylo vytvořeno v <#${channel.id}>!`, ephemeral: true });
    },
};
