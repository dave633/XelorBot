// ═══════════════════════════════════════════
// Příkaz: /anonym <text>
// ═══════════════════════════════════════════

const { SlashCommandBuilder } = require('discord.js');
const { sendAnonymSlash } = require('../modules/anonymous');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('anonym')
        .setDescription('Pošli anonymní zprávu do anonym kanálu')
        .addStringOption(option =>
            option
                .setName('text')
                .setDescription('Zpráva, kterou chceš poslat anonymně')
                .setRequired(true)
                .setMaxLength(1000)
        ),

    async execute(interaction) {
        await sendAnonymSlash(interaction);
    }
};
