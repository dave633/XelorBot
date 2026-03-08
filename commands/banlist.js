const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BANS_FILE = path.join(__dirname, '../data/tempbans.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banlist')
        .setDescription('Zobrazit seznam aktuálně dočasně zabanovaných hráčů')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        if (!fs.existsSync(BANS_FILE)) return interaction.reply({ content: '✅ Aktuálně nejsou uloženy žádné dočasné bany.', ephemeral: true });

        const data = JSON.parse(fs.readFileSync(BANS_FILE, 'utf8'));
        const activeBans = Object.entries(data).filter(([id, b]) => b.unbanTime > Date.now());

        if (activeBans.length === 0) return interaction.reply({ content: '✅ Žádné aktivní dočasné bany.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`📊 Seznam dočasných banů (${activeBans.length})`)
            .setThumbnail(interaction.guild.iconURL())
            .setTimestamp();

        const list = activeBans.map(([id, b]) => {
            const timeLeft = Math.floor(b.unbanTime / 1000);
            return `**${b.username}**\n🕒 Vyprší: <t:${timeLeft}:R>\n📝 Důvod: \`${b.reason}\`\n🛡️ Mod: \`${b.moderator}\`\n🆔 ID: \`${id}\``;
        }).join('\n\n');

        embed.setDescription(list.substring(0, 4096));

        await interaction.reply({ embeds: [embed] });
    },
};
