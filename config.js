// load .env variables into process.env
require('dotenv').config();

var config = {
  dev: (process.env.OBEDBOT_DEV === 'true') || false,
  port: process.env.OBEDBOT_PORT || 4000,
  slack: {
    token: process.env.OBEDBOT_BOT_TOKEN || '',
    lunchChannelId: process.env.OBEDBOT_CHANNEL_ID || '',
    botId: process.env.OBEDBOT_BOT_ID || '',
  },
  menuLinks: {
    presto: process.env.OBEDBOT_PRESTO || '',
    veglife: process.env.OBEDBOT_VEGLIFE || '',
  },
  orderRegex: {
    presto: /presto[1-6]p[1-2]/,
    pizza: /pizza[0-9]{1,2}(v((33)|(40)|(50)))?/,
    veglife: /veg[1-4]\+?[ps]?/,
    spaghetti: /[a-z]{1,2}((300)|(400)|(450)|(600)|(800))((sc)|(cs)|(pc)|[psc])?\+?[pt]?/,
    shop: /^nakup.*/,
  },
  orderReaction: 'taco',
  orderUnknownReaction: 'question',
  dbPath: './obedbot.db'
};

config.helpMessage = `*SALAT + MASO*
staci nahlasit do ~11:00, ze budete papat a dostanete salatik + masko, ake si vypytate z Billy. Bezne byva kuracie stehno, klobaska, no najde sa obcas aj sekana, prso, bocik...

*Priklad:* \`@obedbot: nakup stehno+salat\`

*PIZZA PRESTO*
\`http://www.pizza-presto.sk/default.aspx?p=catalogpage&group=1\`
Tam si viete objednat do 9:45 v dany den lubovolny obed z denneho menu alebo pizzu.
MENU: Napisete do Slacku presto+"cislo"+"p"+(1/2), kde 1 alebo 2 na konci je cislopolievky.
*Priklad:* \`@obedbot: presto3p1\` - chcem menu 3 s prvou polievkou v poradi na dany den
PIZZA: Napisete do Slacku pizza+"cislo"+"v" (velkost) +(33/40/50)
*Priklad:* \`@obedbot: pizza3v33\` - chcem pizzu c. 3 velkosti 33 cm

*SPAGETY LEVIATHAN*
\`http://www.leviathan.sk/bratislava/menu.html\`
Viete si objednat do ~10:45 na Slacku. Nas slang dnes vyzera tak, ze napisete ABC+D, kde A je prve pismeno nazvu spagiet (moze sa skladat aj z dvoch pismen pre lepsiu prehladnost, ak je viac typov spagiet s rovnakym zacinajucim pismenom), B je hmotnost a C je typ cestoviny (spagety alebo penne). D urcuje, ci chcete polievku alebo tiramisu ("p" alebo "t").
*Priklad:* \`@obedbot: b600p+p\` znamena bolognese 600 gramove penne s polievkou.
Zial niekedy nerobia donasku, co dopredu nikdy nevieme.

*VEGLIFE*
\`http://www.veglife.sk/index.php/obedove-menu\`
Do 9:45 je mozne si nahlasit veg+cislo+pripadna polievka alebo salat
Priklad: \`@obedbot: veg4p\` znaci, ze si date stvorku s polievkou z VegLife.
Dufame, ze si v tom kazdy najde svoje :slightly_smiling_face:

*MENU*
Ak sa ti nechce hladat menu na strankach tychto restik, staci ak do konverzacie na slacku napises \`/veglife\` alebo \`"/presto"\` a zobrazi sa ti menu restiky na dany den. Neboj, nikoho tym spamovat nebudes. Menu je viditelne iba pre teba :slightly_smiling_face:
`;

if (!config.slack.token || !config.slack.lunchChannelId
  || !config.slack.botId || !config.menuLinks.presto || !config.menuLinks.veglife) {
  console.log('Missing env variables!');
  process.exit(1);
}

module.exports = config;
module.exports.default = config;