var config = {
  port: 4000,
  slack: {
    token: ''
    lunchChannelId: '',
    botId: '',
  },
  orderRegex: {
    presto: /presto[1-6]p[1-2]/,
    pizza: /pizza[0-9]{1,2}(v((33)|(40)|(50)))?/,
    veglife: /veg[1-4]\+?[ps]?/,
    spaghetti: /[a-z]{1,2}((300)|(400)|(450)|(600)|(800))((sc)|(cs)|(pc)|[psc])?\+?[pt]?/,
    shop: /^nakup.*/,
  },
  orderReaction: 'taco',
  dbPath: './obedbot.db'
};

module.exports = config;
module.exports.default = config;
