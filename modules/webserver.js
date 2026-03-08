const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const path = require('path');
const config = require('../config');
const { handleWebTickets } = require('./web_tickets_logic');

function setupWebServer(client) {
    console.log('🚀 INICIALIZACE WEBSERVERU...');
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] }
    });

    // Oprava pro Render (Proxy)
    app.set('trust proxy', 1);

    app.use(cors());
    app.use(express.json());

    // TESTOVACÍ ROUTA
    app.get('/test', (req, res) => {
        res.send('SERVER JE OK! Pokud toto vidíš, bot funguje.');
    });

    const webPath = path.join(__dirname, '../public');

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
        proxy: true,
        cookie: {
            secure: !!process.env.RENDER, // True na Renderu (přes HTTPS), false pro localhost
            maxAge: 1000 * 60 * 60 * 24 // 1 den
        }
    }));

    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => done(null, user));
    passport.deserializeUser((obj, done) => done(null, obj));

    if (process.env.CLIENT_ID && process.env.CLIENT_SECRET) {
        console.log(`📡 Konfigurace Discord OAuth: ID=${process.env.CLIENT_ID ? 'OK' : 'CHYBÍ'}, URL=${process.env.CALLBACK_URL}`);

        passport.use(new DiscordStrategy({
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: process.env.CALLBACK_URL,
            scope: ['identify', 'guilds'],
            state: false
        }, (accessToken, refreshToken, profile, done) => {
            console.log('✅ Token získán pro uživatele:', profile.username);
            return done(null, profile);
        }));

        app.get('/auth/discord', passport.authenticate('discord'));

        app.get('/auth/discord/callback', (req, res, next) => {
            passport.authenticate('discord', (err, user, info) => {
                if (err) {
                    console.error('❌ CHYBA AUTENTIZACE:', err);
                    return res.send(`Chyba: ${err.message}. Zkontrolujte logy na Renderu.`);
                }
                if (!user) return res.redirect('/');
                req.logIn(user, (err) => {
                    if (err) return next(err);
                    res.redirect('/dashboard.html');
                });
            })(req, res, next);
        });

        app.get('/api/user', async (req, res) => {
            if (req.isAuthenticated()) {
                try {
                    const guild = client.guilds.cache.get(config.GUILD_ID || process.env.GUILD_ID);
                    let member = guild?.members.cache.get(req.user.id);

                    if (!member && guild) {
                        try {
                            member = await guild.members.fetch(req.user.id);
                        } catch (e) {
                            console.error('API/User: Member fetch error', e.message);
                        }
                    }

                    const isStaff = config.staffRoles.some(roleId => member?.roles.cache.has(roleId));

                    res.json({
                        loggedIn: true,
                        username: req.user.username,
                        avatar: `https://cdn.discordapp.com/avatars/${req.user.id}/${req.user.avatar}.png`,
                        id: req.user.id,
                        isStaff: !!isStaff
                    });
                } catch (err) {
                    console.error('API/User Error:', err);
                    res.json({ loggedIn: true, id: req.user.id, isStaff: false });
                }
            } else {
                res.json({ loggedIn: false });
            }
        });

        app.get('/logout', (req, res) => {
            req.logout(() => {
                res.redirect('/');
            });
        });
    }

    // Socket.io
    io.on('connection', (socket) => {
        console.log('🔌 Nové webové připojení');
        handleWebTickets(io, socket, client);
    });

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
        console.log(`🌐 SERVER BĚŽÍ NA PORTU: ${PORT}`);
    });
}

module.exports = { setupWebServer };
