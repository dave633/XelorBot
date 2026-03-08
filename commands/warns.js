const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const WARNS_FILE = path.join(__dirname, '../data/warns.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warns')
        .setDescription('Zobrazit historii varování hráče')
        .addUserOption(option =>
            option.setName('hrac')
                .setDescription('Hráč, jehož varování chceš vidět')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('hrac');

        if (!fs.existsSync(WARNS_FILE)) {
            return interaction.reply({ content: '❌ Databáze varování je prázdná.', ephemeral: true });
        }

        const data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'));
        const userWarns = data[target.id] || [];

        if (userWarns.length === 0) {
            return interaction.reply({ content: `✅ Hráč **${target.tag}** nemá žádná aktivní varování.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setAuthor({ name: `Historie trestů: ${target.tag}`, iconURL: target.displayAvatarURL({ dynamic: true }) })
            .setTitle(`Celkový počet varování: ${userWarns.length}`)
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        // Výpis posledních 10 varování
        const list = userWarns.slice(-10).map((w, i) => {
            const date = new Date(w.timestamp).toLocaleDateString('cs-CZ');
            return `**${userWarns.length - i}.** \`${date}\` - **${w.reason}** (Moderátor: ${w.moderator})`;
        }).reverse().join('\n\n');

        embed.setDescription(list);

        await interaction.reply({ embeds: [embed] });
    },
};
