import { toHumanTime, OrdersCounter } from './utils'

const ORDER_PATTERN = /geronimo(((?<mainM>M)(?<soup>P[1-2])?)|(?<mainB>B)|(?<mainS>S[1-2])|(?<mainF>F))/
const MENU_LINK = 'https://geronimoexpress.sk/menu/'

const id = 'geronimo'
const name = 'Geronimo'
const endOfOrders = { hour: 10, minute: 0 }
const isNotifiable = true
const help =
`Objednávať si môžte do ${toHumanTime(endOfOrders)} v tvare:
@Obedbot geronimoM - denné menu bez polievky
geronimoMP+"číslo polievky" - denné menu s polievkou 1 (polievka dňa) alebo 2 (slepačia polievka)
geronimoB - burger menu
geronimoS+"číslo šalátu" - šalát týždňa 1 alebo 2
geronimoF - fit menu
*Príklad:* \`@Obedbot: geronimoMP1\` - denné menu s polievkou dňa`

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
  return new OrdersCounter(id, name, ORDER_PATTERN)
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
