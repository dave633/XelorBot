// ═══════════════════════════════════════════
// Deploy slash příkazů na Discord
// ═══════════════════════════════════════════

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const token = process.env.TOKEN;
const guildId = process.env.GUILD_ID;

// Automatické získání CLIENT_ID z tokenu
const clientId = Buffer.from(token.split('.')[0], 'base64').toString();

console.log(`📡 Client ID: ${clientId}`);
console.log(`🏠 Guild ID: ${guildId}`);

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const exported = require(path.join(commandsPath, file));
    // Podpora pro export pole příkazů (např. leaderboard.js)
    const commandList = Array.isArray(exported) ? exported : [exported];
    for (const command of commandList) {
        if ('data' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Příkaz připraven: /${command.data.name}`);
        }
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`\n🔄 Registruji ${commands.length} příkazů...`);

        if (guildId && guildId !== 'DOPLNIT_GUILD_ID') {
            // Guild příkazy (okamžitě dostupné)
            const data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );
            console.log(`✅ Úspěšně zaregistrováno ${data.length} guild příkazů!`);
        } else {
            // Globální příkazy (může trvat až hodinu)
            const data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands },
            );
            console.log(`✅ Úspěšně zaregistrováno ${data.length} globálních příkazů!`);
            console.log('⚠️ Globální příkazy se mohou objevit až za hodinu. Doporuč se nastavit GUILD_ID v .env!');
        }
    } catch (error) {
        console.error('❌ Chyba při registraci příkazů:', error);
    }
})();
