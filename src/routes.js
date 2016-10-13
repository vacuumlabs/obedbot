import express from 'express';
import {get} from 'lodash';

import config from '../config'; // eslint-disable-line import/no-unresolved
import {orders} from './resources';
import {identifyRestaurant, restaurants, getOrderFromMessage} from './utils';

function renderOrders(req, res) {
  let presto = {
    soups: {},
    meals: [0, 0, 0, 0, 0],
  };
  let pizza = {};
  let spaghetti = {};
  let veglife = [0, 0, 0, 0];
  let shop = [];

  for (let o of orders) {
    const restaurant = identifyRestaurant(o.text);
    const order = getOrderFromMessage(o.text, restaurant);

    if (restaurant === restaurants.presto) {
      const mainMealNum = parseInt(order.charAt(6), 10) - 1;
      const soup = order.substring(8);

      presto.meals[mainMealNum]++;
      if (soup) {
        presto.soups[soup] = get(presto.soups, soup, 0) + 1;
      }
    } else if (restaurant === restaurants.pizza) {
      const pizzaNum = order.substring(5);

      pizza = get(pizza, pizzaNum, 0) + 1;
    } else if (restaurant === restaurants.veglife) {
      const mainMealNum = parseInt(order.charAt(3), 10) - 1;

      veglife[mainMealNum]++;
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
    orders: orders.sort((a, b) => a.text.localeCompare(b.text)),
  });
}


export function startExpress() {
  const app = express();
  const port = config.port;

  app.set('view engine', 'pug');
  app.use('/public', express.static('public'));

  app.get('/', renderOrders);

  app.listen(port, () => {
    console.log('Server listening on port', port);
  });
}
