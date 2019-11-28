import { readFileSync } from 'fs'

export function loadText(message, lang) {
  return readFileSync(`messages/${message}.${lang}.txt`).toString()
}

export const BASIC_TEXTS = {
  NOTIFICATIONS_ON: 'Notifikácie zapnuté',
  NOTIFICATIONS_OFF: 'Notifikácie vypnuté',
  ERROR: 'Stala sa chyba, skús operáciu vykonať znovu, poprípade kontaktuj administrátora',
  UNKNOWN_OFFICE:
    'Neviem, do ktorého officu patríš. Pridaj sa do obedového channelu pre tvoj office a zadaj príkaz z neho.',
}

export const LANG = {
  SK: 'sk',
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

const DATA = {
  [LANG.SK]: {
    [TEXTS.LAST_CALL]: 'Nezabudni si dnes objednať obed :slightly_smiling_face:',
    [TEXTS.GREETING_NEW]:
      'Ahoj, volám sa obedbot a všimol som si ťa na kanáli <CHANNEL> ' +
      'ale nemal som ťa ešte v mojom zápisníčku, tak si ťa poznamenávam, ' +
      'budem ti odteraz posielať last cally, pokiaľ v daný deň nemáš nič objednané :)',
    [TEXTS.GREETING_SAVED]:
      'Dobre, už som si ťa zapísal :) Môžeš si teraz objednávať cez kanál ' +
      '<CHANNEL> tak, že napíšeš `@Obedbot [tvoja objednávka]`',
    [TEXTS.FOOD_ARRIVED]: 'Prišli obedy z <RESTAURANT> :slightly_smiling_face:',
    [TEXTS.FOOD_WILL_NOT_ARRIVE]: 'Dneska bohužiaľ obedy z <RESTAURANT> neprídu :disappointed:',
    [TEXTS.YOUR_FOOD_ARRIVED]: 'Prišiel ti obed <ORDER> z <RESTAURANT> :slightly_smiling_face:',
    [TEXTS.YOUR_FOOD_WILL_NOT_ARRIVE]: 'Dneska bohužiaľ obed z <RESTAURANT> nepríde :disappointed:',
    [TEXTS.END_OF_ORDERS]: 'Koniec objednávok <RESTAURANT>',
    [TEXTS.UNKNOWN_ORDER]: 'Poslal/a si neznámy príkaz\nNapíš `/obedy` pre viac informácií',
    [TEXTS.NO_DM]:
      'Objednávanie v súkromných kanáloch bolo vypnuté, ' +
      'pošli prosím svoju objednávku do <CHANNEL> :slightly_smiling_face:',
    [TEXTS.MENU_LOAD_FAILED]: 'Chyba počas načítavania menu :disappointed:',
    [TEXTS.HELP_COMMANDS]: loadText('help', 'sk'),
  },
}

const missingData = []

Object.values(LANG).forEach(lang => {
  Object.values(TEXTS).forEach(text => {
    if (!DATA[lang][text]) {
      missingData.push(`${lang}.${text}`)
    }
  })
})

if (missingData.length > 0) {
  throw new Error(`Missing texts:\n${missingData.join('\n')}`)
}

export function getText(lang, name, placeholders = {}) {
  const text = DATA[lang][name]

  return Object.entries(placeholders).reduce(
    (acc, [key, value]) => acc.replace(new RegExp(`<${key}>`, 'g'), value),
    text,
  )
}
