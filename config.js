// load .env variables into process.env
require('dotenv').config()

const config = {
  dev: process.env.OBEDBOT_DEV === 'true' || false,
  port: process.env.OBEDBOT_PORT || 4000,
  airtable: {
    apiKey: process.env.OBEDBOT_API_KEY || '',
    baseId: process.env.OBEDBOT_BASE_ID || '',
    tableName: process.env.OBEDBOT_TABLE_NAME || '',
  },
  slack: {
    userToken: process.env.OBEDBOT_USER_TOKEN || '',
    botToken: process.env.OBEDBOT_BOT_TOKEN || '',
    lunchChannelId: process.env.OBEDBOT_CHANNEL_ID || '',
    lunchChannelIdKE: process.env.OBEDBOT_CHANNEL_ID_KE || '',
    botId: process.env.OBEDBOT_BOT_ID || '',
  },
  orderReaction: 'taco',
  orderUnknownReaction: 'question',
}

const requiredConfig = [
  config.slack.userToken,
  config.slack.botToken,
  config.slack.lunchChannelId,
  config.slack.lunchChannelIdKE,
  config.slack.botId,
  config.airtable.apiKey,
  config.airtable.baseId,
  config.airtable.tableName,
]

if (requiredConfig.some(value => !value)) {
  console.error('Missing env variables!')
  process.exit(1)
}

module.exports = config
module.exports.default = config
