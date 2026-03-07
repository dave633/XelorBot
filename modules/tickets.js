// ═══════════════════════════════════════════
// Modul: Ticket systém
// ═══════════════════════════════════════════

const {
    EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder,
    ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits
} = require('discord.js');
const config = require('../config');
const { sendNaborPanel } = require('./nabor');

const ticketCategories = [
    { label: '📋 Nábor', value: 'nabor', description: 'Žádost o nábor do týmu', adminOnly: false },
    { label: '🐛 Nahlášení bugu', value: 'bug', description: 'Nahlásit chybu na serveru', adminOnly: false },
    { label: '🚨 Nahlášení hráče', value: 'hrac', description: 'Nahlásit hráče za porušení pravidel', adminOnly: false },
    { label: '🛡️ Nahlášení člena AT', value: 'at_clen', description: 'Nahlásit člena Admin Teamu', adminOnly: true },
    { label: '⚖️ Žádost o zkrácení/zrušení trestu', value: 'trest', description: 'Požádat o zmírnění trestu', adminOnly: false },
    { label: '🤝 Spolupráce', value: 'spoluprace', description: 'Nabídka spolupráce', adminOnly: false },
    { label: '🔄 Převod účtu', value: 'prevod', description: 'Žádost o převod účtu', adminOnly: true },
    { label: '❓ Jiné', value: 'jine', description: 'Ostatní dotazy a žádosti', adminOnly: false },
];

// Pozice pro nábor
const naborPositions = [
    { label: '🛡️ Helper', value: 'helper', description: 'Pozice Helper' },
    { label: '🔨 Builder', value: 'builder', description: 'Pozice Builder' },
    { label: '💻 Developer', value: 'developer', description: 'Pozice Developer' },
    { label: '🎨 Grafik', value: 'grafik', description: 'Pozice Grafik' },
    { label: '📹 YouTuber/Streamer', value: 'youtuber', description: 'Pozice YouTuber/Streamer' },
    { label: '❓ Jiná pozice', value: 'jina', description: 'Jiná pozice' },
];

async function sendTicketPanel(channel) {
    const embed = new EmbedBuilder()
        .setTitle('🎫 TICKET SYSTÉM')
        .setDescription(
            '**Potřebujete pomoc? Vytvořte si ticket!**\n\n' +
            '📋 **Nábor** – Chceš se stát součástí týmu?\n' +
            '🐛 **Nahlášení bugu** – Našel/a jsi chybu?\n' +
            '🚨 **Nahlášení hráče** – Někdo porušuje pravidla?\n' +
            '🛡️ **Nahlášení člena AT** – Problém s členem týmu?\n' +
            '⚖️ **Žádost o trest** – Chceš zmírnit trest?\n' +
            '🤝 **Spolupráce** – Máš návrh na spolupráci?\n' +
            '🔄 **Převod účtu** – Potřebuješ převést účet?\n' +
            '❓ **Jiné** – Cokoliv dalšího?\n\n' +
            '*Vyber kategorii z menu níže 👇*'
        )
        .setColor(0x5865F2)
        .setFooter({ text: 'Xeloria Ticket Systém' })
        .setTimestamp();

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('ticket_create')
        .setPlaceholder('📩 Vyber kategorii ticketu...')
        .addOptions(ticketCategories.map(cat => ({
            label: cat.label,
            value: cat.value,
            description: cat.description,
        })));

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await channel.send({ embeds: [embed], components: [row] });
}

async function handleTicketCreate(interaction) {
    const category = interaction.values[0];
    const catInfo = ticketCategories.find(c => c.value === category);
    const guild = interaction.guild;
    const user = interaction.user;

    // Zjistit staff role pro permissions
    const permissionOverwrites = [
        { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
    ];

    if (catInfo.adminOnly) {
        for (const roleId of config.adminRoles) {
            permissionOverwrites.push({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages],
            });
        }
    } else {
        for (const roleId of config.staffRoles) {
            permissionOverwrites.push({
                id: roleId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageMessages],
            });
        }
    }

    try {
        const ticketChannel = await guild.channels.create({
            name: `ticket-${category}-${user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites,
        });

        const ticketEmbed = new EmbedBuilder()
            .setTitle(`🎫 Ticket – ${catInfo.label}`)
            .setDescription(
                `Ahoj <@${user.id}>!\n\n` +
                `Tvůj ticket byl vytvořen v kategorii **${catInfo.label}**.\n` +
                `Napiš svůj dotaz/problém a tým se ti brzy ozve.\n\n` +
                `*Ticket může zavřít pouze člen staff týmu.*`
            )
            .setColor(0x00FF00)
            .setTimestamp()
            .setFooter({ text: `Ticket ID: ${ticketChannel.id}` });

        const closeBtn = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Zavřít ticket')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger),
        );

        await ticketChannel.send({ embeds: [ticketEmbed], components: [closeBtn] });

        // Pokud je to nábor – poslat nábor panel s DM přihláškou
        if (category === 'nabor') {
            await sendNaborPanel(ticketChannel);

        } else if (category === 'bug') {
            const bugEmbed = new EmbedBuilder()
                .setTitle('🐛 Nahlášení bugu')
                .setDescription(
                    `<@${user.id}>, odpověz prosím na následující otázky:\n\n` +
                    `**1️⃣ O jaký bug se jedná?**\n` +
                    `> Popiš co nejpodrobněji, co se děje.\n\n` +
                    `**2️⃣ Kde se bug vyskytuje?**\n` +
                    `> Na jakém místě/mapě/herním módu?\n\n` +
                    `**3️⃣ Jak se bug reprodukuje?**\n` +
                    `> Co musíš udělat, aby se bug zopakoval?\n\n` +
                    `**4️⃣ Máš screenshot nebo video?**\n` +
                    `> Přilož ho prosím do tohoto kanálu.`
                )
                .setColor(0xFFCC00)
                .setFooter({ text: 'Odpověz do tohoto kanálu, staff se ti brzy ozve.' });
            await ticketChannel.send({ embeds: [bugEmbed] });

        } else if (category === 'hrac') {
            const hracEmbed = new EmbedBuilder()
                .setTitle('🚨 Nahlášení hráče')
                .setDescription(
                    `<@${user.id}>, odpověz prosím na následující otázky:\n\n` +
                    `**1️⃣ O jakého hráče se jedná?**\n` +
                    `> Napiš jeho přezdívku (nick).\n\n` +
                    `**2️⃣ Co udělal?**\n` +
                    `> Popiš, jaké pravidlo porušil a co přesně se stalo.\n\n` +
                    `**3️⃣ Kdy se to stalo?**\n` +
                    `> Přibližný čas a datum.\n\n` +
                    `**4️⃣ Máš důkaz? (screenshot/video)**\n` +
                    `> Přilož ho prosím do tohoto kanálu.`
                )
                .setColor(0xFF4444)
                .setFooter({ text: 'Odpověz do tohoto kanálu, staff se ti brzy ozve.' });
            await ticketChannel.send({ embeds: [hracEmbed] });

        } else if (category === 'at_clen') {
            const atEmbed = new EmbedBuilder()
                .setTitle('🛡️ Nahlášení člena AT')
                .setDescription(
                    `<@${user.id}>, odpověz prosím na následující otázky:\n\n` +
                    `**1️⃣ O jakého člena Admin Teamu se jedná?**\n` +
                    `> Napiš jeho přezdívku nebo označ @mention.\n\n` +
                    `**2️⃣ Co udělal?**\n` +
                    `> Popiš co nejpodrobněji situaci – co se stalo, jak se choval.\n\n` +
                    `**3️⃣ Kdy se to stalo?**\n` +
                    `> Přibližný čas a datum.\n\n` +
                    `**4️⃣ Máš důkaz? (screenshot/video/zprávy)**\n` +
                    `> Přilož prosím vše, co máš.`
                )
                .setColor(0xFF0000)
                .setFooter({ text: 'Tento ticket vidí pouze vedení serveru.' });
            await ticketChannel.send({ embeds: [atEmbed] });

        } else if (category === 'trest') {
            const trestEmbed = new EmbedBuilder()
                .setTitle('⚖️ Žádost o zkrácení/zrušení trestu')
                .setDescription(
                    `<@${user.id}>, odpověz prosím na následující otázky:\n\n` +
                    `**1️⃣ Jaký trest máš?**\n` +
                    `> Ban, mute, nebo jiný? Na jak dlouho?\n\n` +
                    `**2️⃣ Za co jsi dostal/a trest?**\n` +
                    `> Popiš důvod trestu.\n\n` +
                    `**3️⃣ Proč by měl být trest zkrácen/zrušen?**\n` +
                    `> Napiš svůj argument.`
                )
                .setColor(0x9966FF)
                .setFooter({ text: 'Odpověz do tohoto kanálu, staff se ti brzy ozve.' });
            await ticketChannel.send({ embeds: [trestEmbed] });

        } else if (category === 'spoluprace') {
            const spolupraceEmbed = new EmbedBuilder()
                .setTitle('🤝 Nabídka spolupráce')
                .setDescription(
                    `<@${user.id}>, odpověz prosím na následující otázky:\n\n` +
                    `**1️⃣ Jaký server/projekt zastupuješ?**\n` +
                    `> Napiš název a odkaz (Discord/web).\n\n` +
                    `**2️⃣ Jakou spolupráci nabízíš?**\n` +
                    `> Co si představuješ pod spoluprací?\n\n` +
                    `**3️⃣ Co můžeš nabídnout?**\n` +
                    `> Kolik máte hráčů, co za obsah, atd.`
                )
                .setColor(0x00CCFF)
                .setFooter({ text: 'Odpověz do tohoto kanálu, staff se ti brzy ozve.' });
            await ticketChannel.send({ embeds: [spolupraceEmbed] });

        } else if (category === 'prevod') {
            const prevodEmbed = new EmbedBuilder()
                .setTitle('🔄 Převod účtu')
                .setDescription(
                    `<@${user.id}>, odpověz prosím na následující otázky:\n\n` +
                    `**1️⃣ Z jakého účtu chceš převést?**\n` +
                    `> Napiš přezdívku starého účtu.\n\n` +
                    `**2️⃣ Na jaký účet chceš převést?**\n` +
                    `> Napiš přezdívku nového účtu.\n\n` +
                    `**3️⃣ Proč potřebuješ převod?**\n` +
                    `> Důvod převodu (nový nick, ztracený přístup, atd.).`
                )
                .setColor(0x00FF99)
                .setFooter({ text: 'Tento ticket vidí pouze vedení serveru.' });
            await ticketChannel.send({ embeds: [prevodEmbed] });

        } else if (category === 'jine') {
            const jineEmbed = new EmbedBuilder()
                .setTitle('❓ Jiný dotaz')
                .setDescription(
                    `<@${user.id}>, odpověz prosím na otázku:\n\n` +
                    `**Co máš za problém / dotaz?**\n` +
                    `> Popiš co nejpodrobněji, s čím potřebuješ pomoci.`
                )
                .setColor(0x808080)
                .setFooter({ text: 'Odpověz do tohoto kanálu, staff se ti brzy ozve.' });
            await ticketChannel.send({ embeds: [jineEmbed] });

        } else {
            await ticketChannel.send({ content: `<@${user.id}> tvůj ticket je připraven!` });
        }

        await interaction.reply({
            content: `✅ Ticket vytvořen! Přejdi do <#${ticketChannel.id}>`,
            ephemeral: true,
        });

        // ═══ LOG: Ticket vytvořen ═══
        try {
            const logChannel = guild.channels.cache.get(config.channels.TICKET_LOG);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle('📩 Ticket vytvořen')
                    .addFields(
                        { name: '👤 Vytvořil', value: `<@${user.id}> (${user.tag})`, inline: true },
                        { name: '📂 Kategorie', value: catInfo.label, inline: true },
                        { name: '📝 Kanál', value: `<#${ticketChannel.id}>`, inline: true },
                        { name: '🆔 Ticket ID', value: ticketChannel.id, inline: true },
                    )
                    .setColor(0x00FF00)
                    .setTimestamp()
                    .setFooter({ text: 'Xeloria Ticket Log' });
                await logChannel.send({ embeds: [logEmbed] });
            }
        } catch (err) {
            console.error('Chyba při logování vytvoření ticketu:', err);
        }

    } catch (err) {
        console.error('Chyba při vytváření ticketu:', err);
        await interaction.reply({
            content: '❌ Nepodařilo se vytvořit ticket. Kontaktuj admina.',
            ephemeral: true,
        });
    }
}

// Handler pro výběr pozice u náboru
async function handleNaborPosition(interaction) {
    const position = interaction.values[0];
    const posInfo = naborPositions.find(p => p.value === position);

    const embed = new EmbedBuilder()
        .setTitle('✅ Pozice vybrána')
        .addFields(
            { name: '👤 Hráč', value: `<@${interaction.user.id}>`, inline: true },
            { name: '🎯 Pozice', value: posInfo.label, inline: true },
        )
        .setDescription('Nyní nám napiš, proč se na tuto pozici hlásíš a jaké máš zkušenosti. Staff se ti brzy ozve!')
        .setColor(0x00FF00)
        .setTimestamp();

    // Nahradit select menu potvrzením
    await interaction.update({ embeds: [embed], components: [] });
}

async function handleTicketClose(interaction) {
    const channel = interaction.channel;
    const member = interaction.member;

    // Zavřít ticket může JEN staff
    const isStaff = config.staffRoles.some(roleId => member.roles.cache.has(roleId));

    if (!isStaff) {
        await interaction.reply({ content: '❌ Ticket může zavřít pouze člen staff týmu.', ephemeral: true });
        return;
    }

    await interaction.reply({ content: '🔒 Ticket bude zavřen za 5 sekund...' });

    // ═══ LOG: Ticket zavřen (s historií zpráv) ═══
    try {
        const logChannel = interaction.guild.channels.cache.get(config.channels.TICKET_LOG);
        if (logChannel) {
            // Sbírání historie zpráv z ticketu
            let allMessages = [];
            let lastId;
            while (true) {
                const options = { limit: 100 };
                if (lastId) options.before = lastId;
                const fetched = await channel.messages.fetch(options);
                if (fetched.size === 0) break;
                allMessages.push(...fetched.values());
                lastId = fetched.last().id;
                if (fetched.size < 100) break;
            }

            // Seřadit od nejstarší po nejnovější
            allMessages.reverse();

            // Vytvořit textový přepis zpráv
            let transcript = '';
            for (const msg of allMessages) {
                const time = msg.createdAt.toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' });
                const author = msg.author.tag;
                const content = msg.content || (msg.embeds.length > 0 ? '[Embed]' : '[Příloha/Bez textu]');
                transcript += `[${time}] ${author}: ${content}\n`;
            }

            // Omezit délku (Discord limit 4096 znaků pro description)
            if (transcript.length > 3800) {
                transcript = transcript.substring(transcript.length - 3800);
                transcript = '... (zkráceno)\n' + transcript;
            }

            const logEmbed = new EmbedBuilder()
                .setTitle('🔒 Ticket zavřen')
                .addFields(
                    { name: '📝 Název', value: channel.name, inline: true },
                    { name: '🔒 Zavřel', value: `<@${member.id}> (${member.user.tag})`, inline: true },
                    { name: '💬 Počet zpráv', value: `${allMessages.length}`, inline: true },
                )
                .setColor(0xFF0000)
                .setTimestamp()
                .setFooter({ text: 'Xeloria Ticket Log' });

            if (transcript.trim()) {
                logEmbed.setDescription(`**📜 Přepis konverzace:**\n\`\`\`\n${transcript}\n\`\`\``);
            }

            await logChannel.send({ embeds: [logEmbed] });
        }
    } catch (err) {
        console.error('Chyba při logování zavření ticketu:', err);
    }

    setTimeout(async () => {
        try {
            await channel.delete();
        } catch (err) {
            console.error('Chyba při mazání ticket kanálu:', err);
        }
    }, 5000);
}

module.exports = { sendTicketPanel, handleTicketCreate, handleTicketClose, handleNaborPosition };
