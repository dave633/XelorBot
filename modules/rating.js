// ═══════════════════════════════════════════
// Modul: Hodnocení (+rep / -rep)
// ═══════════════════════════════════════════

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

async function handleRating(message) {
    if (message.channel.id !== config.channels.HODNOCENI) return;
    if (message.author.bot) return;

    // Povolený formát: +rep @user důvod  NEBO  -rep @user důvod
    // Musí obsahovat: +rep/-rep, @mention, a důvod (neprázdný text za zmínkou)
    const repRegex = /^([+-]rep)\s+<@!?(\d+)>\s+(.+)/si;
    const match = message.content.match(repRegex);

    // Pokud zpráva NEODPOVÍDÁ formátu → smazat zprávu + timeout 1h
    if (!match) {
        try { await message.delete(); } catch { }

        // Timeout na 1 hodinu (60 * 60 * 1000 = 3600000 ms)
        try {
            const member = message.member || await message.guild.members.fetch(message.author.id);
            await member.timeout(60 * 60 * 1000, 'Špatný formát hodnocení – chybí +rep/-rep, @zmínka nebo důvod.');

            // Poslat DM uživateli s informací
            try {
                await message.author.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('⚠️ Timeout – Špatný formát hodnocení')
                            .setDescription(
                                'Dostal/a jsi timeout na **1 hodinu**, protože tvoje zpráva v kanálu hodnocení neodpovídala správnému formátu.\n\n' +
                                '**Správný formát:**\n' +
                                '```\n+rep @uživatel důvod\n-rep @uživatel důvod\n```\n\n' +
                                '**Příklad:**\n' +
                                '`+rep @Matěj Skvělý hráč, pomohl mi s questem!`\n' +
                                '`-rep @Matěj Toxický, nadával v chatu.`'
                            )
                            .setColor(0xFF0000)
                            .setTimestamp()
                            .setFooter({ text: 'Xeloria Hodnocení' })
                    ]
                });
            } catch {
                // Uživatel má zavřené DMs – ignorovat
            }
        } catch (err) {
            console.error('Chyba při timeoutu uživatele:', err);
        }

        return;
    }

    const type = match[1].toLowerCase(); // "+rep" nebo "-rep"
    const targetId = match[2];
    const reason = match[3].trim();

    // Nemůžeš hodnotit sám sebe
    if (targetId === message.author.id) {
        const errorMsg = await message.channel.send({
            content: '❌ Nemůžeš hodnotit sám sebe!'
        });
        setTimeout(() => errorMsg.delete().catch(() => { }), 5000);
        try { await message.delete(); } catch { }
        return;
    }

    // Smazat původní zprávu
    try { await message.delete(); } catch { }

    // Barva a ikona podle typu
    const isPositive = type === '+rep';
    const color = isPositive ? 0x00FF00 : 0xFF0000;
    const icon = isPositive ? '👍' : '👎';
    const typeLabel = isPositive ? '+REP' : '-REP';

    const embed = new EmbedBuilder()
        .setTitle(`${icon} Hodnocení – ${typeLabel}`)
        .addFields(
            { name: '👤 Hodnotitel', value: `<@${message.author.id}>`, inline: true },
            { name: '🎯 Hodnocený', value: `<@${targetId}>`, inline: true },
            { name: '📝 Důvod', value: reason },
        )
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: 'Xeloria Hodnocení' });

    const sentMsg = await message.channel.send({ embeds: [embed] });

    // Vytvořit vlákno automaticky
    try {
        const threadName = `${typeLabel} – ${message.author.username}`;
        await sentMsg.startThread({
            name: threadName,
            autoArchiveDuration: 1440, // 24 hodin
        });
    } catch (err) {
        console.error('Chyba při vytváření vlákna:', err);
    }
}

module.exports = { handleRating };
