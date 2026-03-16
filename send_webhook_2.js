const https = require('https');

const webhookUrl = 'https://discord.com/api/webhooks/1482188034798780513/62UNL7fyVFLhQTb3OEr4g050VLFwQGmkaCyaqt-fzyOeUh00t0dH715u1bSvSLm0v_3v';

const messageContent = "## 🎮 Server a aktivity\n\n**Q: Jak mohu získat levely?**\nA: Levely získáváš automaticky za aktivitu na serveru - psaním zpráv a účastí v komunitě. Sleduj svůj progress v https://discord.com/channels/1466312793643810849/1466685836312580138\n\n**Q: Jaké eventy se konají?**\nA: Informace o aktuálních a plánovaných eventech najdeš v E-TEAM sekci a kanálu https://discord.com/channels/1466312793643810849/1466684340867043542 .\n\n## 🎙️ Hlasové kanály\n\n**Q: Mohu si vytvořit vlastní místnost?**\nA: Ano! Připoj se do **➕ Creator Channel** a automaticky se ti vytvoří vlastní dočasná místnost.\n\n## 💬 Chat a komunikace\n\n**Q: Kde mohu normálně chatovat?**\nA: Hlavní chat kanály jsou v sekci CHAT https://discord.com/channels/1466312793643810849/1466685908676775999 - použij kanál pro obecnou konverzaci.\n\n**Q: Co jsou off-topic kanály?**\nA: V https://discord.com/channels/1466312793643810849/1466686288869593252 můžeš psát o věcech, které přímo nesouvisí s hlavním tématem serveru.";

const data = JSON.stringify({ content: messageContent });

const url = new URL(webhookUrl);
const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
    },
};

const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Response: ${body}`);
    });
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
