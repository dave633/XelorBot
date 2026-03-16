require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

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
    const roleList = roles.map(role => ({
        name: role.name,
        id: role.id
    }));
    fs.writeFileSync('roles_list.json', JSON.stringify(roleList, null, 2));
    console.log('Roles saved to roles_list.json');
    process.exit();
});

client.login(process.env.DISCORD_TOKEN);
