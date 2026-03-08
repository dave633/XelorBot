const { Client, GatewayIntentBits, Partials, Events, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

function setupAdminBot() {
    console.log('🛡️ STARTUJI ADMIN BOTA (Moderace)...');

    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers,
        ],
        partials: [
            Partials.Channel,
            Partials.Message,
            Partials.GuildMember,
        ],
    });

    const BANS_FILE = path.join(__dirname, '../data/tempbans.json');

    // Interval pro unbany
    setInterval(async () => {
        if (!fs.existsSync(BANS_FILE)) return;
        try {
            const fileContent = fs.readFileSync(BANS_FILE, 'utf8');
            if (!fileContent) return;
            const data = JSON.parse(fileContent);
            let changed = false;

            for (const [userId, ban] of Object.entries(data)) {
                if (Date.now() >= ban.unbanTime) {
                    try {
                        const guild = await client.guilds.fetch(ban.guildId);
                        if (guild) {
                            await guild.members.unban(userId, 'Vypršení dočasného banu');

                            try {
                                const user = await client.users.fetch(userId);
                                const embed = new EmbedBuilder()
                                    .setColor(0x2ECC71)
                                    .setTitle('🟢 TVŮJ BAN VYPRŠEL • XELORIA LAND')
                                    .setDescription(
                                        `\n` +
                                        `Zdravíme, **${user.username}**,\n` +
                                        `tvůj dočasný ban vypršel a opět se můžeš připojit na náš server!\n\n` +
                                        `🔗 **Invite Link:** https://discord.gg/xeloria\n\n` +
                                        `*Prosíme o dodržování pravidel, aby se situace neopakovala.*\n` +
                                        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
                                    )
                                    .setTimestamp();

                                await user.send({ embeds: [embed] });
                            } catch (e) {
                                console.log(`DM pro ${userId} nelze po unbanu zaslat.`);
                            }
                        }
                    } catch (err) {
                        console.error(`Chyba při unbanu ${userId}:`, err.message);
                    }
                    delete data[userId];
                    changed = true;
                }
            }

            if (changed) {
                fs.writeFileSync(BANS_FILE, JSON.stringify(data, null, 2));
            }
        } catch (e) {
            console.error('Chyba v intervalu unbanů:', e);
        }
    }, 60 * 1000);

    client.once(Events.ClientReady, (readyClient) => {
        console.log('═══════════════════════════════════════════');
        console.log(`🛡️ Admin Bot (Moderace) je online: ${readyClient.user.tag}`);
        console.log('═══════════════════════════════════════════');
        readyClient.user.setActivity('Xeloria Moderation', { type: 3 });
    });

    // POZOR: Příkazy pro Admin bota nenačítáme zde, protože jsou v 'commands' složce 
    // a budou načteny hlavním botem. Pokud chceš, aby Admin bot reagoval na své příkazy,
    // musel by mít vlastní Collection, ale oba boti nyní sdílí stejnou složku.
    // Pro jednoduchost necháme oba boty načítat všechny příkazy.

    client.login(process.env.ADMIN_TOKEN).catch(err => {
        console.error('❌ Chyba při přihlašování Admin bota:', err.message);
    });

    return client;
}

module.exports = { setupAdminBot };
