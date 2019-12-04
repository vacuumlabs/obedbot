import schedule from 'node-schedule'
import moment from 'moment-timezone'

import { slack, logger } from './resources'
import { startExpress } from './routes'
import { loadUsers, messageReceived, processTodaysOrders, endOfOrders, makeLastCall } from './actions'
import offices from './offices'
import { loadTexts, LANG } from './texts'

let wasDST = null
let jobs = []

function reschedule() {
  const isDST = moment()
    .tz('Europe/Prague')
    .isDST()

  if (isDST === wasDST) {
    return
  }

  wasDST = isDST

  jobs.forEach(j => j.cancel)

  const getJob = (data, action) =>
    schedule.scheduleJob(`${data.minute} ${data.hour - (isDST ? 2 : 1)} * * 1-5`, () => {
      action()
    })

  jobs = [
    getJob({ hour: 8, minute: 30 }, loadUsers),
    offices.map(office => [
      office.lastCall && getJob(office.lastCall, makeLastCall.bind(null, office)),
      office.restaurants.map(
        restaurant => restaurant.endOfOrders &&
          getJob(restaurant.endOfOrders, endOfOrders.bind(null, office, restaurant)),
      ),
    ]),
  ].flat(Infinity).filter(Boolean)
}

/**
 * Starts the bot server
 */
export async function runServer() {

  await loadTexts(LANG.SK)

  startExpress()

  loadUsers()
  const rtm = slack.rtm
  logger.log('Starting Slack RTM client')
  rtm.start()

  rtm.on('message', messageReceived)

  rtm.on('connected', () => {
    // the timeout is here to go around a bug where connection is opened, but not properly established
    logger.log('Slack RTM client connected')
    setTimeout(processTodaysOrders, 3000)
  })

  reschedule()

  setInterval(reschedule, 60 * 60 * 1000)
}
