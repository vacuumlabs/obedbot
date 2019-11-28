import { loadHtml, normalizeWhitespace, getMenuCache, toHumanTime, OrdersCounter } from './utils'

const ORDER_PATTERN = /veg(?<main>[1-4])((?<soup>p)|(?<salad>s))?/i
const MENU_LINK = 'http://www.veglife.sk/sk/menu-2/'

const id = 'veglife'
const name = 'Veglife'
const endOfOrders = { hour: 9, minute: 40 }
const isNotifiable = true
export const help =
`Do ${toHumanTime(endOfOrders)} je možné si nahlásiť veg+"číslo"+prípadná polievka alebo šalát
*Príklad:* \`@obedbot: veg4p\` značí, že si dáte štvorku s polievkou z VegLife`

function isOrder(msg) {
  return ORDER_PATTERN.test(msg)
}

function getMenuLink(date) {
  return MENU_LINK
}

async function loadMenu(date) {
  const { $ } = await loadHtml(getMenuLink(date))

  const dateStr = date.format('DD.MM.YYYY')

  // Due to unclosed h1 tag, it looks like h1 is inside another h1
  const menuTitle = normalizeWhitespace($(`h1 > h1:contains('${dateStr}')`).text())
  const menu = $(`h1:contains('${dateStr}')`)
    .nextUntil("p:contains('Dezert')")
    .map((_, tag) => normalizeWhitespace($(tag).text()))
    .filter((_, s) => s.length > 0)

  return [menuTitle, ...menu].join('\n')
}

const getMenu = getMenuCache(loadMenu)

function getOrdersCounter() {
  return new OrdersCounter(id, name, ORDER_PATTERN, {
    viewData: {
      totalMeals: 4,
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
