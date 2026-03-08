const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config');

// Cesta k souboru s varováními
const WARNS_FILE = path.join(__dirname, '../data/warns.json');

// Ujistíme se, že složka a soubor existují
if (!fs.existsSync(path.dirname(WARNS_FILE))) {
    fs.mkdirSync(path.dirname(WARNS_FILE), { recursive: true });
}
if (!fs.existsSync(WARNS_FILE)) {
    fs.writeFileSync(WARNS_FILE, JSON.stringify({}));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Udělit varování hráči')
        .addUserOption(option =>
            option.setName('hrac')
                .setDescription('Hráč, kterému chceš udělit varování')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duvod')
                .setDescription('Důvod varování')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target = interaction.options.getUser('hrac');
        const reason = interaction.options.getString('duvod');

        if (target.bot) return interaction.reply({ content: '❌ Nemůžeš varovat bota!', ephemeral: true });
        if (target.id === interaction.user.id) return interaction.reply({ content: '❌ Nemůžeš varovat sám sebe!', ephemeral: true });

        // Načtení a uložení varování
        const data = JSON.parse(fs.readFileSync(WARNS_FILE, 'utf8'));
        if (!data[target.id]) data[target.id] = [];

        const newWarn = {
            moderator: interaction.user.tag,
            moderatorId: interaction.user.id,
            reason: reason,
            timestamp: new Date().toISOString()
        };

        data[target.id].push(newWarn);
        fs.writeFileSync(WARNS_FILE, JSON.stringify(data, null, 2));

        const warnCount = data[target.id].length;

        // 1. DM HRÁČI (Prémiový styl)
        const dmEmbed = new EmbedBuilder()
            .setColor(0xE74C3C) // Červená pro varování
            .setAuthor({ name: 'SYSTÉM VAROVÁNÍ • XELORIA', iconURL: interaction.guild.iconURL({ dynamic: true }) })
            .setTitle('⚠️ BYLO TI UDĚLENO VAROVÁNÍ')
            .setDescription(
                `\n` +
                `Zdravíme, **${target.username}**,\n` +
                `na tvém účtu bylo zaznamenáno porušení pravidel serveru.\n\n` +
                `> **Důvod:** ${reason}\n\n` +
                `*Aktuálně máš na svém kontě **${warnCount}** varování.*\n` +
                `*Opakované porušování pravidel může vést k dočasnému nebo trvalému zabanování.*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
            .setFooter({ text: 'Pokud si myslíš, že je varování neoprávněné, kontaktuj vedení přes Ticket.' })
            .setTimestamp();

        try {
            await target.send({ embeds: [dmEmbed] });
        } catch (err) {
            console.log(`Nepodařilo se poslat DM hráči ${target.tag}`);
        }

        // 2. ZPRÁVA DO CHATU (Kde Staff příkaz použil)
        const publicEmbed = new EmbedBuilder()
            .setColor(0xF1C40F) // Žlutá/Oranžová
            .setTitle('🔨 Varování uděleno')
            .addFields(
                { name: '👤 Hráč', value: `${target.tag} (${target.id})`, inline: true },
                { name: '🛡️ Moderátor', value: interaction.user.tag, inline: true },
                { name: '📝 Důvod', value: reason },
                { name: '📊 Stav varování', value: `Uživatel má nyní **${warnCount}** varování.` }
            )
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await interaction.reply({ embeds: [publicEmbed] });

        // 3. LOGOVÁNÍ (Volitelné, ale doporučené - do kanálu v configu)
        const logChannel = interaction.guild.channels.cache.get(config.channels.LOGS);
        if (logChannel) {
            logChannel.send({ embeds: [publicEmbed] });
        }
    },
};
