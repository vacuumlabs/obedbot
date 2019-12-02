import {
  loadHtml,
  normalizeWhitespace,
  getMenuCache,
  toHumanTime,
  OrdersCounter,
} from './utils'

const ORDER_PATTERN = /^click(?<main>[1-6])(?:p(?<soup>[1-3]))?$/i
const MENU_LINK = 'http://m.clickfood.sk/sk/menu/'

const id = 'click'
const name = 'Click'
const endOfOrders = { hour: 10, minute: 0 }
const isNotifiable = true
const help = `Objednávať si môžte do ${toHumanTime(
  endOfOrders,
)} v tvare click+"číslo"+p+"číslo polievky".
*Príklad:* \`@Obedbot: click4p3\` - menu č. 4 a polievka č. 3.`

function isOrder(msg) {
  return ORDER_PATTERN.test(msg)
}

function getMenuLink(date) {
  return MENU_LINK
}

function parseMenuList($, listElement) {
  return $(listElement)
    .find('li')
    .map((index, el) => {
      const name = normalizeWhitespace(
        $(el)
          .find('.product-name')
          .text(),
      )
      const description = normalizeWhitespace(
        $(el)
          .find('.product-description')
          .text(),
      )
      const weight = normalizeWhitespace(
        $(el)
          .find('.product-bar span')
          .first()
          .text(),
      )
      const price = normalizeWhitespace(
        $(el)
          .find('.product-price')
          .text(),
      )
      return `${index + 1}. ${name}: ${description}, ${weight}, ${price}`
    })
    .get()
}

async function loadMenu(date) {
  const { $ } = await loadHtml(getMenuLink(date))

  const mainMenu = $('[id^="kategoria-menu-"]').first()
  const dayTitle = normalizeWhitespace(
    $(mainMenu)
      .find('.title')
      .text(),
  )

  const main = parseMenuList($, mainMenu)
  const soups = parseMenuList($, $('#kategoria-polievky'))

  return [`${dayTitle}`, 'Polievky:', ...soups, 'Hlavné jedlo:', ...main].join(
    '\n',
  )
}

const getMenu = getMenuCache(loadMenu)

function getOrdersCounter() {
  return new OrdersCounter(id, name, ORDER_PATTERN, {
    viewData: {
      totalMeals: 6,
    },
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
