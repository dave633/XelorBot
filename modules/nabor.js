// ═══════════════════════════════════════════
// Modul: Nábor systém (Recruitment)
// ═══════════════════════════════════════════

const {
    EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    ButtonBuilder, ButtonStyle, ComponentType
} = require('discord.js');
const config = require('../config');

// ═══ KONFIGURACE POZIC ═══
const naborPositions = {
    technik: {
        label: '💻 Technik',
        emoji: '💻',
        color: 0x00CEC9,
        description: 'Technický specialista, který se stará o servery, pluginy a konfiguraci.',
        requirements: [
            '🔞 Věk: **13+**',
            '🕐 Aktivita: min. **2 hodiny denně**',
            '💻 Zkušenosti s pluginy a konfigurací serverů',
            '🧠 Schopnost řešit technické problémy',
            '🤝 Týmový hráč a dobrá komunikace',
        ],
        benefits: [
            '⭐ Exkluzivní **Technik** role',
            '🔧 Přístup ke správě serveru',
            '🎮 Možnost ovlivnit budoucnost serveru',
            '👥 Být součástí skvělého týmu',
            '🏆 Uznání komunity',
        ],
        questions: [
            'Kolik ti je let?',
            'Jak tě máme nazývat?',
            'Jak dlouho hraješ Minecraft?',
            'Máš zkušenosti se správou Minecraft serverů? Pokud ano, jaké?',
            'Jaké pluginy/mody znáš a umíš konfigurovat? (např. WorldGuard, EssentialsX, LuckPerms...)',
            'Umíš pracovat s databázemi (MySQL, SQLite)? Pokud ano, na jaké úrovni?',
            'Dokážeš diagnostikovat a opravit lag na serveru? Jak bys postupoval/a?',
            'Máš zkušenosti s nastavováním permission systémů? Jaký nástroj preferuješ?',
            'Jak bys řešil/a situaci, kdy se na serveru vyskytne kritický bug a nikdo jiný z AT není online?',
            'Kolik hodin týdně bys mohl/a serveru věnovat?',
            'Pracoval/a jsi někdy v admin týmu na jiném serveru? Pokud ano, na jakém a jakou jsi měl/a pozici?',
            'Proč se hlásíš právě na pozici Technik a ne na jinou?',
            'Jak bys optimalizoval/a výkon serveru s 50+ hráči online?',
            'Umíš psát skripty nebo pluginy? V jakém jazyce? (Java, Skript, atd.)',
            'Máš něco dalšího, co bys nám chtěl/a říct nebo ukázat? (portfolio, reference...)',
        ],
    },
    builder: {
        label: '🔨 Builder',
        emoji: '🔨',
        color: 0xE17055,
        description: 'Kreativní stavitel, který vytváří úžasné stavby a mapy pro server.',
        requirements: [
            '🔞 Věk: **13+**',
            '🕐 Aktivita: min. **2 hodiny denně**',
            '🏗️ Zkušenosti se stavěním v Minecraftu',
            '🎨 Kreativní myšlení a smysl pro detail',
            '🤝 Schopnost pracovat v týmu na velkých projektech',
        ],
        benefits: [
            '⭐ Exkluzivní **Builder** role',
            '🌍 Kreativní svoboda při stavění',
            '🗺️ Tvořit mapy, které uvidí stovky hráčů',
            '👥 Být součástí kreativního týmu',
            '🏆 Tvoje stavby budou viděny celou komunitou',
        ],
        questions: [
            'Kolik ti je let?',
            'Jak tě máme nazývat?',
            'Jak dlouho se věnuješ stavění v Minecraftu?',
            'Jaký styl stavění preferuješ? (středověk, moderní, fantasy, organika...)',
            'Máš zkušenosti se stavěním na jiných serverech? Pokud ano, na jakých?',
            'Používáš WorldEdit nebo jiné stavební nástroje? Jaké a jak pokročile?',
            'Umíš pracovat s terraformingem (úprava terénu)?',
            'Jak velký projekt jsi dosud postavil/a? Popiš ho.',
            'Dokážeš stavět podle zadání/referencí, nebo preferuješ vlastní kreativitu?',
            'Kolik hodin týdně bys mohl/a věnovat stavění pro server?',
            'Jak bys přistoupil/a ke stavbě spawn oblasti pro 200+ hráčů?',
            'Máš portfolio svých staveb? Pokud ano, pošli odkaz nebo screenshoty.',
            'Umíš pracovat s detaily jako interiéry, osvětlení a landscaping?',
            'Jak bys reagoval/a, kdyby se vedení rozhodlo tvoji stavbu výrazně předělat?',
            'Máš něco dalšího, co bys nám chtěl/a říct nebo ukázat?',
        ],
    },
    helper: {
        label: '🛡️ Helper',
        emoji: '🛡️',
        color: 0x00B894,
        description: 'Pomocník komunity, který pomáhá hráčům a udržuje pořádek na serveru.',
        requirements: [
            '🔞 Věk: **13+**',
            '🕐 Aktivita: min. **2 hodiny denně**',
            '💬 Dobrá komunikace a trpělivost',
            '📚 Znalost pravidel serveru',
            '🤝 Přátelský přístup k hráčům',
        ],
        benefits: [
            '⭐ Exkluzivní **Helper** role',
            '🔇 Pravomoc mutovat hráče',
            '📢 Přístup do staff kanálů',
            '👥 Být součástí Admin Teamu',
            '📈 Možnost povýšení na vyšší pozice',
        ],
        questions: [
            'Kolik ti je let?',
            'Jak tě máme nazývat?',
            'Jak dlouho hraješ na našem serveru?',
            'Proč se hlásíš na pozici Helper? Co tě motivuje pomáhat ostatním?',
            'Jak bys řešil/a situaci, kdy se dva hráči hádají v chatu?',
            'Hráč tě požádá o pomoc, ale ty odpověď neznáš. Co uděláš?',
            'Jak bys reagoval/a na hráče, který opakovaně porušuje pravidla, ale je to kamarád?',
            'Máš zkušenosti s moderováním na jiných serverech? (Discord/Minecraft)',
            'Kolik hodin denně jsi aktivní na serveru?',
            'Jaké jsou podle tebe nejdůležitější vlastnosti dobrého Helpera?',
            'Jak bys přivítal/a nového hráče, který se na serveru vůbec nevyzná?',
            'Hráč tvrdí, že byl nesprávně potrestán. Jak bys situaci vyřešil/a?',
            'Jak bys řešil/a hráče, který spamuje nebo toxicky komunikuje?',
            'Znáš naše pravidla serveru? Vyjmenuj alespoň 3 důležitá.',
            'Máš něco dalšího, co bys nám chtěl/a říct?',
        ],
    },
    eventer: {
        label: '🎉 Eventer',
        emoji: '🎉',
        color: 0xFDCB6E,
        description: 'Organizátor eventů a soutěží, který přináší zábavu na server.',
        requirements: [
            '🔞 Věk: **13+**',
            '🕐 Aktivita: min. **2 hodiny denně**',
            '🎯 Kreativní nápady na eventy',
            '📋 Organizační schopnosti',
            '🎤 Schopnost motivovat a bavit hráče',
        ],
        benefits: [
            '⭐ Exkluzivní **Eventer** role',
            '🎮 Tvořit vlastní eventy a soutěže',
            '🏆 Rozdávat odměny hráčům',
            '👥 Být součástí event týmu',
            '🎯 Kreativní svoboda při plánování',
        ],
        questions: [
            'Kolik ti je let?',
            'Jak tě máme nazývat?',
            'Jak dlouho hraješ Minecraft a účastnil/a ses eventů na jiných serverech?',
            'Jaký typ eventu bys jako první uspořádal/a na našem serveru? Popiš ho detailně.',
            'Jak bys motivoval/a hráče, aby se eventu zúčastnili?',
            'Kolik hráčů bys dokázal/a najednou koordinovat během eventu?',
            'Jak bys řešil/a situaci, kdy se eventu přihlásí příliš málo hráčů?',
            'Máš zkušenosti s organizováním eventů na jiných serverech/platformách?',
            'Jak bys zajistil/a, že event bude férový pro všechny hráče?',
            'Kolik hodin týdně bys mohl/a věnovat přípravě a organizaci eventů?',
            'Vymysli na místě 3 originální nápady na eventy pro náš server.',
            'Jak bys řešil/a technický problém uprostřed probíhajícího eventu?',
            'Jak bys komunikoval/a pravidla eventu hráčům, aby je všichni pochopili?',
            'Dokážeš pracovat pod tlakem, když se něco během eventu pokazí?',
            'Jak bys propagoval/a nadcházející event, aby se o něm dozvědělo co nejvíce hráčů?',
            'Máš něco dalšího, co bys nám chtěl/a říct nebo ukázat?',
        ],
    },
    partnership: {
        label: '🤝 Partnership Mod',
        emoji: '🤝',
        color: 0x6C5CE7,
        description: 'Správce partnerství a spolupráce s dalšími servery a komunitami.',
        requirements: [
            '🔞 Věk: **13+**',
            '🕐 Aktivita: min. **2 hodiny denně**',
            '💬 Výborné komunikační schopnosti',
            '📊 Zkušenosti s networkingem a marketingem',
            '🌐 Přehled o Minecraft komunitě',
        ],
        benefits: [
            '⭐ Exkluzivní **Partnership Mod** role',
            '🌍 Navazovat spolupráce s jinými servery',
            '📈 Pomáhat s růstem komunity',
            '👥 Být součástí vedení serveru',
            '🤝 Budovat síť partnerství',
        ],
        questions: [
            'Kolik ti je let?',
            'Jak tě máme nazývat?',
            'Jaké máš zkušenosti s navazováním partnerství nebo spolupráce?',
            'Jak bys oslovil/a jiný server s nabídkou partnerství? Napiš ukázkovou zprávu.',
            'Podle čeho bys vybíral/a servery pro partnerství? Jaká kritéria jsou pro tebe důležitá?',
            'Jak bys řešil/a situaci, kdy partnerský server porušuje podmínky spolupráce?',
            'Kolik hodin týdně bys mohl/a věnovat správě partnerství?',
            'Máš kontakty na jiné Minecraft servery nebo komunity?',
            'Jak bys propagoval/a náš server na sociálních sítích nebo v komunitách?',
            'Jak by podle tebe měla vypadat ideální partnerská spolupráce?',
            'Máš něco dalšího, co bys nám chtěl/a říct?',
        ],
    },
};

// ═══ PANEL: Odeslání nábor panelu ═══
async function sendNaborPanel(channel) {
    // Hlavní embed
    const mainEmbed = new EmbedBuilder()
        .setTitle('📋 NÁBOR DO ADMIN TEAMU')
        .setDescription(
            '**Chceš se stát součástí týmu Xeloria?**\n\n' +
            'Vyber si pozici, která tě zajímá, a pošleme ti přihlášku do DM!\n\n' +
            '⚠️ **Požadavky pro všechny pozice:**\n' +
            '> 🔞 Minimální věk: **13 let**\n' +
            '> 💬 Dobrá komunikace\n' +
            '> ⏰ Pravidelná aktivita\n\n' +
            '**Dostupné pozice:**\n' +
            '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
        )
        .setColor(0x5865F2)
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3135/3135768.png')
        .setFooter({ text: 'Xeloria Nábor Systém • Vyber pozici z menu níže' })
        .setTimestamp();

    // Embedy pro jednotlivé pozice
    const positionEmbeds = Object.entries(naborPositions).map(([key, pos]) => {
        return new EmbedBuilder()
            .setTitle(`${pos.emoji} ${pos.label.replace(pos.emoji + ' ', '')}`)
            .setDescription(pos.description)
            .addFields(
                {
                    name: '📌 Požadavky',
                    value: pos.requirements.join('\n'),
                    inline: false,
                },
                {
                    name: '🎁 Výhody',
                    value: pos.benefits.join('\n'),
                    inline: false,
                },
            )
            .setColor(pos.color);
    });

    // Select menu
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('nabor_apply')
        .setPlaceholder('🎯 Vyber pozici, na kterou se chceš hlásit...')
        .addOptions(
            Object.entries(naborPositions).map(([key, pos]) => ({
                label: pos.label.replace(pos.emoji + ' ', ''),
                value: key,
                description: pos.description.substring(0, 100),
                emoji: pos.emoji,
            }))
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    // Odeslat hlavní embed + pozice + select menu
    await channel.send({ embeds: [mainEmbed, ...positionEmbeds], components: [row] });
}

// ═══ HANDLER: Zpracování výběru pozice (DM dotazník) ═══
async function handleNaborApply(interaction) {
    const positionKey = interaction.values[0];
    const position = naborPositions[positionKey];
    const user = interaction.user;
    const guild = interaction.guild;

    if (!position) {
        return interaction.reply({ content: '❌ Neplatná pozice!', ephemeral: true });
    }

    // Informovat uživatele
    await interaction.reply({
        content: `📬 **Zkontroluj své DM!** Posíláme ti přihlášku na pozici **${position.label}**.\n*Pokud ti DM nepřišlo, povol si zprávy od členů serveru.*`,
        ephemeral: true,
    });

    try {
        const dmChannel = await user.createDM();

        // Úvodní embed v DM
        const introEmbed = new EmbedBuilder()
            .setTitle(`📋 Přihláška – ${position.label}`)
            .setDescription(
                `Ahoj! Děkujeme za tvůj zájem o pozici **${position.label}** na serveru **${guild.name}**!\n\n` +
                `📝 Nyní ti budu postupně posílat **${position.questions.length} otázek**.\n` +
                `Na každou odpověz jednou zprávou. Máš **30 minut** na každou odpověď.\n\n` +
                `⚠️ Buď prosím upřímný/á a piš podrobně – odpovědi ovlivní tvé přijetí!\n\n` +
                `*Napiš cokoliv pro zahájení dotazníku...*`
            )
            .setColor(position.color)
            .setFooter({ text: 'Xeloria Nábor Systém' })
            .setTimestamp();

        await dmChannel.send({ embeds: [introEmbed] });

        // Čekat na potvrzení zahájení
        const startFilter = (m) => m.author.id === user.id;
        try {
            await dmChannel.awaitMessages({ filter: startFilter, max: 1, time: 1800000, errors: ['time'] });
        } catch {
            const timeoutEmbed = new EmbedBuilder()
                .setTitle('⏰ Čas vypršel')
                .setDescription('Nepřijali jsme od tebe žádnou odpověď. Pokud chceš, zkus to znovu.')
                .setColor(0xFF0000);
            await dmChannel.send({ embeds: [timeoutEmbed] });
            return;
        }

        // Sbírání odpovědí
        const answers = [];
        const filter = (m) => m.author.id === user.id;

        for (let i = 0; i < position.questions.length; i++) {
            const questionEmbed = new EmbedBuilder()
                .setTitle(`❓ Otázka ${i + 1}/${position.questions.length}`)
                .setDescription(`**${position.questions[i]}**`)
                .setColor(position.color)
                .setFooter({ text: `Zbývá ${position.questions.length - i - 1} otázek • Máš 30 minut na odpověď` });

            await dmChannel.send({ embeds: [questionEmbed] });

            try {
                const collected = await dmChannel.awaitMessages({
                    filter,
                    max: 1,
                    time: 1800000, // 5 minut
                    errors: ['time'],
                });

                const answer = collected.first().content;
                answers.push({ question: position.questions[i], answer });

                // Potvrzení odpovědi
                await dmChannel.send({ content: `✅ Odpověď uložena! (${i + 1}/${position.questions.length})` });

            } catch {
                const timeoutEmbed = new EmbedBuilder()
                    .setTitle('⏰ Čas vypršel')
                    .setDescription(`Neodpověděl/a jsi na otázku ${i + 1}. Přihláška byla zrušena.\nPokud chceš, zkus to znovu.`)
                    .setColor(0xFF0000);
                await dmChannel.send({ embeds: [timeoutEmbed] });
                return;
            }
        }

        // ═══ Dokončení – odeslání shrnutí do DM ═══
        const doneEmbed = new EmbedBuilder()
            .setTitle('🎉 Přihláška odeslána!')
            .setDescription(
                `Tvoje přihláška na pozici **${position.label}** byla úspěšně odeslána!\n\n` +
                `📩 Admin tým si ji projde a brzy se ti ozve.\n` +
                `⏳ Buď prosím trpělivý/á, může to trvat několik dní.\n\n` +
                `Děkujeme za zájem o **${guild.name}**! 💜`
            )
            .setColor(0x00FF00)
            .setTimestamp();

        await dmChannel.send({ embeds: [doneEmbed] });

        // ═══ LOG: Odeslání přihlášky do log kanálu ═══
        try {
            const logChannel = guild.channels.cache.get(config.channels.NABOR_LOG);
            if (logChannel) {
                // Hlavní log embed
                const logEmbed = new EmbedBuilder()
                    .setTitle(`📋 Nová přihláška – ${position.label}`)
                    .setDescription(`Uživatel <@${user.id}> (${user.tag}) odeslal přihlášku na pozici **${position.label}**.`)
                    .setColor(position.color)
                    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
                    .setTimestamp()
                    .setFooter({ text: `User ID: ${user.id}` });

                await logChannel.send({ embeds: [logEmbed] });

                // Odpovědi - rozdělit do více embedů (max 25 fieldů na embed)
                const answersPerEmbed = 10;
                for (let i = 0; i < answers.length; i += answersPerEmbed) {
                    const chunk = answers.slice(i, i + answersPerEmbed);
                    const answerEmbed = new EmbedBuilder()
                        .setTitle(`📝 Odpovědi (${i + 1}–${Math.min(i + answersPerEmbed, answers.length)})`)
                        .setColor(position.color);

                    for (const a of chunk) {
                        const answerText = a.answer.length > 1024 ? a.answer.substring(0, 1021) + '...' : a.answer;
                        answerEmbed.addFields({
                            name: `❓ ${a.question}`,
                            value: `> ${answerText}`,
                            inline: false,
                        });
                    }

                    await logChannel.send({ embeds: [answerEmbed] });
                }

                // Akční tlačítka pro staff
                const actionRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`nabor_accept_${user.id}_${positionKey}`)
                        .setLabel('✅ Přijmout')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`nabor_deny_${user.id}_${positionKey}`)
                        .setLabel('❌ Zamítnout')
                        .setStyle(ButtonStyle.Danger),
                );

                await logChannel.send({
                    content: `**Rozhodnutí o přihlášce:**`,
                    components: [actionRow],
                });
            }
        } catch (err) {
            console.error('Chyba při logování náboru:', err);
        }

    } catch (err) {
        console.error('Chyba při DM náboru:', err);
        // Pokud nejde poslat DM
        try {
            await interaction.followUp({
                content: '❌ Nepodařilo se ti odeslat DM. Povol si zprávy od členů serveru a zkus to znovu.',
                ephemeral: true,
            });
        } catch { }
    }
}

// ═══ HANDLER: Přijmout/Zamítnout přihlášku ═══
async function handleNaborDecision(interaction) {
    const customId = interaction.customId;
    const member = interaction.member;

    // Kontrola oprávnění (jen admin/vedení)
    const isAdmin = config.adminRoles.some(r => member.roles.cache.has(r));
    if (!isAdmin) {
        return interaction.reply({ content: '❌ Nemáš oprávnění rozhodovat o přihláškách!', ephemeral: true });
    }

    // Parsování customId: nabor_accept_USERID_POSITION nebo nabor_deny_USERID_POSITION
    const parts = customId.split('_');
    const action = parts[1]; // accept nebo deny
    const userId = parts[2];
    const positionKey = parts[3];
    const position = naborPositions[positionKey];

    if (!position) {
        return interaction.reply({ content: '❌ Neplatná pozice!', ephemeral: true });
    }

    const guild = interaction.guild;

    try {
        const targetUser = await guild.client.users.fetch(userId);

        if (action === 'accept') {
            // Přijato
            const acceptEmbed = new EmbedBuilder()
                .setTitle('🎉 Přihláška přijata!')
                .setDescription(
                    `Gratulujeme! Tvoje přihláška na pozici **${position.label}** na serveru **${guild.name}** byla **PŘIJATA**! 🎊\n\n` +
                    `Brzy se ti ozve někdo z vedení s dalšími instrukcemi.`
                )
                .setColor(0x00FF00)
                .setTimestamp();

            try {
                await targetUser.send({ embeds: [acceptEmbed] });
            } catch { }

            // Update log zprávy
            const resultEmbed = new EmbedBuilder()
                .setTitle('✅ Přihláška PŘIJATA')
                .setDescription(`Přihlášku uživatele <@${userId}> na pozici **${position.label}** přijal <@${member.id}>.`)
                .setColor(0x00FF00)
                .setTimestamp();

            await interaction.update({ embeds: [resultEmbed], components: [] });

        } else if (action === 'deny') {
            // Zamítnuto
            const denyEmbed = new EmbedBuilder()
                .setTitle('❌ Přihláška zamítnuta')
                .setDescription(
                    `Bohužel, tvoje přihláška na pozici **${position.label}** na serveru **${guild.name}** byla **zamítnuta**.\n\n` +
                    `Nevzdávej to! Můžeš se přihlásit znovu po zlepšení svých dovedností. 💪`
                )
                .setColor(0xFF0000)
                .setTimestamp();

            try {
                await targetUser.send({ embeds: [denyEmbed] });
            } catch { }

            // Update log zprávy
            const resultEmbed = new EmbedBuilder()
                .setTitle('❌ Přihláška ZAMÍTNUTA')
                .setDescription(`Přihlášku uživatele <@${userId}> na pozici **${position.label}** zamítl <@${member.id}>.`)
                .setColor(0xFF0000)
                .setTimestamp();

            await interaction.update({ embeds: [resultEmbed], components: [] });
        }
    } catch (err) {
        console.error('Chyba při rozhodování o přihlášce:', err);
        await interaction.reply({ content: '❌ Nastala chyba při zpracování rozhodnutí.', ephemeral: true });
    }
}

module.exports = { sendNaborPanel, handleNaborApply, handleNaborDecision };
