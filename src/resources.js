import { RTMClient, LogLevel } from '@slack/rtm-api'
import { WebClient } from '@slack/web-api'
import moment from 'moment'

import config from '../config'

export const slack = {
  rtm: new RTMClient(config.slack.botToken, { logLevel: LogLevel.ERROR }),
  webUser: new WebClient(config.slack.userToken),
  webBot: new WebClient(config.slack.botToken),
}

function getTime() {
  return moment().format('HH:mm:ss L')
}

export const logger = {
  log: text => console.log(`[${getTime()}] ${text}`),
  devLog: text => config.dev && console.log(`[${getTime()}] ${text}`),
  error: (text, err) => console.error(`[${getTime()}] ${text}`, err || ''),
}

export let orders = []
