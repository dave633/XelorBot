// ═══════════════════════════════════════════
// Filtr špatných slov (CZ/SK)
// ═══════════════════════════════════════════

const badWords = [
    // České/Slovenské vulgarismy
    'kurva', 'píča', 'piča', 'kokot', 'debil', 'kretén', 'hajzl',
    'hovado', 'prdel', 'sráč', 'zmrd', 'čurák', 'hovno',
    'jebat', 'posrat', 'zasraný', 'mrdka', 'mrdkat', 'svině', 'sviňa',
    'děvka', 'šlapka', 'coura', 'čubka', 'zkurvit', 'zkurvenej',
    // Rasistické výrazy
    'negr', 'nigger', 'nigga', 'cikán',
    // Obecně urážlivé
    'retard', 'mongol', 'kys', 'kill yourself', 'zemři', 'zabij se',
];

function containsBadWord(text) {
    const lower = text.toLowerCase();
    const normalized = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    for (const word of badWords) {
        const normalizedWord = word.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (lower.includes(word) || normalized.includes(normalizedWord)) {
            return true;
        }
    }
    return false;
}

module.exports = { badWords, containsBadWord };
