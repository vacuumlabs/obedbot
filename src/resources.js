import {RtmClient, WebClient} from '@slack/client';
import config from '../config'; // eslint-disable-line import/no-unresolved

export const slack = {
  rtm: new RtmClient(config.slack.token, {logLevel: 'error'}),
  web: new WebClient(config.slack.token),
};

export const orders = {
  jedloPodNos: [],
  veglife: [],
  spaghetti: [],
  nakup: [],
};
