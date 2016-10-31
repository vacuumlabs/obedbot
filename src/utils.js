import database from 'sqlite';
import {find} from 'lodash';
import moment from 'moment';

import {slack} from './resources';
import config from '../config'; // eslint-disable-line import/no-unresolved

/**
 * Returns string with pretty printed json object
 *
 * @param {Object} json - json object
 * @returns {string} - pretty printed json string
 */

function prettyPrint(json) {
  return JSON.stringify(json, null, 2);
}

/**
 * Strips the @obedbot part of the message
 *
 * @param {string} order - message with the order
 * @returns {string} - order message without the @obedbot mention
 */

function stripMention(order) {
  //check if user used full colon after @obedbot
  const orderStart = (order.charAt(12) === ':') ? 14 : 13;

  return order.substring(orderStart);
}

function isObedbotMentioned(order) {
  return new RegExp(`<@${config.slack.botId}>:?`).test(order);
}

function isChannelPublic(channel) {
  return channel === config.slack.lunchChannelId;
}

function alreadyReacted(reactions) {
  return !!find(
    reactions,
    ({name, users}) => name === config.orderReaction && users.includes(config.slack.botId)
  );
}

/**
 * Returns the name of the restaurant to which the order belongs to
 *
 * @param {string} order - message with the order
 * @returns {string} - name of the restaurant
 */

const restaurants = {
  presto: 'presto',
  pizza: 'pizza',
  veglife: 'veglife',
  spaghetti: 'spaghetti',
  shop: 'shop',
};

function identifyRestaurant(order) {
  const regexes = config.orderRegex;
  const values = [
    {regex: regexes.presto, name: restaurants.presto},
    {regex: regexes.pizza, name: restaurants.pizza},
    {regex: regexes.veglife, name: restaurants.veglife},
    {regex: regexes.spaghetti, name: restaurants.spaghetti},
    {regex: regexes.shop, name: restaurants.shop},
  ];
  let ans;

  values.forEach((restaurant) => {
    if (restaurant.regex.test(order)) {
      ans = restaurant.name;
    }
  });
  return ans;
}

function getOrderFromMessage(msg, restaurant) {
  const regex = config.orderRegex[restaurant];
  return msg.match(regex)[0];
}

function saveUser(userId) {
  console.log('Saving user');
  slack.web.im.open(userId).then(({channel: {id: channelId}}) => {
    slack.rtm.sendMessage(
      // eslint-disable-next-line max-len
      'Ahoj, volám sa obedbot, našiel som ťa v channely #obedy a nemal som ťa ešte v mojom zápisníčku, tak si ťa poznamenávam, budem ti odteraz posielať last cally pokiaľ v daní deň nemáš nič objednané :)',
      channelId
    );
    slack.web.users.info(userId).then((userInfo) => {
      const realname = userInfo.user.profile.real_name;
      database.run(
        'INSERT INTO users(user_id, channel_id, username) VALUES($userId, $channelId, $username)',
        {
          $userId: userId,
          $channelId: channelId,
          $username: realname,
        }
      ).then(() => {
        console.log(`User ${realname} has been added to database`);
        slack.rtm.sendMessage(
          // eslint-disable-next-line max-len
          'Dobre, už som si ťa zapísal :) Môžeš si teraz objednávať v channely #obedy tak, že napíšeš `@obedbot [tvoja objednávka]`',
          channelId
        );
      }).catch((err) => console.log(`User ${realname} is already in the database. ${err}`));
    });
  }).catch(() => console.log('Trying to save bot or disabled user'));
}

async function userExists(userId) {
  return database.get('SELECT * FROM users WHERE user_id=$userId', {$userId: userId})
          .then((result) => !!result);
}

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


function getTodaysMessages() {
  let lastNoon = moment();
  let now = moment();

  // set the date to last Friday if it is Saturday (6), Sunday (0) or Monday (1)
  if (now.day() === 0 || (now.day() === 1  && now.hours() < 13) || now.day() === 6) {
    lastNoon.day(-2);
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

export {
  restaurants,
  prettyPrint,
  stripMention,
  isObedbotMentioned,
  isChannelPublic,
  alreadyReacted,
  identifyRestaurant,
  getOrderFromMessage,
  saveUser,
  userExists,
  getTodaysMessages,
};
