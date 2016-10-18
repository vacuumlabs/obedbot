import {RTM_MESSAGE_SUBTYPES} from '@slack/client';
import {isNil, find} from 'lodash';
import moment from 'moment';
import database from 'sqlite';

import {slack, orders, users} from './resources';
import {
  prettyPrint,
  userExists,
  saveUser,
  alreadyReacted,
  identifyRestaurant,
  stripMention,
  isObedbotMentioned,
  isChannelPublic,
} from './utils';
import config from '../config'; // eslint-disable-line import/no-unresolved

/**
 * Checks if the given message is an order
 *
 * @param {string} order - order message
 * @returns {bool} - true if order matches, false if not identified
 */
function isOrder(order) {
  const regexes = config.orderRegex;
  order = order.toLowerCase().trim();

  console.log('Checking order:', order);

  for (let regexKey in regexes) {
    if (regexes.hasOwnProperty(regexKey)) {
      if (regexes[regexKey].test(order)) {
        console.log(`Order type is ${regexKey}`);
        return true;
      }
    }
  }

  console.log('Message is not an order');
  return false;
}

function saveOrder(messageText, ts, user) {
  messageText = stripMention(messageText);

  orders.push({ts: ts, text: messageText, userId: user});

  // insert order into database
  database.run(
    'INSERT INTO orders (timestamp, text, user_id) VALUES ($ts, $text, $user)',
    {$ts: ts, $text: messageText, $user: user}
  ).then(() => {
    console.log(`Order ${messageText} successfully saved in database`);
    confirmOrder(ts);
  }).catch((error) => {
    console.log('Could not insert order into database', error);
  });
}

/**
 * Updates the order with the given ts to newOrder
 *
 * @param {string} newOrder - new order message
 * @param {string} ts - timestamp of the order message
 * @returns {bool} - true if order with supplied ts is found, false otherwise
 */
function updateOrder(newOrder, ts) {
  newOrder = stripMention(newOrder);

  for (let order of orders) {
    if (order.ts === ts) {
      order.text = newOrder;
      database.run('UPDATE orders SET text=$text WHERE timestamp=$ts', {
        $text: newOrder,
        $ts: ts,
      }).then(() => {
        console.log(`Updated order ${ts} to ${newOrder}`);
      });
      return true;
    }
  }

  return false;
}

/**
 * Removes the order with the given ts
 *
 * @param {string} ts - timestamp of the order message
 * @returns {bool} - true if order with supplied ts is deleted, false otherwise
 */
function removeOrder(ts) {
  for (let order of orders) {
    if (order.ts === ts) {
      orders.splice(orders.indexOf(order), 1);
      database.run('DELETE FROM orders WHERE timestamp=$ts', {$ts: ts})
        .then(() => {
          console.log(`Deleted order ${ts}`);
        });
      return true;
    }
  }

  return false;
}

/**
 * Adds reaction to the message to confirm the order
 *
 * @param {string} ts - timestamp of the order message
 * @param {string} channel - channel on which to add reaction to the message
 */

function confirmOrder(ts) {
  // key of the object is the reaction to the order on slack
  // reactions are custom/aliases of slack reactions

  database.get('SELECT user_id, public_channel FROM orders WHERE timestamp=$ts', {$ts: ts})
    .then((ans) => {
      if (!ans) {
        console.log('Order confirmation error: Requested order does not exist');
      } else {
        const channel = (ans.public_channel === 1)
                        ? config.slack.lunchChannelId
                        : find(users, {user_id: ans.user_id}).channel_id;
        console.log('confirmation order channel is', channel);
        slack.web.reactions.add(config.orderReaction, {channel: channel, timestamp: ts});
      }
    });
}

/**
 * Deletes all the loaded orders
 */

export function dropOrders() {
  orders.length = 0;
}

/**
 * Function called by slack api after receiving message event
 *
 * @param {Object} res - response slack api received
 *
 */

export function messageReceived(msg) {
  console.log('Message received');

  if (isNil(msg.subtype)) {
    console.log('A new message:', prettyPrint(msg));

    const {text: messageText, ts: timestamp, channel, user} = msg;

    if (isChannelPublic(channel) && isObedbotMentioned(messageText) && isOrder(messageText)) {
      saveOrder(messageText, timestamp, user);
    }
  } else if (msg.subtype === RTM_MESSAGE_SUBTYPES.MESSAGE_CHANGED) {
    console.log('Received an edited message', prettyPrint(msg));

    const {
      previous_message: {
        text: previousMessageText,
        ts: timestamp,
      },
      message: {
        text: messageText,
        channel,
        reactions,
      },
    } = msg;

    if (isChannelPublic(channel)) {
      if (isObedbotMentioned(messageText) && isOrder(messageText)) {
        updateOrder(messageText, timestamp);
      } else if (isObedbotMentioned(previousMessageText) && isOrder(previousMessageText)) {
        removeOrder(timestamp);
        if (alreadyReacted(reactions)) {
          slack.web.reactions.remove(
            config.orderReaction,
            {channel: config.lunchChannelId, timestamp: timestamp}
          );
        }
      }
    }
  } else if (msg.subtype === RTM_MESSAGE_SUBTYPES.MESSAGE_DELETED) {
    console.log('Deleting order:', msg.previous_message.text);
    removeOrder(msg.previous_message.ts);
  }
}

function processMessages(history) {
  for (let message of history.messages) {
    console.log(prettyPrint(message));

    const {text: messageText, ts: timestamp, user} = message;

    // check if the order is already registered
    // if not, save and confirm it
    if (isObedbotMentioned(messageText) && isOrder(messageText)) {
      database.get('SELECT * FROM orders WHERE timestamp=$ts', {$ts: timestamp})
        .then((result) => {
          if (!result) {
            console.log('Order with such id does not exist in the database, inserting');
            saveOrder(messageText, timestamp, user);
          } else {
            orders.push({
              ts: timestamp,
              text: messageText,
              userId: user,
            });
            if (!alreadyReacted(message.reactions)) {
              confirmOrder(timestamp);
            }
          }
        }).catch((err) => console.log('Error', err));
    }
  }
}

/**
 * Loads the orders since the last noon
 */
export function loadTodayOrders() {
  console.log('Loading today\'s orders');

  let lastNoon = moment();
  let now = moment();

  // set the date to last Friday if it is Saturday (6), Sunday (0) or Monday (1)
  if (now.day() === 0 || now.day() === 1 || now.day() === 6) {
    lastNoon.day(-2);
  } else if (now.hours() < 12) {
    lastNoon.subtract(1, 'day');
  }

  lastNoon.hours(12);
  lastNoon.minutes(0);
  lastNoon.seconds(0);

  const timeRange = {
    latest: now.valueOf() / 1000,
    oldest: lastNoon.valueOf() / 1000,
  };

  slack.web.channels.history(config.slack.lunchChannelId, timeRange).then(processMessages);
}

/**
 * Makes the last call for orders
 */
export function makeLastCall(restaurant) {
  for (let order of orders) {
    const orderRest = identifyRestaurant(order.text);
    if (orderRest === restaurant) {
      // TODO finish last calls
      //const channel = find(users, {user_id: order.userId}).channel_id;
      //slack.rtm.sendMessage(`Last call ${restaurant}`, channel);
    }
  }
}
