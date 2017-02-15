import {RtmClient, WebClient} from '@slack/client';
import moment from 'moment';

import config from '../config';

export const slack = {
  rtm: new RtmClient(config.slack.token, {logLevel: 'error'}),
  web: new WebClient(config.slack.token),
};

function getTime() {
  return moment().format('HH:mm:ss L');
}

export const logger = {
  log: (text) => console.log(`[${getTime()}] ${text}`),
  devLog: (text) => config.dev && console.log(`[${getTime()}] ${text}`),
  error: (text, err) => console.error(`[${getTime()}] ${text}`, err),
};

export let orders = [];
