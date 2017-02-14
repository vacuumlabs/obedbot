import express from 'express';
import {Curl} from 'node-libcurl';

import {restaurants, parseOrders, parseOrdersNamed, getTodaysPrestoMenu, getTodaysVeglifeMenu} from './utils';
import {notifyAllThatOrdered} from './slack';
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
    notifyAllThatOrdered(restaurants.veglife, true);
    res.redirect('/');
  });

  app.get('/noveglife', (req, res) => {
    notifyAllThatOrdered(restaurants.veglife, false);
    res.redirect('/');
  });

  app.get('/presto', (req, res) => {
    notifyAllThatOrdered(restaurants.presto, true);
    notifyAllThatOrdered(restaurants.pizza, true);
    res.redirect('/');
  });

  // notification messages that food will not arrive
  app.get('/nopresto', (req, res) => {
    notifyAllThatOrdered(restaurants.presto, false);
    notifyAllThatOrdered(restaurants.pizza, false);
    res.redirect('/');
  });

  app.get('/spaghetti', (req, res) => {
    notifyAllThatOrdered(restaurants.spaghetti, true);
    res.redirect('/');
  });

  app.get('/nospaghetti', (req, res) => {
    notifyAllThatOrdered(restaurants.spaghetti, false);
    res.redirect('/');
  });

  // menu responses for slash commands
  app.get('/menupresto', (req, res) => {
    const curl = new Curl();
    curl.setOpt('URL', config.menuLinks.presto);

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
    curl.setOpt('URL', config.menuLinks.veglife);

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

  app.get('/help', (req, res) => {
    res.send(config.messages.help);
  });

  app.listen(port, () => {
    console.log('Server listening on port', port);
  });
}
