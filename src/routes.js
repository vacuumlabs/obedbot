import express from 'express';
import config from '../config';
import {orders} from './resources.js';
import {padArray} from './utils';

function renderOrders(req, res) {
  let maxOrders = 0;

  for (let restaurant in orders) {
    if (orders.hasOwnProperty(restaurant)) {
      maxOrders = Math.max(orders[restaurant].length, maxOrders);
    }
  }

  const compoundOrders = {
    jpn: {
      orders: [0, 0, 0, 0, 0, 0, 0, 0],
      soup: 0,
      chocolate: 0,
    },
    veglife: [0, 0, 0, 0],
    spaghetti: {},
  };

  for (let order of orders.jedloPodNos) {
    const mainMealNum = order.text.charCodeAt(0) - 48;
    const secondMeal = order.text.charAt(2);

    compoundOrders.jpn.orders[mainMealNum - 1]++;

    if (secondMeal === 'p') {
      compoundOrders.jpn.soup++;
    } else if (secondMeal === 'k') {
      compoundOrders.jpn.chocolate++;
    }
  }

  for (let order of orders.veglife) {
    const mainMealNum = order.text.charCodeAt(3) - 48;

    compoundOrders.veglife[mainMealNum - 1]++;
  }

  for (let order of orders.spaghetti) {
    if (compoundOrders.spaghetti[order.text] === undefined) {
      compoundOrders.spaghetti[order.text] = 1;
    } else {
      compoundOrders.spaghetti[order.text]++;
    }
  }
/*
  console.log(padArray(jpn.slice(), maxOrders),
  padArray(veglife.slice(), maxOrders),
  padArray(spaghetti.slice(), maxOrders),
  padArray(nakup.slice(), maxOrders));
*/
  res.render('index', {
    title: 'Obedbot page',
    tableName: 'Dne\u0161n\u00E9 objedn\u00E1vky',
    maxOrders: maxOrders,
    allOrders: {
      'Jedlo pod nos': padArray(orders.jedloPodNos.slice(), maxOrders),
      'Veglife': padArray(orders.veglife.slice(), maxOrders),
      'Spaghetti': padArray(orders.spaghetti.slice(), maxOrders),
      'Nakup': padArray(orders.nakup.slice(), maxOrders),
    },
    shortOrders: compoundOrders,
  });
}

export function startExpress() {
  const app = express();
  const port = config.port;

  app.set('view engine', 'pug');
  app.use(express.static('public'));

  app.get('/', renderOrders);

  app.listen(port, () => {
    console.log('Server listening on port', port);
  });
}
