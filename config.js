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
    shop: /^((nakup)|(nákup)|(nakúp)).*/,
  },
  orderReaction: 'taco',
  orderUnknownReaction: 'question',
  dbPath: './obedbot.db',
  messages: require('./messages'),
};

if (!config.slack.token || !config.slack.lunchChannelId
  || !config.slack.botId || !config.menuLinks.presto || !config.menuLinks.veglife) {
  console.error('Missing env variables!');
  process.exit(1);
}

module.exports = config;
module.exports.default = config;