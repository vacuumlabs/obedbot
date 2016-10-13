import {RTM_EVENTS, CLIENT_EVENTS} from '@slack/client';
import schedule from 'node-schedule';
import Promise from 'bluebird';
import database from 'sqlite';

import {slack, loadUsers} from './resources';
import {startExpress} from './routes';
import {messageReceived, loadTodayOrders, makeLastCall, dropOrders} from './orders';
import {restaurants} from './utils';
import config from '../config'; // eslint-disable-line import/no-unresolved

/**
 * Starts the bot server
 */
export function runServer() {
  startExpress();

  // setup the database
  Promise.resolve().then(
    () => database.open(config.dbPath, {Promise})
  ).then(() => {
    loadUsers();
  });

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
  schedule.scheduleJob('34 22 * * 1-5', () => {
    makeLastCall(restaurants.presto);
  });
  schedule.scheduleJob('45 9 * * 1-5', () => {
    makeLastCall(restaurants.veglife);
  });
  schedule.scheduleJob('45 10 * * 1-5', () => {
    makeLastCall(restaurants.spaghetti);
  });

  // delete all the orders for the new day
  schedule.scheduleJob('0 12 * * 1-5', dropOrders);
}
