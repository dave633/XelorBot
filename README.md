# XelorBot — rychlé spuštění

Krátký návod jak lokalně spustit bota.

1. Nainstaluj závislosti

```bash
npm install
```

2. Vytvoř `.env` ze souboru `.env.example` a vyplň `TOKEN` a (volitelně) `GUILD_ID`:

```bash
cp .env.example .env
# nebo na Windows PowerShell
Copy-Item .env.example .env
```

3. Nasazení slash příkazů (pokud máš `GUILD_ID`, bude to okamžité):

```bash
npm run deploy
```

4. Spuštění bota

```bash
npm start
```

Hotovo — bot by měl být online a dostupný na serveru.
