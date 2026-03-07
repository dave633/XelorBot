// ═══════════════════════════════════════════
// Konfigurace bota Xeloria
// ═══════════════════════════════════════════

module.exports = {
    // ═══ KANÁLY ═══
    channels: {
        KALKULACKA: '1475526003232342078',
        NAPADY: '1467571631877656727',
        HODNOCENI: '1474493950285844602',
        ANONYM: '1474699337836658709',
        ANONYM_LOG: '1475078648636899440',
        PRAVIDLA: '1466312795460075804',
        TICKETY: '1466913729596756159',
        OZNAMENI: '1466684340867043542',
        OZNAMENI_ODKAZ: '1466685487979827444',
        SELFROLE: '1466685746588024974',
        CHAT_COMMANDS: '1466685908676775999',
        VERIFY_LOG: '1478202563659829329',
        TICKET_LOG: '1478205802819883048',
        NABOR: '1467325249132564603',
        NABOR_LOG: '1478208640144904284',
        EKONOMIKA: '1467467996824862918',
        HLASOVANI: '1467467704834195487',
        GIVEAWAY: '1467462535224623268',
    },

    // ═══ ROLE ═══
    roles: {
        OWNER_ADMIN: '1478866092159144046',
        ADMIN: '1466804160786858221',
        VEDENI_Serveru: '1478865604705517761',
        TICKET_MOD: '1466805359044726954',
        GIVEAWAY_MOD: '1478840702740725922', // Role s přístupem na /gcreate
        NEOVERENY: '1467561819483672607', // Role pro neověřené hráče (při připojení)
        OVERENY: '1467561736457421023',   // Role pro ověřené hráče (po přijetí pravidel)
    },

    // Role s admin právy (pro nápady, oznámení, nahlášení AT, převod účtu)
    adminRoles: ['1478775290808242289', '1478776557962002462','1466804160786858221','1478785007400124457'],

    // Všechny staff role (helper, owner, admin, vedení, ticket mod)
    staffRoles: [
        '1478840700907819229',
        '1466804031925256284',
        '1466805359044726954',
    ],
};
