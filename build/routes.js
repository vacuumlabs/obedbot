'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.startExpress = startExpress;

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

var _resources = require('./resources.js');

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function renderOrders(req, res) {
  let maxOrders = 0;

  for (let restaurant in _resources.orders) {
    if (_resources.orders.hasOwnProperty(restaurant)) {
      maxOrders = Math.max(_resources.orders[restaurant].length, maxOrders);
    }
  }

  const compoundOrders = {
    jpn: {
      orders: [0, 0, 0, 0, 0, 0, 0, 0],
      soup: 0,
      chocolate: 0
    },
    veglife: [0, 0, 0, 0],
    spaghetti: {}
  };

  for (let order of _resources.orders.jedloPodNos) {
    const mainMealNum = order.text.charCodeAt(0) - 48;
    const secondMeal = order.text.charAt(2);

    compoundOrders.jpn.orders[mainMealNum - 1]++;

    if (secondMeal === 'p') {
      compoundOrders.jpn.soup++;
    } else if (secondMeal === 'k') {
      compoundOrders.jpn.chocolate++;
    }
  }

  for (let order of _resources.orders.veglife) {
    const mainMealNum = order.text.charCodeAt(3) - 48;

    compoundOrders.veglife[mainMealNum - 1]++;
  }

  for (let order of _resources.orders.spaghetti) {
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
      'Jedlo pod nos': (0, _utils.padArray)(_resources.orders.jedloPodNos.slice(), maxOrders),
      'Veglife': (0, _utils.padArray)(_resources.orders.veglife.slice(), maxOrders),
      'Spaghetti': (0, _utils.padArray)(_resources.orders.spaghetti.slice(), maxOrders),
      'Nakup': (0, _utils.padArray)(_resources.orders.nakup.slice(), maxOrders)
    },
    shortOrders: compoundOrders
  });
}

function startExpress() {
  const app = (0, _express2.default)();
  const port = _config2.default.port;

  app.set('view engine', 'pug');
  app.use(_express2.default.static('public'));

  app.get('/', renderOrders);

  app.listen(port, () => {
    console.log('Server listening on port', port);
  });
}
//# sourceMappingURL=routes.js.map