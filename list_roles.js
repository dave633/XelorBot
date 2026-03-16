require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', async () => {
    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (!guild) {
        console.log('Guild not found');
        process.exit();
    }
    const roles = await guild.roles.fetch();
    roles.forEach(role => {
        console.log(`Role: ${role.name} | ID: ${role.id}`);
    });
    process.exit();
});

client.login(process.env.DISCORD_TOKEN);
