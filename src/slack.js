import database from 'sqlite';
import moment from 'moment';
import {isNil, find} from 'lodash';
import {RTM_MESSAGE_SUBTYPES} from '@slack/client';

import {slack} from './resources';
import {
  userExists,
  saveUser,
  isObedbotMentioned,
  stripMention,
  identifyRestaurant,
  restaurants,
  prettyPrint,
  isChannelPublic,
  alreadyReacted,
  isOrder,
} from './utils';
import config from '../config';

export function loadUsers() {
  slack.web.channels.info(config.slack.lunchChannelId)
    .then(async ({channel: {members}}) => {
      for (let member of members) {
        if (!(await userExists(member))) {
          saveUser(member);
        }
      }
    });
}

export function getTodaysMessages() {
  let lastNoon = moment();
  let now = moment();

  // set the date to last Friday if it is Saturday (6), Sunday (0) or Monday (1)
  if (now.day() === 0 || (now.day() === 1 && now.hours() < 13) || now.day() === 6) {
    lastNoon.day(lastNoon.day() >= 5 ? 5 : -2);
  } else if (now.hours() < 13) {
    lastNoon.subtract(1, 'day');
  }

  lastNoon.hours(13);
  lastNoon.minutes(0);
  lastNoon.seconds(0);

  const timeRange = {
    latest: now.valueOf() / 1000,
    oldest: lastNoon.valueOf() / 1000,
  };

  return slack.web.channels.history(config.slack.lunchChannelId, timeRange);
}

export function notifyThatFoodArrived(callRestaurant) {
  console.log('Notifying that food arrived', callRestaurant);
  getTodaysMessages()
    .then(({messages}) => {
      database.all('SELECT * FROM users')
        .then((users) => {
          for (let message of messages) {
            if (!(isObedbotMentioned(message.text) && isOrder(message.text))) {
              continue;
            }
            const text = stripMention(message.text).toLowerCase().trim();
            const restaurant = identifyRestaurant(text);

            if (restaurant === callRestaurant ||
              (callRestaurant === restaurants.presto && restaurant === restaurants.pizza)) {
              const userChannelId = find(users, ({user_id}) => user_id === message.user).channel_id;
              if (userChannelId) {
                slack.web.chat.postMessage(
                  userChannelId,
                  `Prišiel ti obed ${text} z ${callRestaurant} :slightly_smiling_face:`,
                  {as_user: true}
                );
              }
            }
          }
        });
    });
}

export function notifyThatFoodWontArrive(callRestaurant) {
  console.log('Notifying that food will not arrive', callRestaurant);
  getTodaysMessages()
    .then(({messages}) => {
      database.all('SELECT * FROM users')
        .then((users) => {
          for (let message of messages) {
            if (!(isObedbotMentioned(message.text) && isOrder(message.text))) {
              continue;
            }
            const text = stripMention(message.text).toLowerCase().trim();
            const restaurant = identifyRestaurant(text);

            if (restaurant === callRestaurant
              || (callRestaurant === restaurants.presto && restaurant === restaurants.pizza)) {
              const userChannelId = find(users, ({user_id}) => user_id === message.user).channel_id;
              if (userChannelId) {
                slack.web.chat.postMessage(
                  userChannelId,
                  `Dneska bohužiaľ obed z ${callRestaurant} nepríde :disappointed:`,
                  {as_user: true}
                );
              }
            }
          }
        });
    });
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

function unknownOrder(ts) {
  slack.web.reactions.add(
    config.orderUnknownReaction,
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
 * User has tried to order in private channel
 * send him message that this feature is deprecated
 *
 * @param {string} userChannel - IM channel of the user
 */
function privateIsDeprecated(userChannel) {
  slack.web.chat.postMessage(
    userChannel,
    'Objednávanie v súkromných kanáloch bolo vypnuté, ' +
    'pošli prosím svoju objednávku do #obedy :slightly_smiling_face:',
    {as_user: true}
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

    if (isChannelPublic(channel) && isObedbotMentioned(messageText)) {
      if (isOrder(messageText)) {
        confirmOrder(timestamp);
      } else {
        unknownOrder(timestamp);
      }
    } else if (channel.charAt(0) === 'D') {
      // if the user sent order into private channel, notify him this feature is deprecated
      if (user !== config.slack.botId && isOrder(messageText)) {
        privateIsDeprecated(channel);
      }
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
        } else if (channel.charAt(0) === 'D') {
          // if the user sent order into private channel, notify him this feature is deprecated
          if (isOrder(messageText)) {
            privateIsDeprecated(channel);
          }
        }
      }).catch((err) => console.log(`Error during loading of reactions: ${err}`));
  }
}

export async function processMessages(history) {
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
 * Makes the last call for orders
 */
export function makeLastCall() {
  if (config.dev) {
    return;
  }
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
            {as_user: true}
          );
        }
      }
    });
  });
}

export function endOfOrders(restaurant) {
  slack.rtm.sendMessage(`Koniec objednávok ${restaurant}`, config.slack.lunchChannelId);
}
