const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const BANS_FILE = path.join(__dirname, '../data/tempbans.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Udělit dočasný ban hráči')
        .addUserOption(option =>
            option.setName('hrac')
                .setDescription('Hráč, kterého chceš zabanovat')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('cas')
                .setDescription('Doba banu (např: 1h, 7d, 30d)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('duvod')
                .setDescription('Důvod banu')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const user = interaction.options.getUser('hrac');
        const durationStr = interaction.options.getString('cas');
        const reason = interaction.options.getString('duvod');
        const durationMs = ms(durationStr);

        if (!durationMs) return interaction.reply({ content: '❌ Neplatný formát času! Použij např. `1h`, `7d`.', ephemeral: true });
        if (user.id === interaction.user.id) return interaction.reply({ content: '❌ Nemůžeš zabanovat sám sebe!', ephemeral: true });

        await interaction.deferReply();

        const unbanTime = Date.now() + durationMs;

        // 1. DM HRÁČI (Před banem)
        const dmEmbed = new EmbedBuilder()
            .setColor(0x000000)
            .setAuthor({ name: 'SYSTÉM TRESTŮ • XELORIA LAND', iconURL: interaction.guild.iconURL() })
            .setTitle('🚫 BYL TI UDĚLEN DOČASNÝ BAN')
            .setDescription(
                `\n` +
                `Zdravíme, **${user.username}**,\n` +
                `přístup na náš server ti byl dočasně odepřen.\n\n` +
                `> **Důvod:** ${reason}\n` +
                `> **Doba trvání:** ${durationStr}\n` +
                `> **Vyprší:** <t:${Math.floor(unbanTime / 1000)}:F>\n\n` +
                `*Pokud si myslíš, že je trest neoprávněný, můžeš si po vypršení zažádat o vysvětlení.*\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
            )
            .setFooter({ text: 'Trest je nevratný po dobu jeho trvání.' })
            .setTimestamp();

        let dmSent = true;
        try {
            await user.send({ embeds: [dmEmbed] });
        } catch (e) {
            dmSent = false;
            console.log(`DM nelze odeslat uživateli ${user.tag} před banem.`);
        }

        try {
            // 2. PROVEDENÍ BANU
            await interaction.guild.members.ban(user, { reason: `${reason} | Do: ${new Date(unbanTime).toLocaleString()} | Moderátor: ${interaction.user.tag}` });

            // 3. ULOŽENÍ DO DATABÁZE
            const data = fs.existsSync(BANS_FILE) ? JSON.parse(fs.readFileSync(BANS_FILE, 'utf8')) : {};
            data[user.id] = {
                username: user.tag,
                guildId: interaction.guild.id,
                unbanTime: unbanTime,
                reason: reason,
                moderator: interaction.user.tag
            };
            fs.writeFileSync(BANS_FILE, JSON.stringify(data, null, 2));

            // 4. POTVRZENÍ DO CHATU
            const logEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('🚫 Hráč byl dočasně zabanován')
                .addFields(
                    { name: '👤 Hráč', value: `\`${user.tag}\` (${user.id})`, inline: true },
                    { name: '⏳ Doba', value: `\`${durationStr}\``, inline: true },
                    { name: '🛡️ Moderátor', value: `${interaction.user.tag}`, inline: true },
                    { name: '📝 Důvod', value: reason },
                    { name: '📅 Vyprší', value: `<t:${Math.floor(unbanTime / 1000)}:R>` },
                    { name: '📩 DM', value: dmSent ? '✅ Doručeno' : '❌ Nedoručeno (uzavřené DM)', inline: true }
                )
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();

            await interaction.editReply({ embeds: [logEmbed] });

            // 5. STAFF LOG
            const logChannel = interaction.guild.channels.cache.get(config.channels.LOGS);
            if (logChannel) await logChannel.send({ embeds: [logEmbed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Nastala chyba při provádění banu. Prověř oprávnění bota.');
        }
    },
};
