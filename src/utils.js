import database from 'sqlite';
import Promise from 'bluebird';
import {find, get} from 'lodash';
import moment from 'moment';
import {AllHtmlEntities} from 'html-entities';
import request from 'request-promise';

import {getTodaysMessages, processMessages} from './slack';
import {slack, logger} from './resources';
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

  logger.devLog('Checking order: ' + order);

  for (let regexKey in regexes) {
    if (regexes.hasOwnProperty(regexKey)) {
      if (regexes[regexKey].test(order)) {
        logger.devLog(`Order type is ${regexKey}`);
        return true;
      }
    }
  }

  logger.devLog('Message is not an order');
  return false;
}

/**
 * Loads the orders since the last noon
 */
export function loadTodayOrders() {
  logger.devLog('Loading today\'s orders');

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
  mizza: 'mizza',
  shop: 'shop',
};

export function identifyRestaurant(order) {
  const regexes = config.orderRegex;
  const values = [
    {regex: regexes.presto, name: restaurants.presto},
    {regex: regexes.pizza, name: restaurants.pizza},
    {regex: regexes.veglife, name: restaurants.veglife},
    {regex: regexes.mizza, name: restaurants.mizza},
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
  logger.devLog('Saving user ' + userId);

  slack.web.im.open(userId)
    .then(({channel: {id: channelId}}) => {
      if (!config.dev) {
        slack.web.chat.postMessage(
          channelId,
          'Ahoj, volám sa obedbot a všimol som si ťa na kanáli #obedy ' +
          'ale nemal som ťa ešte v mojom zápisníčku, tak si ťa poznamenávam, ' +
          'budem ti odteraz posielať last cally, pokiaľ v daný deň nemáš nič objednané :)',
          {as_user: true}
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
              logger.devLog(`User ${realname} has been added to database`);
              if (!config.dev) {
                slack.web.chat.postMessage(
                  channelId,
                  'Dobre, už som si ťa zapísal :) Môžeš si teraz objednávať cez kanál ' +
                  '#obedy tak, že napíšeš `@obedbot [tvoja objednávka]`',
                  {as_user: true}
                );
              }
            }).catch((err) => logger.error(`User ${realname} is already in the database`, err));
        });
    }).catch(
      () => logger.error('Trying to save bot or disabled user')
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
    meals: Array(7).fill(0),
    pizza: {},
  };
  let mizza = {a: 0, b: 0, c: 0, soups: 0};
  let veglife = {
    meals: Array(4).fill(0),
    soups: 0,
    salads: 0,
  };
  let shop = [];

  logger.devLog('Parsing orders for webpage display');

  return getTodaysMessages()
    .then((messages) => {
      for (let message of messages) {
        if (!(isObedbotMentioned(message.text) && isOrder(message.text))) {
          continue;
        }
        const text = stripMention(message.text).toLowerCase().trim();

        const restaurant = identifyRestaurant(text);
        const order = getOrderFromMessage(text, restaurant);

        logger.devLog(`Message ${text} is from ${restaurant}, order ${order}`);

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
            presto.pizza[pizzaNum] = get(presto.pizza, pizzaNum, 0) + 1;
          } else {
            presto.pizza[`${pizzaNum} veľkosti ${pizzaSize}`] =
              get(presto.pizza, `${pizzaNum} veľkosti ${pizzaSize}`, 0) + 1;
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
        } else if (restaurant === restaurants.mizza) {
          // /mizza[abc][p]?/
          let meal;
          if (order.slice(-1) === 'p') {
            mizza.soups++;
            meal = order.charAt(order.length - 2);
          } else {
            meal = order.slice(-1);
          }
          mizza[meal] = get(mizza, meal, 0) + 1;
        } else if (restaurant === restaurants.shop) {
          shop.push(order.substring(6));
        }
      }

      return Promise.resolve({presto, mizza, veglife, shop});
    });
}

export function parseOrdersNamed() {
  const orders = {
    presto: [],
    pizza: [],
    veglife: [],
    mizza: [],
    shop: [],
  };
  let messages;

  return getTodaysMessages()
    .then((history) => {
      messages = history;
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
        } else if (restaurant === restaurants.mizza) {
          if (order.order.slice(-1) === 'p') {
            order.order = `${order.order.charAt(order.order.length - 2).toUpperCase()}p`;
          } else {
            order.order = order.order.slice(-1).toUpperCase();
          }
          orders.mizza.push(order);
        } else if (restaurant === restaurants.shop) {
          order.order = order.order.substring(6);
          orders.shop.push(order);
        }
      }
      logger.devLog(`Orders for named display on webpage: ${orders}`);
      return Promise.resolve(orders);
    });
}

function getDayForMenu() {
  const now = moment();
  let today = now.day();

  // if it is Saturday, Sunday or Friday afternoon, set day to Monday
  if (today === 0 || today === 6 || (today === 5 && now.hours() > 13)) {
    today = 1;
  } else if (now.hours() > 13) {
    today++;
  }

  return today;
}

export async function getMenu(link, parseMenu, allergens) {
  const block = '```';
  try {
    const body = await request(link);
    return `${block}${parseMenu(body, allergens)}${block}`;
  } catch (e) {
    logger.error(e);
    return `${block}Chyba počas načítavania menu :disappointed:${block}`;
  }
}

export async function getAllMenus(allergens) {
  const [presto, veglife, mizza] = await Promise.all([
    getMenu(config.menuLinks.presto, parseTodaysPrestoMenu),
    getMenu(config.menuLinks.veglife, parseTodaysVeglifeMenu),
    getMenu(config.menuLinks.mizza, parseTodaysMizzaMenu, allergens),
  ]);

  return `*Presto* ${presto} *Veglife* ${veglife} *Pizza Mizza* ${mizza}`;
}

export function parseTodaysPrestoMenu(rawMenu) {
  const entities = new AllHtmlEntities();
  // CENA is there as a delimiter because the menu continues on with different things
  const slovakDays = ['', 'PONDELOK', 'UTOROK', 'STREDA', 'ŠTVRTOK', 'PIATOK', 'CENA'];
  const today = getDayForMenu();

  // delete all HTML tags
  let menu = rawMenu.replace(/<[^>]*>/g, '');
  menu = entities.decode(menu);
  menu = menu
    // presto has the whole menu on single page, cut out only today
    .substring(menu.indexOf(slovakDays[today]), menu.indexOf(slovakDays[today + 1]))
    .split('\n')
    .map((row) => row.trim())
    // delete empty lines
    .filter((row) => row.length)
    .join('\n')
    // replace all multiple whitespaces with single space
    .replace(/\s\s+/g, ' ');

  return menu;
}

export function parseTodaysVeglifeMenu(rawMenu) {
  const slovakDays = ['', 'PONDELOK', 'UTOROK', 'STREDA', 'ŠTVRTOK', 'PIATOK', 'SOBOT'];
  const today = getDayForMenu();
  let menu = rawMenu
    .substring(rawMenu.indexOf(slovakDays[today]), rawMenu.indexOf(slovakDays[today + 1]))
    // delete all HTML tags
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((row) => row.trim())
    // delete empty lines
    .filter((row) => row.length)
    .join('\n')
    // replace all multiple whitespaces with single space
    .replace(/\s\s+/g, ' ');

  // delete unnecessary part
  return menu.substring(0, menu.indexOf('+ Pestrá'));
}

/**
 * Creates a readable menu for Pizza Mizza
 *
 * @param {string} menu - unparsed result of curl from the menu page
 * @returns {string} - menu in a more readable format
 */
export function parseTodaysMizzaMenu(rawMenu, allergens) {
  const entities = new AllHtmlEntities();
  const slovakDays = ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'];
  const daysCount = slovakDays.length;
  const today = getDayForMenu();

  // delete all HTML tags
  let menu = rawMenu.replace(/<[^>]*>/g, '');
  menu = entities.decode(menu);
  const menuStart = menu.indexOf(slovakDays[today]);
  let menuEnd = -1, nextDay = (today + 1) % daysCount;
  for (;nextDay !== today && menuEnd === -1; nextDay = (nextDay + 1) % daysCount) {
    menuEnd = menu.indexOf(slovakDays[nextDay]);
  }
  if (menuStart === -1 || menuEnd === -1 || menuStart >= menuEnd) {
    return `Nepodarilo sa mi spracovať menu.\nPozri si menu na ${config.menuLinks.mizza}`;
  }
  menu = menu
    .substring(menuStart, menuEnd)
    // delete Add to Cart text
    .replace(/Pridaj/g, '')
    .split('\n')
    .map((row) => row.trim())
    // delete empty lines
    .filter((row) => row.length)
    // delete rows with prices
    .filter((row) => !row.includes('€'))
    // delete rows with allergens if they are not required
    .filter((row) => allergens || !row.includes('al.:'));

  if (!allergens) {
    for (let i = 0; i < menu.length; ++i) {
      if (menu[i].length === 1) {
        menu[i] = `${menu[i]}. ${menu[i + 1]}`;
        menu.splice(i + 1, 1);
      }
    }
  }

  // put date on the first line
  menu[0] = `${menu[0]} ${menu[1]}`;
  menu.splice(1, 1);

  return menu
    .join('\n')
    // replace all multiple whitespaces with single space
    .replace(/\s\s+/g, ' ');
}
