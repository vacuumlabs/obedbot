import { readFile } from 'fs'
import lodash from 'lodash'
import path from 'path'

async function loadTextMessageAsync(path, lang, name) {
  return new Promise((resolve, reject) => {
    readFile(path, (err, data) => {
      if (!!err) {
        reject(err)
      } else {
        resolve({[lang]: {[name]: data.toString()}})
      }
    })
  })
}

const PATH_TO_MESSAGE_FILES = 'messages';

export const BASIC_TEXTS = {
  NOTIFICATIONS_ON: 'Notifikácie zapnuté',
  NOTIFICATIONS_OFF: 'Notifikácie vypnuté',
  ERROR: 'Stala sa chyba, skús operáciu vykonať znovu, poprípade kontaktuj administrátora',
  UNKNOWN_OFFICE:
    'Neviem, do ktorého officu patríš. Pridaj sa do obedového channelu pre tvoj office a zadaj príkaz z neho.',
}

export const LANG = {
  SK: 'sk',
  CZ: 'cz',
}

export const TEXTS = {
  LAST_CALL: 'LAST_CALL',
  GREETING_NEW: 'GREETING_NEW',
  GREETING_SAVED: 'GREETING_SAVED',
  FOOD_ARRIVED: 'FOOD_ARRIVED',
  FOOD_WILL_NOT_ARRIVE: 'FOOD_WILL_NOT_ARRIVE',
  YOUR_FOOD_ARRIVED: 'YOUR_FOOD_ARRIVED',
  YOUR_FOOD_WILL_NOT_ARRIVE: 'YOUR_FOOD_WILL_NOT_ARRIVE',
  END_OF_ORDERS: 'END_OF_ORDERS',
  UNKNOWN_ORDER: 'UNKNOWN_ORDER',
  NO_DM: 'NO_DM',
  MENU_LOAD_FAILED: 'MENU_LOAD_FAILED',
  HELP_COMMANDS: 'HELP_COMMANDS',
}

let TEXT_MESSAGES = null;

export function getText(lang, name, placeholders = {}) {
  const text = TEXT_MESSAGES[lang][name]

  return Object.entries(placeholders).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`<${key}>`, 'g'), value),
    text,
  )
}

export async function loadTexts(lang = LANG.SK) {
  const promises = [
    {file: 'end_of_orders.txt', name: TEXTS.END_OF_ORDERS},
    {file: 'food_arrived.txt', name: TEXTS.FOOD_ARRIVED},
    {file: 'food_wont_arrive.txt', name: TEXTS.FOOD_WILL_NOT_ARRIVE},
    {file: 'greetings_new.txt', name: TEXTS.GREETING_NEW},
    {file: 'greetings_saved.txt', name: TEXTS.GREETING_SAVED},
    {file: 'help.txt', name: TEXTS.HELP_COMMANDS},
    {file: 'last_call.txt', name: TEXTS.LAST_CALL},
    {file: 'load_failed.txt', name: TEXTS.MENU_LOAD_FAILED},
    {file: 'no_dm.txt', name: TEXTS.NO_DM},
    {file: 'unknown_order.txt', name: TEXTS.UNKNOWN_ORDER},
    {file: 'your_food_arrived.txt', name: TEXTS.YOUR_FOOD_ARRIVED},
    {file: 'your_food_wont_arrive.txt', name: TEXTS.YOUR_FOOD_WILL_NOT_ARRIVE},
  ].map(({file, name}) => loadTextMessageAsync(path.join(PATH_TO_MESSAGE_FILES, lang, file), lang, name))

  const datas = await Promise.all(promises)

  TEXT_MESSAGES = {...TEXT_MESSAGES, ...lodash.merge(...datas)}

  return true;
}
