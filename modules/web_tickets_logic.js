const fs = require('fs');
const path = require('path');

const TICKETS_FILE = path.join(__dirname, '../data/web_tickets.json');

// Načtení ticketů ze souboru
function loadWebTickets() {
    if (!fs.existsSync(TICKETS_FILE)) return [];
    try {
        const data = fs.readFileSync(TICKETS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Chyba při načítání web ticketů:', err);
        return [];
    }
}

// Uložení ticketů do souboru
function saveWebTickets(tickets) {
    try {
        fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
    } catch (err) {
        console.error('Chyba při ukládání web ticketů:', err);
    }
}

function handleWebTickets(io, socket, client) {
    const config = require('../config');

    // Načtení ticketů (uživatel vidí své, staff vidí všechny)
    socket.on('get_my_web_tickets', ({ userId, isStaff }) => {
        const tickets = loadWebTickets();
        if (isStaff) {
            socket.emit('your_web_tickets', tickets);
        } else {
            const userTickets = tickets.filter(t => t.userId === userId);
            socket.emit('your_web_tickets', userTickets);
        }
    });

    // Vytvoření nového web ticketu
    socket.on('create_web_ticket', async (data) => {
        const { userId, username, category, subject } = data;
        const tickets = loadWebTickets();

        const newTicket = {
            id: `WEB-${Math.floor(1000 + Math.random() * 9000)}`,
            userId,
            username,
            category,
            subject,
            status: 'open',
            createdAt: new Date().toISOString(),
            messages: [
                {
                    author: 'System',
                    content: `Vítejte ve vašem webovém ticketu na téma ${category}. Brzy se vám ozveme.`,
                    timestamp: new Date().toISOString()
                }
            ]
        };

        tickets.push(newTicket);
        saveWebTickets(tickets);

        socket.emit('web_ticket_created', newTicket);

        // --- DISCORD NOTIFIKACE PRO STAFF ---
        try {
            const logChannel = client.channels.cache.get(config.channels.TICKET_LOG);
            if (logChannel) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setTitle('🎫 Nový Web Ticket #2')
                    .setColor('#7c3aed')
                    .addFields(
                        { name: 'Uživatel', value: username, inline: true },
                        { name: 'Kategorie', value: category, inline: true },
                        { name: 'ID', value: newTicket.id, inline: true },
                        { name: 'Předmět', value: subject }
                    )
                    .setDescription(`Nový webový ticket byl vytvořen. Podpora může odepsat na dashboardu:\n${process.env.BASE_URL || 'http://localhost:3005'}/dashboard.html`)
                    .setTimestamp();

                logChannel.send({ embeds: [embed] });
            }
        } catch (err) {
            console.error('Chyba při posílání notifikace na Discord:', err);
        }

        // Informovat uživatele o aktualizaci seznamu
        const ticketsAfter = loadWebTickets();
        socket.emit('your_web_tickets', ticketsAfter.filter(t => t.userId === userId));
    });

    // Odeslání zprávy ve web ticketu
    socket.on('send_web_message', (data) => {
        const { ticketId, userId, username, content } = data;
        const tickets = loadWebTickets();
        const ticket = tickets.find(t => t.id === ticketId);

        if (ticket) {
            ticket.messages.push({
                author: username,
                userId: userId,
                content: content,
                timestamp: new Date().toISOString()
            });
            saveWebTickets(tickets);

            // Emit zpět všem v tomto ticketu (pokud by jich bylo víc)
            io.to(ticketId).emit('new_web_message', {
                ticketId,
                message: {
                    author: username,
                    content: content,
                    timestamp: new Date().toISOString()
                }
            });
        }
    });

    // Připojení k místnosti ticketu
    socket.on('join_web_ticket', (ticketId) => {
        socket.join(ticketId);
        const tickets = loadWebTickets();
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
            socket.emit('web_ticket_history', ticket);
        }
    });

    // Uzavření ticketu
    socket.on('close_web_ticket', (ticketId) => {
        const tickets = loadWebTickets();
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
            ticket.status = 'closed';
            ticket.messages.push({
                author: 'System',
                content: 'Tento ticket byl uzavřen členem týmu.',
                timestamp: new Date().toISOString()
            });
            saveWebTickets(tickets);
            io.to(ticketId).emit('web_ticket_history', ticket);
            // Informovat o uzavření v reálném čase
            io.to(ticketId).emit('new_web_message', {
                ticketId,
                message: {
                    author: 'System',
                    content: '🔒 TICKET UZAVŘEN',
                    timestamp: new Date().toISOString()
                }
            });
        }
    });
}

module.exports = { handleWebTickets };
