// ═══════════════════════════════════════════
// Modul: Selfrole panel (ping role)
// ═══════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const pingRoles = [
    { id: '1466805522299752490', label: '📋 Plány', emoji: '📋' },
    { id: '1466805404209254577', label: '🎁 Giveaways', emoji: '🎁' },
    { id: '1466882617298129079', label: '📊 Hlasování', emoji: '📊' },
    { id: '1466805406600007926', label: '💬 Chat Ping', emoji: '💬' },
    { id: '1466804101944967219', label: '👥 Komunitní Ping', emoji: '👥' },
    { id: '1466805461578678455', label: '🎥 Stream Ping', emoji: '🎥' },
    { id: '1466805466372772051', label: '🔊 VC Ping', emoji: '🔊' },
    { id: '1466805409036767426', label: '🔄 Update Ping', emoji: '🔄' },
    { id: '5404209254577', label: '🎉 Giveaway Ping', emoji: '🎉' },
    { id: '1466805464057647155', label: '🎪 Event Ping', emoji: '🎪' },
    { id: '1466805468390490143', label: '📢 Announcement Ping', emoji: '📢' },
    { id: '1478172707806908537', label: '🔮 Noční Ping', emoji: '🔮' },
    { id: '1478216385837531215', label: '💼 Nábory Ping', emoji: '💼' },
];

function createSelfroleEmbed() {
    const roleList = pingRoles.map(r => `${r.emoji} **${r.label.replace(r.emoji + ' ', '')}**`).join('\n');

    return new EmbedBuilder()
        .setTitle('🔔 Výběr Ping Rolí')
        .setDescription(
            '**Vyber si, jaké pingy chceš dostávat!**\n' +
            'Klikni na tlačítko pro přidání/odebrání role.\n' +
            'Pokud roli už máš, kliknutím ji odebereš.\n\n' +
            `${roleList}`
        )
        .setColor(0x5865F2)
        .setFooter({ text: 'Xeloria – Klikni pro přidání/odebrání role' })
        .setTimestamp();
}

function createSelfroleButtons() {
    const rows = [];
    // Discord povoluje max 5 tlačítek na řádek a max 5 řádků
    // Máme 11 rolí → 3 řádky po 4 + 1 řádek po 3 = nefunguje, max 5 řádků po 5
    // 11 rolí → 3 řádky: 4+4+3
    for (let i = 0; i < pingRoles.length; i += 4) {
        const row = new ActionRowBuilder();
        const chunk = pingRoles.slice(i, i + 4);
        for (const role of chunk) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`selfrole_${role.id}`)
                    .setLabel(role.label.replace(role.emoji + ' ', ''))
                    .setEmoji(role.emoji)
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        rows.push(row);
    }
    return rows;
}

async function sendSelfrolePanel(channel) {
    await channel.send({
        embeds: [createSelfroleEmbed()],
        components: createSelfroleButtons(),
    });
}

async function handleSelfroleButton(interaction) {
    const roleId = interaction.customId.replace('selfrole_', '');
    const member = interaction.member;
    const roleInfo = pingRoles.find(r => r.id === roleId);

    if (!roleInfo) {
        return interaction.reply({ content: '❌ Role nebyla nalezena!', ephemeral: true });
    }

    try {
        if (member.roles.cache.has(roleId)) {
            await member.roles.remove(roleId);
            await interaction.reply({
                content: `❌ Role **${roleInfo.label}** ti byla odebrána!`,
                ephemeral: true,
            });
        } else {
            await member.roles.add(roleId);
            await interaction.reply({
                content: `✅ Role **${roleInfo.label}** ti byla přidána!`,
                ephemeral: true,
            });
        }
    } catch (err) {
        console.error('Chyba při přidávání/odebírání role:', err);
        await interaction.reply({
            content: '❌ Nepodařilo se změnit roli. Zkontroluj oprávnění bota.',
            ephemeral: true,
        });
    }
}

module.exports = { sendSelfrolePanel, handleSelfroleButton };
