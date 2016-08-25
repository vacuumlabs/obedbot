import {RTM_EVENTS, CLIENT_EVENTS} from '@slack/client';
import schedule from 'node-schedule';
import {slack} from './resources';
import {startExpress} from './routes';
import {messageReceived, loadTodayOrders, makeLastCall, dropOrders} from './orders';

/**
 * Starts the bot server
 */
export function runServer() {
  startExpress();
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
  schedule.scheduleJob('20 9 * * 1-5', () => {
    makeLastCall('jedlo pod nos');
  });
  schedule.scheduleJob('50 9 * * 1-5', () => {
    makeLastCall('veglife');
  });
  schedule.scheduleJob('50 10 * * 1-5', () => {
    makeLastCall('spaghetti');
  });

  // delete all the orders for the new day
  schedule.scheduleJob('0 12 * * 1-5', dropOrders);
}
