import { toHumanTime, OrdersCounter } from './utils'

const ORDER_PATTERN = /vedome/
const MENU_LINK = 'https://www.facebook.com/vedome.veganbistro/'

const id = 'vedome'
const name = 'Vedome'
const endOfOrders = { hour: 10, minute: 0 }
const isNotifiable = true
const help = `Objednávať si môžte do ${toHumanTime(endOfOrders)} v tvare \`@Obedbot vedome\``

function isOrder(msg) {
  return ORDER_PATTERN.test(msg)
}

function getMenuLink(date) {
  return MENU_LINK
}

async function getMenu(date) {
  return `Menu nájdeš tu: ${getMenuLink(date)}`
}

function getOrdersCounter() {
  return new OrdersCounter(id, name, ORDER_PATTERN, {
    getGroups: result => ({ order: 'vedome' }),
  })
}

export default {
  id,
  name,
  endOfOrders,
  isNotifiable,
  isOrder,
  getMenuLink,
  getMenu,
  help,
  getOrdersCounter,
}
