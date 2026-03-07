// ═══════════════════════════════════════════
// Příkazy: Periodické XP odměny
//   /weekly   – jednou za týden
//   /tweekly  – jednou za 2 týdny
//   /monthly  – jednou za měsíc
//   /yearly   – jednou za rok
// Pouze v kanálu CHAT_COMMANDS
// ═══════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../config');
const {
    loadXP, saveXP, getXPUser,
    checkCooldown, setCooldown,
    randomXP, formatRemaining, COOLDOWN_LABELS,
} = require('../modules/xp');

// ─── Pomocná funkce – zpracuj odměnu ───
async function handleReward(interaction, type, emoji, color, minXP, maxXP) {
    // Kontrola kanálu
    if (interaction.channel.id !== config.channels.CHAT_COMMANDS) {
        return interaction.reply({
            content: `❌ Tento příkaz lze použít pouze v <#${config.channels.CHAT_COMMANDS}>!`,
            ephemeral: true,
        });
    }

    await interaction.deferReply({ ephemeral: false });

    const db = loadXP();
    const user = getXPUser(db, interaction.user.id);
    const cd = checkCooldown(user, type);

    if (!cd.ok) {
        const remaining = formatRemaining(cd.remaining);
        const embed = new EmbedBuilder()
            .setTitle(`${emoji} Odměna ještě není připravena`)
            .setDescription(
                `⏳ Tuto odměnu můžeš vyzvednou **${COOLDOWN_LABELS[type].toLowerCase()}**.\n\n` +
                `⌛ Zbývá: **${remaining}**`
            )
            .setColor(0xFF6B00)
            .setTimestamp()
            .setFooter({ text: 'Xeloria XP Systém ⭐' });
        return interaction.editReply({ embeds: [embed] });
    }

    // Vygeneruj XP
    const gained = randomXP(minXP, maxXP);
    user.xp = (user.xp || 0) + gained;
    setCooldown(user, type);
    saveXP(db);

    const typeNames = {
        weekly: '📆 Týdenní odměna',
        tweekly: '🗓️ Dvoutýdenní odměna',
        monthly: '📊 Měsíční odměna',
        yearly: '🎖️ Roční odměna',
    };

    const embed = new EmbedBuilder()
        .setTitle(`${emoji} Odměna vyzvednutá!`)
        .setDescription(
            `🎉 Vyzvedl/a sis svou **${typeNames[type]}**!\n\n` +
            `⭐ Získané XP: **+${gained.toLocaleString('cs-CZ')} XP**\n` +
            `📈 Celkem XP: **${user.xp.toLocaleString('cs-CZ')} XP**\n\n` +
            `⏰ Příštní odměna: **${COOLDOWN_LABELS[type]}**`
        )
        .setColor(color)
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'Xeloria XP Systém ⭐ • Hodně štěstí!' });

    return interaction.editReply({ embeds: [embed] });
}

// ─── /weekly ───
const weekly = {
    data: new SlashCommandBuilder()
        .setName('weekly')
        .setDescription(`📆 Vyzvedni si týdenní XP odměnu • ${COOLDOWN_LABELS.weekly}`),
    async execute(interaction) {
        await handleReward(interaction, 'weekly', '📆', 0x5865F2, 100, 1500);
    },
};

// ─── /tweekly ───
const tweekly = {
    data: new SlashCommandBuilder()
        .setName('tweekly')
        .setDescription(`🗓️ Vyzvedni si dvoutýdenní XP odměnu • ${COOLDOWN_LABELS.tweekly}`),
    async execute(interaction) {
        await handleReward(interaction, 'tweekly', '🗓️', 0xEB459E, 200, 2500);
    },
};

// ─── /monthly ───
const monthly = {
    data: new SlashCommandBuilder()
        .setName('monthly')
        .setDescription(`📊 Vyzvedni si měsíční XP odměnu • ${COOLDOWN_LABELS.monthly}`),
    async execute(interaction) {
        await handleReward(interaction, 'monthly', '📊', 0xFEE75C, 500, 3500);
    },
};

// ─── /yearly ───
const yearly = {
    data: new SlashCommandBuilder()
        .setName('yearly')
        .setDescription(`🎖️ Vyzvedni si roční XP odměnu • ${COOLDOWN_LABELS.yearly}`),
    async execute(interaction) {
        await handleReward(interaction, 'yearly', '🎖️', 0xFF6B00, 1000, 4000);
    },
};

module.exports = [weekly, tweekly, monthly, yearly];
