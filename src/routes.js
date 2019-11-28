import express from 'express'
import bodyParser from 'body-parser'

import {
  getRestaurantMenu,
  getAllMenus,
  changeMute,
  getUser,
} from './utils'
import {
  parseOrders,
  parseNamedOrders,
  getHelp,
  notifyAllThatOrdered,
} from './actions'
import { logger } from './resources'
import config from '../config'
import { listRecords } from './airtable'
import offices, { getDefaultOffice, getOfficeById, getOfficeByChannel, getRestaurantById } from './offices'
import { BASIC_TEXTS } from './texts'

function getAdminOffice(req) {
  const { officeId } = req.params

  return officeId ? getOfficeById(officeId) : getDefaultOffice()
}

async function getSlashOffice(req) {
  const { user_id, channel_id } = req.body

  const officeByChannel = getOfficeByChannel(channel_id)

  if (officeByChannel) {
    return officeByChannel
  }

  const user = await getUser(user_id)

  if (user) {
    return getOfficeById(user.office)
  }

  return null
}

function getMenu(restaurantId, officeId) {
  const office = getOfficeById(officeId)
  const restaurant = getRestaurantById(office, restaurantId)

  return getRestaurantMenu(office, restaurant)
}

async function renderOrders(req, res) {
  const office = getAdminOffice(req)
  const restaurantOrders = await parseOrders(office)

  res.render('index', {
    title: 'Dnešné objednávky',
    activePage: 'index',
    office,
    offices,
    restaurantViews: restaurantOrders.map(restaurant => restaurant.view()),
  })
}

async function renderOrdersNamed(req, res) {
  const office = getAdminOffice(req)
  const restaurantOrders = await parseNamedOrders(office)

  res.render('namedOrders', {
    title: 'Objednávky s menami',
    activePage: 'named',
    office,
    offices,
    restaurantOrders,
  })
}

async function renderNotifications(req, res) {
  const users = await listRecords()

  res.render('notifications', {
    title: 'Stav notifikácií',
    activePage: 'notifications',
    users,
    offices,
  })
}

export function startExpress() {
  const app = express()
  const port = config.port

  app.set('view engine', 'pug')
  app.use('/public', express.static('public'))

  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: false }))

  app.param('officeId', (req, res, next, value) => {
    const office = value ? getOfficeById(value) : getDefaultOffice()

    if (!office) {
      if (req.method === 'GET') {
        res.redirect('/')
      } else {
        res.status(400).json({ error: 'Unknown office' })
      }
      return
    }

    next()
  })

  app.get('/notifications', renderNotifications)

  app.get('/mute', async (req, res) => {
    await changeMute(req.query.channel, false)

    res.redirect('/notifications')
  })

  app.get('/unmute', async (req, res) => {
    await changeMute(req.query.channel, true)

    res.redirect('/notifications')
  })

  app.get('/:officeId?', renderOrders)
  app.get('/:officeId/named', renderOrdersNamed)

  // notification messages that food has arrived or won't arrive
  app.post('/:officeId/notify', async (req, res) => {
    const office = getAdminOffice(req)
    const restaurant = office && office.restaurants.find(r => r.id === req.body.restaurant)

    if (!office || !restaurant) {
      res.status(400).json({ error: 'Unknown office or restaurant' })
      return
    }

    await notifyAllThatOrdered(office, restaurant, Boolean(req.body.arrived))

    res.status(200).json({ msg: 'Users notified' })
  })

  // menu responses for slash commands
  app.post('/menupresto', async (req, res) => {
    const menu = await getMenu('presto')
    res.status(200).send(menu)
  })

  app.post('/menuveglife', async (req, res) => {
    const menu = await getMenu('veglife')
    res.status(200).send(menu)
  })

  app.post('/menuclick', async (req, res) => {
    const menu = await getMenu('click')
    res.status(200).send(menu)
  })

  app.post('/menus', async (req, res) => {
    const office = await getSlashOffice(req)

    if (!office) {
      res.status(200).send(BASIC_TEXTS.UNKNOWN_OFFICE)
      return
    }

    res.status(200).send(await getAllMenus(office))
  })

  app.post('/help', async (req, res) => {
    const office = await getSlashOffice(req)

    if (!office) {
      res.status(200).send(BASIC_TEXTS.UNKNOWN_OFFICE)
      return
    }

    res.send(getHelp(office))
  })

  app.listen(port, () => {
    logger.log('Server started on http://localhost:' + port)
  })
}
