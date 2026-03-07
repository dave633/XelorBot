// ═══════════════════════════════════════════
// Modul: Pravidla (CZ/SK/EN + ověření)
// ═══════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');

const rulesData = {
    cs: {
        title: '📜 PRAVIDLA SERVERU XELORIA',
        fields: [
            { name: '1️⃣ Respekt a slušnost', value: '• Chovejte se k ostatním hráčům s respektem\n• Žádné urážky, nadávky nebo toxic behavior\n• Diskriminace na základě rasy, náboženství nebo pohlaví je přísně zakázána' },
            { name: '2️⃣ Žádný spam', value: '• Nespamujte v chatech\n• Nereklamujte jiné servery bez povolení\n• Neposílejte zbytečné nebo opakující se zprávy' },
            { name: '3️⃣ Žádné podvádění', value: '• X-Ray, fly hacky a jiné cheaty jsou zakázány\n• Využívání bugů pro vlastní prospěch je zakázáno\n• Používání nepovolených modifikací je zakázáno' },
            { name: '4️⃣ Ochrana účtu', value: '• Nesdílejte své heslo s nikým\n• Nespouštějte podezřelé soubory nebo linky\n• Chraňte svůj účet před hackováním' },
            { name: '5️⃣ Stavby a griefing', value: '• Griefing (ničení staveb) je přísně zakázán\n• Nekraďte ostatním hráčům\n• Stavějte pouze na povolených místech' },
            { name: '6️⃣ Komunikace', value: '• Používejte češtinu nebo slovenštinu\n• Nepoužívejte caps lock (velká písmena)\n• Nepoužívejte vulgární výrazy příliš často' },
            { name: '7️⃣ Chovejte se láskyplně', value: '• Pomáhejte novým hráčům\n• Buďte pozitivní a přátelští\n• Vytvářejte příjemnou komunitu' },
        ],
        penalties: '🔴 **Tresty za porušení pravidel:**\n⚠️ První porušení: Varování\n⚠️ Druhé porušení: Mute/Kick\n⚠️ Třetí porušení: Dočasný ban (1-7 dní)\n⚠️ Čtvrté porušení: Permanentní ban',
        severe: '🚨 **Závažné porušení (okamžitý permanentní ban):**\n• Cheaty a hacky | DDoS hrozby\n• Závažné urážky a diskriminace\n• Sdílení osobních údajů ostatních hráčů',
        report: '✅ **Porušení pravidel nahlašujte:**\n• Kontaktujte A-Team nebo Adminy pomocí ticketu\n• Nahlášení musí obsahovat důkazy (screenshot/video)\n*(Nahlášení člena AT, co se netýká serveru, nehlaste, hrozí trest)*',
        accept: '🎉 **Klikni na ✅ níže pro přijetí pravidel a získání přístupu na server!**',
    },
    sk: {
        title: '📜 PRAVIDLÁ SERVERU XELORIA',
        fields: [
            { name: '1️⃣ Rešpekt a slušnosť', value: '• Správajte sa k ostatným hráčom s rešpektom\n• Žiadne urážky, nadávky alebo toxic behavior\n• Diskriminácia na základe rasy, náboženstva alebo pohlavia je prísne zakázaná' },
            { name: '2️⃣ Žiadny spam', value: '• Nespamujte v chatoch\n• Nereklamujte iné servery bez povolenia\n• Neposielajte zbytočné alebo opakujúce sa správy' },
            { name: '3️⃣ Žiadne podvádzanie', value: '• X-Ray, fly hacky a iné cheaty sú zakázané\n• Využívanie bugov pre vlastný prospech je zakázané\n• Používanie nepovolených modifikácií je zakázané' },
            { name: '4️⃣ Ochrana účtu', value: '• Nezdieľajte svoje heslo s nikým\n• Nespúšťajte podozrivé súbory alebo linky\n• Chráňte svoj účet pred hackovaním' },
            { name: '5️⃣ Stavby a griefing', value: '• Griefing (ničenie stavieb) je prísne zakázaný\n• Nekraďte ostatným hráčom\n• Stavajte iba na povolených miestach' },
            { name: '6️⃣ Komunikácia', value: '• Používajte češtinu alebo slovenčinu\n• Nepoužívajte caps lock (veľké písmená)\n• Nepoužívajte vulgárne výrazy príliš často' },
            { name: '7️⃣ Tvárte sa láskavo', value: '• Pomáhajte novým hráčom\n• Buďte pozitívni a priateľskí\n• Vytvárajte príjemnú komunitu' },
        ],
        penalties: '🔴 **Tresty za porušenie pravidiel:**\n⚠️ Prvé porušenie: Varovanie\n⚠️ Druhé porušenie: Mute/Kick\n⚠️ Tretie porušenie: Dočasný ban (1-7 dní)\n⚠️ Štvrté porušenie: Permanentní ban',
        severe: '🚨 **Závažné porušenie (okamžitý permanentný ban):**\n• Cheaty a hacky | DDoS hrozby\n• Závažné urážky a diskriminácia\n• Zdieľanie osobných údajov ostatných hráčov',
        report: '✅ **Porušenie pravidiel nahlasujte:**\n• Kontaktujte A-Team alebo Adminov pomocou ticketu\n• Nahlášenie musí obsahovať dôkazy (screenshot/video)\n*(Nahlášenie člena AT, čo sa netýka serveru, nehláste, hrozí trest)*',
        accept: '🎉 **Kliknite na ✅ nižšie pre prijatie pravidiel a získanie prístupu na server!**',
    },
    en: {
        title: '📜 XELORIA SERVER RULES',
        fields: [
            { name: '1️⃣ Respect & Decency', value: '• Treat other players with respect\n• No insults, profanity or toxic behavior\n• Discrimination based on race, religion or gender is strictly prohibited' },
            { name: '2️⃣ No Spam', value: '• Don\'t spam in chats\n• Don\'t advertise other servers without permission\n• Don\'t send unnecessary or repetitive messages' },
            { name: '3️⃣ No Cheating', value: '• X-Ray, fly hacks and other cheats are banned\n• Exploiting bugs for personal gain is prohibited\n• Using unauthorized modifications is prohibited' },
            { name: '4️⃣ Account Protection', value: '• Don\'t share your password with anyone\n• Don\'t run suspicious files or links\n• Protect your account from hacking' },
            { name: '5️⃣ Building & Griefing', value: '• Griefing (destroying builds) is strictly prohibited\n• Don\'t steal from other players\n• Build only in permitted areas' },
            { name: '6️⃣ Communication', value: '• Use Czech or Slovak language\n• Don\'t use caps lock\n• Don\'t use vulgar expressions too often' },
            { name: '7️⃣ Be Kind', value: '• Help new players\n• Be positive and friendly\n• Create a pleasant community' },
        ],
        penalties: '🔴 **Penalties for rule violations:**\n⚠️ First offense: Warning\n⚠️ Second offense: Mute/Kick\n⚠️ Third offense: Temporary ban (1-7 days)\n⚠️ Fourth offense: Permanent ban',
        severe: '🚨 **Severe violations (instant permanent ban):**\n• Cheats and hacks | DDoS threats\n• Severe insults and discrimination\n• Sharing personal data of other players',
        report: '✅ **Report rule violations:**\n• Contact A-Team or Admins via ticket\n• Reports must include evidence (screenshot/video)\n*(Reports about AT members unrelated to the server are not accepted)*',
        accept: '🎉 **Click ✅ below to accept the rules and gain access to the server!**',
    },
};

function buildRulesEmbed(lang = 'cs') {
    const data = rulesData[lang];
    const embed = new EmbedBuilder()
        .setTitle(data.title)
        .addFields(data.fields)
        .setDescription(`${data.penalties}\n\n${data.severe}\n\n${data.report}\n\n${data.accept}`)
        .setColor(0x5865F2)
        .setTimestamp()
        .setFooter({ text: 'Xeloria – Vyberte si jazyk / Choose your language' });
    return embed;
}

function createRulesButtons() {
    const langRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rules_lang_cs').setLabel('Čeština').setEmoji('🇨🇿').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rules_lang_sk').setLabel('Slovenčina').setEmoji('🇸🇰').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('rules_lang_en').setLabel('English').setEmoji('🇬🇧').setStyle(ButtonStyle.Secondary),
    );
    const acceptRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rules_accept').setLabel('Souhlasím s pravidly').setEmoji('✅').setStyle(ButtonStyle.Success),
    );
    return [langRow, acceptRow];
}

async function sendRulesPanel(channel) {
    await channel.send({
        embeds: [buildRulesEmbed('cs')],
        components: createRulesButtons(),
    });
}

async function handleRulesButton(interaction) {
    if (interaction.customId.startsWith('rules_lang_')) {
        const lang = interaction.customId.replace('rules_lang_', '');
        await interaction.update({
            embeds: [buildRulesEmbed(lang)],
            components: createRulesButtons(),
        });
    } else if (interaction.customId === 'rules_accept') {
        const member = interaction.member;
        const verifiedRoleId = config.roles.OVERENY;
        const unverifiedRoleId = config.roles.NEOVERENY;

        if (member.roles.cache.has(verifiedRoleId)) {
            await interaction.reply({ content: '✅ Už máš pravidla přijatá!', ephemeral: true });
            return;
        }

        try {
            // Přidat ověřenou roli
            await member.roles.add(verifiedRoleId);

            // Odebrat neověřenou roli (pokud ji má)
            if (member.roles.cache.has(unverifiedRoleId)) {
                await member.roles.remove(unverifiedRoleId);
            }

            await interaction.reply({ content: '✅ Pravidla přijata! Nyní máš přístup na server. 🎉', ephemeral: true });

            // Poslat DM uživateli
            try {
                await interaction.user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('✅ Ověření úspěšné')
                            .setDescription('Úspěšně jsi se ověřil! Nyní máš plný přístup na server **Xeloria**. 🎉')
                            .setColor(0x00FF00)
                            .setTimestamp()
                            .setFooter({ text: 'Xeloria' })
                    ]
                });
            } catch {
                // Uživatel má zavřené DMs – ignorovat
            }

            // Log do verify log kanálu
            try {
                const logChannel = interaction.guild.channels.cache.get(config.channels.VERIFY_LOG);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('✅ Hráč se ověřil')
                        .addFields(
                            { name: '👤 Hráč', value: `<@${member.id}> (${member.user.tag})`, inline: true },
                            { name: '🆔 ID', value: member.id, inline: true },
                        )
                        .setColor(0x00FF00)
                        .setTimestamp()
                        .setFooter({ text: 'Xeloria Verify Log' });
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (err) {
                console.error('Chyba při logování ověření:', err);
            }
        } catch (err) {
            console.error('Chyba při přidávání role:', err);
            await interaction.reply({ content: '❌ Nepodařilo se přidat roli. Kontaktuj admina.', ephemeral: true });
        }
    }
}

module.exports = { sendRulesPanel, handleRulesButton, buildRulesEmbed, createRulesButtons };
