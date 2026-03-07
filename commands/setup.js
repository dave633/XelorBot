// ═══════════════════════════════════════════
// Příkaz: /setup (nastavení panelů)
// ═══════════════════════════════════════════

const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const config = require('../config');
const { sendCalculatorPanel } = require('../modules/calculator');
const { sendRulesPanel } = require('../modules/rules');
const { sendTicketPanel } = require('../modules/tickets');
const { sendSelfrolePanel } = require('../modules/selfroles');
const { sendNaborPanel } = require('../modules/nabor');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Nastavit panely bota')
        .addStringOption(option =>
            option.setName('panel')
                .setDescription('Který panel nastavit')
                .setRequired(true)
                .addChoices(
                    { name: '🔢 Kalkulačka', value: 'kalkulacka' },
                    { name: '📜 Pravidla', value: 'pravidla' },
                    { name: '🎫 Tickety', value: 'tickety' },
                    { name: '🔔 Selfrole', value: 'selfrole' },
                    { name: '🔒 Verify oprávnění', value: 'verify-perms' },
                    { name: '📋 Nábor', value: 'nabor' },
                )),

    async execute(interaction) {
        const isAdmin = config.adminRoles.some(r => interaction.member.roles.cache.has(r));
        if (!isAdmin) {
            return interaction.reply({ content: '❌ Nemáš oprávnění!', ephemeral: true });
        }

        const panel = interaction.options.getString('panel');

        switch (panel) {
            case 'kalkulacka': {
                const ch = interaction.guild.channels.cache.get(config.channels.KALKULACKA);
                if (!ch) return interaction.reply({ content: '❌ Kanál pro kalkulačku nebyl nalezen!', ephemeral: true });
                await sendCalculatorPanel(ch);
                await interaction.reply({ content: '✅ Kalkulačka panel odeslán!', ephemeral: true });
                break;
            }
            case 'pravidla': {
                const ch = interaction.guild.channels.cache.get(config.channels.PRAVIDLA);
                if (!ch) return interaction.reply({ content: '❌ Kanál pro pravidla nebyl nalezen!', ephemeral: true });
                await sendRulesPanel(ch);
                await interaction.reply({ content: '✅ Pravidla panel odeslán!', ephemeral: true });
                break;
            }
            case 'tickety': {
                const ch = interaction.guild.channels.cache.get(config.channels.TICKETY);
                if (!ch) return interaction.reply({ content: '❌ Kanál pro tickety nebyl nalezen!', ephemeral: true });
                await sendTicketPanel(ch);
                await interaction.reply({ content: '✅ Ticket panel odeslán!', ephemeral: true });
                break;
            }
            case 'selfrole': {
                const ch = interaction.guild.channels.cache.get(config.channels.SELFROLE);
                if (!ch) return interaction.reply({ content: '❌ Kanál pro selfrole nebyl nalezen!', ephemeral: true });
                await sendSelfrolePanel(ch);
                await interaction.reply({ content: '✅ Selfrole panel odeslán!', ephemeral: true });
                break;
            }
            case 'nabor': {
                const ch = interaction.guild.channels.cache.get(config.channels.NABOR);
                if (!ch) return interaction.reply({ content: '❌ Kanál pro nábor nebyl nalezen!', ephemeral: true });
                await sendNaborPanel(ch);
                await interaction.reply({ content: '✅ Nábor panel odeslán!', ephemeral: true });
                break;
            }
            case 'verify-perms': {
                await interaction.deferReply({ ephemeral: true });

                const guild = interaction.guild;
                const unverifiedRoleId = config.roles.NEOVERENY;
                const rulesChannelId = config.channels.PRAVIDLA;

                let updated = 0;
                let errors = 0;

                // Projít všechny kanály na serveru
                const channels = guild.channels.cache.filter(
                    ch => ch.type === ChannelType.GuildText ||
                        ch.type === ChannelType.GuildVoice ||
                        ch.type === ChannelType.GuildCategory ||
                        ch.type === ChannelType.GuildForum ||
                        ch.type === ChannelType.GuildAnnouncement
                );

                for (const [channelId, channel] of channels) {
                    try {
                        if (channelId === rulesChannelId) {
                            // Kanál pravidel – Neověřený MŮŽE vidět + číst
                            await channel.permissionOverwrites.edit(unverifiedRoleId, {
                                ViewChannel: true,
                                SendMessages: false,    // Nemůže psát (jen číst a kliknout na tlačítko)
                                AddReactions: false,
                            });
                        } else {
                            // Všechny ostatní kanály – Neověřený NEMŮŽE vidět
                            await channel.permissionOverwrites.edit(unverifiedRoleId, {
                                ViewChannel: false,
                            });
                        }
                        updated++;
                    } catch (err) {
                        console.error(`Chyba při nastavování oprávnění pro kanál ${channel.name}:`, err);
                        errors++;
                    }
                }

                await interaction.editReply({
                    content: `✅ Oprávnění nastavena!\n\n` +
                        `🔒 **Neověřená role** nyní vidí pouze kanál pravidel.\n` +
                        `📊 Upraveno kanálů: **${updated}**\n` +
                        `${errors > 0 ? `⚠️ Chyby: **${errors}**` : ''}`,
                });
                break;
            }
        }
    },
};
