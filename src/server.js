import {RTM_EVENTS, CLIENT_EVENTS} from '@slack/client';
import schedule from 'node-schedule';
import Promise from 'bluebird';
import database from 'sqlite';

import {slack} from './resources';
import {startExpress} from './routes';
import {loadTodayOrders, restaurants} from './utils';
import {loadUsers, messageReceived, endOfOrders, makeLastCall} from './slack';
import config from '../config';

/**
 * Starts the bot server
 */
export function runServer() {
  startExpress();

  // setup the database
  Promise.resolve().then(() => database.open(config.dbPath, {Promise}))
    .then(loadUsers);

  const rtm = slack.rtm;
  console.log('Starting Slack RTM client');
  rtm.start();

  rtm.on(RTM_EVENTS.MESSAGE, messageReceived);

  rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
    // the timeout is here to go around a bug where connection is opened, but not properly established
    console.log('Connected');
    setTimeout(loadTodayOrders, 3000);
  });

  //TODO make times independent
  // set up last calls for each restaurant
  schedule.scheduleJob('30 8 * * 1-5', () => {
    makeLastCall();
  });

  schedule.scheduleJob('30 7 * * 1-5', async () => {
    loadUsers();
  });

  schedule.scheduleJob('45 8 * * 1-5', async () => {
    endOfOrders(restaurants.veglife);
  });

  schedule.scheduleJob('46 8 * * 1-5', async () => {
    endOfOrders(restaurants.presto);
  });

  schedule.scheduleJob('45 9 * * 1-5', async () => {
    endOfOrders(restaurants.spaghetti);
  });
}
