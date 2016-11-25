import express from 'express';
import {get, find} from 'lodash';
import database from 'sqlite';
import {Curl} from 'node-libcurl';
import {AllHtmlEntities} from 'html-entities';
import moment from 'moment';

import config from '../config'; // eslint-disable-line import/no-unresolved
import {
  identifyRestaurant,
  restaurants,
  getOrderFromMessage,
  getTodaysMessages,
  isObedbotMentioned,
  stripMention,
} from './utils';
import {slack} from './resources';
import {isOrder} from './orders';

function renderOrders(req, res) {
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

  getTodaysMessages().then((history) => {
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

    res.render('index', {
      title: 'Obedbot page',
      tableName: 'Dnešné objednávky',
      presto: presto,
      pizza: pizza,
      veglife: veglife,
      spaghetti: spaghetti,
      shop: shop,
    });
  });
}

function notifyThatFoodArrived(callRestaurant) {
  console.log('Notifying that food arrived', callRestaurant);
  getTodaysMessages().then(({messages}) => {
    database.all('SELECT * FROM users').then((users) => {
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
              `Prišiel ti obed ${text} z ${callRestaurant} :slightly_smiling_face:`
            );
          }
        }
      }
    });
  });
}

function notifyThatFoodWontArrive(callRestaurant) {
  console.log('Notifying that food will not arrive', callRestaurant);
  getTodaysMessages().then(({messages}) => {
    database.all('SELECT * FROM users').then((users) => {
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
              `Dneska bohužiaľ obed z ${callRestaurant} nepríde :disappointed:`
            );
          }
        }
      }
    });
  });
}

function getTodaysPrestoMenu(menu) {
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

function getTodaysVeglifeMenu(menu) {
  menu = menu
    .substring(menu.indexOf('Polievka'), menu.indexOf('jedál') + 5)
    // delete all HTML tags
    .replace(/<[^>]*>/g, '')
    .split('\n')
    .map((row) => row.trim())
    .filter((row) => row.length)
    .join('\n')
    // replace all multiple whitespaces with single space
    .replace(/\s\s+/g, ' ');

  return menu;
}

export function startExpress() {
  const app = express();
  const port = config.port;

  app.set('view engine', 'pug');
  app.use('/public', express.static('public'));

  app.get('/', renderOrders);

  // notification messages that food has arrived
  app.get('/veglife', (req, res) => {
    notifyThatFoodArrived(restaurants.veglife);
    res.redirect('/');
  });

  app.get('/noveglife', (req, res) => {
    notifyThatFoodWontArrive(restaurants.veglife);
    res.redirect('/');
  });

  app.get('/presto', (req, res) => {
    notifyThatFoodArrived(restaurants.presto);
    res.redirect('/');
  });

  // notification messages that food will not arrive
  app.get('/nopresto', (req, res) => {
    notifyThatFoodWontArrive(restaurants.presto);
    res.redirect('/');
  });

  app.get('/spaghetti', (req, res) => {
    notifyThatFoodArrived(restaurants.spaghetti);
    res.redirect('/');
  });

  app.get('/nospaghetti', (req, res) => {
    notifyThatFoodWontArrive(restaurants.spaghetti);
    res.redirect('/');
  });

  // menu responses for slash commands
  app.get('/menupresto', (req, res) => {
    const curl = new Curl();
    curl.setOpt('URL', 'http://www.pizza-presto.sk/default.aspx?p=catalogpage&group=1');

    curl.on('end', (status, body, headers) => {
      res
        .status(200)
        .send(`\`\`\`${getTodaysPrestoMenu(body)}\`\`\``);
      curl.close();
    });
    curl.on('error', () => {
      res.status(500).send();
      curl.close();
    });
    curl.perform();
  });

  app.get('/menuveglife', (req, res) => {
    const curl = new Curl();
    curl.setOpt('URL', 'http://www.veglife.sk/sk/');

    curl.on('end', (status, body, headers) => {
      res
        .status(200)
        .send(`\`\`\`${getTodaysVeglifeMenu(body)}\`\`\``);
      curl.close();
    });
    curl.on('error', () => {
      res.status(500).send();
      curl.close();
    });
    curl.perform();
  });

  app.listen(port, () => {
    console.log('Server listening on port', port);
  });
}
