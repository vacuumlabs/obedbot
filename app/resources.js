'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.orders = exports.slack = undefined;

var _client = require('@slack/client');

var _config = require('../config');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const slack = exports.slack = {
  rtm: new _client.RtmClient(_config2.default.slack.token, { logLevel: 'error' }),
  web: new _client.WebClient(_config2.default.slack.token)
};

const orders = exports.orders = {
  jedloPodNos: [],
  veglife: [],
  spaghetti: [],
  nakup: []
};
//# sourceMappingURL=resources.js.map