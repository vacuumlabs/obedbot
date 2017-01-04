import database from 'sqlite';
import Promise from 'bluebird';
import {find, get} from 'lodash';
import moment from 'moment';
import {AllHtmlEntities} from 'html-entities';

import {getTodaysMessages, processMessages} from './slack';
import {slack} from './resources';
import config from '../config';

/**
 * Returns string with pretty printed json object
 *
 * @param {Object} json - json object
 * @returns {string} - pretty printed json string
 */

export function prettyPrint(json) {
  return JSON.stringify(json, null, 2);
}

/**
 * Strips the @obedbot part of the message
 *
 * @param {string} order - message with the order
 * @returns {string} - order message without the @obedbot mention
 */

export function stripMention(order) {
  //check if user used full colon after @obedbot
  const orderStart = (order.charAt(12) === ':') ? 14 : 13;

  return order.substring(orderStart);
}

export function isObedbotMentioned(order) {
  return new RegExp(`<@${config.slack.botId}>:?`).test(order);
}

export function isChannelPublic(channel) {
  return channel === config.slack.lunchChannelId;
}

export function alreadyReacted(reactions) {
  return !!find(
    reactions,
    ({name, users}) => name === config.orderReaction && users.includes(config.slack.botId)
  );
}

/**
 * Checks if the given message is an order
 *
 * @param {string} order - order message
 * @returns {bool} - true if order matches, false if not identified
 */
export function isOrder(order) {
  const regexes = config.orderRegex;
  if (isObedbotMentioned(order)) {
    order = stripMention(order);
  }
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

/**
 * Loads the orders since the last noon
 */
export function loadTodayOrders() {
  console.log('Loading today\'s orders');

  getTodaysMessages().then(processMessages);
}

/**
 * Returns the name of the restaurant to which the order belongs to
 *
 * @param {string} order - message with the order
 * @returns {string} - name of the restaurant
 */

export const restaurants = {
  presto: 'presto',
  pizza: 'pizza',
  veglife: 'veglife',
  spaghetti: 'spaghetti',
  shop: 'shop',
};

export function identifyRestaurant(order) {
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

export function getOrderFromMessage(msg, restaurant) {
  const regex = config.orderRegex[restaurant];
  return msg.match(regex)[0];
}

export function saveUser(userId) {
  console.log('Saving user');
  slack.web.im.open(userId)
    .then(({channel: {id: channelId}}) => {
      if (!config.dev) {
        slack.web.chat.postMessage(
          channelId,
          'Ahoj, volám sa obedbot, našiel som ťa v channely #obedy ' +
          'a nemal som ťa ešte v mojom zápisníčku, tak si ťa poznamenávam, ' +
          'budem ti odteraz posielať last cally, pokiaľ v daný deň nemáš nič objednané :)',
        );
      }

      slack.web.users.info(userId)
        .then((userInfo) => {
          const realname = userInfo.user.profile.real_name;
          database.run(
              'INSERT INTO users(user_id, channel_id, username) VALUES($userId, $channelId, $username)',
              {$userId: userId, $channelId: channelId, $username: realname}
            )
            .then(() => {
              console.log(`User ${realname} has been added to database`);
              if (!config.dev) {
                slack.web.chat.postMessage(
                  channelId,
                  'Dobre, už som si ťa zapísal :) Môžeš si teraz objednávať v channely ' +
                  '#obedy tak, že napíšeš `@obedbot [tvoja objednávka]`',
                );
              }
            }).catch((err) => console.log(`User ${realname} is already in the database. ${err}`));
        });
    }).catch(
      () => console.log('Trying to save bot or disabled user')
    );
}

export async function userExists(userId) {
  return database
    .get(
      'SELECT * FROM users WHERE user_id=$userId',
      {$userId: userId}
    ).then((result) => !!result);
}

export function parseOrders() {
  let presto = {
    soups: {},
    meals: [0, 0, 0, 0, 0, 0],
  };
  let pizza = {};
  let spaghetti = {};
  let veglife = {
    meals: [0, 0, 0, 0],
    soups: 0,
    salads: 0,
  };
  let shop = [];

  return getTodaysMessages()
    .then((history) => {
      for (let message of history.messages) {
        if (!(isObedbotMentioned(message.text) && isOrder(message.text))) {
          continue;
        }
        const text = stripMention(message.text).toLowerCase().trim();

        const restaurant = identifyRestaurant(text);
        const order = getOrderFromMessage(text, restaurant);
        console.log(restaurant, order);
        if (restaurant === restaurants.presto) {
          const mainMealNum = parseInt(order.charAt(6), 10) - 1;
          const soup = order.substring(8);

          presto.meals[mainMealNum]++;
          if (soup) {
            presto.soups[soup] = get(presto.soups, soup, 0) + 1;
          }
        } else if (restaurant === restaurants.pizza) {
          const pizzaNum = order.match(/\d+/g)[0];
          const pizzaSize = order.match(/\d+/g)[1];

          if (!pizzaSize || pizzaSize === '33') {
            pizza[pizzaNum] = get(pizza, pizzaNum, 0) + 1;
          } else {
            pizza[`${pizzaNum} veľkosti ${pizzaSize}`] = get(pizza, `${pizzaNum} veľkosti ${pizzaSize}`, 0) + 1;
          }
        } else if (restaurant === restaurants.veglife) {
          const mainMealNum = parseInt(order.charAt(3), 10) - 1;
          const saladOrSoup = order.charAt(order.length - 1);

          veglife.meals[mainMealNum]++;
          if (saladOrSoup === 's') {
            veglife.salads++;
          } else {
            veglife.soups++;
          }
        } else if (restaurant === restaurants.spaghetti) {
          spaghetti[order] = get(spaghetti, order, 0) + 1;
        } else if (restaurant === restaurants.shop) {
          shop.push(order.substring(6));
        }
      }

      return Promise.resolve({presto, pizza, spaghetti, veglife, shop});
    });
}

export function parseOrdersNamed() {
  const orders = {
    presto: [],
    pizza: [],
    veglife: [],
    spaghetti: [],
    shop: [],
  };
  let messages;

  return getTodaysMessages()
    .then((history) => {
      messages = history.messages;
      return database.all('SELECT * FROM users');
    }).then((users) => {
      for (let message of messages) {
        if (!(isObedbotMentioned(message.text) && isOrder(message.text))) {
          continue;
        }
        const text = stripMention(message.text).toLowerCase().trim();

        const restaurant = identifyRestaurant(text);
        const order = {
          user: find(users, {user_id: message.user}).username,
          order: getOrderFromMessage(text, restaurant),
        };

        if (restaurant === restaurants.presto) {
          orders.presto.push(order);
        } else if (restaurant === restaurants.pizza) {
          orders.pizza.push(order);
        } else if (restaurant === restaurants.veglife) {
          orders.veglife.push(order);
        } else if (restaurant === restaurants.spaghetti) {
          orders.spaghetti.push(order);
        } else if (restaurant === restaurants.shop) {
          order.order = order.order.substring(6);
          orders.shop.push(order);
        }
      }
      console.log(orders);
      return Promise.resolve(orders);
    });
}

export function getTodaysPrestoMenu(menu) {
  const entities = new AllHtmlEntities();
  // CENA is there as a delimiter because the menu continues on with different things
  const slovakDays = ['', 'PONDELOK', 'UTOROK', 'STREDA', 'ŠTVRTOK', 'PIATOK', 'CENA'];
  let today = moment().day();

  if (today === 0 || today === 6) {
    today = 1;
  }

  // delete all HTML tags
  menu = menu.replace(/<[^>]*>/g, '');
  menu = entities.decode(menu);
  menu = menu
    // presto has the whole menu on single page, cut out only today
    .substring(menu.indexOf(slovakDays[today]), menu.indexOf(slovakDays[today + 1]))
    .split('\n')
    .map((row) => row.trim())
    .filter((row) => row.length)
    .join('\n')
    // replace all multiple whitespaces with single space
    .replace(/\s\s+/g, ' ');

  return menu;
}

export function getTodaysVeglifeMenu(menu) {
  const slovakDays = ['', 'PONDELOK', 'UTOROK', 'STREDA', 'ŠTVRTOK', 'PIATOK', 'CENA'];
  let today = moment().day();

  if (today === 0 || today === 6) {
    today = 1;
  }

  return menu
    .substring(menu.indexOf(slovakDays[today]), menu.indexOf('jedál') + 5)
    // delete all HTML tags
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((row) => row.trim())
    .filter((row) => row.length)
    .join('\n');
}
