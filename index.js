// ═══════════════════════════════════════════
// XelorBot – Hlavní soubor
// ═══════════════════════════════════════════

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
    Client, Collection, GatewayIntentBits, Partials, Events
} = require('discord.js');
const config = require('./config');

// Moduly
const { handleCalculatorButton } = require('./modules/calculator');
const { handleNewIdea } = require('./modules/ideas');
const { handleRating } = require('./modules/rating');
const { handleAnonymousMessage } = require('./modules/anonymous');
const { handleRulesButton } = require('./modules/rules');
const { handleTicketCreate, handleTicketClose, handleNaborPosition } = require('./modules/tickets');
const { handleNaborApply, handleNaborDecision } = require('./modules/nabor');
const { handleSelfroleButton } = require('./modules/selfroles');
const { handleChatCommand } = require('./modules/chatcommands');
const { handleEconomy } = require('./modules/economy');
const { handleVoteButton } = require('./modules/voting');
const { handleGiveawayButton } = require('./modules/giveaway');
const { setupWebServer } = require('./modules/webserver');

// ═══ Ochrana před duplicitním zpracováním zpráv ═══
// Každá zpráva se zpracuje JEDINKRÁT – lock platí 30s
const processedMessages = new Set();
function isAlreadyProcessed(id) {
    if (processedMessages.has(id)) return true;
    processedMessages.add(id);
    setTimeout(() => processedMessages.delete(id), 30000);
    return false;
}

// ═══ Vytvoření klienta ═══
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
    ],
});

// ═══ Spuštění Admin bota (Moderace) ═══
const { setupAdminBot } = require('./modules/admin_bot');
const adminClient = setupAdminBot();

// ═══ Načtení příkazů ═══
client.commands = new Collection();
adminClient.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const exported = require(path.join(commandsPath, file));
        const commandList = Array.isArray(exported) ? exported : [exported];
        for (const command of commandList) {
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                adminClient.commands.set(command.data.name, command);
                console.log(`✅ Příkaz načten: /${command.data.name}`);
            }
        }
    }
}



// ═══ Event: Bot je připraven ═══
client.once(Events.ClientReady, (readyClient) => {
    console.log('═══════════════════════════════════════════');
    console.log(`🤖 XelorBot je online jako ${readyClient.user.tag}`);
    console.log(`📡 Servery: ${readyClient.guilds.cache.size}`);
    console.log('═══════════════════════════════════════════');

    readyClient.user.setActivity('Xeloria Server', { type: 3 }); // Watching
});

// ═══ Event: Interakce (slash příkazy, tlačítka, select menu) ═══
const handleInteraction = async (interaction, botClient) => {
    try {
        // Slash příkazy
        if (interaction.isChatInputCommand()) {
            const command = botClient.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Chyba v příkazu /${interaction.commandName}:`, error);
                const reply = { content: '❌ Nastala chyba při provádění příkazu!', ephemeral: true };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }

        // Tlačítka
        if (interaction.isButton()) {
            // Kalkulačka
            if (interaction.customId.startsWith('calc_')) {
                await handleCalculatorButton(interaction);
                return;
            }

            // Pravidla
            if (interaction.customId.startsWith('rules_')) {
                await handleRulesButton(interaction);
                return;
            }

            // Ticket zavření
            if (interaction.customId === 'ticket_close') {
                await handleTicketClose(interaction);
                return;
            }

            // Selfrole
            if (interaction.customId.startsWith('selfrole_')) {
                await handleSelfroleButton(interaction);
                return;
            }

            // Hlasování
            if (interaction.customId === 'vote_ano' || interaction.customId === 'vote_ne') {
                await handleVoteButton(interaction);
                return;
            }

            // Giveaway
            if (interaction.customId === 'giveaway_join') {
                await handleGiveawayButton(interaction);
                return;
            }

            // Nábor – přijmout/zamítnout přihlášku
            if (interaction.customId.startsWith('nabor_accept_') || interaction.customId.startsWith('nabor_deny_')) {
                await handleNaborDecision(interaction);
                return;
            }
        }

        // Select menu
        if (interaction.isStringSelectMenu()) {
            // Ticket vytvoření
            if (interaction.customId === 'ticket_create') {
                await handleTicketCreate(interaction);
                return;
            }

            // Nábor – výběr pozice (starý ticket systém)
            if (interaction.customId === 'nabor_position') {
                await handleNaborPosition(interaction);
                return;
            }

            // Nábor – přihláška přes DM
            if (interaction.customId === 'nabor_apply') {
                await handleNaborApply(interaction);
                return;
            }
        }
    } catch (error) {
        console.error('Chyba v interakci:', error);
    }
};

client.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction, client));
adminClient.on(Events.InteractionCreate, (interaction) => handleInteraction(interaction, adminClient));

const interactionHandlingRemovedMarker = true;
// Pozor: Smazal jsem starý blok client.on(Events.InteractionCreate) níže.


// ═══ Event: Nová zpráva ═══
client.on(Events.MessageCreate, async (message) => {
    // Partial zpráva bez autora → ignorovat
    if (!message.author) return;
    // Zprávy od botů ignorovat
    if (message.author.bot) return;
    // Ochrana před duplicitním zpracováním (Discord partial events)
    if (isAlreadyProcessed(message.id)) return;

    try {


        // Nápady
        if (message.channel.id === config.channels.NAPADY) {
            await handleNewIdea(message);
            return;
        }

        // Hodnocení
        if (message.channel.id === config.channels.HODNOCENI) {
            await handleRating(message);
            return;
        }

        // Anonymní zprávy
        if (message.channel.id === config.channels.ANONYM) {
            await handleAnonymousMessage(message);
            return;
        }

        // Chat příkazy (!ahoj, !ping, !server info)
        if (message.channel.id === config.channels.CHAT_COMMANDS) {
            await handleChatCommand(message);
            return;
        }

        // Ekonomika
        if (message.channel.id === config.channels.EKONOMIKA) {
            await handleEconomy(message);
            return;
        }
    } catch (error) {
        console.error('Chyba při zpracování zprávy:', error);
    }
});
// ═══ Event: Nový člen na serveru ═══
client.on(Events.GuildMemberAdd, async (member) => {
    try {
        // Přidat neověřenou roli novým hráčům
        const unverifiedRoleId = config.roles.NEOVERENY;
        await member.roles.add(unverifiedRoleId);
        console.log(`📥 Nový člen ${member.user.tag} – přidána neověřená role`);
    } catch (err) {
        console.error('Chyba při přidávání neověřené role:', err);
    }
});

// ═══ Spuštění webserveru a přihlášení bota ═══
setupWebServer(client);

client.login(process.env.TOKEN).catch(err => {
    console.error('❌ Nepodařilo se přihlásit bota:', err.message);
});
