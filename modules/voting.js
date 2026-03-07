// ═══════════════════════════════════════════
// Modul: Hlasování (Ano / Ne)
// ═══════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');

// messageId -> { ano: Set<userId>, ne: Set<userId> }
const voteTracker = new Map();

async function handleVoteButton(interaction) {
    const { customId, message, user } = interaction;

    const msgId = message.id;

    if (!voteTracker.has(msgId)) {
        voteTracker.set(msgId, { ano: new Set(), ne: new Set() });
    }

    const v = voteTracker.get(msgId);
    const isAno = customId === 'vote_ano';
    const thisSide = isAno ? 'ano' : 'ne';
    const otherSide = isAno ? 'ne' : 'ano';

    if (v[thisSide].has(user.id)) {
        // Odvolat hlas
        v[thisSide].delete(user.id);
        await interaction.reply({ content: '↩️ Tvůj hlas byl odvolán.', ephemeral: true });
    } else {
        // Přepnout hlas (odebrat z druhé strany pokud tam byl)
        v[otherSide].delete(user.id);
        v[thisSide].add(user.id);
        await interaction.reply({
            content: isAno ? '✅ Hlasoval/a jsi **PRO**!' : '❌ Hlasoval/a jsi **PROTI**!',
            ephemeral: true,
        });
    }

    // Aktualizovat embed s počty
    const total = v.ano.size + v.ne.size;
    const anoBar = total > 0 ? Math.round((v.ano.size / total) * 10) : 0;
    const neBar = total > 0 ? Math.round((v.ne.size / total) * 10) : 0;
    const anoPercent = total > 0 ? Math.round((v.ano.size / total) * 100) : 0;
    const nePercent = total > 0 ? Math.round((v.ne.size / total) * 100) : 0;

    const anoProgress = '🟩'.repeat(anoBar) + '⬛'.repeat(10 - anoBar);
    const neProgress = '🟥'.repeat(neBar) + '⬛'.repeat(10 - neBar);

    const updatedEmbed = EmbedBuilder.from(message.embeds[0]).setFields(
        { name: '✅ Pro', value: `${anoProgress}\n**${v.ano.size} hlasů** (${anoPercent}%)`, inline: true },
        { name: '❌ Proti', value: `${neProgress}\n**${v.ne.size} hlasů** (${nePercent}%)`, inline: true },
        { name: '📊 Celkem', value: `**${total} hlasů**`, inline: true },
    );

    await message.edit({ embeds: [updatedEmbed] });
}

module.exports = { handleVoteButton };
