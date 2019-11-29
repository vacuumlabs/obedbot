import {
  loadHtml,
  normalizeWhitespace,
  getMenuCache,
  toHumanTime,
  OrdersCounter,
} from './utils'

// eslint-disable-next-line max-len
const ORDER_PATTERN = /((?<typePresto>presto)(?<main>[1-7])(?<soup>p[1-2])?)|((?<typePizza>pizza)(?<pizza>[0-9]{1,2})(v(?<size>((33)|(40)|(50))))?)/i
const MENU_LINK =
  'https://www.bizref.sk/sk/firmy/charopos-s-r-o/denne-menu/837/OBEDOVE-MENU/'
const DEFAULT_PIZZA_SIZE = '33'

const id = 'presto'
const name = 'Pizza Presto'
const endOfOrders = { hour: 10, minute: 0 }
const isNotifiable = true
/* eslint-disable max-len */
const help = `Napíšete pred ${toHumanTime(
  endOfOrders,
)} do Slacku presto+"číslo"+"p"+(1/2), kde 1 alebo 2 na konci je číslo polievky.
*Príklad:* \`@Obedbot: presto3p1\` - chcem menu 3 s prvou polievkou v poradí na daný deň
PIZZA: Napíšete do Slacku pizza+"číslo"+"v" (veľkosť) +(33/40/50).
*Príklad:* \`@Obedbot: pizza3v33\` - chcem pizzu č. 3 veľkosti 33 cm`
/* eslint-enable max-len */

function isOrder(msg) {
  return ORDER_PATTERN.test(msg)
}

function getMenuLink(date) {
  return MENU_LINK
}

function parseMenuRow($, row) {
  return $(row)
    .find('td')
    .map((ind, cell) => normalizeWhitespace($(cell).text()))
    .get()
    .join(' ')
}

async function loadMenu(date) {
  const { $ } = await loadHtml(getMenuLink(date))

  const slovakDays = [
    '',
    'Pondelok',
    'Utorok',
    'Streda',
    'Štvrtok',
    'Piatok',
    'Sobota',
  ]
  const today = date.day()

  const dayTitle = slovakDays[today]
  const meals = $(`tr.first:contains('${dayTitle}')`)
    .nextUntil('tr.first')
    .map((_, row) => parseMenuRow($, row))
    .toArray()

  return [`${dayTitle}`, ...meals].join('\n')
}

const getMenu = getMenuCache(loadMenu)

function getOrdersCounter() {
  return new OrdersCounter(id, name, ORDER_PATTERN, {
    getGroups: ({
      groups: { typePresto, typePizza, main, soup, pizza, size },
    }) => {
      if (typePresto) {
        return { main, soup }
      }

      const pizzaNum = pizza.replace(/^0+/, '')
      const pizzaSize = size || DEFAULT_PIZZA_SIZE

      return {
        pizza:
          pizzaSize === DEFAULT_PIZZA_SIZE
            ? pizzaNum
            : `${pizzaNum} veľkosti ${pizzaSize}`,
      }
    },
    viewData: {
      totalMeals: 7,
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
