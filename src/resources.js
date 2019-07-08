import { RTMClient, LogLevel } from '@slack/rtm-api'
import { WebClient } from '@slack/web-api'
import moment from 'moment'

import config from '../config'

export const slack = {
  rtm: new RTMClient(config.slack.token, { logLevel: LogLevel.ERROR }),
  web: new WebClient(config.slack.token),
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
