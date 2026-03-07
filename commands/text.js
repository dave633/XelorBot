// ═══════════════════════════════════════════
// Příkaz: /text
// Pouze pro administraci – pošle embed do
// libovolného kanálu na serveru.
// ═══════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../config');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('text')
        .setDescription('📢 [ADMIN] Pošle embed zprávu do zvoleného kanálu')
        .addStringOption(option =>
            option.setName('zprava')
                .setDescription('Obsah zprávy (lze použít \\n pro nový řádek)')
                .setRequired(true)
        )
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Kanál, do kterého bude zpráva odeslána (výchozí: aktuální kanál)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('nadpis')
                .setDescription('Nadpis embedu (volitelné)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('barva')
                .setDescription('Barva embedu: modra, cervena, zelena, zluta, fialova, oranzova (výchozí: modrá)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // ─── Kontrola admin role ───
        const isAdmin = config.adminRoles.some(r => interaction.member.roles.cache.has(r));
        if (!isAdmin) {
            return interaction.reply({
                content: '❌ Tento příkaz mohou používat pouze **administrátoři**!',
                ephemeral: true,
            });
        }

        const targetChannel = interaction.options.getChannel('kanal') || interaction.channel;
        const rawText = interaction.options.getString('zprava');
        const nadpis = interaction.options.getString('nadpis') || null;
        const barvaInput = (interaction.options.getString('barva') || 'modra').toLowerCase().trim();

        // ─── Převod barvy ───
        const colorMap = {
            modra: 0x5865F2,
            cervena: 0xED4245,
            zelena: 0x00D26A,
            zluta: 0xFEE75C,
            fialova: 0xEB459E,
            oranzova: 0xFF6B00,
            bila: 0xFFFFFF,
            cerna: 0x23272A,
        };
        const color = colorMap[barvaInput] || 0x5865F2;

        // Nahraď \n za skutečný nový řádek
        const text = rawText.replace(/\\n/g, '\n');

        // ─── Vytvoř embed ───
        const embed = new EmbedBuilder()
            .setDescription(text)
            .setColor(color)
            .setTimestamp()
            .setFooter({ text: `Zpráva od ${interaction.user.username}` });

        if (nadpis) {
            embed.setTitle(nadpis);
        }

        // ─── Odešli do zvoleného kanálu ───
        try {
            await targetChannel.send({ embeds: [embed] });
            return interaction.reply({
                content: `✅ Zpráva byla úspěšně odeslána do <#${targetChannel.id}>!`,
                ephemeral: true,
            });
        } catch (err) {
            console.error('[/text] Chyba při odesílání:', err);
            return interaction.reply({
                content: `❌ Nepodařilo se odeslat zprávu do <#${targetChannel.id}>. Zkontroluj práva bota v tom kanálu.`,
                ephemeral: true,
            });
        }
    },
};
