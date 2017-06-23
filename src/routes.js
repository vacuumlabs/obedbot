import express from 'express';
import database from 'sqlite';
import {Curl} from 'node-libcurl';

import {restaurants, parseOrders, parseOrdersNamed,
  getTodaysPrestoMenu, getTodaysVeglifeMenu, getTodaysMizzaMenu} from './utils';
import {notifyAllThatOrdered, changeMute} from './slack';
import {logger} from './resources';
import config from '../config';

async function renderOrders(req, res) {
  const {presto, pizza, veglife, mizza, shop} = await parseOrders();

  res.render('index', {
    title: 'Obedbot page',
    tableName: 'Dnešné objednávky',
    presto, pizza, veglife, mizza, shop,
  });
}

async function renderOrdersNamed(req, res) {
  const allOrders = await parseOrdersNamed();

  res.render('namedOrders', {
    title: 'Obedbot page',
    tableName: 'Dnešné objednávky',
    allOrders,
  });
}

async function renderNotifications(req, res) {
  const users = await database.all('SELECT * FROM users');

  res.render('notifications', {
    title: 'Stav notifikácií',
    users,
  });
}

export function startExpress() {
  const app = express();
  const port = config.port;

  app.set('view engine', 'pug');
  app.use('/public', express.static('public'));

  app.get('/', renderOrders);
  app.get('/named', renderOrdersNamed);

  app.get('/notifications', renderNotifications);

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

  app.get('/mizza', (req, res) => {
    notifyAllThatOrdered(restaurants.mizza, true);
    res.redirect('/');
  });

  app.get('/nomizza', (req, res) => {
    notifyAllThatOrdered(restaurants.mizza, false);
    res.redirect('/');
  });

  app.get('/mute', (req, res) => {
    changeMute(req.query.channel, true)
      .then(() => res.redirect('/notifications'));
  });

  app.get('/unmute', (req, res) => {
    changeMute(req.query.channel, false)
      .then(() => res.redirect('/notifications'));
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

  app.get('/menumizza', (req, res) => {
    const curl = new Curl();
    curl.setOpt('URL', config.menuLinks.mizza);

    curl.on('end', (status, body, headers) => {
      res
        .status(200)
        .send(`\`\`\`${getTodaysMizzaMenu(body)}\`\`\``);
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
    logger.log('Server started on http://localhost:' + port);
  });
}
