// ═══════════════════════════════════════════
// Příkazy: Moderace – /warn, /mute, /tban, /dm
// ═══════════════════════════════════════════

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const { addWarn, applyMute, removeMute, applyTempBan, removeBan, parseDuration, formatDuration } = require('../modules/moderation');

// Pomocná funkce pro kontrolu oprávnění (Staff)
function isStaff(member) {
    return config.staffRoles.some(roleId => member.roles.cache.has(roleId)) ||
        config.adminRoles.some(roleId => member.roles.cache.has(roleId)) ||
        member.permissions.has(PermissionFlagsBits.Administrator);
}

// ─── /warn ───
const warnCommand = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('⚠ Udělit varování hráči')
        .addUserOption(opt => opt.setName('hrac').setDescription('Hráč, kterému chceš udělit varování').setRequired(true))
        .addStringOption(opt => opt.setName('duvod').setDescription('Důvod varování').setRequired(true)),
    async execute(interaction) {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Na tento příkaz nemáš dostatečná oprávnění!', ephemeral: true });
        }

        const target = interaction.options.getUser('hrac');
        const reason = interaction.options.getString('duvod');

        const userWarns = await addWarn(interaction.guild, target.id, reason, interaction.user.id);

        const embed = new EmbedBuilder()
            .setTitle('✅ Varování uděleno')
            .setDescription(`Hráč <@${target.id}> byl varován.`)
            .addFields(
                { name: '📌 Důvod', value: reason },
                { name: '🔢 Celkem varování', value: `${userWarns}` }
            )
            .setColor(0xFFAA00)
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
};

// ─── /mute ───
const muteCommand = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('🔇 Umlčet hráče (Timeout)')
        .addUserOption(opt => opt.setName('hrac').setDescription('Hráč, kterého chceš umlčet').setRequired(true))
        .addStringOption(opt => opt.setName('trvani').setDescription('Trvání (např. 1h, 4h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('duvod').setDescription('Důvod umlčení').setRequired(true)),
    async execute(interaction) {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Na tento příkaz nemáš dostatečná oprávnění!', ephemeral: true });
        }

        const target = interaction.options.getUser('hrac');
        const durationStr = interaction.options.getString('trvani');
        const reason = interaction.options.getString('duvod');

        const durationMs = parseDuration(durationStr);
        if (!durationMs) {
            return interaction.reply({ content: '❌ Neplatný formát času! Použij např. `30m`, `1h`, `4h`, `1d`.', ephemeral: true });
        }

        const success = await applyMute(interaction.guild, target.id, durationMs, reason, interaction.user.id);

        if (success) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Mute udělen')
                .setDescription(`Hráč <@${target.id}> byl umlčen na **${formatDuration(durationMs)}**.`)
                .addFields({ name: '📌 Důvod', value: reason })
                .setColor(0xFF0000)
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply({ content: '❌ Nepodařilo se udělit mute (hráč možná není na serveru nebo má vyšší roli).', ephemeral: true });
        }
    }
};

// ─── /tban ───
const tbanCommand = {
    data: new SlashCommandBuilder()
        .setName('tban')
        .setDescription('🚫 Udělit dočasný ban hráči')
        .addUserOption(opt => opt.setName('hrac').setDescription('Hráč, kterému chceš dát ban').setRequired(true))
        .addStringOption(opt => opt.setName('trvani').setDescription('Trvání (např. 1h, 1d, 7d)').setRequired(true))
        .addStringOption(opt => opt.setName('duvod').setDescription('Důvod banu').setRequired(true)),
    async execute(interaction) {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Na tento příkaz nemáš dostatečná oprávnění!', ephemeral: true });
        }

        const target = interaction.options.getUser('hrac');
        const durationStr = interaction.options.getString('trvani');
        const reason = interaction.options.getString('duvod');

        const durationMs = parseDuration(durationStr);
        if (!durationMs) {
            return interaction.reply({ content: '❌ Neplatný formát času! Použij např. `1h`, `12h`, `1d`, `7d`.', ephemeral: true });
        }

        const success = await applyTempBan(interaction.guild, target.id, durationMs, reason, interaction.user.id);

        if (success) {
            const embed = new EmbedBuilder()
                .setTitle('✅ Dočasný ban udělen')
                .setDescription(`Hráč <@${target.id}> dostal ban na **${formatDuration(durationMs)}**.`)
                .addFields({ name: '📌 Důvod', value: reason })
                .setColor(0x000000)
                .setTimestamp();
            return interaction.reply({ embeds: [embed] });
        } else {
            return interaction.reply({ content: '❌ Nepodařilo se udělit ban (zkontroluj práva bota).', ephemeral: true });
        }
    }
};

// ─── /dm ───
const dmCommand = {
    data: new SlashCommandBuilder()
        .setName('dm')
        .setDescription('✉ Poslat soukromou zprávu hráči jménem bota')
        .addUserOption(opt => opt.setName('hrac').setDescription('Příjemce zprávy').setRequired(true))
        .addStringOption(opt => opt.setName('zprava').setDescription('Text zprávy').setRequired(true)),
    async execute(interaction) {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Na tento příkaz nemáš dostatečná oprávnění!', ephemeral: true });
        }

        const target = interaction.options.getUser('hrac');
        const text = interaction.options.getString('zprava');

        try {
            const dmEmbed = new EmbedBuilder()
                .setTitle('✉ Zpráva od vedení serveru')
                .setDescription(text)
                .setColor(0x3498DB)
                .setTimestamp()
                .setFooter({ text: `Odesláno z: ${interaction.guild.name}` });

            await target.send({ embeds: [dmEmbed] });

            return interaction.reply({ content: `✅ Zpráva byla úspěšně odeslána uživateli **${target.tag}**.`, ephemeral: true });
        } catch (err) {
            return interaction.reply({ content: `❌ Nepodařilo se odeslat zprávu (uživatel má pravděpodobně vypnuté DM nebo si bota zablokoval).`, ephemeral: true });
        }
    }
};

// ─── /ban (Permanent) ───
const banCommand = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('🚫 Udělit trvalý ban hráči')
        .addUserOption(opt => opt.setName('hrac').setDescription('Hráč, kterému chceš dát ban').setRequired(true))
        .addStringOption(opt => opt.setName('duvod').setDescription('Důvod banu').setRequired(true)),
    async execute(interaction) {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Na tento příkaz nemáš dostatečná oprávnění!', ephemeral: true });
        }

        const target = interaction.options.getUser('hrac');
        const reason = interaction.options.getString('duvod');

        try {
            await interaction.guild.members.ban(target.id, { reason: `Permanent (${interaction.user.id}): ${reason}` });

            const embed = new EmbedBuilder()
                .setTitle('✅ Trvalý ban udělen')
                .setDescription(`Hráč <@${target.id}> dostal trvalý ban.`)
                .addFields({ name: '📌 Důvod', value: reason })
                .setColor(0x000000)
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        } catch (err) {
            return interaction.reply({ content: '❌ Nepodařilo se udělit ban (zkontroluj práva bota).', ephemeral: true });
        }
    }
};

// ─── /unmute ───
const unmuteCommand = {
    data: new SlashCommandBuilder()
        .setName('unmute')
        .setDescription('🔊 Zrušit umlčení (timeout) hráči')
        .addUserOption(opt => opt.setName('hrac').setDescription('Hráč, kterému chceš zrušit mute').setRequired(true)),
    async execute(interaction) {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Na tento příkaz nemáš dostatečná oprávnění!', ephemeral: true });
        }

        const target = interaction.options.getUser('hrac');
        const success = await removeMute(interaction.guild, target.id, interaction.user.id);

        if (success) {
            return interaction.reply({ content: `✅ Hráč <@${target.id}> byl odmlčen.`, ephemeral: true });
        } else {
            return interaction.reply({ content: `❌ Nepodařilo se zrušit mute (hráč možná není na serveru).`, ephemeral: true });
        }
    }
};

// ─── /unban ───
const unbanCommand = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('🔓 Odbanovat hráče')
        .addStringOption(opt => opt.setName('id').setDescription('ID uživatele, kterého chceš odbanovat').setRequired(true)),
    async execute(interaction) {
        if (!isStaff(interaction.member)) {
            return interaction.reply({ content: '❌ Na tento příkaz nemáš dostatečná oprávnění!', ephemeral: true });
        }

        const targetId = interaction.options.getString('id');
        const success = await removeBan(interaction.guild, targetId, interaction.user.id);

        if (success) {
            return interaction.reply({ content: `✅ Uživatel s ID \`${targetId}\` byl odbanován.`, ephemeral: true });
        } else {
            return interaction.reply({ content: `❌ Nepodařilo se odbanovat uživatele (zkontroluj ID nebo práva bota).`, ephemeral: true });
        }
    }
};

module.exports = [warnCommand, muteCommand, tbanCommand, banCommand, unmuteCommand, unbanCommand, dmCommand];
