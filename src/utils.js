import moment from 'moment'

import {
  getUsersInChannel,
  getTodaysMessages,
  addPost,
  getUserInfo,
  getUserChannel,
  addReaction,
  removeReaction,
  getReactions,
} from './slack'
import { logger } from './resources'
import config from '../config'
import { createRecord, listRecords, updateChannelId, updateRecord } from './airtable'
import { TEXTS, BASIC_TEXTS } from './texts'
import { getDefaultOffice, getOfficeByChannel, getOfficeByOrder } from './offices'

function clearOrderMsg(order) {
  //check if user used full colon after @obedbot
  const orderStart = order.charAt(12) === ':' ? 14 : 13

  return order.substring(orderStart).trim()
}

export function isObedbotMentioned(order) {
  return new RegExp(`<@${config.slack.botId}>:?`).test(order)
}

export async function getUsersMap() {
  const users = await listRecords()

  return users.filter(user => user.channel_id).reduce((acc, user) => {
    acc[user.user_id] = user
    return acc
  }, {})
}

export function isOrder(text, office, restaurant) {
  if (!isObedbotMentioned(text)) {
    return false
  }

  const textOrder = clearOrderMsg(text)

  return restaurant
    ? restaurant.isOrder(textOrder)
    : office.restaurants.some(instRestaurant => instRestaurant.isOrder(textOrder))
}

export async function getTodaysOrders(office, restaurant) {
  const messages = await getTodaysMessages(office.lunchChannelId)

  return messages
    .filter(({ text }) => isOrder(text, office, restaurant))
    .map(({ text, ...other }) => ({
      ...other,
      text,
      orderText: clearOrderMsg(text),
    }))
}

export async function getListeningUsers(office) {
  const [users, members] = await Promise.all([
    listRecords('({notifications} = 1)'),
    getUsersInChannel(office.lunchChannelId),
  ])

  return users.filter(({ user_id }) => members.includes(user_id))
}

function confirmOrder(office, ts) {
  return addReaction(config.orderReaction, office.lunchChannelId, ts)
}

function removeConfirmation(office, ts) {
  return removeReaction(config.orderReaction, office.lunchChannelId, ts)
}

function unknownOrder(office, ts) {
  return Promise.all([
    addReaction(config.orderUnknownReaction, office.lunchChannelId, ts).catch(() => null),
    addPost(
      office.lunchChannelId,
      office.getText(TEXTS.UNKNOWN_ORDER),
      ts,
    ),
  ])
}

function alreadyReacted(reactions) {
  return reactions.some(({ name, users }) =>
    name === config.orderReaction && users.includes(config.slack.botId),
  )
}

export async function changeMute(userChannel, notifications) {
  try {
    await updateRecord(userChannel, notifications)
    await addPost(userChannel, notifications ? BASIC_TEXTS.NOTIFICATIONS_ON : BASIC_TEXTS.NOTIFICATIONS_OFF)
  } catch (err) {
    await addPost(userChannel, BASIC_TEXTS.ERROR)
  }
}

export async function processMessage(channel, message) {
  const { text, ts: timestamp, user, reactions } = message

  if (user === config.slack.botId) {
    logger.devLog('Message was from obedbot')
    return
  }

  const office = getOfficeByChannel(channel)

  if (!(await userExists(user))) {
    await saveUser(office || getDefaultOffice(), user)
  }

  if (office) {
    if (!isObedbotMentioned(text)) {
      return
    }

    const realReactions = reactions || await getReactions(channel, timestamp)

    if (isOrder(text, office)) {
      return !alreadyReacted(realReactions) && confirmOrder(office, timestamp)
    }

    if (alreadyReacted(realReactions)) {
      await removeConfirmation(office, timestamp)
    }

    return unknownOrder(office, timestamp)
  }

  if (channel.charAt(0) === 'D') {
    if (text.includes('unmute')) {
      return changeMute(channel, true)
    }

    if (text.includes('mute')) {
      return changeMute(channel, false)
    }

    const office = getOfficeByOrder(text)

    if (office) {
      return addPost(channel, office.getText(TEXTS.NO_DM))
    }
  }
}

export function prettyPrint(json) {
  return JSON.stringify(json, null, 2)
}

export async function saveUserChannel(recordId, userId) {
  const channelId = await getUserChannel(userId)

  return updateChannelId(recordId, channelId)
}

export async function saveUser(office, userId) {
  logger.devLog('Saving user ' + userId)

  try {
    const channelId = await getUserChannel(userId)

    if (!config.dev) {
      addPost(
        channelId,
        office.getText(TEXTS.GREETING_NEW),
      )
    }

    const userInfo = await getUserInfo(userId)
    const realname = userInfo.user.profile.real_name
    const filter = "({channel_id} = '" + channelId + "')"

    const records = await listRecords(filter)

    if (records[0]) {
      return
    }

    try {
      await createRecord({
        user_id: userId,
        channel_id: channelId,
        username: realname,
        notifications: true,
        office: office.id,
      })
    } catch (err) {
      logger.error(`User ${realname} is already in the database`, err)
    }

    logger.devLog(`User ${realname} has been added to database`)

    if (!config.dev) {
      addPost(
        channelId,
        office.getText(TEXTS.GREETING_SAVED),
      )
    }
  } catch (err) {
    logger.error(`Trying to save bot or disabled user ${userId}`, err)
  }
}

export async function getUser(userId) {
  const filter = "({user_id} = '" + userId + "')"
  const records = await listRecords(filter)
  return records[0]
}

export async function userExists(userId) {
  const userData = await getUser(userId)
  return Boolean(userData)
}

export function getMomentForMenu() {
  let mom

  // if it is Saturday, Sunday or Friday afternoon, set day to Monday
  for (
    mom = moment();
    mom.day() === 0 || mom.day() === 6 || mom.hours() > 13;
    mom.add(1, 'days').startOf('day')
  );
  return mom
}

export function getMomentForOrders() {
  let lastNoon = moment()
  let now = moment()

  // set the date to last Friday if it is Saturday (6), Sunday (0) or Monday (1)
  if (
    now.day() === 0 ||
    (now.day() === 1 && now.hours() < 13) ||
    now.day() === 6
  ) {
    lastNoon.day(lastNoon.day() >= 5 ? 5 : -2)
  } else if (now.hours() < 13) {
    lastNoon.subtract(1, 'day')
  }

  lastNoon.hours(13)
  lastNoon.minutes(0)
  lastNoon.seconds(0)

  return lastNoon
}

export async function getRestaurantMenu(office, restaurant, today = getMomentForMenu()) {
  if (!restaurant.getMenu) {
    return null
  }

  const block = '```'

  const menu = await restaurant.getMenu(today).catch(err => {
    logger.error(`Failed to get menu ${office.id}.${restaurant.id}`, err)
    return office.getText(TEXTS.MENU_LOAD_FAILED, {
      MENU_LINK: restaurant.getMenuLink(today),
    })
  })

  return [
    `*${restaurant.name}* ${restaurant.getMenuLink(today)}`,
    `${block}${menu}${block}`,
  ].join('\n')
}

export async function getAllMenus(office) {
  const today = getMomentForMenu()

  const menus = await Promise.all(
    office.restaurants.map(restaurant => getRestaurantMenu(office, restaurant, today))
  )

  return menus.filter(Boolean).join('\n\n')
}

export function haveMenusChanged(restaurants, currentMenus) {
  const changedRestaurantMenus = []

  restaurants.forEach((restaurant, index) => {
    if (restaurant.morningMenu !== currentMenus[index]) {
      changedRestaurantMenus.push(restaurant)
    }
  })

  return changedRestaurantMenus
}