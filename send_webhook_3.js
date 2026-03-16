const https = require('https');

const webhookUrl = 'https://discord.com/api/webhooks/1482188890453311583/VJVvo9QJIwkLnuJqQ-wbHogwLegEgQOaDzI5wc3rZoEq8aofcrYnpMMkAoFzeWvxgNDU';

const messageContent = "# 🛡️ Bezpečnost na XELORIA Community\n\nTvoje bezpečnost je pro nás priorita! Přečti si důležité informace o tom, jak se chránit na Discordu a v online prostředí.\n\n## 🔒 Ochrana účtu\n\n**Zapni dvoufaktorové ověření (2FA)**\n✅ Jdi do Nastavení > Můj účet > Zapnout dvoufaktorové ověření\n✅ Použij autentikační aplikaci (Google Authenticator, Authy)\n✅ Ulož si záložní kódy na bezpečné místo\n\n**Silné heslo**\n✅ Použij unikátní heslo pro Discord (nepoužívej stejné jako jinde)\n✅ Minimálně 12 znaků s kombinací písmen, čísel a symbolů\n✅ Zvažte použití správce hesel (LastPass, Bitwarden, 1Password)\n\n## ⚠️ Podvodné praktiky - VAROVÁNÍ\n\n**NIKDY nesdílej:**\n❌ Své heslo k Discordu nebo email\n❌ Své tokeny nebo přihlašovací údaje\n❌ Osobní informace (celé jméno, adresu, telefonní číslo)\n❌ Platební údaje s neznámými lidmi\n\n**Phishing útoky - Dávej pozor na:**\n🚫 Podezřelé odkazy (zkontroluj URL před kliknutím!)\n🚫 Zprávy tvářící se jako Discord staff (Discord NIKDY nežádá o heslo!)\n🚫 \"Free Nitro\" scamy a falešné giveaway\n🚫 Podivné DM zprávy od botů nebo neznámých";

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
