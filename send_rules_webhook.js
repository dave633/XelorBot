const { EmbedBuilder, WebhookClient } = require('discord.js');

const webhookUrl = 'https://discord.com/api/webhooks/1482201782791831593/2goCJIOmUBBgtVi5FugQgCO6R41IatbVjVErxGXmXwOCbvY3_YWoDaNG3a-16LUy3DAS';
const webhook = new WebhookClient({ url: webhookUrl });

const embed = new EmbedBuilder()
    .setTitle('📋 PODMÍNKY A PRAVIDLA SERVERU')
    .setDescription(`**✅ VŠEOBECNÉ PODMÍNKY**\n\nPřipojením se na tento Discord server souhlasíš s následujícími podmínkami:\n\n**1️⃣ Věkové Omezení**\n• Server je určen pro uživatele ve věku 12+ \n• Respektujeme Discord Terms of Service\n\n**2️⃣ Osobní Data**\n• Neshromažďujeme tvé osobní údaje bez souhlasu\n• Tvé zprávy a aktivita jsou viditelné pouze v rámci serveru\n• Nepředáváme data třetím stranám\n\n**3️⃣ Použití Botů**\n• Používáme Discord boty pro lepší funkčnost\n• Boti mohou ukládat tvé statistiky (level, aktivita)\n• Můžeš požádat o smazání svých dat\n\n**4️⃣ Pravidla Chování**\nVšechna pravidla najdeš v <#1466312795460075804>\n• Musíš respektovat všechny uživatele\n• Žádný spam, hate, toxicita\n• Dodržuj Discord Guidelines\n\n**5️⃣ Sankce**\n• Pořušení pravidel může vést k:\n  - Varování (warn)\n  - Ztlumení (mute)\n  - Vykopnutí (kick)\n  - Trvalému zablokování (ban)\n\n**6️⃣ Změny Podmínek**\n• Vyhrazujeme si právo změnit tyto podmínky\n• Změny budou oznámeny v <#1466684340867043542>\n\n**📞 KONTAKT**\nPokud máš otázky k podmínkám, kontaktuj nás:\n• Vytvoř ticket v <#1466913729596756159>\n• Napiš A-TEAM členu\n\n**⚠️ DŮLEŽITÉ**\nPokračováním na serveru souhlasíš s těmito podmínkami.\nPokud nesouhlasíš, prosím opušť server.`)
    .setColor('#f1c40f')
    .setTimestamp();

webhook.send({
    embeds: [embed]
}).then(() => {
    console.log('✅ Webhook zpráva odeslána!');
    process.exit(0);
}).catch(console.error);
