import { logger } from './resources'
import {
  getTodaysOrders,
  getUsersMap,
  saveUser,
  saveUserChannel,
  getListeningUsers,
  getAllMenus,
  prettyPrint,
  processMessage,
  getMomentForMenu,
} from './utils'
import { getUsersInChannel, getTodaysMessages, addPost } from './slack'
import { TEXTS } from './texts'
import offices from './offices'
import config from '../config'

export async function loadUsers() {
  const usersMap = await getUsersMap()

  for (const office of offices) {
    const members = await getUsersInChannel(office.lunchChannelId)

    for (const member of members) {
      if (member === config.slack.botId) {
        logger.devLog('Skipping member obedbot')
        continue
      }

      if (!usersMap[member]) {
        saveUser(office, member)
      } else if (!usersMap[member].channel_id) {
        saveUserChannel(usersMap[member].id, member)
      }
    }
  }
}

export async function makeLastCall(office) {
  if (config.dev) {
    return
  }

  logger.devLog(`Making last call (${office.id})`)

  const [messages, users, menus] = await Promise.all([
    getTodaysOrders(office),
    getListeningUsers(office),
    getAllMenus(office),
  ])

  const message = `${office.getText(TEXTS.LAST_CALL)}\n${menus}`

  for (let user of users) {
    if (!messages.some(({ user: userId }) => userId === user.user_id)) {
      addPost(
        user.channel_id,
        message,
      )
    }
  }
}

export function endOfOrders(office, restaurant) {
  addPost(
    office.lunchChannelId,
    office.getText(TEXTS.END_OF_ORDERS, {
      RESTAURANT: restaurant.name,
    })
  )
}

export async function notifyAllThatOrdered(office, restaurant, willThereBeFood) {
  logger.devLog(`Notifying about food arrival ${office.id}.${restaurant.id}`)

  const [orders, usersMap] = await Promise.all([
    getTodaysOrders(office, restaurant),
    getUsersMap(),
  ])

  addPost(
    office.lunchChannelId,
    office.getText(
      willThereBeFood ? TEXTS.FOOD_ARRIVED : TEXTS.FOOD_WILL_NOT_ARRIVE,
      { RESTAURANT: restaurant.name },
    ),
  )

  return Promise.all(orders.map(({ user, orderText }) => {
    const userChannelId = usersMap[user] && usersMap[user].channel_id

    return userChannelId && addPost(
      userChannelId,
      office.getText(
        willThereBeFood ? TEXTS.YOUR_FOOD_ARRIVED : TEXTS.YOUR_FOOD_WILL_NOT_ARRIVE,
        { RESTAURANT: restaurant.name, ORDER: orderText },
      ),
    )
  }))
}

export async function processTodaysOrders() {
  for (const office of offices) {
    const messages = await getTodaysMessages(office.lunchChannelId)

    for (const message of messages) {
      logger.devLog('Processing message')
      logger.devLog(prettyPrint(message))

      processMessage(office.lunchChannelId, message)
    }
  }
}

export function messageReceived(msg) {
  logger.devLog('Message received')

  if (!msg.subtype) {
    logger.devLog('Message type: new message')
    logger.devLog(prettyPrint(msg))

    const { channel } = msg

    return processMessage(channel, msg)
  }

  if (msg.subtype === 'message_changed') {
    const {
      message,
      channel,
    } = msg

    if (message.subtype !== 'tombstone') {
      logger.devLog('Message type: edited message')
      logger.devLog(prettyPrint(msg))

      return processMessage(channel, message)
    }
  }

  logger.devLog('Message type: probably deleted message')
}

export function getHelp(office) {
  const today = getMomentForMenu()

  const restaurantsHelp = office.restaurants.map(restaurant =>
    [
      `*${restaurant.name}*`,
      restaurant.getMenuLink && restaurant.getMenuLink(today),
      restaurant.help,
    ].filter(Boolean).join('\n'),
  ).join('\n\n')

  return `${office.help}\n\n${restaurantsHelp}\n\n${office.getText(TEXTS.HELP_COMMANDS)}`
}

export async function parseOrders(office) {
  const orders = await getTodaysOrders(office)

  const counters = office.restaurants.map(restaurant => restaurant.getOrdersCounter())

  orders.forEach(({ orderText }) => {
    counters.some(counter => counter.add(orderText))
  })

  return counters
}

export async function parseNamedOrders(office) {
  const [orders, usersMap] = await Promise.all([
    getTodaysOrders(office),
    getUsersMap(),
  ])

  const restaurantData = office.restaurants.reduce((acc, restaurant) => {
    acc[restaurant.id] = {
      name: restaurant.name,
      orders: [],
    }

    return acc
  }, {})

  orders.forEach(({ orderText, user, ...rest }) => {
    office.restaurants.some(restaurant => {
      if (restaurant.isOrder(orderText)) {
        restaurantData[restaurant.id].orders.push({
          text: orderText,
          userName: usersMap[user] ? usersMap[user].username : '???',
        })

        return true
      }

      return false
    })
  })

  return restaurantData
}
