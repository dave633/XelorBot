// ═══════════════════════════════════════════
// Modul: Giveaway systém
// ═══════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// messageId -> { prize, authorId, endTime, participants: [] }
const activeGiveaways = new Map();

function storeGiveaway(messageId, data) {
    activeGiveaways.set(messageId, data);
}

async function handleGiveawayButton(interaction) {
    const { customId, message, user } = interaction;
    if (customId !== 'giveaway_join') return;

    const giveaway = activeGiveaways.get(message.id);

    if (!giveaway) {
        return interaction.reply({ content: '❌ Tento giveaway již skončil nebo neexistuje.', ephemeral: true });
    }

    if (Date.now() > giveaway.endTime) {
        return interaction.reply({ content: '❌ Tento giveaway již skončil!', ephemeral: true });
    }

    const idx = giveaway.participants.indexOf(user.id);
    if (idx !== -1) {
        // Odhlásit se
        giveaway.participants.splice(idx, 1);
        await interaction.reply({ content: '↩️ Byl/a jsi ze giveaway odhlášen/a.', ephemeral: true });
    } else {
        // Přihlásit se
        giveaway.participants.push(user.id);
        await interaction.reply({ content: '🎊 Byl/a jsi přihlášen/a do giveaway! Hodně štěstí! 🍀', ephemeral: true });
    }

    // Aktualizovat počet účastníků v embedu
    const updatedEmbed = EmbedBuilder.from(message.embeds[0]);
    const newFields = message.embeds[0].fields.map(f => {
        if (f.name === '🎟️ Účastníci') {
            return { name: f.name, value: `**${giveaway.participants.length}** hráčů`, inline: true };
        }
        return { name: f.name, value: f.value, inline: f.inline ?? false };
    });
    updatedEmbed.setFields(newFields);
    await message.edit({ embeds: [updatedEmbed] });
}

function scheduleGiveaway(message, endTime, prize, guildId) {
    const delay = Math.max(endTime - Date.now(), 1000);

    setTimeout(async () => {
        const giveaway = activeGiveaways.get(message.id);
        if (!giveaway) return;
        activeGiveaways.delete(message.id);

        // Vyber vítěze
        let winnerText;
        let winnerMention = null;

        if (giveaway.participants.length === 0) {
            winnerText = '😔 Nikdo se nezapojil.';
        } else {
            const winnerId = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
            winnerMention = `<@${winnerId}>`;
            winnerText = `🏆 ${winnerMention}`;
        }

        // Upravit embed na "skončil"
        try {
            const endedEmbed = EmbedBuilder.from(message.embeds[0])
                .setTitle('🎊 GIVEAWAY – SKONČIL!')
                .setColor(0x808080)
                .setFields(
                    { name: '🎁 Cena', value: `**${prize}**`, inline: true },
                    { name: '👤 Autor', value: `<@${giveaway.authorId}>`, inline: true },
                    { name: '🎟️ Účastníci', value: `**${giveaway.participants.length}** hráčů`, inline: true },
                    { name: '🏆 Výherce', value: winnerText },
                )
                .setFooter({ text: 'Giveaway skončil' });

            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_join')
                    .setLabel('🎊 Giveaway skončil')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true),
            );

            await message.edit({ embeds: [endedEmbed], components: [disabledRow] });

            // Announce výherce v kanálu
            if (winnerMention) {
                await message.channel.send({
                    content: `🎊 Gratuluji ${winnerMention}! Vyhráváš **${prize}**! Kontaktuj administrátora pro převzetí výhry.`,
                });
            } else {
                await message.channel.send({ content: `😔 Giveaway pro **${prize}** skončil bez vítěze – nikdo se nezapojil.` });
            }
        } catch (err) {
            console.error('Giveaway – Chyba při ukončení:', err);
        }
    }, delay);
}

module.exports = { storeGiveaway, handleGiveawayButton, scheduleGiveaway };
