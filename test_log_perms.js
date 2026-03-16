require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
    console.log(`Běžím jako ${client.user.tag}`);
    const channelId = '1475182080022544608';
    try {
        const channel = await client.channels.fetch(channelId);
        if (channel) {
            console.log(`Kanál nalezen: ${channel.name}`);
            await channel.send("🚀 **TESTOVACÍ ZPRÁVA OD BOTA**\nPokud toto vidíš, bot má práva do tohoto kanálu psát.");
            console.log("✅ Zpráva odeslána!");
        } else {
            console.log("❌ Kanál nenalezen.");
        }
    } catch (error) {
        console.error("❌ Došlo k chybě:", error);
    }
    process.exit(0);
});

client.login(process.env.DISCORD_TOKEN);
