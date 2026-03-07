const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Odpoví Pong a zobrazí latenci.'),

    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        await interaction.editReply(`Pong! Latence: ${latency} ms`);
    },
};
