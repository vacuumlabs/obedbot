import database from 'sqlite';
import {find} from 'lodash';

import {slack, users} from './resources';
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

function saveUser(userId, channelId) {
  slack.rtm.sendMessage(
    'Ahoj, teba ešte nepoznám, daj mi sekundu, uložím si ťa do môjho adresára :)',
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
      users.push({user_id: userId, channel_id: channelId, username: realname});
      slack.rtm.sendMessage(
        `Dobre, už som si ťa zapísal :) Ak som ešte tvoju objednávku
        nezaregistroval, prosím ťa zmaž svoju pôvodnú a napíš mi novú :)'`,
        channelId
      );
    }).catch((err) => console.log(`User ${realname} is already in the database. Error: ${err}`));
  });
}

function userExists(userId) {
  return !!find(users, (user) => user.user_id === userId);
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
};
