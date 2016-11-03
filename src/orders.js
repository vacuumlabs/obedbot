import {RTM_MESSAGE_SUBTYPES} from '@slack/client';
import {isNil, find} from 'lodash';
import database from 'sqlite';

import {slack} from './resources';
import {
  prettyPrint,
  userExists,
  saveUser,
  alreadyReacted,
  stripMention,
  isObedbotMentioned,
  isChannelPublic,
  getTodaysMessages,
} from './utils';
import config from '../config'; // eslint-disable-line import/no-unresolved

/**
 * Checks if the given message is an order
 *
 * @param {string} order - order message
 * @returns {bool} - true if order matches, false if not identified
 */
export function isOrder(order) {
  const regexes = config.orderRegex;
  order = stripMention(order).toLowerCase().trim();

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

/**
 * Adds reaction to the message to confirm the order
 *
 * @param {string} ts - timestamp of the order message
 * @param {string} channel - channel on which to add reaction to the message
 */

function confirmOrder(ts) {
  slack.web.reactions.add(
    config.orderReaction,
    {channel: config.slack.lunchChannelId, timestamp: ts}
  );
}

function removeConfirmation(ts) {
  slack.web.reactions.remove(
    config.orderReaction,
    {channel: config.slack.lunchChannelId, timestamp: ts}
  );
}

/**
 * Function called by slack api after receiving message event
 *
 * @param {Object} res - response slack api received
 *
 */

export async function messageReceived(msg) {
  console.log('Message received');

  if (isNil(msg.subtype)) {
    console.log('A new message:', prettyPrint(msg));

    const {text: messageText, ts: timestamp, channel, user} = msg;

    if (!(await userExists(user))) {
      saveUser(user);
    }

    if (isChannelPublic(channel) && isObedbotMentioned(messageText) && isOrder(messageText)) {
      confirmOrder(timestamp);
    }
  } else if (msg.subtype === RTM_MESSAGE_SUBTYPES.MESSAGE_CHANGED) {
    console.log('Received an edited message', prettyPrint(msg));

    const {
      previous_message: {
        text: previousMessageText,
      },
      message: {
        text: messageText,
        ts: timestamp,
        user,
      },
      channel,
    } = msg;

    if (!(await userExists(user))) {
      saveUser(user);
    }

    slack.web.reactions.get({channel: config.slack.lunchChannelId, timestamp: timestamp})
      .then(({message: {reactions = []}}) => {
        if (isChannelPublic(channel)) {
          if (isObedbotMentioned(messageText) && isOrder(messageText)) {
            if (!alreadyReacted(reactions)) {
              confirmOrder(timestamp);
            }
          } else if (isObedbotMentioned(previousMessageText) && isOrder(previousMessageText)) {
            if (alreadyReacted(reactions)) {
              removeConfirmation(timestamp);
            }
          }
        }
      }).catch((err) => console.log(`Error during loading of reactions: ${err}`));
  }
}

async function processMessages(history) {
  for (let message of history.messages) {
    console.log(prettyPrint(message));

    const {text: messageText, ts: timestamp, user, reactions} = message;

    if (!(await userExists(user))) {
      saveUser(user);
    }

    if (isObedbotMentioned(messageText) && isOrder(messageText)) {
      if (!alreadyReacted(reactions)) {
        confirmOrder(timestamp);
      }
    } else if (alreadyReacted(reactions)) {
      removeConfirmation(timestamp);
    }
  }
}

/**
 * Loads the orders since the last noon
 */
export function loadTodayOrders() {
  console.log('Loading today\'s orders');

  getTodaysMessages().then(processMessages);
}

/**
 * Makes the last call for orders
 */
export function makeLastCall() {
  console.log('making last call');
  getTodaysMessages().then(({messages}) => {
    database.all('SELECT * FROM users').then((users) => {
      for (let user of users) {
        if (!find(messages, ({text, user: userId}) => userId === user.user_id && isOrder(text))) {
          // if the user is Martin Macko, do not send notification
          if (user.user_id === 'U0RRABABE') {
            continue;
          }
          slack.web.chat.postMessage(
            user.channel_id,
            'Nezabudni si dnes objednať obed :slightly_smiling_face:',
          );
        }
      }
    });
  });
}

export function endOfOrders(restaurant) {
  slack.rtm.sendMessage(`Koniec objednávok ${restaurant}`, config.slack.lunchChannelId);
}
