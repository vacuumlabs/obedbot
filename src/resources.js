import {RtmClient, WebClient} from '@slack/client';
import database from 'sqlite';

import config from '../config'; // eslint-disable-line import/no-unresolved

export const slack = {
  rtm: new RtmClient(config.slack.token, {logLevel: 'error'}),
  web: new WebClient(config.slack.token),
};

export let orders = [];
export let users = [];

export function loadUsers() {
  database.all('SELECT * FROM users')
    .then((allUsers) => {
      allUsers.forEach((userData) => users.push(userData));
    });
}
