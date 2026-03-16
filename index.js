require('dotenv').config();
const http = require('http');

// Webový server pro UptimeRobot (udržuje bota naživu 24/7)
http.createServer((req, res) => {
    res.write("Xelori Bot is online!");
    res.end();
}).listen(process.env.PORT || 8080, () => {
    console.log('🌐 | Webový server pro UptimeRobot běží!');
});

const { Client, GatewayIntentBits, Collection, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');
const rulesData = require('./rulesData'); 
const recruitData = require('./recruitData');

// ANTI-CRASH SYSTÉM (Udrží bota aktivního i při chybě)
process.on('unhandledRejection', (reason, promise) => {
    console.error('[ANTI-CRASH] Neošetřené zamítnutí slibu:', promise, 'důvod:', reason);
});
process.on('uncaughtException', (err, origin) => {
    console.error('[ANTI-CRASH] Nezachycená výjimka:', err, 'původ:', origin);
});

// Pomocná funkce pro čas
function parseDuration(str) {
    if (!str) return 0;
    const regex = /(\d+)\s*([smhd])/;
    const match = str.toLowerCase().match(regex);
    if (!match) return 0;
    const value = parseInt(match[1]);
    const unit = match[2];
    switch (unit) {
        case 's': return value * 1000;
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 0;
    }
}

// Vytvoříme in-memory cache okno pro právě spuštěné DM pohovory (ID uživatele -> Data o pohovoru)
const activeApplications = new Map();

// Načtení dat o souhlasu (persistentní uložení)
const dataPath = './agreements.json';
let agreedUsers = [];
if (fs.existsSync(dataPath)) {
    try {
        agreedUsers = JSON.parse(fs.readFileSync(dataPath));
    } catch (e) {
        agreedUsers = [];
    }
} else {
    fs.writeFileSync(dataPath, JSON.stringify([]));
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages, // DŮLEŽITÉ PRO DM
    ],
    partials: [2] // Partials.Channel - potřeba pro správné fungování DM kolektorů
});

const levelCooldowns = new Set();
const levelsPath = path.join(__dirname, 'levels.json');
function loadLevels() {
    if (!fs.existsSync(levelsPath)) return {};
    return JSON.parse(fs.readFileSync(levelsPath, 'utf8'));
}
function saveLevels(data) {
    fs.writeFileSync(levelsPath, JSON.stringify(data, null, 2));
}

const economyPath = path.join(__dirname, 'economy.json');
function loadEconomy() {
    if (!fs.existsSync(economyPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(economyPath, 'utf8'));
    } catch (e) { return {}; }
}
function saveEconomy(data) {
    fs.writeFileSync(economyPath, JSON.stringify(data, null, 2));
}

const warnsPath = path.join(__dirname, 'warns.json');
function loadWarns() {
    if (!fs.existsSync(warnsPath)) return {};
    try {
        return JSON.parse(fs.readFileSync(warnsPath, 'utf8'));
    } catch (e) { return {}; }
}
function saveWarns(data) {
    fs.writeFileSync(warnsPath, JSON.stringify(data, null, 2));
}

const permsPath = path.join(__dirname, 'permissions.json');
function loadPermissions() {
    if (!fs.existsSync(permsPath)) return {};
    try {
        const data = fs.readFileSync(permsPath, 'utf8');
        return data ? JSON.parse(data) : {};
    } catch (e) { return {}; }
}
function savePermissions(data) {
    fs.writeFileSync(permsPath, JSON.stringify(data, null, 2));
}

const countingPath = path.join(__dirname, 'counting.json');
function loadCounting() {
    if (!fs.existsSync(countingPath)) return { currentNumber: 0, lastUserId: "" };
    try {
        const data = fs.readFileSync(countingPath, 'utf8');
        return data ? JSON.parse(data) : { currentNumber: 0, lastUserId: "" };
    } catch (e) { return { currentNumber: 0, lastUserId: "" }; }
}
function saveCounting(data) {
    fs.writeFileSync(countingPath, JSON.stringify(data, null, 2));
}

function hasPermission(interaction, commandName) {
    if (interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return true;
    const perms = loadPermissions();
    if (!perms[commandName]) return false;
    
    const userAllowed = perms[commandName].users?.includes(interaction.user.id);
    const roleAllowed = perms[commandName].roles?.some(roleId => interaction.member.roles.cache.has(roleId));
    
    return userAllowed || roleAllowed;
}

const forbiddenWords = ['nigger', 'negr', 'cigán', 'debil', 'zmrd', 'píča', 'kunda', 'kokot', 'mrdko', 'čurák', 'curak', 'pico', 'zmrdde'];

// Pomocné funkce pro sestavení pravidel
function getRulesEmbeds(lang) {
    const data = rulesData[lang] || rulesData['cs'];
    return [
        new EmbedBuilder().setTitle(data.generalTitle).setColor('#f1c40f').setDescription(data.generalDesc),
        new EmbedBuilder().setTitle(data.discordTitle).setColor('#3498db').setDescription(data.discordDesc),
        new EmbedBuilder().setTitle(data.serverTitle).setColor('#e74c3c').setDescription(data.serverDesc),
        new EmbedBuilder().setTitle(data.mcTitle).setColor('#2ecc71').setDescription(data.mcDesc)
    ];
}

function getRulesComponents() {
    // 1. Řada: Jazyky
    const langRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('lang_cs').setLabel('🇨🇿 Čeština').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lang_sk').setLabel('🇸🇰 Slovenčina').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lang_en').setLabel('🇬🇧 English').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lang_de').setLabel('🇩🇪 Deutsch').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('lang_pl').setLabel('🇵🇱 Polski').setStyle(ButtonStyle.Secondary)
    );

    // 2. Řada: Samostatný souhlas (+ počet)
    const agreeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('agree_rules_button') 
            .setLabel(`✅ Souhlasím s pravidly (${agreedUsers.length} lidí souhlasilo)`)
            .setStyle(ButtonStyle.Success)
    );

    return [langRow, agreeRow];
}

client.once('ready', async () => {
    console.log(`✅ | Přihlášen jako ${client.user.tag}!`);
    console.log(`✅ | Bot běží a je připraven na serveru s ID: ${process.env.GUILD_ID}`);

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
        console.log(`✅ | Bot detekoval server: ${guild.name}`);
        try {
            const commandsData = [
                { name: 'setup', description: 'Otevře hlavní menu pro nastavení serveru.' },
                { name: 'oznameni', description: 'Napsat a odeslat oficiální oznámení do speciálního kanálu.' },
                { name: 'changelog', description: 'Vydat nový seznam změn (Changelog) do příslušného kanálu.' },
                { name: 'odpoved', description: 'Odpovědět na nábor (Přijmout/Odmítnout) uživatele.', options: [
                    { name: 'uzivatel', description: 'Uživatel, kterému chceš odpovědět', type: 6, required: true }
                ]},
                { name: 'odkazy', description: 'Odeslat důležité odkazy do aktuálního kanálu.' },
                { name: 'ateam', description: 'Odeslat oficiální zprávu od Admin Týmu.' },
                { name: 'hlasovani', description: 'Vytvořit nové hlasování (anketu) pro komunitu.', options: [
                    { name: 'ping', description: 'Koho chceš pingnout (např. @everyone nebo ID role)', type: 3, required: false }
                ]},
                { name: 'giveaway', description: 'Vytvořit novou soutěž (Giveaway) o ceny.', options: [
                    { name: 'prize', description: 'O co se hraje?', type: 3, required: true },
                    { name: 'duration', description: 'Doba trvání (např. 10m, 1h, 1d)', type: 3, required: true },
                    { name: 'winners', description: 'Počet výherců', type: 4, required: true }
                ]},
                { name: 'role', description: 'Správa rolí uživatelů.', options: [
                    {
                        name: 'add',
                        description: 'Přidat roli uživateli (trvale).',
                        type: 1,
                        options: [
                            { name: 'uzivatel', description: 'Komu přidat roli?', type: 6, required: true },
                            { name: 'role', description: 'ID nebo označení role', type: 3, required: true }
                        ]
                    },
                    {
                        name: 'add-temp',
                        description: 'Přidat roli uživateli na určitou dobu.',
                        type: 1,
                        options: [
                            { name: 'uzivatel', description: 'Komu přidat roli?', type: 6, required: true },
                            { name: 'role', description: 'ID nebo označení role', type: 3, required: true },
                            { name: 'doba', description: 'Na jak dlouho? (např. 1h, 1d)', type: 3, required: true }
                        ]
                    },
                    {
                        name: 'remove',
                        description: 'Odebrat roli uživateli.',
                        type: 1,
                        options: [
                            { name: 'uzivatel', description: 'Komu odebrat roli?', type: 6, required: true },
                            { name: 'role', description: 'ID nebo označení role', type: 3, required: true }
                        ]
                    }
                ]},
                { name: 'dm', description: 'Zasílání soukromých zpráv uživatelům.', options: [
                    {
                        name: 'user',
                        description: 'Poslat DM konkrétnímu uživateli.',
                        type: 1,
                        options: [
                            { name: 'uzivatel', description: 'Komu poslat zprávu?', type: 6, required: true }
                        ]
                    },
                    {
                        name: 'all',
                        description: 'Poslat DM všem členům na serveru.',
                        type: 1
                    }
                ]},
                { name: 'text', description: 'Odeslat čistý text jako bot do aktuálního kanálu.', options: [
                    { name: 'obsah', description: 'Text, který má bot napsat', type: 3, required: true }
                ]},
                { name: 'ticket', description: 'Správa ticketů a trestů.', options: [
                    { name: 'close', description: 'Uzavřít aktuální ticket.', type: 1 },
                    { name: 'ban', description: 'Zabanovat hráče.', type: 1, options: [
                        { name: 'hrac', description: 'Uživatel k zabanování', type: 6, required: true },
                        { name: 'duvod', description: 'Důvod banu', type: 3, required: true }
                    ]},
                    { name: 'tempban', description: 'Dočasně zabanovat hráče.', type: 1, options: [
                        { name: 'hrac', description: 'Uživatel k zabanování', type: 6, required: true },
                        { name: 'doba', description: 'Doba banu (např. 1d, 1h)', type: 3, required: true },
                        { name: 'duvod', description: 'Důvod banu', type: 3, required: true }
                    ]}
                ]},
                { name: 'rank', description: 'Zobrazit tvou aktuální úroveň a XP.', options: [
                    { name: 'uzivatel', description: 'Uživatel, jehož rank chceš vidět', type: 6, required: false }
                ]},
                { name: 'leaderboard', description: 'Zobrazit žebříček nejlepších hráčů podle úrovní.' },
                { name: 'knp', description: 'Zahraj si Kámen, Nůžky, Papír proti botovi!', options: [
                    {
                        name: 'volba',
                        description: 'Tvoje volba',
                        type: 3,
                        required: true,
                        choices: [
                            { name: 'Kámen', value: 'kamen' },
                            { name: 'Nůžky', value: 'nuzky' },
                            { name: 'Papír', value: 'papir' }
                        ]
                    }
                ]},
                { name: 'verify', description: 'Správa verifikačního systému.', options: [
                    { name: 'reload', description: 'Znovu odeslat verifikační panel do nastaveného kanálu.', type: 1 }
                ]},
                { name: 'reset_count', description: 'Resetuje počítání na 0 a smaže posledního hráče.' },
                { name: 'anonym', description: 'Odeslat anonymní zprávu do speciálního kanálu.', options: [
                    { name: 'text', description: 'Obsah tvé anonymní zprávy', type: 3, required: true }
                ]},
                { name: 'hodnoceni', description: 'Udělit hodnocení (+REP/-REP) uživateli.', options: [
                    {
                        name: 'typ',
                        description: 'Typ hodnocení',
                        type: 3,
                        required: true,
                        choices: [
                            { name: '+REP', value: 'plus' },
                            { name: '-REP', value: 'minus' }
                        ]
                    },
                    { name: 'uzivatel', description: 'Koho chceš ohodnotit?', type: 6, required: true },
                    { name: 'duvod', description: 'Důvod tvého hodnocení', type: 3, required: true }
                ]},
                { name: 'prijmout', description: 'Přijmout návrh/nápad hráče.', options: [
                    { name: 'id', description: 'ID zprávy s nápadem', type: 3, required: true },
                    { name: 'duvod', description: 'Důvod přijetí', type: 3, required: false }
                ]},
                { name: 'zamitnout', description: 'Zamítnout návrh/nápad hráče.', options: [
                    { name: 'id', description: 'ID zprávy s nápadem', type: 3, required: true },
                    { name: 'duvod', description: 'Důvod zamítnutí', type: 3, required: false }
                ]},
                { name: 'cekase', description: 'Označit návrh jako čekající.', options: [
                    { name: 'id', description: 'ID zprávy s nápadem', type: 3, required: true },
                    { name: 'duvod', description: 'Důvod k čekání', type: 3, required: false }
                ]},
                {
                    name: 'prikaz',
                    description: 'Správa oprávnění k příkazům.',
                    options: [
                        {
                            name: 'add',
                            description: 'Přidat oprávnění.',
                            type: 2,
                            options: [
                                {
                                    name: 'user',
                                    description: 'Přidat uživateli.',
                                    type: 1,
                                    options: [
                                        { name: 'uzivatel', description: 'Uživatel', type: 6, required: true },
                                        { name: 'prikaz', description: 'Název příkazu', type: 3, required: true }
                                    ]
                                },
                                {
                                    name: 'role',
                                    description: 'Přidat roli.',
                                    type: 1,
                                    options: [
                                        { name: 'role', description: 'Role', type: 8, required: true },
                                        { name: 'prikaz', description: 'Název příkazu', type: 3, required: true }
                                    ]
                                }
                            ]
                        },
                        {
                            name: 'remove',
                            description: 'Odebrat oprávnění.',
                            type: 2,
                            options: [
                                {
                                    name: 'user',
                                    description: 'Odebrat uživateli.',
                                    type: 1,
                                    options: [
                                        { name: 'uzivatel', description: 'Uživatel', type: 6, required: true },
                                        { name: 'prikaz', description: 'Název příkazu', type: 3, required: true }
                                    ]
                                },
                                {
                                    name: 'role',
                                    description: 'Odebrat roli.',
                                    type: 1,
                                    options: [
                                        { name: 'role', description: 'Role', type: 8, required: true },
                                        { name: 'prikaz', description: 'Název příkazu', type: 3, required: true }
                                    ]
                                }
                            ]
                        }
                    ]
                },
                { name: 'reset_count', description: 'Resetuje celé počítání a začne se od znova.' }
            ];

            // Registrace pro konkrétní server (okamžitá)
            await guild.commands.set(commandsData);
            
            // Vyčištění globálních příkazů (zamezení duplicit)
            await client.application.commands.set([]); 

            console.log('✅ | Slash příkazy úspěšně zaregistrovány pro Guild a globální vyčištěny!');
        } catch (error) {
            console.error('❌ | Chyba při registraci slash příkazů:', error);
        }
    }

    // Interval pro kontrolu ukončení Giveaway
    setInterval(async () => {
        const giveawayPath = path.join(__dirname, 'giveaways.json');
        if (!fs.existsSync(giveawayPath)) return;
        
        let giveaways = JSON.parse(fs.readFileSync(giveawayPath, 'utf8'));
        const now = Date.now();
        let changed = false;

        for (let i = 0; i < giveaways.length; i++) {
            const gw = giveaways[i];
            if (gw.endAt <= now && !gw.ended) {
                gw.ended = true;
                changed = true;
                await endGiveaway(client, gw);
            }
        }

        if (changed) {
            fs.writeFileSync(giveawayPath, JSON.stringify(giveaways, null, 2));
        }
    }, 30000); // Každých 30 sekund

    // Interval pro kontrolu dočasných rolí
    setInterval(async () => {
        const tempRolesPath = path.join(__dirname, 'temp_roles.json');
        if (!fs.existsSync(tempRolesPath)) return;

        let tempRoles = JSON.parse(fs.readFileSync(tempRolesPath, 'utf8'));
        const now = Date.now();
        let changed = false;
        const remainingRoles = [];

        for (const tr of tempRoles) {
            if (tr.expireAt <= now) {
                const guild = client.guilds.cache.get(tr.guildId);
                if (guild) {
                    const member = await guild.members.fetch(tr.userId).catch(() => null);
                    if (member) {
                        await member.roles.remove(tr.roleId).catch(console.error);
                        console.log(`[TEMP-ROLE] Role ${tr.roleId} odebrána uživateli ${tr.userId} po vypršení času.`);
                    }
                }
                changed = true;
            } else {
                remainingRoles.push(tr);
            }
        }

        if (changed) {
            fs.writeFileSync(tempRolesPath, JSON.stringify(remainingRoles, null, 2));
        }
    }, 60000); // Každou minutu

    // Funkce pro posílání Memů
    async function sendMeme() {
        const memeChannelId = process.env.MEME_CHANNEL_ID;
        if (!memeChannelId) return console.log('[MEME] ID kanálu není v .env!');

        const guild = client.guilds.cache.get(process.env.GUILD_ID) || client.guilds.cache.first();
        if (!guild) return console.log('[MEME] Server nebyl nalezen!');

        const channel = await guild.channels.fetch(memeChannelId).catch(() => null);
        if (!channel) return console.log(`[MEME] Kanál s ID ${memeChannelId} nebyl nalezen!`);

        const subreddits = ['czechmemes', 'czskmes', 'Duklock'];
        const randomSub = subreddits[Math.floor(Math.random() * subreddits.length)];

        https.get(`https://meme-api.com/gimme/${randomSub}`, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', async () => {
                try {
                    if (data.startsWith('<!DOCTYPE html>') || data.startsWith('<html>')) {
                        console.log('[MEME] API vrátilo HTML místo JSON.');
                        return;
                    }
                    const meme = JSON.parse(data);
                    if (!meme.url) return;

                    const premiumColors = ['#FF00D6', '#00E5FF', '#7000FF', '#FF8A00', '#2ECC71'];
                    const randomColor = premiumColors[Math.floor(Math.random() * premiumColors.length)];

                    const memeEmbed = new EmbedBuilder()
                        .setTitle(`✨ | ${meme.title || 'Stylový Meme'}`)
                        .setURL(meme.postLink)
                        .setImage(meme.url)
                        .setColor(randomColor)
                        .addFields(
                            { name: '🔥 Reakce', value: `\`${meme.ups || 0}\` upvotů`, inline: true },
                            { name: '👤 Autor', value: `\`${meme.author}\``, inline: true },
                            { name: '📺 Subreddit', value: `\`r/${meme.subreddit}\``, inline: true }
                        )
                        .setFooter({ 
                            text: 'Xeloria Premium Entertainment • © 2024', 
                            iconURL: guild.iconURL({ dynamic: true }) 
                        })
                        .setTimestamp();

                    await channel.send({ embeds: [memeEmbed] });
                    console.log(`[MEME] Stylový meme odeslán: ${meme.title}`);
                } catch (e) {
                    console.error('[MEME] Chyba při parsování:', e.message);
                }
            });
        }).on('error', (err) => console.error('[MEME] API Error:', err));
    }

    // Poslat jeden hned při startu
    setTimeout(sendMeme, 5000);

    // Interval pro posílání Memů (každých 10 minut)
    setInterval(sendMeme, 10 * 60 * 1000); 
});

async function endGiveaway(client, gw) {
    const channel = await client.channels.fetch(gw.channelId).catch(() => null);
    if (!channel) return;

    const message = await channel.messages.fetch(gw.messageId).catch(() => null);
    if (!message) return;

    if (gw.participants.length === 0) {
        const noWinnerEmbed = EmbedBuilder.from(message.embeds[0])
            .setTitle('🎉 | SOUTĚŽ UKONČENA')
            .setColor('#7f8c8d')
            .setDescription(`**Cena:** ${gw.prize}\n**Výherci:** Nikdo se nezapojil! 😢`)
            .setFields([]);
        await message.edit({ embeds: [noWinnerEmbed], components: [] });
        return;
    }

    // Losování
    const shuffled = [...gw.participants].sort(() => 0.5 - Math.random());
    const winners = shuffled.slice(0, Math.min(gw.winnersCount, shuffled.length));
    const winnerMentions = winners.map(id => `<@${id}>`).join(', ');

    const winEmbed = EmbedBuilder.from(message.embeds[0])
        .setTitle('🎉 | MÁME VÝHERCE!')
        .setColor('#2ecc71')
        .setDescription(`**Cena:** ${gw.prize}\n**Výherci:** ${winnerMentions}\n**Hostitel:** ${gw.host}`)
        .setFields([])
        .setFooter({ text: `Soutěž skončila • Gratulujeme všem výhercům!` });

    await message.edit({ embeds: [winEmbed], components: [] });
    await channel.send(`🎊 Gratulace ${winnerMentions}! Vyhráváte **${gw.prize}** v soutěži od **${gw.host}**!`);
}

client.on('guildMemberAdd', async member => {
    const unverifiedRoleId = process.env.UNVERIFIED_ROLE_ID;
    if (!unverifiedRoleId) return;
    
    const role = member.guild.roles.cache.get(unverifiedRoleId);
    if (role) {
        try {
            await member.roles.add(role);
        } catch (error) {
            console.error(`Chyba při přiřazování unverified role:`, error);
        }
    }
});

client.on('interactionCreate', async interaction => {
    // 1. Zpracování příkazu
    if (interaction.isChatInputCommand()) {
        // PŘÍKAZ /SETUP
        if (interaction.commandName === 'setup') {
            if (!hasPermission(interaction, 'setup')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const embed = new EmbedBuilder()
                .setTitle('⚙️ | Hlavní nastavení serveru')
                .setDescription('Vyber si z menu níže, co konkrétně chceš do tohoto kanálu nastavit a vložit.')
                .setColor('#9b59b6');

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('setup_menu')
                .setPlaceholder('Vyber si z nabídky...')
                .addOptions([
                    {
                        label: 'Nastavit Verifikaci proti robotům',
                        description: 'Pošle panel pouze pro Captcha ověření.',
                        value: 'setup_category_verify',
                        emoji: '🛡️',
                    },
                    {
                        label: 'Nastavit Pravidla serveru',
                        description: 'Pošle pravidla, překladatele a souhlas.',
                        value: 'setup_category_rules',
                        emoji: '📜',
                    },
                    {
                        label: 'Nastavit Nábory do A-Teamu',
                        description: 'Pošle panel s výběrem role přes DM bota.',
                        value: 'setup_category_recruit',
                        emoji: '📋',
                    },
                    {
                        label: 'Nastavit Ticket Systém',
                        description: 'Pošle panel pro otevírání ticketů.',
                        value: 'setup_category_tickets',
                        emoji: '🎫',
                    }
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // PŘÍKAZ /OZNAMENI 
        if (interaction.commandName === 'oznameni') {
            if (!hasPermission(interaction, 'oznameni')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const modal = new ModalBuilder()
                .setCustomId('announcement_modal')
                .setTitle('Vytvořit oznámení komunitě');

            // Pole pro PING/Předzprávu
            const preMessageInput = new TextInputBuilder()
                .setCustomId('announcement_pre_message')
                .setLabel('Text nad oznámením (např. @everyone atd.)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false) 
                .setPlaceholder('Zde můžeš pingnout roli / skupinu...')
                .setMaxLength(100);

            const titleInput = new TextInputBuilder()
                .setCustomId('announcement_title')
                .setLabel('Nadpis (např. 🚀 Nový Update!)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const descInput = new TextInputBuilder()
                .setCustomId('announcement_desc')
                .setLabel('Text uvnitř rámečku')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(preMessageInput),
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descInput)
            );

            await interaction.showModal(modal);
        }

        // PŘÍKAZ /CHANGELOG
        if (interaction.commandName === 'changelog') {
            if (!hasPermission(interaction, 'changelog')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const modal = new ModalBuilder()
                .setCustomId('changelog_modal')
                .setTitle('Vydat nový seznam změn (Changelog)');

            const preMessageInput = new TextInputBuilder()
                .setCustomId('changelog_pre_message')
                .setLabel('Text nad updatem (př. @everyone nebo <@&ID>)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('Můžeš nechat prázdné, použít @everyone, @here nebo přímo vložit roli pomocí formátu: <@&ID_ROLE>')
                .setMaxLength(100);

            const titleInput = new TextInputBuilder()
                .setCustomId('changelog_title')
                .setLabel('Verze / Nadpis (např. 🛠️ Update v1.2.0)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const descInput = new TextInputBuilder()
                .setCustomId('changelog_desc')
                .setLabel('Seznam novinek, oprav a úprav (bodově)')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('- Přidán nový systém\n- Opraven bug s penězi\n- Optimalizován server');

            modal.addComponents(
                new ActionRowBuilder().addComponents(preMessageInput),
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descInput)
            );

            await interaction.showModal(modal);
        }

        // PŘÍKAZ /ODKAZY
        if (interaction.commandName === 'odkazy') {
            if (!hasPermission(interaction, 'odkazy')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const modal = new ModalBuilder()
                .setCustomId('links_modal')
                .setTitle('Sdílet důležité odkazy');

            const preMessageInput = new TextInputBuilder()
                .setCustomId('links_pre_message')
                .setLabel('Text nad odkazy (př. @everyone nebo ID)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('Můžeš nechat prázdné nebo pingnout roli...')
                .setMaxLength(100);

            const titleInput = new TextInputBuilder()
                .setCustomId('links_title')
                .setLabel('Nadpis (např. 🔗 Naše Sociální sítě)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const descInput = new TextInputBuilder()
                .setCustomId('links_desc')
                .setLabel('Seznam odkazů a popis')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Web: https://xeloria.cz\nStore: https://store.xeloria.cz');

            modal.addComponents(
                new ActionRowBuilder().addComponents(preMessageInput),
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descInput)
            );

            await interaction.showModal(modal);
        }

        // PŘÍKAZ /ATEAM
        if (interaction.commandName === 'ateam') {
            if (!hasPermission(interaction, 'ateam')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const modal = new ModalBuilder()
                .setCustomId('ateam_modal')
                .setTitle('Zpráva od Admin Týmu');

            const preMessageInput = new TextInputBuilder()
                .setCustomId('ateam_pre_message')
                .setLabel('Text nad zprávou (př. @everyone nebo ID)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setPlaceholder('Můžeš nechat prázdné nebo pingnout roli...')
                .setMaxLength(100);

            const titleInput = new TextInputBuilder()
                .setCustomId('ateam_title')
                .setLabel('Nadpis (např. 🛡️ Důležité sdělení A-Teamu)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const descInput = new TextInputBuilder()
                .setCustomId('ateam_desc')
                .setLabel('Obsah zprávy / Seznam členů')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Zde vypiš seznam týmu nebo důležité info...');

            modal.addComponents(
                new ActionRowBuilder().addComponents(preMessageInput),
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(descInput)
            );

            await interaction.showModal(modal);
        }

        // PŘÍKAZ /HLASOVANI
        if (interaction.commandName === 'hlasovani') {
            if (!hasPermission(interaction, 'hlasovani')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const ping = interaction.options.getString('ping') || 'none';
            const modal = new ModalBuilder()
                .setCustomId(`poll_modal_${ping}`)
                .setTitle('Vytvořit nové hlasování');

            const questionInput = new TextInputBuilder()
                .setCustomId('poll_question')
                .setLabel('Otázka pro hlasování')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(100);

            const opt1Input = new TextInputBuilder()
                .setCustomId('poll_opt1')
                .setLabel('Možnost A (Povinné)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);

            const opt2Input = new TextInputBuilder()
                .setCustomId('poll_opt2')
                .setLabel('Možnost B (Povinné)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMaxLength(50);

            const opt3Input = new TextInputBuilder()
                .setCustomId('poll_opt3')
                .setLabel('Možnost C (Volitelné)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(50);

            const opt4Input = new TextInputBuilder()
                .setCustomId('poll_opt4')
                .setLabel('Možnost D (Volitelné)')
                .setStyle(TextInputStyle.Short)
                .setRequired(false)
                .setMaxLength(50);

            modal.addComponents(
                new ActionRowBuilder().addComponents(questionInput),
                new ActionRowBuilder().addComponents(opt1Input),
                new ActionRowBuilder().addComponents(opt2Input),
                new ActionRowBuilder().addComponents(opt3Input),
                new ActionRowBuilder().addComponents(opt4Input)
            );

            await interaction.showModal(modal);
        }

        // PŘÍKAZ /GIVEAWAY
        if (interaction.commandName === 'giveaway') {
            if (!hasPermission(interaction, 'giveaway')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const prize = interaction.options.getString('prize');
            const host = interaction.user.tag;
            const durationStr = interaction.options.getString('duration');
            const winnersCount = interaction.options.getInteger('winners');
            
            const durationMs = parseDuration(durationStr);
            if (durationMs <= 0) {
                return interaction.reply({ content: '❌ | Neplatný formát času! Použij např. 10m, 1h, 1d.', ephemeral: true });
            }

            const endAt = Date.now() + durationMs;

            const embed = new EmbedBuilder()
                .setTitle('🎁 | NOVÁ SOUTĚŽ O CENU!')
                .setDescription(`**Hrajeme o:** ${prize}\n\nKlikni na tlačítko níže pro zapojení!`)
                .addFields(
                    { name: '👤 Hostitel:', value: host, inline: true },
                    { name: '🏆 Počet výherců:', value: winnersCount.toString(), inline: true },
                    { name: '⏰ Končí:', value: `<t:${Math.floor(endAt / 1000)}:R>`, inline: false }
                )
                .setColor('#f1c40f')
                .setTimestamp()
                .setFooter({ text: 'Zapojeno: 0 uživatelů • Hodně štěstí všem! 🍀' });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('giveaway_join')
                    .setLabel('Zapojit se!')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎉')
            );

            const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

            const giveawayPath = path.join(__dirname, 'giveaways.json');
            let giveaways = [];
            if (fs.existsSync(giveawayPath)) giveaways = JSON.parse(fs.readFileSync(giveawayPath, 'utf8'));

            giveaways.push({
                messageId: msg.id,
                channelId: interaction.channelId,
                prize,
                host,
                winnersCount,
                endAt,
                participants: [],
                ended: false
            });

            fs.writeFileSync(giveawayPath, JSON.stringify(giveaways, null, 2));
        }

        // PŘÍKAZ /ROLE
        if (interaction.commandName === 'role') {
            if (!hasPermission(interaction, 'role')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const subcommand = interaction.options.getSubcommand();
            const targetUser = interaction.options.getMember('uzivatel');
            const roleInput = interaction.options.getString('role');
            
            // Vyčištění ID z případného mentionu <@&123456>
            const roleId = roleInput.replace(/[<@&>]/g, '');
            const role = interaction.guild.roles.cache.get(roleId);

            if (!targetUser) return interaction.reply({ content: '❌ | Uživatel nebyl nalezen!', ephemeral: true });
            if (!role) return interaction.reply({ content: `❌ | Role s ID \`${roleId}\` nebyla na tomto serveru nalezena!`, ephemeral: true });

            if (subcommand === 'add') {
                try {
                    await targetUser.roles.add(role);
                    await interaction.reply({ content: `✅ | Role **${role.name}** byla úspěšně přidána uživateli **${targetUser.user.tag}** (Trvale).`, ephemeral: true });
                } catch (e) {
                    return interaction.reply({ content: '❌ | Chyba při přidávání role! Zkontrolujte má oprávnění.', ephemeral: true });
                }
            }

            if (subcommand === 'add-temp') {
                const durationStr = interaction.options.getString('doba');
                const durationMs = parseDuration(durationStr);

                if (durationMs <= 0) {
                    return interaction.reply({ content: '❌ | Neplatný formát času! Použij např. 1h, 1d.', ephemeral: true });
                }

                try {
                    await targetUser.roles.add(role);
                    
                    const expireAt = Date.now() + durationMs;
                    const tempRolesPath = path.join(__dirname, 'temp_roles.json');
                    let tempRoles = [];
                    if (fs.existsSync(tempRolesPath)) tempRoles = JSON.parse(fs.readFileSync(tempRolesPath, 'utf8'));

                    tempRoles.push({
                        userId: targetUser.id,
                        roleId: role.id,
                        guildId: interaction.guildId,
                        expireAt: expireAt
                    });

                    fs.writeFileSync(tempRolesPath, JSON.stringify(tempRoles, null, 2));

                    await interaction.reply({ 
                        content: `✅ | Role **${role.name}** byla přidána uživateli **${targetUser.user.tag}** na dobu **${durationStr}**.\nRole vyprší: <t:${Math.floor(expireAt / 1000)}:F>`, 
                        ephemeral: true 
                    });
                } catch (e) {
                    return interaction.reply({ content: '❌ | Chyba při přidávání role! Zkontrolujte má oprávnění.', ephemeral: true });
                }
            }

            if (subcommand === 'remove') {
                try {
                    await targetUser.roles.remove(role);
                    await interaction.reply({ content: `✅ | Role **${role.name}** byla úspěšně odebrána uživateli **${targetUser.user.tag}**.`, ephemeral: true });
                } catch (e) {
                    return interaction.reply({ content: '❌ | Chyba při odebírání role! Zkontrolujte má oprávnění.', ephemeral: true });
                }
            }
        }

        // PŘÍKAZ /DM (MODAL)
        if (interaction.commandName === 'dm') {
            if (!hasPermission(interaction, 'dm')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const subcommand = interaction.options.getSubcommand();
            const targetId = subcommand === 'user' ? interaction.options.getUser('uzivatel').id : 'all';

            const modal = new ModalBuilder()
                .setCustomId(`dm_modal_${targetId}`)
                .setTitle(targetId === 'all' ? 'Hromadná zpráva (ALL)' : 'Soukromá zpráva (USER)');

            const titleInput = new TextInputBuilder()
                .setCustomId('dm_title')
                .setLabel('Nadpis zprávy')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('Např. Důležité upozornění!')
                .setMaxLength(100);

            const messageInput = new TextInputBuilder()
                .setCustomId('dm_message')
                .setLabel('Obsah zprávy')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder('Zde můžeš psát cokoli... > - / \nPodporuje i více řádků.')
                .setMaxLength(2000);

            modal.addComponents(
                new ActionRowBuilder().addComponents(titleInput),
                new ActionRowBuilder().addComponents(messageInput)
            );

            await interaction.showModal(modal);
        }

        // PŘÍKAZ /TEXT
        if (interaction.commandName === 'text') {
            if (!hasPermission(interaction, 'text')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const content = interaction.options.getString('obsah');
            
            try {
                // Pošleme zprávu do kanálu
                await interaction.channel.send({ content: content });
                // Potvrdíme uživateli ephemerálně, že se to povedlo
                await interaction.reply({ content: '✅ | Zpráva byla odeslána.', ephemeral: true });
            } catch (e) {
                console.error(e);
                await interaction.reply({ content: '❌ | Nepodařilo se odeslat zprávu (možná mi chybí práva).', ephemeral: true });
            }
        }

        // PŘÍKAZ /TICKET
        if (interaction.commandName === 'ticket') {
            const mgmtRole = process.env.MGMT_ROLE_ID;
            const supportRole = process.env.SUPPORT_ROLE_ID;
            const partnerRole = process.env.PARTNER_ROLE_ID;

            if (!interaction.member.roles.cache.has(mgmtRole) && !interaction.member.roles.cache.has(supportRole) && !interaction.member.roles.cache.has(partnerRole)) {
                return interaction.reply({ content: '❌ | Tento příkaz může používat pouze vedení nebo podpora.', ephemeral: true });
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'close') {
                if (!interaction.channel.name.startsWith('ticket-')) {
                    return interaction.reply({ content: '❌ | Tento příkaz lze použít pouze uvnitř ticketu.', ephemeral: true });
                }

                const closeEmbed = new EmbedBuilder()
                    .setTitle('🔒 | UZAVŘENÍ TICKETU')
                    .setDescription('Tento ticket bude za **5 sekund** uzavřen a kanál smazán.')
                    .setColor('#e74c3c')
                    .setFooter({ text: `Uzavřel: ${interaction.user.tag}` });

                await interaction.reply({ embeds: [closeEmbed] });

                setTimeout(async () => {
                    try {
                        await interaction.channel.delete();
                    } catch (e) {
                        console.log('Kanál nelze smazat.');
                    }
                }, 5000);
            }

            if (subcommand === 'ban') {
                const targetUser = interaction.options.getUser('hrac');
                const reason = interaction.options.getString('duvod');

                try {
                    await interaction.guild.members.ban(targetUser, { reason: reason });
                    await interaction.reply({ content: `✅ | Uživatel **${targetUser.tag}** byl trvale zabanován za: **${reason}**`, ephemeral: false });
                } catch (e) {
                    await interaction.reply({ content: '❌ | Nepodařilo se udělit ban. Ujisti se, že mám dostatečná práva.', ephemeral: true });
                }
            }

            if (subcommand === 'tempban') {
                const targetUser = interaction.options.getUser('hrac');
                const duration = interaction.options.getString('doba');
                const reason = interaction.options.getString('duvod');

                const timeMs = parseDuration(duration);
                if (!timeMs) return interaction.reply({ content: '❌ | Neplatný formát času! Použij např. 1h, 1d, 30m.', ephemeral: true });

                try {
                    await interaction.guild.members.ban(targetUser, { reason: `(Tempban: ${duration}) ${reason}` });
                    await interaction.reply({ content: `✅ | Uživatel **${targetUser.tag}** byl dočasně zabanován na **${duration}** za: **${reason}**`, ephemeral: false });

                    setTimeout(async () => {
                        try {
                            await interaction.guild.members.unban(targetUser, 'Konec dočasného banu');
                        } catch (e) {
                            console.log('Uživatel již není zabanován nebo unban selhal.');
                        }
                    }, timeMs);
                } catch (e) {
                    await interaction.reply({ content: '❌ | Nepodařilo se udělit tempban.', ephemeral: true });
                }
            }
        }

        // PŘÍKAZ /RANK
        if (interaction.commandName === 'rank') {
            if (!hasPermission(interaction, 'rank')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const target = interaction.options.getUser('uzivatel') || interaction.user;
            const levels = loadLevels();
            const userData = levels[target.id] || { xp: 0, level: 0 };
            
            // Level systém s náhodnými XP (průměr 20 XP na zprávu, level každých ~500 XP)
            const currentLevel = Math.floor(userData.xp / 500);
            const xpInLevel = userData.xp % 500;
            const nextLevelXp = 500;

            const rankEmbed = new EmbedBuilder()
                .setTitle(`📊 | RANK: ${target.tag}`)
                .setThumbnail(target.displayAvatarURL())
                .addFields(
                    { name: 'Úroveň', value: `⭐ ${currentLevel}`, inline: true },
                    { name: 'Pokrok v úrovni', value: `✨ ${xpInLevel} / ${nextLevelXp} XP`, inline: true },
                    { name: 'Celkem bity (XP)', value: `📝 ${userData.xp}`, inline: true }
                )
                .setColor('#f1c40f')
                .setTimestamp();

            await interaction.reply({ embeds: [rankEmbed] });
        }

        // PŘÍKAZ /LEADERBOARD
        if (interaction.commandName === 'leaderboard') {
            if (!hasPermission(interaction, 'leaderboard')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const levels = loadLevels();
            const sorted = Object.entries(levels)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => b.xp - a.xp)
                .slice(0, 10);

            if (sorted.length === 0) return interaction.reply({ content: '❌ | Žebříček je zatím prázdný!', ephemeral: true });

            let lbDesc = '';
            for (let i = 0; i < sorted.length; i++) {
                const user = await client.users.fetch(sorted[i].id).catch(() => null);
                const tag = user ? user.tag : 'Neznámý uživatel';
                lbDesc += `${i + 1}. **${tag}** - Level ${sorted[i].level} (${sorted[i].xp} XP)\n`;
            }

            const lbEmbed = new EmbedBuilder()
                .setTitle('🏆 | ŽEBŘÍČEK ÚROVNÍ (TOP 10)')
                .setDescription(lbDesc)
                .setColor('#e67e22')
                .setTimestamp();

            await interaction.reply({ embeds: [lbEmbed] });
        }

        // PŘÍKAZ /KNP
        if (interaction.commandName === 'knp') {
            if (!hasPermission(interaction, 'knp')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const volba = interaction.options.getString('volba');
            const moznosti = ['kamen', 'nuzky', 'papir'];
            const botVolba = moznosti[Math.floor(Math.random() * moznosti.length)];
            
            const emojis = { kamen: '🪨', nuzky: '✂️', papir: '📄' };
            
            let vysledek = '';
            if (volba === botVolba) vysledek = '👔 **Remíza!**';
            else if (
                (volba === 'kamen' && botVolba === 'nuzky') ||
                (volba === 'nuzky' && botVolba === 'papir') ||
                (volba === 'papir' && botVolba === 'kamen')
            ) vysledek = '🎉 **Vyhrál jsi!**';
            else vysledek = '😢 **Prohrál jsi!**';

            const knpEmbed = new EmbedBuilder()
                .setTitle('🎮 | Kámen, Nůžky, Papír')
                .addFields(
                    { name: 'Tvoje volba', value: `${emojis[volba]} ${volba.charAt(0).toUpperCase() + volba.slice(1)}`, inline: true },
                    { name: 'Moje volba', value: `${emojis[botVolba]} ${botVolba.charAt(0).toUpperCase() + botVolba.slice(1)}`, inline: true },
                    { name: 'Výsledek', value: vysledek }
                )
                .setColor(vysledek.includes('Vyhrál') ? '#2ecc71' : (vysledek.includes('Remíza') ? '#f1c40f' : '#e74c3c'))
                .setTimestamp();

            await interaction.reply({ embeds: [knpEmbed] });
        }

        // PŘÍKAZ /ANONYM
        if (interaction.commandName === 'anonym') {
            if (!hasPermission(interaction, 'anonym')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const text = interaction.options.getString('text');
            const anonymChannelId = process.env.ANONYM_CHANNEL_ID;
            const channel = interaction.guild.channels.cache.get(anonymChannelId);

            if (!channel) return interaction.reply({ content: '❌ | Kanál pro anonymní zprávy nebyl nalezen!', ephemeral: true });

            const anonymEmbed = new EmbedBuilder()
                .setAuthor({ 
                    name: 'Anonym', 
                    iconURL: interaction.guild.iconURL({ dynamic: true }) 
                })
                .setDescription(text)
                .setColor('#2b2d31')
                .setFooter({ 
                    text: `xelorialand • Anonym chat • Použitý příkaz: /anonym • Identita? Neexistuje.`
                })
                .setTimestamp();

            try {
                await channel.send({ embeds: [anonymEmbed] });
                await interaction.reply({ content: '✅ | Tvá anonymní zpráva byla odeslána!', ephemeral: true });

                // LOGOVÁNÍ PRO ADMINY
                const logChannelId = process.env.ANONYM_LOG_CHANNEL_ID;
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🕵️ | ANONYMNÍ LOG')
                        .setDescription(`Uživatel <@${interaction.user.id}> odeslal anonymní zprávu.`)
                        .addFields({ name: 'Obsah:', value: text })
                        .setColor('#e74c3c')
                        .setTimestamp()
                        .setFooter({ text: `ID uživatele: ${interaction.user.id}` });
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (e) {
                await interaction.reply({ content: '❌ | Nepodařilo se odeslat anonymní zprávu.', ephemeral: true });
            }
        }

        // PŘÍKAZ /HODNOCENI
        if (interaction.commandName === 'hodnoceni') {
            if (!hasPermission(interaction, 'hodnoceni')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const typ = interaction.options.getString('typ');
            const targetUser = interaction.options.getUser('uzivatel');
            const reason = interaction.options.getString('duvod');
            const reviewsChannelId = process.env.REVIEWS_CHANNEL_ID;
            const channel = interaction.guild.channels.cache.get(reviewsChannelId);

            if (!channel) return interaction.reply({ content: '❌ | Kanál pro hodnocení nebyl nalezen!', ephemeral: true });
            if (targetUser.id === interaction.user.id) return interaction.reply({ content: '❌ | Nemůžeš hodnotit sám sebe!', ephemeral: true });

            const isPlus = typ === 'plus';
            const reviewEmbed = new EmbedBuilder()
                .setTitle(isPlus ? '👍 Hodnocení – +REP' : '👎 Hodnocení – -REP')
                .addFields(
                    { name: '👤 Hodnotitel', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '🎯 Hodnocený', value: `<@${targetUser.id}>`, inline: true },
                    { name: '📝 Důvod', value: reason }
                )
                .setColor(isPlus ? '#2ecc71' : '#e74c3c')
                .setFooter({ 
                    text: `Xeloria Hodnocení • ${new Date().toLocaleDateString('cs-CZ')} ${new Date().toLocaleTimeString('cs-CZ')}` 
                });

            try {
                await channel.send({ embeds: [reviewEmbed] });
                await interaction.reply({ content: `✅ | Tvé hodnocení (**${isPlus ? '+REP' : '-REP'}**) bylo úspěšně odesláno!`, ephemeral: true });
            } catch (e) {
                await interaction.reply({ content: '❌ | Nepodařilo se odeslat hodnocení.', ephemeral: true });
            }
        }

        if (interaction.commandName === 'odpoved') {
            if (!hasPermission(interaction, 'odpoved')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const targetUser = interaction.options.getUser('uzivatel');
            
            const embed = new EmbedBuilder()
                .setTitle('⚖️ | Vyjádření k náboru')
                .setDescription(`Vyber konečný verdikt pro uživatele <@${targetUser.id}>. Po kliknutí budeš moci napsat doprovodnou zprávu.`)
                .setColor('#f1c40f');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`final_accept_${targetUser.id}`).setLabel('Přijmout').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId(`final_reject_${targetUser.id}`).setLabel('Odmítnout').setStyle(ButtonStyle.Danger).setEmoji('❌')
            );

            await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        }

        // PŘÍKAZY PRO NÁPADY (/prijmout, /zamitnout, /cekase)
        if (['prijmout', 'zamitnout', 'cekase'].includes(interaction.commandName)) {
            if (!hasPermission(interaction, interaction.commandName)) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            const messageId = interaction.options.getString('id');
            const reason = interaction.options.getString('duvod') || 'Neuveden';
            const suggestionsChannelId = process.env.SUGGESTIONS_CHANNEL_ID;
            const channel = interaction.guild.channels.cache.get(suggestionsChannelId);

            if (!channel) return interaction.reply({ content: '❌ | Kanál pro nápady nebyl nalezen!', ephemeral: true });

            try {
                const message = await channel.messages.fetch(messageId);
                if (!message || !message.embeds[0]) return interaction.reply({ content: '❌ | Zpráva s nápadem nebyla nalezena nebo neobsahuje embed!', ephemeral: true });

                const oldEmbed = message.embeds[0];
                const authorMention = oldEmbed.fields.find(f => f.name.includes('Nápad navrhl'))?.value || 'Neznámý';

                let newStatus = '';
                let newColor = '';

                if (interaction.commandName === 'prijmout') {
                    newStatus = '✅ Přijato';
                    newColor = '#2ecc71';
                } else if (interaction.commandName === 'zamitnout') {
                    newStatus = '❌ Zamítnuto';
                    newColor = '#e74c3c';
                } else if (interaction.commandName === 'cekase') {
                    newStatus = '⏳ Čeká se na vyjádření';
                    newColor = '#f1c40f';
                }

                const newEmbed = EmbedBuilder.from(oldEmbed)
                    .setColor(newColor)
                    .spliceFields(2, 1, { name: '📊 Stav:', value: `**${newStatus}**\n\n**Vyjádření:** ${reason}\n**Provedl:** <@${interaction.user.id}>` });

                await message.edit({ embeds: [newEmbed] });
                await interaction.reply({ content: `✅ | Aktualizoval jsi nápad na **${newStatus}**.`, ephemeral: true });

                // ODESLÁNÍ DM AUTOROVI
                const authorIdMatch = oldEmbed.footer?.text?.match(/ID uživatele: (\d+)/);
                if (authorIdMatch) {
                    const authorId = authorIdMatch[1];
                    const authorUser = await client.users.fetch(authorId).catch(() => null);
                    if (authorUser) {
                        const dmEmbed = new EmbedBuilder()
                            .setTitle('💡 | Tvůj nápad byl aktualizován!')
                            .setDescription(`Tvůj nápad na serveru **${interaction.guild.name}** byl aktualizován.`)
                            .addFields(
                                { name: '📊 Nový stav:', value: `**${newStatus}**` },
                                { name: '📝 Vyjádření:', value: reason },
                                { name: '👤 Provedl:', value: `<@${interaction.user.id}>` }
                            )
                            .setColor(newColor)
                            .setTimestamp();
                        
                        await authorUser.send({ embeds: [dmEmbed] }).catch(() => console.log(`[NÁPADY] Nepodařilo se poslat DM uživateli ${authorId}.`));
                    }
                }

            } catch (e) {
                console.error('[NÁPADY] Chyba při úpravě:', e);
                await interaction.reply({ content: '❌ | Došlo k chybě při hledání nebo úpravě zprávy. Ujisti se, že ID je správné.', ephemeral: true });
            }
        }

        // PŘÍKAZ /PRIKAZ (SPRÁVA OPRÁVNĚNÍ)
        if (interaction.commandName === 'prikaz') {
            if (!interaction.member.permissions.has('Administrator')) return interaction.reply({ content: '❌ | Tento příkaz může používat pouze administrátor!', ephemeral: true });

            const group = interaction.options.getSubcommandGroup();
            const subgroup = interaction.options.getSubcommand();
            const commandName = interaction.options.getString('prikaz').toLowerCase();
            const perms = loadPermissions();

            if (!perms[commandName]) perms[commandName] = { users: [], roles: [] };

            if (group === 'add') {
                if (subgroup === 'user') {
                    const user = interaction.options.getUser('uzivatel');
                    if (!perms[commandName].users.includes(user.id)) {
                        perms[commandName].users.push(user.id);
                        savePermissions(perms);
                        await interaction.reply({ content: `✅ | Uživatel <@${user.id}> nyní může používat příkaz \`/${commandName}\`.`, ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ | Tento uživatel již má oprávnění.', ephemeral: true });
                    }
                } else if (subgroup === 'role') {
                    const role = interaction.options.getRole('role');
                    if (!perms[commandName].roles.includes(role.id)) {
                        perms[commandName].roles.push(role.id);
                        savePermissions(perms);
                        await interaction.reply({ content: `✅ | Role **${role.name}** nyní může používat příkaz \`/${commandName}\`.`, ephemeral: true });
                    } else {
                        await interaction.reply({ content: '❌ | Tato role již má oprávnění.', ephemeral: true });
                    }
                }
            } else if (group === 'remove') {
                if (subgroup === 'user') {
                    const user = interaction.options.getUser('uzivatel');
                    perms[commandName].users = perms[commandName].users.filter(id => id !== user.id);
                    savePermissions(perms);
                    await interaction.reply({ content: `✅ | Uživateli <@${user.id}> bylo odebráno oprávnění k příkazu \`/${commandName}\`.`, ephemeral: true });
                } else if (subgroup === 'role') {
                    const role = interaction.options.getRole('role');
                    perms[commandName].roles = perms[commandName].roles.filter(id => id !== role.id);
                    savePermissions(perms);
                    await interaction.reply({ content: `✅ | Roli **${role.name}** bylo odebráno oprávnění k příkazu \`/${commandName}\`.`, ephemeral: true });
                }
            }
        }

        // PŘÍKAZ /RESET_COUNT
        if (interaction.commandName === 'reset_count') {
            if (!hasPermission(interaction, 'reset_count')) return interaction.reply({ content: '❌ | Na tohle nemáš oprávnění!', ephemeral: true });
            
            const countingData = { currentNumber: 0, lastUserId: "" };
            saveCounting(countingData);
            
            await interaction.reply({ content: '🔄 | Počítání bylo resetováno! Začínáme znovu od **1**.' });
        }

        // PŘÍKAZ /VERIFY
        if (interaction.commandName === 'verify') {
            const sub = interaction.options.getSubcommand();
            if (sub === 'reload') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ | Tohle může jen Administrátor!', ephemeral: true });
                const channelId = process.env.VERIFY_CHANNEL_ID;
                const channel = interaction.guild.channels.cache.get(channelId) || await interaction.guild.channels.fetch(channelId).catch(() => null);
                if (!channel) return interaction.reply({ content: '❌ | Kanál pro verifikaci nebyl nalezen v `.env`!', ephemeral: true });

                const embed = new EmbedBuilder()
                    .setTitle('🔐 | VERIFIKACE')
                    .setDescription('Vítej na serveru!\n\nPro odemčení všech kanálů a získání plného přístupu prosím klikni na tlačítko níže **Ověřit se**.\nNásledně se ti otevře okno, do kterého opíšeš zobrazený kód.\n\nTím ověříme, že nejsi robot. 🤖')
                    .setColor('#3498db');

                const button = new ButtonBuilder().setCustomId('verify_only_button').setLabel('Ověřit se proti robotům').setStyle(ButtonStyle.Primary).setEmoji('🛡️');
                await channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
                await interaction.reply({ content: `✅ | Verifikační panel byl znovu odeslán do <#${channelId}>!`, ephemeral: true });
            }
        }
    }

    // 2. Tlačítka z MENU výběru do chatu (/setup)
    if (interaction.isStringSelectMenu() && interaction.customId === 'setup_menu') {
        const selected = interaction.values[0];

        if (selected === 'setup_category_verify') {
            const embed = new EmbedBuilder()
                .setTitle('🔐 | VERIFIKACE')
                .setDescription('Vítej na serveru!\n\nPro odemčení všech kanálů a získání plného přístupu prosím klikni na tlačítko níže **Ověřit se**.\nNásledně se ti otevře okno, do kterého opíšeš zobrazený kód.\n\nTím ověříme, že nejsi robot. 🤖')
                .setColor('#3498db');

            const button = new ButtonBuilder().setCustomId('verify_only_button').setLabel('Ověřit se proti robotům').setStyle(ButtonStyle.Primary).setEmoji('🛡️');
            await interaction.channel.send({ embeds: [embed], components: [new ActionRowBuilder().addComponents(button)] });
            await interaction.reply({ content: '✅ | Verifikační panel úspěšně nastaven do tohoto kanálu!', ephemeral: true });
        }

        if (selected === 'setup_category_rules') {
            const embeds = getRulesEmbeds('cs');
            const components = getRulesComponents();
            await interaction.channel.send({ embeds: embeds, components: components });
            await interaction.reply({ content: '✅ | Pravidla úspěšně nahrána do tohoto kanálu!', ephemeral: true });
        }

        if (selected === 'setup_category_recruit') {
            const embed = new EmbedBuilder()
                .setTitle('📋 | Nábor do A-Týmu XELORIA')
                .setDescription('Chceš se podílet na růstu naší komunity? Vyber si pozici, která ti nejvíce sedí, a začni svůj pohovor přímo v soukromých zprávách!\\n\\n*(Ujisti se, že máš povolené DM zprávy od členů serveru!)*')
                .addFields(
                    { name: '💻 Developer', value: 'Kódování a technické inovace.', inline: true },
                    { name: '🔧 Technik', value: 'Konfigurace pluginů a Discordu.', inline: true },
                    { name: '🔨 Builder', value: 'Stavba map a WorldEdit projekty.', inline: true },
                    { name: '🛡️ Helper', value: 'Podpora hráčů a dohled na chatu.', inline: true },
                    { name: '🎪 Eventer', value: 'Pořádání akcí a soutěží.', inline: true }
                )
                .setColor('#2ecc71')
                .setImage('attachment://recruitment_banner.png');

            const buttons1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('recruit_btn_Developer').setLabel('Developer').setStyle(ButtonStyle.Primary).setEmoji('💻'),
                new ButtonBuilder().setCustomId('recruit_btn_Technik').setLabel('Technik').setStyle(ButtonStyle.Secondary).setEmoji('🔧'),
                new ButtonBuilder().setCustomId('recruit_btn_Builder').setLabel('Builder').setStyle(ButtonStyle.Success).setEmoji('🔨')
            );
            const buttons2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('recruit_btn_Helper').setLabel('Helper').setStyle(ButtonStyle.Primary).setEmoji('🛡️'),
                new ButtonBuilder().setCustomId('recruit_btn_Eventer').setLabel('Eventer').setStyle(ButtonStyle.Danger).setEmoji('🎪')
            );

            await interaction.channel.send({ 
                embeds: [embed], 
                components: [buttons1, buttons2],
                files: [{ attachment: 'C:\\Users\\Matěj\\.gemini\\antigravity\\brain\\6fb41a0a-2e45-48bf-be4e-f928ce43ac3d\\recruitment_banner_zelori_1773450034412.png', name: 'recruitment_banner.png' }]
            });
            await interaction.reply({ content: '✅ | Panel náborů byl vyčištěn a profesionálně nastaven!', ephemeral: true });
        }

        if (selected === 'setup_category_tickets') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 | TICKET SYSTÉM - PODPORA')
                .setDescription('Vítej v naší podpoře! Pro otevírení ticketu vyber téma z příslušné nabídky níže.\n\n👑 **Ticket s vedením** - Pro vážné věci, stížnosti na tým, bugy či spolupráce.\n💬 **Normální ticket** - Pro běžnou pomoc, nahlášení hráčů nebo žádosti o Unban.')
                .setColor('#3498db')
                .setThumbnail(interaction.guild.iconURL());

            const mgmtMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_mgmt_select')
                .setPlaceholder('Ticket s vedením')
                .addOptions([
                    { label: 'Nahlásit člena A-Týmu', value: 'ticket_mgmt_complaint', emoji: '⚖️' },
                    { label: 'Nahlásit závažný Bug', value: 'ticket_mgmt_bug', emoji: '🐛' },
                    { label: 'Reset hesla / Účet', value: 'ticket_mgmt_account', emoji: '🔐' },
                    { label: 'Spolupráce / Partnerství', value: 'ticket_mgmt_partner', emoji: '🤝' }
                ]);

            const normalMenu = new StringSelectMenuBuilder()
                .setCustomId('ticket_normal_select')
                .setPlaceholder('Normální ticket')
                .addOptions([
                    { label: 'Žádost o zrušení/zkrácení trestu', value: 'ticket_unban', emoji: '⚖️' },
                    { label: 'Nahlášení hráče', value: 'ticket_report_player', emoji: '🚫' },
                    { label: 'Jiné / Ostatní', value: 'ticket_other', emoji: '❔' }
                ]);

            await interaction.channel.send({ 
                embeds: [embed], 
                components: [
                    new ActionRowBuilder().addComponents(mgmtMenu),
                    new ActionRowBuilder().addComponents(normalMenu)
                ] 
            });
            await interaction.reply({ content: '✅ | Ticket systém byl úspěšně nastaven!', ephemeral: true });
        }
    }

    // HANDLER PRO OTEVŘENÍ TICKETU (Z MENU)
    if (interaction.isStringSelectMenu() && (interaction.customId === 'ticket_mgmt_select' || interaction.customId === 'ticket_normal_select')) {
        const category = interaction.values[0];
        const categoryLabels = {
            'ticket_mgmt_complaint': '⚖️ Nahlášení člena AT',
            'ticket_mgmt_bug': '🐛 Nahlášení Bugu',
            'ticket_mgmt_account': '🔐 Reset hesla',
            'ticket_mgmt_partner': '🤝 Spolupráce',
            'ticket_unban': '⚖️ Žádost o Unban',
            'ticket_report_player': '🚫 Nahlášení hráče',
            'ticket_other': '❔ Jiné'
        };

        const ticketsPath = path.join(__dirname, 'tickets.json');
        let ticketData = { count: 0 };
        if (fs.existsSync(ticketsPath)) ticketData = JSON.parse(fs.readFileSync(ticketsPath, 'utf8'));
        
        ticketData.count++;
        fs.writeFileSync(ticketsPath, JSON.stringify(ticketData, null, 2));

        const ticketName = `ticket-${ticketData.count.toString().padStart(4, '0')}`;
        const categoryId = process.env.TICKETS_CATEGORY_ID;
        
        // Rozlišení role podle toho, zda jde o vedení, podporu nebo partnerství
        let targetRoleId = process.env.SUPPORT_ROLE_ID;
        if (category.startsWith('ticket_mgmt')) {
            targetRoleId = category === 'ticket_mgmt_partner' ? process.env.PARTNER_ROLE_ID : process.env.MGMT_ROLE_ID;
        }

        try {
            const ticketChannel = await interaction.guild.channels.create({
                name: ticketName,
                type: 0, // GuildText
                parent: categoryId,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id,
                        deny: ['ViewChannel']
                    },
                    {
                        id: interaction.user.id,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
                    },
                    {
                        id: process.env.MGMT_ROLE_ID,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
                    },
                    {
                        id: process.env.SUPPORT_ROLE_ID,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
                    },
                    {
                        id: process.env.PARTNER_ROLE_ID,
                        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles']
                    }
                ]
            });

            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`🎫 | TICKET: ${categoryLabels[category]}`)
                .setDescription(`Ahoj <@${interaction.user.id}>,\nvítej ve svém ticketu. Naši administrátoři se ti budou věnovat hned, jak to bude možné.`)
                .addFields({ name: 'Kategorie:', value: categoryLabels[category], inline: true })
                .setColor(category.startsWith('ticket_mgmt') ? '#c0392b' : '#3498db')
                .setTimestamp()
                .setFooter({ text: 'Xelori Community • Podpora' });

            const callStaffButton = new ButtonBuilder()
                .setCustomId('ticket_call_staff')
                .setLabel('Přivolat A-T')
                .setStyle(ButtonStyle.Success)
                .setEmoji('🔔');

            const welcomeMsg = await ticketChannel.send({ 
                content: `<@${interaction.user.id}> | <@&${targetRoleId}>`,
                embeds: [welcomeEmbed],
                components: [new ActionRowBuilder().addComponents(callStaffButton)]
            });

            // LOGOVÁNÍ VYTVOŘENÍ TICKETU
            const logChannelId = process.env.TICKETS_LOG_CHANNEL_ID;
            if (logChannelId) {
                const logChannel = interaction.guild.channels.cache.get(logChannelId);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setTitle('🆕 | NOVÝ TICKET')
                        .setDescription(`Hráč **${interaction.user.tag}** si právě vytvořil ticket.`)
                        .addFields(
                            { name: 'Uživatel', value: `<@${interaction.user.id}>`, inline: true },
                            { name: 'Kanál', value: `<#${ticketChannel.id}>`, inline: true },
                            { name: 'Kategorie', value: categoryLabels[category], inline: true }
                        )
                        .setColor('#2ecc71')
                        .setTimestamp();
                    
                    await logChannel.send({ embeds: [logEmbed] });
                }
            }

            await interaction.reply({ content: `✅ | Tvůj ticket byl vytvořen: <#${ticketChannel.id}>`, ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ | Nepodařilo se vytvořit ticket. Kontaktuj administrátora.', ephemeral: true });
        }
    }

    // HANDLER PRO PŘIVOLÁNÍ AT
    if (interaction.isButton() && interaction.customId === 'ticket_call_staff') {
        const logChannelId = process.env.TICKETS_LOG_CHANNEL_ID;
        if (!logChannelId) return interaction.reply({ content: '❌ | Log kanál není nastaven.', ephemeral: true });

        const logChannel = interaction.guild.channels.cache.get(logChannelId);
        if (logChannel) {
            const callEmbed = new EmbedBuilder()
                .setTitle('🔔 | PŘIVOLÁNÍ AT')
                .setDescription(`Hráč **${interaction.user.tag}** přivolal administrátora k ticketu.`)
                .addFields(
                    { name: 'Kanál', value: `<#${interaction.channel.id}>`, inline: true },
                    { name: 'Uživatel', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setColor('#f1c40f')
                .setTimestamp();

            const pingRoleId = process.env.TICKET_PING_ROLE_ID;
            const logContent = pingRoleId ? `<@&${pingRoleId}>` : '';

            await logChannel.send({ content: logContent, embeds: [callEmbed] });
            await interaction.reply({ content: '✅ | Administrátoři byli informováni v logách.', ephemeral: true });
            
            // Deaktivujeme tlačítko, aby se nespamovalo
            const originalEmbed = interaction.message.embeds[0];
            await interaction.message.edit({ 
                embeds: [originalEmbed], 
                components: [] 
            });
        }
    }

    // HANDLER PRO ZAVŘENÍ TICKETU (Smazáno na žádost uživatele - nahrazeno příkazem)
    /*
    if (interaction.isButton() && interaction.customId === 'ticket_close') {
        ...
    }
    */

    // Handlery pro náborová tlačítka a menu
    if (interaction.isStringSelectMenu() && interaction.customId === 'recruit_select' || (interaction.isButton() && interaction.customId.startsWith('recruit_btn_'))) {
        const roleName = interaction.isStringSelectMenu() ? interaction.values[0] : interaction.customId.replace('recruit_btn_', '');
        const data = recruitData[roleName];
        
        if (activeApplications.has(interaction.user.id)) {
            return interaction.reply({ content: `❌ | Aktuálně už máš rozehraný jeden běžící pohovor v soukromých zprávách! Buď jej dopiš do konce, nebo vyčkej na vypršení zkušebních 20 minut a zkus to pak znovu zde.`, ephemeral: true });
        }

        try {
            const recruitEmbed = new EmbedBuilder()
                .setTitle(`👋 Nábor na pozici: ${roleName}`)
                .setDescription(`Rádi tě vidíme! Vybral(a) jsi si nábor na pozici **${roleName}**.\n\n📖 **Co budeš dělat?**\n${data.description}\n\n📝 **Jak to bude probíhat?**\nČeká tě celkem **15 otázek**. Odpovídej prosím srozumitelně. Na celý proces máš limit **20 minut**.\n\nKliknutím na tlačítko níže nábor **oficiálně zahájíš** nebo jej můžeš **zrušit**.`)
                .setColor('#2ecc71')
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`start_recruit_flow_${roleName}`).setLabel('Spustit nábor').setStyle(ButtonStyle.Success).setEmoji('🚀'),
                new ButtonBuilder().setCustomId(`cancel_recruit_flow`).setLabel('Ukončit nábor').setStyle(ButtonStyle.Danger)
            );

            await interaction.user.send({ embeds: [recruitEmbed], components: [row] });
            await interaction.reply({ content: `✅ | Výborně! Koukni do svých **Soukromých zpráv (DM)**, poslal jsem ti tam úvodní informace a čekám na tvé potvrzení o spuštění!`, ephemeral: true });
        } catch (e) {
            return interaction.reply({ content: `❌ | Nepodařilo se mi ti napsat do DM. Ujisti se prosím ve svém Nastavení soukromí na Discordu, že máš povolené přijímání soukromých zpráv pro tento server!`, ephemeral: true });
        }
    }

    // HANDLER PRO TLAČÍTKA UVNITŘ DM (START/STOP)
    if (interaction.isButton() && (interaction.customId.startsWith('start_recruit_flow_') || interaction.customId === 'cancel_recruit_flow')) {
        const logChannelId = process.env.RECRUIT_APPLICATIONS_CHANNEL_ID;
        const logChannel = client.channels.cache.get(logChannelId);

        if (interaction.customId === 'cancel_recruit_flow') {
            if (logChannel) await logChannel.send(`🛑 | Uživatel **${interaction.user.tag}** (<@${interaction.user.id}>) právě **UKONČIL** nebo zrušil začátek svého náboru.`);
            return interaction.update({ content: '❌ | Nábor byl na tvou žádost ukončen. Kdykoliv můžeš zkusit začít znovu v kanálu náborů.', embeds: [], components: [] });
        }

        const roleName = interaction.customId.replace('start_recruit_flow_', '');
        const data = recruitData[roleName];

        if (logChannel) await logChannel.send(`🚀 | Uživatel **${interaction.user.tag}** (<@${interaction.user.id}>) právě **SPUSTIL** svůj nábor na pozici **${roleName}**.`);

        // Zahájení sběru!
        activeApplications.set(interaction.user.id, { role: roleName, currentQuestion: 0, answers: [] });
        
        const firstQuestionEmbed = new EmbedBuilder()
            .setTitle('🎬 Nábor zahájen!')
            .setDescription(`Zde je tvá první otázka:\n\n**${data.questions[0]}**`)
            .setColor('#3498db');

        await interaction.update({ 
            content: null,
            embeds: [firstQuestionEmbed], 
            components: [] 
        });

        const dmChannel = await interaction.user.createDM();
        const filter = m => m.author.id === interaction.user.id;
        const collector = dmChannel.createMessageCollector({ filter, time: 1200000 }); // 20 minut limit

        collector.on('collect', async m => {
            // Získáme zmapovaná data přímo podle ID autora zprávy
            const app = activeApplications.get(m.author.id);
            if (!app) return;
            
            // Načteme otázky pro danou roli
            const roleData = recruitData[app.role];
            if (!roleData) return;

            app.answers.push(m.content);
            app.currentQuestion++;
            
            if (app.currentQuestion < roleData.questions.length) {
                const nextQuestionEmbed = new EmbedBuilder()
                    .setTitle(`Otázka ${app.currentQuestion + 1} / ${roleData.questions.length}`)
                    .setDescription(`**${roleData.questions[app.currentQuestion]}**`)
                    .setColor('#3498db');
                    
                await m.author.send({ embeds: [nextQuestionEmbed] });
            } else {
                collector.stop('completed');
            }
        });

        collector.on('end', async (collected, reason) => {
            const app = activeApplications.get(interaction.user.id);
            if (!app) return;
            activeApplications.delete(interaction.user.id);

            if (reason === 'completed') {
                const finishEmbed = new EmbedBuilder()
                    .setTitle('🎉 Nábor dokončen!')
                    .setDescription('**Všechny tvé odpovědi byly úspěšně zaznamenány.**\n\nTvůj nábor jsme odeslali na kontrolu vedení serveru (A-Teamu). Výsledek se dozvíš v nejbližší době prostřednictvím DM zprávy od tohoto bota. Buď prosím trpělivý/á.\n\n*Děkujeme za tvůj čas a zájem o naši komunitu!*')
                    .setColor('#2ecc71')
                    .setTimestamp();

                await interaction.user.send({ embeds: [finishEmbed] });
                
                const logChannelId = process.env.RECRUIT_APPLICATIONS_CHANNEL_ID;
                if (!logChannelId) return;
                const logChannel = client.channels.cache.get(logChannelId);
                
                if (logChannel) {
                    const embedsToSend = [];
                    let currentEmbed = new EmbedBuilder()
                        .setTitle(`📝 | Nová Přihláška na pozici: ${app.role}`)
                        .setColor('#9b59b6')
                        .setThumbnail(interaction.user.displayAvatarURL());
                    
                    let totalLength = currentEmbed.data.title?.length || 0;

                    data.questions.forEach((q, idx) => {
                        let ans = app.answers[idx] || "Bez odpovědi.";
                        if (ans.length > 1024) ans = ans.substring(0, 1021) + '...';
                        
                        const fieldName = q.substring(0, 256);
                        const fieldCalc = fieldName.length + ans.length;

                        // Stránkování - Discord limituje jeden embed max na 6000 prvků
                        if (totalLength + fieldCalc > 5500 || currentEmbed.data.fields?.length === 25) {
                            embedsToSend.push(currentEmbed);
                            currentEmbed = new EmbedBuilder().setColor('#9b59b6');
                            totalLength = 0;
                        }

                        currentEmbed.addFields({ name: fieldName, value: ans });
                        totalLength += fieldCalc;
                    });
                    
                    embedsToSend.push(currentEmbed);

                    await logChannel.send({ 
                        content: `📣 **Uchazeč o připojení do A-Teamu**\\n**Discord účet:** <@${interaction.user.id}> (${interaction.user.id})\\n**Požaduje roli:** ${app.role}`,
                        embeds: embedsToSend, 
                        components: [
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId(`app_accept_${interaction.user.id}`).setLabel('Vyhovuje! Přijmout nábor').setStyle(ButtonStyle.Success),
                                new ButtonBuilder().setCustomId(`app_reject_${interaction.user.id}`).setLabel('Nevyhovuje, Zamítnout!').setStyle(ButtonStyle.Danger)
                            )
                        ]
                    });
                }
            } else {
                await interaction.user.send("🕒 **Těch 20 minut nám bezesporu uteklo!** Tvá žádost do týmu byla kvůli vypršení přesného časového limitu automaticky vymazána a zrušena. Pokud stále nedokážeš odpovídat takto rychle, pošli nám to příště ještě jednou znovu a rychleji!");
            }
        });
    }

    // 3. Ostatní jednoduchá klikátka (Jazyky, Ověření, Souhlas)
    if (interaction.isButton()) {
        
        // Změna jazyku
        if (interaction.customId.startsWith('lang_')) {
            const lang = interaction.customId.split('_')[1];
            const embeds = getRulesEmbeds(lang);
            // Uděláme to jako ephemeral, aby to viděl jen ten, kdo klikl
            await interaction.reply({ embeds: embeds, ephemeral: true });
        }

        // Tlačítko verifikace (Z chatu)
        if (interaction.customId === 'verify_only_button') {
            const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
            const unverifiedRoleId = process.env.UNVERIFIED_ROLE_ID;

            console.log(`[VERIFY-DEBUG] Kliknuto uživatelem ${interaction.user.tag}. Role na serveru: ${interaction.member.roles.cache.map(r => r.name).join(', ')}`);

            if (interaction.member.roles.cache.has(verifiedRoleId)) {
                if (unverifiedRoleId && interaction.member.roles.cache.has(unverifiedRoleId)) {
                    await interaction.member.roles.remove(unverifiedRoleId).catch(() => {});
                }
                return interaction.reply({ content: '✅ | Tvůj účet už je plně ověřen (máš roli Hráč). Pokud chceš testovat kód, odeber si tuto roli.', ephemeral: true });
            }
            
            const captchaCode = crypto.randomBytes(3).toString('hex').toUpperCase();

            const modal = new ModalBuilder()
                .setCustomId(`verify_modal_${captchaCode}`)
                .setTitle(`🔐 | Ověření (Kód: ${captchaCode})`);

            const input = new TextInputBuilder()
                .setCustomId('verify_input')
                .setLabel(`Opište kód z nadpisu: ${captchaCode}`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Vepiš kód sem...')
                .setRequired(true)
                .setMinLength(captchaCode.length)
                .setMaxLength(captchaCode.length);

            modal.addComponents(new ActionRowBuilder().addComponents(input));

            await interaction.showModal(modal);
            console.log(`[VERIFY-DEBUG] Zobrazen modal pro ${interaction.user.tag}. Kód: ${captchaCode}`);
        }

        // TLAČÍTKO SOUHLASU
        if (interaction.customId === 'agree_rules_button') {
            const userId = interaction.user.id;
            if (agreedUsers.includes(userId)) return interaction.reply({ content: '😊 | S pravidly jsi už souhlasil(a), děkujeme!', ephemeral: true });

            agreedUsers.push(userId);
            fs.writeFileSync(dataPath, JSON.stringify(agreedUsers)); 
            await interaction.update({ components: getRulesComponents() });
            
            await interaction.followUp({ content: '✅ | Děkujeme za to, že jsi odsouhlasil(a) pravidla!', ephemeral: true });
        }

        // TLAČÍTKA AKCEPTOVÁNÍ A ODMÍTNUTÍ VE VÝSLEDKOVÉ ZPRÁVĚ U NÁBORŮ (MODALY)
        if (interaction.customId.startsWith('app_accept_') || interaction.customId.startsWith('app_reject_')) {
            const isAccept = interaction.customId.startsWith('app_accept_');
            const targetId = interaction.customId.split('_')[2];

            const modal = new ModalBuilder()
                .setCustomId(`verdict_modal_${isAccept ? 'acc' : 'rej'}_${targetId}`)
                .setTitle(isAccept ? 'Schválit uchazeče' : 'Zamítnout uchazeče');

            const messageInput = new TextInputBuilder()
                .setCustomId('verdict_message')
                .setLabel('Důvod / Zpráva pro uchazeče')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder(isAccept ? 'Gratulujeme, byl jsi vybrán do týmu a postupuješ do 2. kola...' : 'Bohužel tvůj nábor nespňuje naše požadavky...');

            modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
            
            // Editujeme původní zprávu aby zmizela tlačítka (v A-Teamu už nebude potřeba znova klikat)
            await interaction.message.edit({ components: [] }).catch(console.error);
            await interaction.showModal(modal);
        }

        // FINÁLNÍ VERDIKT PŘES /ODPOVED (MODALY)
        if (interaction.customId.startsWith('final_accept_') || interaction.customId.startsWith('final_reject_')) {
            const isAccept = interaction.customId.startsWith('final_accept_');
            const targetId = interaction.customId.split('_')[2];

            const modal = new ModalBuilder()
                .setCustomId(`verdict_modal_${isAccept ? 'acc' : 'rej'}_${targetId}`)
                .setTitle(isAccept ? 'Schválit uchazeče' : 'Zamítnout uchazeče');

            const messageInput = new TextInputBuilder()
                .setCustomId('verdict_message')
                .setLabel('Důvod / Zpráva pro uchazeče')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setPlaceholder(isAccept ? 'Gratulujeme, byl jsi vybrán do týmu...' : 'Bohužel tvůj nábor nespňuje naše požadavky...');

            modal.addComponents(new ActionRowBuilder().addComponents(messageInput));
            await interaction.showModal(modal);
        }

        // ZPRACOVÁNÍ KLIKNUTÍ NA HLASOVACÍ TLAČÍTKA
        if (interaction.customId.startsWith('poll_vote_')) {
            const pollDataPath = path.join(__dirname, 'polls.json');
            let polls = {};
            if (fs.existsSync(pollDataPath)) {
                polls = JSON.parse(fs.readFileSync(pollDataPath, 'utf8'));
            }

            const parts = interaction.customId.split('_');
            const msgId = interaction.message.id;
            const optionIndex = parseInt(parts[parts.length - 1]);

            if (!polls[msgId]) {
                return interaction.reply({ content: '❌ | Data k tomuto hlasování nebyla nalezena.', ephemeral: true });
            }

            const userId = interaction.user.id;
            if (polls[msgId].votes[userId] === optionIndex) {
                return interaction.reply({ content: '❌ | Pro tuhle možnost už jsi hlasoval(a)!', ephemeral: true });
            }

            polls[msgId].votes[userId] = optionIndex;
            fs.writeFileSync(pollDataPath, JSON.stringify(polls, null, 2));

            // Přepočet všech možností
            const counts = polls[msgId].options.map((_, idx) => 
                Object.values(polls[msgId].votes).filter(v => v === idx).length
            );

            const emojis = ['🔹', '🔸', '🟢', '🟡'];
            const originalEmbed = interaction.message.embeds[0];
            
            const newFields = polls[msgId].options.map((opt, idx) => ({
                name: `${emojis[idx]} ${opt}`,
                value: `${counts[idx]} hlasů`,
                inline: true
            }));

            const totalVotes = Object.keys(polls[msgId].votes).length;
            const updatedEmbed = EmbedBuilder.from(originalEmbed)
                .setFields(newFields)
                .setFooter({ 
                    text: `Celkem hlasovalo: ${totalVotes} • Hlasování zahájil: ${originalEmbed.footer.text.split(' • ')[1] || originalEmbed.footer.text}`, 
                    iconURL: originalEmbed.footer.iconURL 
                });

            const labels = ['Možnost A', 'Možnost B', 'Možnost C', 'Možnost D'];
            const newRow = new ActionRowBuilder();
            polls[msgId].options.forEach((_, idx) => {
                newRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poll_vote_${idx}`)
                        .setLabel(`${labels[idx]} (${counts[idx]})`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(emojis[idx])
                );
            });

            try {
                await interaction.update({ embeds: [updatedEmbed], components: [newRow] });
            } catch (err) {
                if (err.code === 10062) {
                    // Ignorujeme Unknown Interaction, stává se při rychlém klikání
                    console.log('[POLL] Interakce vypršela (10062), ale hlas byl pravděpodobně uložen.');
                } else {
                    console.error('Chyba při aktualizaci hlasování:', err);
                }
            }
            console.log(`[VOTE] ${interaction.user.tag} hlasoval pro možnost ${optionIndex + 1} (${polls[msgId].options[optionIndex]})`);
        }

        // ZPRACOVÁNÍ ZAPOJENÍ DO GIVEAWAY
        if (interaction.customId === 'giveaway_join') {
            const giveawayPath = path.join(__dirname, 'giveaways.json');
            if (!fs.existsSync(giveawayPath)) return;
            
            let giveaways = JSON.parse(fs.readFileSync(giveawayPath, 'utf8'));
            const gw = giveaways.find(g => g.messageId === interaction.message.id);
            
            if (!gw) return interaction.reply({ content: '❌ | Tato soutěž již neexistuje v databázi.', ephemeral: true });
            if (gw.ended) return interaction.reply({ content: '❌ | Tato soutěž již skončila!', ephemeral: true });

            if (gw.participants.includes(interaction.user.id)) {
                return interaction.reply({ content: '❌ | **Již jsi se zapojil!** Nemůžeš se zapojit vícekrát.', ephemeral: true });
            }

            gw.participants.push(interaction.user.id);
            fs.writeFileSync(giveawayPath, JSON.stringify(giveaways, null, 2));

            // Aktualizace Embedu s počtem lidí
            const currentEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(currentEmbed)
                .setFooter({ text: `Zapojeno: ${gw.participants.length} uživatelů • Hodně štěstí všem! 🍀` });

            await interaction.update({ embeds: [updatedEmbed] }).catch(() => {});
            
            // DM Zpráva
            const dmEmbed = new EmbedBuilder()
                .setTitle('🎉 | Potvrzení zapojení')
                .setDescription(`Právě jsi se zapojil do soutěže o **${gw.prize}** na serveru Xeloria Community!`)
                .setColor('#3498db')
                .setTimestamp();
            
            await interaction.user.send({ embeds: [dmEmbed] }).catch(() => console.log(`[GW] Nepodařilo se poslat DM uživateli ${interaction.user.tag}`));
        }
    }

    // 4. Modály u oznámení a changelogu!
    if (interaction.isModalSubmit()) {
        
        // Zpracování verifikace
        if (interaction.customId.startsWith('verify_modal_')) {
            const expectedCode = interaction.customId.replace('verify_modal_', '');
            const inputCode = interaction.fields.getTextInputValue('verify_input').trim().toUpperCase();
            
            if (inputCode === expectedCode) {
                console.log(`[VERIFY-DEBUG] Uživatel ${interaction.user.tag} zadal SPRÁVNÝ kód v Modalu: ${inputCode}`);
                try {
                    const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
                    const unverifiedRoleId = process.env.UNVERIFIED_ROLE_ID;
                    const vRole = interaction.guild.roles.cache.get(verifiedRoleId);
                    const uvRole = interaction.guild.roles.cache.get(unverifiedRoleId);
                    
                    if (vRole) await interaction.member.roles.add(vRole);
                    if (uvRole) await interaction.member.roles.remove(uvRole);

                    // LOGOVÁNÍ
                    const logChannelId = process.env.VERIFY_LOG_CHANNEL_ID;
                    if (logChannelId) {
                        const logChannel = interaction.guild.channels.cache.get(logChannelId) || await client.channels.fetch(logChannelId).catch(() => null);
                        if (logChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle('✅ | Uživatel ověřen (přes Modal)')
                                .setThumbnail(interaction.user.displayAvatarURL())
                                .addFields(
                                    { name: 'Uživatel:', value: `${interaction.user.tag} (<@${interaction.user.id}>)`, inline: false },
                                    { name: 'ID:', value: `\`${interaction.user.id}\``, inline: true },
                                    { name: 'Zadaný kód:', value: `\`${inputCode}\``, inline: true }
                                )
                                .setColor('#2ecc71')
                                .setTimestamp();
                            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
                        }
                    }

                    await interaction.reply({ content: '🎉 | Ověření proběhlo úspěšně! Právě jsi získal(a) přístup na server. Vítej na Xelorii! 😊', ephemeral: true });

                    // ZASLÁNÍ POTVRZENÍ DO DM
                    const dmEmbed = new EmbedBuilder()
                        .setTitle('✅ | Verifikace úspěšná')
                        .setDescription(`Ahoj **${interaction.user.username}**,\n\ntvé ověření na serveru **Xeloria Community** proběhlo úspěšně. Právě jsi získal(a) roli **Hráč** a máš plný přístup k serveru!\n\nPřejeme ti příjemnou zábavu! 🎮`)
                        .setColor('#2ecc71')
                        .setTimestamp();
                    await interaction.user.send({ embeds: [dmEmbed] }).catch(() => console.log(`[VERIFY-DEBUG] Nepodařilo se poslat DM uživateli ${interaction.user.tag}`));
                } catch (e) {
                    console.error('[VERIFY-DEBUG] Chyba při úpravě rolí:', e);
                    await interaction.reply({ content: '❌ | Něco se pokazilo při přidělování rolí. Prosím kontaktuj Admin Tým.', ephemeral: true });
                }
            } else {
                console.log(`[VERIFY-DEBUG] Uživatel ${interaction.user.tag} zadal ŠPATNÝ kód v Modalu: ${inputCode} (očekáváno: ${expectedCode})`);
                await interaction.reply({ content: `❌ | Špatný kód (\`${inputCode}\`)! Zkus to prosím znovu kliknutím na tlačítko a opiš kód přesně.`, ephemeral: true });
            }
            return;
        }
        
        const formatPings = (text, guild) => {
            if (!text) return text;
            return text.replace(/@(\d{15,20})/g, (match, id) => {
                return guild.roles.cache.has(id) ? `<@&${id}>` : `<@${id}>`;
            }).replace(/#(\d{15,20})/g, (match, id) => {
                return guild.channels.cache.has(id) ? `<#${id}>` : match;
            });
        };

        // Zpracování DM Modalu
        if (interaction.customId.startsWith('dm_modal_')) {
            const targetId = interaction.customId.replace('dm_modal_', '');
            const title = interaction.fields.getTextInputValue('dm_title');
            const messageText = interaction.fields.getTextInputValue('dm_message');

            const dmEmbed = new EmbedBuilder()
                .setTitle(`📩 | ${title}`)
                .setDescription(messageText)
                .setColor('#f1c40f')
                .setTimestamp()
                .setFooter({ text: `Odesláno z Xeloria Community • Od: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            if (targetId === 'all') {
                await interaction.reply({ content: '⏳ | Probíhá hromadné odesílání...', ephemeral: true });
                const members = await interaction.guild.members.fetch();
                let success = 0, fail = 0;

                for (const [id, member] of members) {
                    if (member.user.bot) continue;
                    try {
                        await member.send({ embeds: [dmEmbed] });
                        success++;
                    } catch (e) {
                        fail++;
                    }
                }
                await interaction.followUp({ content: `📢 | Hromadné odesílání dokončeno!\n✅ ${success} doručeno\n❌ ${fail} selhalo.`, ephemeral: true });
            } else {
                try {
                    const targetUser = await client.users.fetch(targetId);
                    await targetUser.send({ embeds: [dmEmbed] });
                    await interaction.reply({ content: `✅ | Zpráva byla doručena uživateli **${targetUser.tag}**.`, ephemeral: true });
                } catch (e) {
                    await interaction.reply({ content: `❌ | Nepodařilo se poslat DM tomuto uživateli.`, ephemeral: true });
                }
            }
        }
        
        // Zpracování oznámení
        if (interaction.customId === 'announcement_modal') {
            let preMessage = interaction.fields.getTextInputValue('announcement_pre_message');
            preMessage = formatPings(preMessage, interaction.guild);
            
            const title = interaction.fields.getTextInputValue('announcement_title');
            
            let desc = interaction.fields.getTextInputValue('announcement_desc');
            desc = formatPings(desc, interaction.guild);

            const channelId = process.env.ANNOUNCEMENT_CHANNEL_ID;
            if (!channelId) return interaction.reply({ content: '❌ | ID kanálu pro oznámení není nastaveno!', ephemeral: true });
            
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) return interaction.reply({ content: '❌ | Kanál pro oznámení se nepodařilo najít.', ephemeral: true });

            const embed = new EmbedBuilder().setTitle(`📌 | ${title}`).setDescription(desc).setColor('#f39c12').setTimestamp().setFooter({ text: `Oznámení vydal: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            try {
                if (preMessage && preMessage.trim().length > 0) {
                    await channel.send({ content: preMessage, embeds: [embed] });
                } else {
                    await channel.send({ embeds: [embed] }); 
                }
                
                await interaction.reply({ content: `✅ | Tvé oznámení bylo úspěšně zveřejněno!`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ | Error: Nemám dostatečná oprávnění to odeslat.', ephemeral: true });
            }
        }

        // Zpracování changelogu
        if (interaction.customId === 'changelog_modal') {
            let preMessage = interaction.fields.getTextInputValue('changelog_pre_message');
            preMessage = formatPings(preMessage, interaction.guild);
            
            const title = interaction.fields.getTextInputValue('changelog_title');
            
            let desc = interaction.fields.getTextInputValue('changelog_desc');
            desc = formatPings(desc, interaction.guild);

            const channelId = process.env.CHANGELOG_CHANNEL_ID;
            if (!channelId) return interaction.reply({ content: '❌ | ID kanálu pro changelog není nastaveno!', ephemeral: true });
            
            const channel = interaction.guild.channels.cache.get(channelId);
            if (!channel) return interaction.reply({ content: '❌ | Kanál pro changelog se nepodařilo najít.', ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle(`🛠️ | ${title}`)
                .setDescription(desc)
                .setColor('#2ecc71') // Zelená pro changelog/update
                .setTimestamp()
                .setFooter({ text: `Update vydal: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            try {
                if (preMessage && preMessage.trim().length > 0) {
                    await channel.send({ content: preMessage, embeds: [embed] });
                } else {
                    await channel.send({ embeds: [embed] }); 
                }
                
                await interaction.reply({ content: `✅ | Tvůj seznam změn byl úspěšně zveřejněn!`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ | Error: Nemám dostatečná oprávnění to odeslat.', ephemeral: true });
            }
        }

        // ZPRACOVÁNÍ VERDIKTU Z MODALU
        if (interaction.customId.startsWith('verdict_modal_')) {
            const parts = interaction.customId.split('_');
            const isAccept = parts[2] === 'acc';
            const targetId = parts[3];
            const messageText = interaction.fields.getTextInputValue('verdict_message');

            const targetUser = await client.users.fetch(targetId).catch(() => null);
            if (!targetUser) return interaction.reply({ content: '❌ | Nepodařilo se najít uživatele v databázi Discordu.', ephemeral: true });

            const embed = new EmbedBuilder()
                .setTitle(isAccept ? '🎉 | Výsledek tvého náboru: POSTUP DO 2. KOLA' : '❌ | Výsledek tvého náboru: ZAMÍTNUT(O)')
                .setDescription(isAccept 
                    ? `Gratulujeme! Tvůj nábor byl úspěšně schválen vedením serveru a **postupuješ do 2. kola (pohovoru)**.\n\n**Vyjádření vedení:**\n${messageText}`
                    : `Dobrý den, vedení serveru se po pečlivém uvážení rozhodlo tvou žádost zamítnout.\n\n**Důvod zamítnutí:**\n${messageText}`)
                .setColor(isAccept ? '#2ecc71' : '#e74c3c')
                .setTimestamp()
                .setFooter({ text: 'XELORIA A-Team' });

            try {
                await targetUser.send({ embeds: [embed] });
                await interaction.reply({ content: `✅ | Výsledek byl odeslán uživateli <@${targetId}> do soukromých zpráv.`, ephemeral: true });
            } catch (e) {
                await interaction.reply({ content: `❌ | Nepodařilo se odeslat zprávu do DM (uživatel je má pravděpodobně vypnuté). Verdikt byl ale zaznamenán interně.`, ephemeral: true });
            }
        }

        // ZPRACOVÁNÍ ODKAZŮ Z MODALU
        if (interaction.customId === 'links_modal') {
            let preMessage = interaction.fields.getTextInputValue('links_pre_message');
            preMessage = formatPings(preMessage, interaction.guild);
            
            const title = interaction.fields.getTextInputValue('links_title');
            
            let desc = interaction.fields.getTextInputValue('links_desc');
            desc = formatPings(desc, interaction.guild);

            const embed = new EmbedBuilder()
                .setTitle(`🔗 | ${title}`)
                .setDescription(desc)
                .setColor('#3498db')
                .setTimestamp()
                .setFooter({ text: `Odkazy sdílel: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            try {
                if (preMessage && preMessage.trim().length > 0) {
                    await interaction.channel.send({ content: preMessage, embeds: [embed] });
                } else {
                    await interaction.channel.send({ embeds: [embed] }); 
                }
                
                await interaction.reply({ content: `✅ | Odkazy byly úspěšně zveřejněny!`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ | Error: Nemám dostatečná oprávnění to odeslat.', ephemeral: true });
            }
        }

        // ZPRACOVÁNÍ A-TEAM ZPRÁVY Z MODALU
        if (interaction.customId === 'ateam_modal') {
            let preMessage = interaction.fields.getTextInputValue('ateam_pre_message');
            preMessage = formatPings(preMessage, interaction.guild);
            
            const title = interaction.fields.getTextInputValue('ateam_title');
            
            let desc = interaction.fields.getTextInputValue('ateam_desc');
            desc = formatPings(desc, interaction.guild);

            const embed = new EmbedBuilder()
                .setTitle(`🛡️ | ${title}`)
                .setDescription(desc)
                .setColor('#e74c3c') // Červená pro A-Team
                .setTimestamp()
                .setFooter({ text: `Zprávu vydal: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

            try {
                if (preMessage && preMessage.trim().length > 0) {
                    await interaction.channel.send({ content: preMessage, embeds: [embed] });
                } else {
                    await interaction.channel.send({ embeds: [embed] }); 
                }
                
                await interaction.reply({ content: `✅ | Zpráva od A-Teamu byla úspěšně zveřejněna!`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ | Error: Nemám dostatečná oprávnění to odeslat.', ephemeral: true });
            }
        }

        // ZPRACOVÁNÍ HLASOVÁNÍ Z MODALU
        if (interaction.customId.startsWith('poll_modal')) {
            let pingRaw = interaction.customId.replace('poll_modal_', '');
            let preMessage = pingRaw === 'none' ? null : formatPings(pingRaw, interaction.guild);
            
            const question = interaction.fields.getTextInputValue('poll_question');
            const options = [
                interaction.fields.getTextInputValue('poll_opt1'),
                interaction.fields.getTextInputValue('poll_opt2'),
                interaction.fields.getTextInputValue('poll_opt3'),
                interaction.fields.getTextInputValue('poll_opt4')
            ].filter(opt => opt && opt.trim().length > 0);

            const pollChannelId = process.env.POLLS_CHANNEL_ID;
            const channel = interaction.guild.channels.cache.get(pollChannelId);
            if (!channel) return interaction.reply({ content: '❌ | Kanál pro hlasování nebyl nalezen!', ephemeral: true });

            const emojis = ['🔹', '🔸', '🟢', '🟡'];
            const embed = new EmbedBuilder()
                .setTitle(`📊 | NOVÉ HLASOVÁNÍ`)
                .setDescription(`**Otázka:**\n${question}`)
                .setColor('#9b59b6')
                .setTimestamp()
                .setFooter({ 
                    text: `Celkem hlasovalo: 0 • Hlasování zahájil: ${interaction.user.tag}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                });

            const row = new ActionRowBuilder();
            const labels = ['Možnost A', 'Možnost B', 'Možnost C', 'Možnost D'];
            options.forEach((opt, idx) => {
                embed.addFields({ name: `${emojis[idx]} ${opt}`, value: `0 hlasů`, inline: true });
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`poll_vote_${idx}`)
                        .setLabel(`${labels[idx]} (0)`)
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji(emojis[idx])
                );
            });

            try {
                const message = await channel.send({ 
                    content: preMessage, 
                    embeds: [embed], 
                    components: [row] 
                });
                
                const pollDataPath = path.join(__dirname, 'polls.json');
                let polls = {};
                if (fs.existsSync(pollDataPath)) {
                    polls = JSON.parse(fs.readFileSync(pollDataPath, 'utf8'));
                }
                polls[message.id] = { votes: {}, options: options };
                fs.writeFileSync(pollDataPath, JSON.stringify(polls, null, 2));

                await interaction.reply({ content: `✅ | Tvé hlasování se ${options.length} možnostmi bylo vytvořeno v <#${pollChannelId}>!`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ | Chyba při odesílání hlasování.', ephemeral: true });
            }
        }
    }
});

// LEVEL SYSTÉM - PŘIČÍTÁNÍ XP
client.on('messageCreate', async message => {
    // DEBUG: Log všech zpráv pro ověření funkčnosti
    console.log(`[DEBUG-MSG] Kanál: ${message.channel.id}, Autor: ${message.author.tag}, Obsah: ${message.content}`);

    if (message.author.bot || !message.guild) return;

    // AUTOMOD - FILTR SLOV
    const content = message.content.toLowerCase();
    const hasForbiddenWord = forbiddenWords.some(word => content.includes(word));
    const reviewsChannelId = process.env.REVIEWS_CHANNEL_ID;

    if (hasForbiddenWord) {
        try {
            await message.delete();
            
            // Speciální trest pro kanál hodnocení (1 den mute)
            if (message.channel.id === reviewsChannelId) {
                const member = await message.guild.members.fetch(message.author.id).catch(() => null);
                if (member) {
                    await member.timeout(24 * 60 * 60 * 1000, 'Automod: Rasismus/urážky v hodnocení').catch(console.error);
                    const msg = await message.channel.send(`❌ | <@${message.author.id}>, za urážky v hodnocení jsi byl umlčen na **1 den**!`);
                    setTimeout(() => msg.delete().catch(() => null), 10000);
                    return;
                }
            }

            const warns = loadWarns();
            if (!warns[message.author.id]) warns[message.author.id] = 0;
            warns[message.author.id]++;
            saveWarns(warns);

            const userWarns = warns[message.author.id];
            let punishmentText = 'Byl jsi varován za nevhodné vyjadřování.';
            let duration = 0;

            if (userWarns === 3) {
                duration = 30 * 60 * 1000;
                punishmentText = 'Byl jsi umlčen (mute) na **30 minut** za opakované porušení pravidel (3. varování).';
            } else if (userWarns === 8) {
                duration = 6 * 60 * 60 * 1000;
                punishmentText = 'Byl jsi umlčen (mute) na **6 hodin** za opakované porušení pravidel (8. varování).';
            } else if (userWarns > 8) {
                duration = 4 * 24 * 60 * 60 * 1000;
                punishmentText = 'Byl jsi umlčen (mute) na **4 dny** za opakované a hrubé porušení pravidel.';
            }

            if (duration > 0) {
                const member = await message.guild.members.fetch(message.author.id).catch(() => null);
                if (member) {
                    await member.timeout(duration, 'Automod: Nevhodné vyjadřování').catch(console.error);
                }
            }

            const warningMsg = await message.channel.send(`⚠️ | <@${message.author.id}>, ${punishmentText} (*Počet varování: ${userWarns}*)`);
            setTimeout(() => warningMsg.delete().catch(() => null), 10000);
            return; // Zastavíme další zpracování zprávy
        } catch (e) {
            console.error('[AUTOMOD] Chyba:', e);
        }
    }

    // AUTOMATICKÉ MAZÁNÍ V KANÁLECH
    const anonymChannelId = process.env.ANONYM_CHANNEL_ID;
    if (message.channel.id === anonymChannelId) {
        try {
            await message.delete();
        } catch (e) {}
    }

    // POČÍTÁNÍ OD 1 DO NEKONECNA
    if (message.channel.id === '1467456910877003947') {
        const countingData = loadCounting();
        const number = parseInt(message.content);
        const nextNumber = countingData.currentNumber + 1;

        if (isNaN(number) || number !== nextNumber || message.author.id === countingData.lastUserId) {
            // Špatně
            countingData.currentNumber = 0;
            countingData.lastUserId = "";
            saveCounting(countingData);
            
            try {
                await message.reply(`❌ | Špatné číslo nebo jsi hrál dvakrát za sebou! Hrajeme znovu od **1**.`);
            } catch (e) {
                await message.channel.send(`❌ | <@${message.author.id}>, špatné číslo nebo jsi hrál dvakrát za sebou! Hrajeme znovu od **1**.`);
            }
            
            try {
                await message.author.send(`Špatné číslo! Pokračuj v počítání zde: https://discord.com/channels/${message.guild.id}/${message.channel.id}`);
            } catch (e) {
                console.log(`[COUNTING] Nepodařilo se poslat DM uživateli ${message.author.tag}`);
            }
        } else {
            // Správně
            countingData.currentNumber = number;
            countingData.lastUserId = message.author.id;
            saveCounting(countingData);
            try {
                await message.react('✅');
            } catch (e) {}
        }
        return;
    }
    
    if (message.channel.id === reviewsChannelId) {
        // Zjištění typu hodnocení
        const isPositive = message.content.toLowerCase().includes('+rep');
        const isNegative = message.content.toLowerCase().includes('-rep');
        
        if (!isPositive && !isNegative) {
            try {
                await message.delete();
                const msg = await message.channel.send(`💡 | <@${message.author.id}>, pro udělení hodnocení musíš napsat **+rep** nebo **-rep**!`);
                setTimeout(() => msg.delete().catch(() => null), 5000);
            } catch (e) {}
            return;
        }

        const mentionedUsers = message.mentions.users.filter(u => u.id !== message.author.id);
        const targetList = mentionedUsers.map(u => `<@${u.id}>`).join(', ');
        
        const reason = message.content
            .replace(/<@!?\d+>/g, '') // Odstranění všech mentionů
            .replace(/\+rep/gi, '')    // Odstranění +rep
            .replace(/-rep/gi, '')     // Odstranění -rep
            .trim();

        if (mentionedUsers.size > 0 && reason.length > 0) {
            const typeLabel = isPositive ? '+REP' : '-REP';
            const typeEmoji = isPositive ? '👍' : '👎';
            const typeColor = isPositive ? '#2ecc71' : '#e74c3c';

            const reviewEmbed = new EmbedBuilder()
                .setTitle(`${typeEmoji} Hodnocení – ${typeLabel}`)
                .addFields(
                    { name: '👤 Hodnotitel', value: `<@${message.author.id}>`, inline: true },
                    { name: '🎯 Hodnocení pro', value: targetList, inline: true },
                    { name: '📝 Důvod', value: reason }
                )
                .setColor(typeColor)
                .setFooter({ 
                    text: `Xeloria Hodnocení • ${new Date().toLocaleDateString('cs-CZ')} ${new Date().toLocaleTimeString('cs-CZ')}` 
                });

            try {
                await message.delete();
                await message.channel.send({ embeds: [reviewEmbed] });
            } catch (e) {
                console.error('[REP] Chyba:', e);
            }
        } else {
            try {
                await message.delete();
                const errorMsg = mentionedUsers.size === 0 && message.mentions.users.has(message.author.id) 
                    ? `❌ | <@${message.author.id}>, nemůžeš hodnotit sám sebe!`
                    : `💡 | <@${message.author.id}>, pro udělení hodnocení napiš: **@uživatel(é) +/-rep <důvod>**`;
                
                const msg = await message.channel.send(errorMsg);
                setTimeout(() => msg.delete().catch(() => null), 5000);
            } catch (e) {}
        }
        return;
    }

    // NÁPADY / NÁVRHY
    const suggestionsChannelId = process.env.SUGGESTIONS_CHANNEL_ID;
    if (message.channel.id === suggestionsChannelId) {
        const suggestionEmbed = new EmbedBuilder()
            .setAuthor({ 
                name: 'Nápad', 
                iconURL: client.user.displayAvatarURL() 
            })
            .setColor('#f1c40f')
            .addFields(
                { name: '👤 Nápad navrhl:', value: `<@${message.author.id}>` },
                { name: '💡 Nápad:', value: message.content },
                { name: '📊 Stav:', value: '⏳ Čeká se na vyjádření' }
            )
            .setFooter({ text: `ID uživatele: ${message.author.id}` })
            .setTimestamp();

        try {
            await message.delete();
            const sentMsg = await message.channel.send({ embeds: [suggestionEmbed] });
            // Přidáme reakce pro hlasování (volitelné, ale užitečné)
            await sentMsg.react('✅');
            await sentMsg.react('❌');
        } catch (e) {
            console.error('[NÁPADY] Chyba:', e);
        }
        return;
    }

    // XP LOGIKA
    if (!levelCooldowns.has(message.author.id)) {
        const levels = loadLevels();
        if (!levels[message.author.id]) levels[message.author.id] = { xp: 0, level: 0 };

        const randomXp = Math.floor(Math.random() * (25 - 15 + 1)) + 15;
        levels[message.author.id].xp += randomXp;
        
        const newLevel = Math.floor(levels[message.author.id].xp / 500);
        const oldLevel = levels[message.author.id].level || 0;

        if (newLevel > oldLevel) {
            levels[message.author.id].level = newLevel;
            const levelChannelId = process.env.LEVELS_CHANNEL_ID;
            
            try {
                const levelChannel = await message.guild.channels.fetch(levelChannelId).catch(() => null);
                if (levelChannel) {
                    const levelEmbed = new EmbedBuilder()
                        .setTitle('🎊 | LEVEL UP!')
                        .setDescription(`Gratulujeme <@${message.author.id}>! Právě jsi postoupil na **úroveň ${newLevel}**! 🚀`)
                        .setColor('#2ecc71')
                        .setThumbnail(message.author.displayAvatarURL())
                        .setTimestamp();
                    
                    await levelChannel.send({ content: `<@${message.author.id}>`, embeds: [levelEmbed] });
                }
            } catch (e) {
                console.error('[LEVELS] Chyba při odesílání level up zprávy:', e);
            }
        }

        saveLevels(levels);
        console.log(`[LEVELS] Uživatel ${message.author.tag} získal XP. Celkem: ${levels[message.author.id].xp}`);
        levelCooldowns.add(message.author.id);
        setTimeout(() => levelCooldowns.delete(message.author.id), 15000); // 15 sekund cooldown pro testování
    }

    // EKONOMIKA A ZÁBAVNÉ PŘÍKAZY
    const funChannelId = process.env.FUN_CHANNEL_ID;
    if (message.channel.id !== funChannelId) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (message.content.startsWith('!')) {
        const economy = loadEconomy();
        if (!economy[message.author.id]) {
            economy[message.author.id] = { balance: 0, lastDaily: 0, lastWeekly: 0, lastTWeekly: 0, lastMonthly: 0, lastYearly: 0 };
        }
        const userEco = economy[message.author.id];
        const now = Date.now();

        const formatTime = (ms) => {
            const hours = Math.floor(ms / (1000 * 60 * 60));
            const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
            return `${hours}h ${minutes}m`;
        };

        if (command === 'ahoj' || command === 'cs' || command === 'cau') {
            const pozdravy = ['Ahoj', 'Čau', 'Zdravíčko', 'Ahojky'];
            const randomPozdrav = pozdravy[Math.floor(Math.random() * pozdravy.length)];
            return message.reply(`👋 | ${randomPozdrav} <@${message.author.id}>! Jak se dneska máš? 😊`);
        }

        if (command === 'ping') {
            return message.reply(`🏓 | **Pong!** Moje zpoždění je **${client.ws.ping}ms**.`);
        }

        if (command === 'bal' || command === 'money') {
            return message.reply(`💰 | Tvůj aktuální zůstatek je: **${userEco.balance}** mincí.`);
        }

        if (command === 'work') {
            const cooldown = 30 * 60 * 1000;
            if (now - (userEco.lastWork || 0) < cooldown) {
                return message.reply(`❌ | Jsi unavený! Zkus to znovu za **${formatTime(cooldown - (now - (userEco.lastWork || 0)))}**.`);
            }
            const reward = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
            userEco.balance += reward;
            userEco.lastWork = now;
            saveEconomy(economy);
            return message.reply(`⚒️ | Pracoval jsi jako horník a vydělal jsi si **${reward}** mincí!`);
        }

        if (command === 'flip') {
            const bet = parseInt(args[1]);
            const side = args[0] ? args[0].toLowerCase() : null;
            if (!side || !['hlava', 'orel'].includes(side)) return message.reply('❌ | Musíš si vybrat: `!flip <hlava/orel> <sázka>`');
            if (isNaN(bet) || bet <= 0) return message.reply('❌ | Musíš zadat platnou sázku!');
            if (userEco.balance < bet) return message.reply('❌ | Nemáš dostatek mincí na tuto sázku!');

            const result = Math.random() < 0.5 ? 'hlava' : 'orel';
            const win = side === result;
            
            if (win) {
                userEco.balance += bet;
                message.reply(`🪙 | Padla **${result}**! Vyhrál jsi **${bet}** mincí! 🎉`);
            } else {
                userEco.balance -= bet;
                message.reply(`🪙 | Padla **${result}**. Prohrál jsi **${bet}** mincí. 😢`);
            }
            saveEconomy(economy);
            return;
        }

        if (command === 'slots') {
            const bet = parseInt(args[0]);
            if (isNaN(bet) || bet <= 0) return message.reply('❌ | Musíš zadat platnou sázku: `!slots <sázka>`');
            if (userEco.balance < bet) return message.reply('❌ | Nemáš dostatek mincí!');

            const emojis = ['🍒', '🍋', '🍇', '💎', '🎰'];
            const a = emojis[Math.floor(Math.random() * emojis.length)];
            const b = emojis[Math.floor(Math.random() * emojis.length)];
            const c = emojis[Math.floor(Math.random() * emojis.length)];

            let multiplier = 0;
            if (a === b && b === c) multiplier = 5; // JackPot
            else if (a === b || b === c || a === c) multiplier = 2; // Malá výhra

            if (multiplier > 0) {
                const winAmount = bet * multiplier;
                userEco.balance += (winAmount - bet);
                message.reply(`[ ${a} | ${b} | ${c} ]\n✨ | **Gratulace!** Vyhrál jsi **${winAmount}** mincí!`);
            } else {
                userEco.balance -= bet;
                message.reply(`[ ${a} | ${b} | ${c} ]\n💀 | **Smůla.** Prohrál jsi **${bet}** mincí.`);
            }
            saveEconomy(economy);
            return;
        }

        if (command === 'roll') {
            const roll = Math.floor(Math.random() * 6) + 1;
            return message.reply(`🎲 | Hodil jsi kostkou a padlo číslo **${roll}**!`);
        }

        if (command === 'daily') {
            const cooldown = 24 * 60 * 60 * 1000;
            if (now - userEco.lastDaily < cooldown) {
                return message.reply(`❌ | Svou denní odměnu jsi už vybral! Zkus to znovu za **${formatTime(cooldown - (now - userEco.lastDaily))}**.`);
            }
            const reward = 250;
            userEco.balance += reward;
            userEco.lastDaily = now;
            saveEconomy(economy);
            return message.reply(`✅ | Vybral jsi svou denní odměnu **${reward}** mincí!`);
        }

        if (command === 'weekly') {
            const cooldown = 7 * 24 * 60 * 60 * 1000;
            if (now - userEco.lastWeekly < cooldown) {
                return message.reply(`❌ | Svou týdenní odměnu jsi už vybral! Zkus to znovu za **${Math.floor((cooldown - (now - userEco.lastWeekly))/(1000*60*60*24))}d**.`);
            }
            const reward = 2000;
            userEco.balance += reward;
            userEco.lastWeekly = now;
            saveEconomy(economy);
            return message.reply(`✅ | Vybral jsi svou týdenní odměnu **${reward}** mincí!`);
        }

        if (command === 'tweekly') {
            const cooldown = 14 * 24 * 60 * 60 * 1000;
            if (now - userEco.lastTWeekly < cooldown) {
                return message.reply(`❌ | Svou 14-denní odměnu jsi už vybral!`);
            }
            const reward = 5000;
            userEco.balance += reward;
            userEco.lastTWeekly = now;
            saveEconomy(economy);
            return message.reply(`✅ | Vybral jsi svou 14-denní odměnu **${reward}** mincí!`);
        }

        if (command === 'monthly') {
            const cooldown = 30 * 24 * 60 * 60 * 1000;
            if (now - userEco.lastMonthly < cooldown) {
                return message.reply(`❌ | Svou měsíční odměnu jsi už vybral!`);
            }
            const reward = 15000;
            userEco.balance += reward;
            userEco.lastMonthly = now;
            saveEconomy(economy);
            return message.reply(`✅ | Vybral jsi svou měsíční odměnu **${reward}** mincí!`);
        }

        if (command === 'yearly') {
            const cooldown = 365 * 24 * 60 * 60 * 1000;
            if (now - userEco.lastYearly < cooldown) {
                return message.reply(`❌ | Své roční jmění jsi už vybral!`);
            }
            const reward = 250000;
            userEco.balance += reward;
            userEco.lastYearly = now;
            saveEconomy(economy);
            return message.reply(`✅ | Vybral jsi své roční jmění **${reward}** mincí! Bohatče! 🏆`);
        }

        if (command === 'questions') {
            const qs = [
                "Jaký je tvůj nejoblíbenější blok v Minecraftu?",
                "Kdyby jsi mohl být jakýkoliv mob, který by to byl?",
                "Jaká je tvoje nejoblíbenější barva?",
                "Máš radši PvP nebo stavění?",
                "Jaký je tvůj nejoblíbenější biomy?",
                "Co by jsi na serveru nejraději změnil?",
                "Jak dlouho už hraješ Minecraft?",
                "Kdo je tvůj nejoblíbenější admin? (Pšššt, nikomu to neříkej!)"
            ];
            const randomQ = qs[Math.floor(Math.random() * qs.length)];
            return message.reply(`❓ | **Otázka pro tebe:** ${randomQ}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
