import {RTM_EVENTS, CLIENT_EVENTS} from '@slack/client';
import schedule from 'node-schedule';
import Promise from 'bluebird';
import database from 'sqlite';

import {slack} from './resources';
import {startExpress} from './routes';
import {messageReceived, loadTodayOrders, makeLastCall, endOfOrders} from './orders';
import {restaurants, loadUsers} from './utils';
import config from '../config'; // eslint-disable-line import/no-unresolved

/**
 * Starts the bot server
 */
export function runServer() {
  startExpress();

  // setup the database
  Promise.resolve().then(() => database.open(config.dbPath, {Promise}))
    .then(loadUsers);

  const rtm = slack.rtm;

  rtm.start();
  console.log('slack server started');

  rtm.on(RTM_EVENTS.MESSAGE, messageReceived);

  rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
    // the timeout is here to go around a bug where connection is opened, but not properly established
    console.log('Connected');
    setTimeout(loadTodayOrders, 3000);
  });

  // set up last calls for each restaurant
  schedule.scheduleJob('30 7 * * 1-5', () => {
    makeLastCall();
  });

  schedule.scheduleJob('30 6 * * 1-5', async () => {
    loadUsers();
  });

  schedule.scheduleJob('45 7 * * 1-5', async () => {
    endOfOrders(restaurants.veglife);
  });

  schedule.scheduleJob('46 7 * * 1-5', async () => {
    endOfOrders(restaurants.presto);
  });

  schedule.scheduleJob('45 8 * * 1-5', async () => {
    endOfOrders(restaurants.spaghetti);
  });
}
