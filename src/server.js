import {RTM_EVENTS, CLIENT_EVENTS} from '@slack/client';
import schedule from 'node-schedule';
import moment from 'moment-timezone';

import {slack, logger} from './resources';
import {startExpress} from './routes';
import {loadTodayOrders, restaurants} from './utils';
import {loadUsers, messageReceived, endOfOrders, makeLastCall} from './slack';

let wasDST = null;
let jobs = [];

function reschedule() {
  const isDST = moment().tz('Europe/Prague').isDST();

  if (isDST === wasDST) {
    return;
  }

  wasDST = isDST;

  jobs.forEach((j) => j.cancel);

  jobs = [
    // set up last calls for each restaurant
    schedule.scheduleJob(`15 ${isDST ? 7 : 8} * * 1-5`, () => {
      makeLastCall();
    }),
    schedule.scheduleJob(`30 ${isDST ? 6 : 7} * * 1-5`, () => {
      loadUsers();
    }),
    schedule.scheduleJob(`30 ${isDST ? 7 : 8} * * 1-5`, () => {
      endOfOrders(restaurants.hamka);
    }),
    schedule.scheduleJob(`40 ${isDST ? 7 : 8} * * 1-5`, () => {
      endOfOrders(restaurants.veglife);
    }),
    schedule.scheduleJob(`00 ${isDST ? 8 : 9} * * 1-5`, () => {
      endOfOrders(restaurants.click);
    }),
    schedule.scheduleJob(`00 ${isDST ? 8 : 9} * * 1-5`, () => {
      endOfOrders(restaurants.presto);
    }),
  ];
}

/**
 * Starts the bot server
 */
export function runServer() {
  startExpress();

  loadUsers();
  const rtm = slack.rtm;
  logger.log('Starting Slack RTM client');
  rtm.start();

  rtm.on(RTM_EVENTS.MESSAGE, messageReceived);

  rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, () => {
    // the timeout is here to go around a bug where connection is opened, but not properly established
    logger.log('Slack RTM client connected');
    setTimeout(loadTodayOrders, 3000);
  });

  reschedule();

  setInterval(reschedule, 60 * 60 * 1000);
}
