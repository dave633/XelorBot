const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const config = require('../config');

function setupWebServer(client) {
    console.log('🚀 INICIALIZACE WEBSERVERU...');
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    app.use(cors());
    app.use(express.json());

    // TESTOVACÍ ROUTA - musí fungovat jako první
    app.get('/test', (req, res) => {
        res.send('SERVER JE OK! Pokud toto vidíš, bot funguje.');
    });

    const webPath = path.join(__dirname, '../public');

    // Ruční obsluha souborů pro jistotu
    app.get('/dashboard.html', (req, res) => {
        res.sendFile(path.join(webPath, 'dashboard.html'));
    });

    app.use(express.static(webPath));

    app.get('/', (req, res) => {
        res.sendFile(path.join(webPath, 'index.html'));
    });

    // OAuth2 Session
    app.use(session({
        secret: process.env.SESSION_SECRET || 'xeloria_secret_123',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
        passport.use(new DiscordStrategy({
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: process.env.CALLBACK_URL,
            scope: ['identify', 'guilds'],
            state: true
        }, (accessToken, refreshToken, profile, done) => {
            return done(null, profile);
        }));

        app.get('/auth/discord', passport.authenticate('discord'));

        app.get('/auth/discord/callback', (req, res, next) => {
            passport.authenticate('discord', (err, user, info) => {
                if (err) return res.send(`Chyba: ${err.message}`);
                if (!user) return res.redirect('/');
                req.logIn(user, (err) => {
                    if (err) return next(err);
                    res.redirect('/dashboard.html');
                });
            })(req, res, next);
        });

        app.get('/api/user', (req, res) => {
            if (req.isAuthenticated()) {
                res.json({
                    loggedIn: true,
                    username: req.user.username,
                    avatar: `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png`,
                    id: req.user.id
                });
            } else {
                res.json({ loggedIn: false });
            }
        });
    }

    app.get('/api/tickets', async (req, res) => {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return res.json([]);
        const channels = guild.channels.cache.filter(c => c.name.startsWith('ticket-'));
        res.json(channels.map(c => ({ id: c.id, name: c.name })));
    });

    io.on('connection', (socket) => {
        socket.on('join_ticket', (id) => socket.join(id));
        socket.on('send_message', async (data) => {
            const { ticketId, message, user, userId, avatar } = data;
            const guild = client.guilds.cache.get(process.env.GUILD_ID);
            const channel = guild?.channels.cache.get(ticketId);

            if (channel) {
                try {
                    // Najdeme nebo vytvoříme Webhook pro tento kanál
                    let webhooks = await channel.fetchWebhooks();
                    let webhook = webhooks.find(wh => wh.name === 'XelorBridge');

                    if (!webhook) {
                        webhook = await channel.createWebhook({
                            name: 'XelorBridge',
                            avatar: client.user.displayAvatarURL(),
                        });
                    }

                    // Odešleme zprávu jako uživatel (jméno a profilovka z webu/Discordu)
                    await webhook.send({
                        content: message,
                        username: user,
                        avatarURL: avatar || client.user.displayAvatarURL(),
                    });
                } catch (err) {
                    console.error('Webhook error:', err);
                    await channel.send(`**${user}:** ${message}`); // Fallback
                }
            }
        });

        // Vytvoření ticketu z webu (Placeholder - propojí se s tickets.js)
        socket.on('create_ticket', async (data) => {
            const { userId, username, category } = data;
            // Zde by se zavolala funkce z modules/tickets.js
            console.log(`🎫 Požadavek na nový ticket od ${username} (${category})`);
        });
    });

    client.on('messageCreate', (msg) => {
        if (msg.author.bot) return;
        if (msg.channel.name?.startsWith('ticket-')) {
            io.to(msg.channel.id).emit('receive_message', {
                author: msg.author.username,
                content: msg.content,
                isStaff: config.staffRoles.some(r => msg.member?.roles.cache.has(r))
            });
        }
    });

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
        console.log(`🌐 SERVER BĚŽÍ NA PORTU: ${PORT}`);
        console.log(`📂 PRODUKČNÍ CESTA: ${webPath}`);
    });
}

module.exports = { setupWebServer };
