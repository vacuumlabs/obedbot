import express from 'express';
import {get, find} from 'lodash';
import database from 'sqlite';

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
    meals: [0, 0, 0, 0, 0],
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

        if (restaurant === callRestaurant) {
          const userChannelId = find(users, ({user_id}) => user_id === message.user).channel_id;
          if (userChannelId) {
            slack.web.chat.postMessage(userChannelId, `Prišiel ti obed z ${callRestaurant}`);
          }
        }
      }
    });
  });
}

export function startExpress() {
  const app = express();
  const port = config.port;

  app.set('view engine', 'pug');
  app.use('/public', express.static('public'));

  app.get('/', renderOrders);

  app.get('/veglife', (req, res) => {
    notifyThatFoodArrived(restaurants.veglife);
    res.redirect('/');
  });

  app.get('/presto', (req, res) => {
    notifyThatFoodArrived(restaurants.presto);
    res.redirect('/');
  });

  app.get('/spaghetti', (req, res) => {
    notifyThatFoodArrived(restaurants.spaghetti);
    res.redirect('/');
  });

  app.listen(port, () => {
    console.log('Server listening on port', port);
  });
}
