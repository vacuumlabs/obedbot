import pug from 'pug'

const ORDER_PATTERN = /^((nakup)|(nákup)|(nakúp))\s+(?<order>.+)/i

const id = 'shop'
const name = 'Obchod'
const endOfOrders = null
const isNotifiable = false
const help =
`Ak chcete, aby sa do kuchyne niečo dokúpilo, môžete to nahlásiť takto:
*Príklad:* \`@Obedbot: nakup makadamové orechy\``

function isOrder(msg) {
  return ORDER_PATTERN.test(msg)
}

function getOrdersCounter() {
  const orders = []

  return {
    add: text => {
      const result = ORDER_PATTERN.exec(text)

      if (!result) {
        return false
      }

      orders.push(result.groups.order)

      return true
    },
    view: () => {
      return pug.renderFile('views/restaurants/index.pug', {
        name,
        view: pug.renderFile('views/restaurants/shop.pug', { orders }),
      })
    },
  }
}

export default {
  id,
  name,
  endOfOrders,
  isNotifiable,
  isOrder,
  help,
  getOrdersCounter,
}
