// ═══════════════════════════════════════════
// Modul: Kalkulačka
// ═══════════════════════════════════════════

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const calculatorStates = new Map();

function createCalculatorEmbed(display = '0') {
    return new EmbedBuilder()
        .setTitle('🔢 Kalkulačka')
        .setDescription(`\`\`\`\n${display}\n\`\`\``)
        .setColor(0x2B2D31)
        .setFooter({ text: 'Xeloria Kalkulačka' });
}

function createCalculatorButtons() {
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calc_C').setLabel('C').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('calc_(').setLabel('(').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('calc_)').setLabel(')').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('calc_/').setLabel('÷').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calc_7').setLabel('7').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_8').setLabel('8').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_9').setLabel('9').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_*').setLabel('×').setStyle(ButtonStyle.Secondary),
    );
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calc_4').setLabel('4').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_5').setLabel('5').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_6').setLabel('6').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_-').setLabel('-').setStyle(ButtonStyle.Secondary),
    );
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calc_1').setLabel('1').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_2').setLabel('2').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_3').setLabel('3').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_+').setLabel('+').setStyle(ButtonStyle.Secondary),
    );
    const row5 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('calc_0').setLabel('0').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_.').setLabel('.').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('calc_back').setLabel('←').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('calc_=').setLabel('=').setStyle(ButtonStyle.Success),
    );
    return [row1, row2, row3, row4, row5];
}

function safeEval(expr) {
    const sanitized = expr.replace(/[^0-9+\-*/().]/g, '');
    if (!sanitized) return '0';
    try {
        const result = new Function('return ' + sanitized)();
        if (!isFinite(result)) return 'Chyba';
        return String(Math.round(result * 1000000) / 1000000);
    } catch {
        return 'Chyba';
    }
}

async function handleCalculatorButton(interaction) {
    const action = interaction.customId.replace('calc_', '');
    const userId = interaction.user.id;

    let state = calculatorStates.get(userId) || { display: '0', newInput: true };

    if (action === 'C') {
        state = { display: '0', newInput: true };
    } else if (action === 'back') {
        state.display = state.display.length > 1 ? state.display.slice(0, -1) : '0';
    } else if (action === '=') {
        state.display = safeEval(state.display);
        state.newInput = true;
    } else {
        if (state.newInput && !isNaN(action)) {
            state.display = action;
            state.newInput = false;
        } else {
            if (state.display === '0' && !isNaN(action)) {
                state.display = action;
            } else {
                state.display += action;
            }
            state.newInput = false;
        }
    }

    if (state.display.length > 50) {
        state.display = state.display.slice(0, 50);
    }

    calculatorStates.set(userId, state);

    await interaction.update({
        embeds: [createCalculatorEmbed(state.display)],
        components: createCalculatorButtons(),
    });
}

async function sendCalculatorPanel(channel) {
    await channel.send({
        embeds: [createCalculatorEmbed()],
        components: createCalculatorButtons(),
    });
}

module.exports = { handleCalculatorButton, sendCalculatorPanel };
