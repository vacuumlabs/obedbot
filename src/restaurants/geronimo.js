import {
  toHumanTime,
  OrdersCounter,
  loadHtml,
  normalizeWhitespace,
  getMenuCache,
} from './utils'

const ORDER_PATTERN = /^geronimo((?<mainM>M)|(?<mainB>B)|(?<mainS>S[1-2])|(?<mainF>F))?(?<soup>P[1-2])?$/
const MENU_LINK = 'https://geronimoexpress.sk/menu/'

const id = 'geronimo'
const name = 'Geronimo'
const endOfOrders = { hour: 10, minute: 0 }
const isNotifiable = true
const help = `Objednávať si môžte do ${toHumanTime(endOfOrders)} v tvare:
@Obedbot geronimoM - denné menu
geronimoB - burger menu
geronimoS+"číslo šalátu" - šalát týždňa 1 alebo 2
geronimoF - fit menu
Ku každému menu sa dá objednať polievka:
P1 - polievka dňa
P2 - slepačia polievka
Polievka sa dá objednať aj bez hlavného jedla:
geronimoP1
geronimoP2
*Príklad:* \`@Obedbot: geronimoMP1\` - denné menu s polievkou dňa`

function isOrder(msg) {
  return ORDER_PATTERN.test(msg)
}

function getMenuLink(date) {
  return MENU_LINK
}

async function loadMenu(date) {
  const { $ } = await loadHtml(getMenuLink(date))

  const tabs = ['', 'tab_po_0', 'tab_ut_1', 'tab_st_2', 'tab_st_3', 'tab_pi_4']
  const today = date.day()

  const $dayTab = $(`#${tabs[today]}`)
  const dayTitle = $dayTab
    .find('h1')
    .eq(1)
    .text()
  const pArr = $dayTab
    .find('p')
    .toArray()
    .map(p => $(p))
  const soupOfTheDay = pArr[0].text()
  const mainMenu = pArr[1].text()
  const burger = pArr
    .find(p => p.text().includes('ŠPECIÁL MENU BURGER'))
    .next('p')
    .text()
  const saladTitle = pArr.find(p => p.text().includes('ŠALÁT TÝŽDŇA'))
  const salads = [
    saladTitle.next('p').text(),
    saladTitle
      .next('p')
      .next('p')
      .text(),
  ]
  const fitMenu = pArr
    .find(p => p.text().includes('FIT MENU'))
    .next('p')
    .text()

  return [
    dayTitle,
    'Polievky:',
    `P1: ${soupOfTheDay}`,
    'P2: Slepačia polievka',
    'Denné menu:',
    `M: ${mainMenu}`,
    'Burger:',
    `B: ${burger}`,
    'Šaláty:',
    `S1: ${salads[0]}`,
    `S2: ${salads[1]}`,
    'Fit menu:',
    `F: ${fitMenu}`,
  ]
    .map(normalizeWhitespace)
    .join('\n')
}

const getMenu = getMenuCache(loadMenu)

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
