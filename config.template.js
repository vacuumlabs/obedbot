var config = {
  // server configuration
  port: 3000,
  slack: {
    token: 'string with slackbot token',
    channelId: 'id of the channel bot should read messages from',
    botId: 'id of the bot itself',
  },
  lastCall: {
    length: 10,
    step: 1,
  },
  dbUrl: 'url to your mongodb database',
};

module.exports = config;
module.exports.default = config;
