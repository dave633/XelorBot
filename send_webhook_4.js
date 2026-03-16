const https = require('https');

const webhookUrl = 'https://discord.com/api/webhooks/1482189611278139494/5Ab9gsAyyXhhRFYnAxS26bFyl5z-2m9_g23rtyLd0bUzqVIW5d35EZYQtlddTt4eGC8L';

const messageContent = "# 🧭 Vítej na XELORIA Community!\n\nJsme rádi, že jsi se k nám připojil! Tady najdeš vše, co potřebuješ vědět pro začátek:\n\n## ⭐ První kroky\n\n**1️⃣ Přečti si pravidla**\nZačni návštěvou kanálu https://discord.com/channels/1466312793643810849/1466312795460075804 - je důležité znát pravidla serveru!\n\n**2️⃣ Získej role**\nZajdi do kanálu https://discord.com/channels/1466312793643810849/1466685746588024974 a vyber si role, které tě zajímají. Role ti otevřou přístup k různým kanálům.\n\n**3️⃣ Představ se**\nV kanálu https://discord.com/channels/1466312793643810849/1466685908676775999 se klidně představ komunitě! Rádi tě poznáme.\n\n**4️⃣ Prozkoumej server**\nPodívej se do různých sekcí a najdi, co tě baví - máme kanály pro chat, gaming, tvorbu a mnoho dalšího!\n\n## 🎯 Důležité kanály\n\n📜 https://discord.com/channels/1466312793643810849/1466312795460075804 - Pravidla serveru\n🧾 https://discord.com/channels/1466312793643810849/1466684538246795297 - Novinky a změny\n📌 https://discord.com/channels/1466312793643810849/1466684710846730301 - Informace o serveru\n❓ https://discord.com/channels/1466312793643810849/1466684826185633940 - Často kladené otázky\n💬 https://discord.com/channels/1466312793643810849/1466685908676775999 - Hlavní chat\n🎮 https://discord.com/channels/1466312793643810849/1466686416884072644 - Pro hráče\n🎨 https://discord.com/channels/1466312793643810849/1466687133464006666 - Pro kreativní duše\n\n## 💡 Tipy pro začátek\n\n✅ Buď aktivní a získávej levely (https://discord.com/channels/1466312793643810849/1466685836312580138)\n✅ Sleduj oznámení v https://discord.com/channels/1466312793643810849/1466684340867043542\n✅ Máš otázku? Napiš do https://discord.com/channels/1466312793643810849/1466913585686122609 nebo vytvoř https://discord.com/channels/1466312793643810849/1466913729596756159\n✅ Zapoj se do eventů v E-TEAM sekci\n\nUžij si pobyt na XELORIA! 🎉";

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
