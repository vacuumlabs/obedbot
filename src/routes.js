import express from 'express';
import {Curl} from 'node-libcurl';

import {restaurants, parseOrders, parseOrdersNamed, getTodaysPrestoMenu, getTodaysVeglifeMenu} from './utils';
import {notifyThatFoodArrived, notifyThatFoodWontArrive} from './slack';
import config from '../config';

async function renderOrders(req, res) {
  const {presto, pizza, veglife, spaghetti, shop} = await parseOrders();

  res.render('index', {
    title: 'Obedbot page',
    tableName: 'Dnešné objednávky',
    presto: presto,
    pizza: pizza,
    veglife: veglife,
    spaghetti: spaghetti,
    shop: shop,
  });
}

async function renderOrdersNamed(req, res) {
  const orders = await parseOrdersNamed();

  res.render('namedOrders', {
    title: 'Obedbot page',
    tableName: 'Dnešné objednávky',
    orders: orders,
  });
}

export function startExpress() {
  const app = express();
  const port = config.port;

  app.set('view engine', 'pug');
  app.use('/public', express.static('public'));

  app.get('/', renderOrders);
  app.get('/named', renderOrdersNamed);

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
