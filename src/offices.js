import config from '../config'
import { LANG, getText } from './texts'

import presto from './restaurants/presto'
import veglife from './restaurants/veglife'
// import click from './restaurants/click'
import shop from './restaurants/shop'
// import geronimo from './restaurants/geronimo'
// import vedome from './restaurants/vedome'
import thalie from './restaurants/thalie'

export const DEFAULT_OFFICE_ID = 'BA'

const officesData = [
  {
    id: DEFAULT_OFFICE_ID,
    name: 'Bratislava',
    lunchChannelId: config.slack.lunchChannelId,
    lunchChannelName: '#ba-obedy',
    restaurants: [
      presto,
      veglife,
      // click,
      shop,
      thalie,
    ],
    lastCall: {
      hour: 9,
      minute: 15,
    },
    lang: LANG.SK,
    help: '',
  },
  {
    id: 'BR',
    name: 'Brno',
    lunchChannelId: config.slack.lunchChannelIdBR,
    lunchChannelName: '#brno-food',
    //lunchChannelName: '#obedy-test',
    restaurants: [
      thalie,
    ],
    postMenusInChannel: {
      hour: 15,
      minute: 0,
    },
    lastCall: {
      hour: 8,
      minute: 0,
    },
    lang: LANG.CZ,
    help: '',
  },
  // {
  //   id: 'KE',
  //   name: 'Košice',
  //   lunchChannelId: config.slack.lunchChannelIdKE,
  //   lunchChannelName: '#ke-obedy',
  //   restaurants: [
  //     geronimo,
  //     vedome,
  //     shop,
  //   ],
  //   lastCall: {
  //     hour: 9,
  //     minute: 30,
  //   },
  //   lang: LANG.SK,
  //   help: '',
  // },
]

const offices = officesData.map(office => ({
  ...office,
  getText: (name, placeholders = {}) => getText(office.lang, name, {
    CHANNEL: office.lunchChannelName,
    ...placeholders,
  }),
}))

export default offices

export function getOfficeById(id) {
  return offices.find(office => office.id === id)
}

export function getDefaultOffice() {
  return getOfficeById(DEFAULT_OFFICE_ID)
}

export function getOfficeByChannel(channel) {
  return offices.find(office => office.lunchChannelId === channel)
}

export function getOfficeByOrder(text) {
  return offices.find(({ restaurants }) => restaurants.some(restaurant => restaurant.isOrder(text)))
}

export function getRestaurantById(office, id) {
  return office.restaurants.find(restaurant => restaurant.id === id)
}
