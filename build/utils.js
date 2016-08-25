'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.prettyPrint = prettyPrint;
exports.stripMention = stripMention;
exports.padArray = padArray;
/**
 * Returns string with pretty printed json object
 *
 * @param {Object} json - json object
 * @returns {string} - pretty printed json string
 */

function prettyPrint(json) {
  return JSON.stringify(json, null, 2);
}

/**
 * Strips the @obedbot part of the message
 *
 * @param {string} order - message with the order
 * @returns {string} - order message without the @obedbot mention
 */

function stripMention(order) {
  //check if user used full colon after @obedbot
  const orderStart = order.charAt(12) === ':' ? 14 : 13;

  return order.substring(orderStart);
}

/**
 * Pads and sorts the array to length 'size' with empty orders at the end.
 * Orders are sorted by arr[].order
 *
 * @param {Object[]} orders - Array with orders
 * @param {string} orders[].ts - Slack timestamp of the order message
 * @param {string} orders[].order - Message with the order
 * @param {number} size - desired length of the array
 * @returns {Object[]} - padded array with alphabetically ordered orders
 */
function padArray(orders, size) {
  orders.sort((a, b) => a.text.localeCompare(b.text));

  while (orders.length !== size) {
    orders.push({ ts: 'fake time', order: '' });
  }

  return orders;
}
//# sourceMappingURL=utils.js.map