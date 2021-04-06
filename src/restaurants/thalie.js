import {
  // toHumanTime,
  OrdersCounter,
  getMenuCache,
  loadHtml,
} from './utils'
import cheerio from 'cheerio'
import iconv from 'iconv-lite'
import request from 'request'
import config from '../../config'

const ORDER_PATTERN = /^thalie(?<main>[1-5])$/i
const MENU_LINK = 'https://www.thalie.cz/denni-menu/'
const LOGIN_LINK = 'https://www.thalie.cz/rozvoz-prihlasit.php'
const AUTH_MENU_LINK = 'https://www.thalie.cz/rozvoz/'

const id = 'thalie'
const name = 'Thalie'
//TODO: orders are not implemented yet
const endOfOrders = { hour: 0, minute: 0 }
const isNotifiable = false
export const help = 'Objednávanie cez obedbota momentálne nie je implementované'
// export const help = `Do ${toHumanTime(
//   endOfOrders,
// )} je možné si nahlásiť thalie+"číslo"
// *Príklad:* \`@obedbot: thalie4\` značí, že si dáte štvorku z denného menu`

/**
 * Unfinished function for getting menu from the 'rozvoz' page which requires
 * authentification
 */

// eslint-disable-next-line no-unused-vars
function authenticateAndloadHtml(menuForWeekLink) {
  const encoding = 'win1250'
  const reqestWithCookies = request.defaults({ jar: true })
  reqestWithCookies.post(
    LOGIN_LINK,
    {
      form: {
        odeslano: 1,
        f_email: config.auth.thalieLogin,
        f_heslo: config.auth.thaliePassword,
        akce: 'Přihlásit',
      },
    },
    err => {
      if (err) {
        return console.error('login failed:', err)
      }
      reqestWithCookies.get(menuForWeekLink, (error, response, body) => {
        if (!error) {
          const raw = iconv.decode(body, encoding)
          //TODO: transform this to async await
          const result = { raw, $: cheerio.load(iconv.decode(raw, encoding)) }
          console.log(result)
        }
      })
    },
  )
}

function isOrder(msg) {
  return ORDER_PATTERN.test(msg)
}

// Use this function for getting menu from authenticated menu page
// eslint-disable-next-line no-unused-vars
function getAuthMenuLink(date) {
  const year = date.format('YYYY')
  const weekOfYear = date.weeks()
  return `${AUTH_MENU_LINK}?rok=${year}&tyden=${weekOfYear}`
}

function getMenuLink(date) {
  return `${MENU_LINK}`
}

async function loadMenu(date) {
  const { $ } = await loadHtml(getMenuLink(date), 'win1250')
  //const { $ } = await loadHtml(getAuthMenuLink(date))

  const dateStr = date.format('DD.MM.YYYY')

  const menu = $(`i:contains('${dateStr}')`)
    .parent()
    .parent()
    .nextUntil('tr:has(td):has(i)')
    .filter((_, s) => s.children.length >= 3)
    .map((_, el) => $(el).text())
    .toArray()

  return `Menu pre ${dateStr}:\n${menu.join('\n')}`
}

const getMenu = getMenuCache(loadMenu)

function getOrdersCounter() {
  return new OrdersCounter(id, name, ORDER_PATTERN, {
    viewData: {
      totalMeals: 5,
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
