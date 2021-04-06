import request from 'request-promise'
import cheerio from 'cheerio'
import pug from 'pug'
import iconv from 'iconv-lite'

export async function loadHtml(link, encoding = null) {
  const requestData = {
    uri: link,
    headers: {
      'User-Agent':
        // eslint-disable-next-line max-len
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36',
    },
  }

  if (encoding) {
    const raw = await request(
      { ...requestData, encoding: null },
      (err, res, body) => {
        if (!err) return iconv.decode(body, encoding)
      },
    )
    return { raw, $: cheerio.load(iconv.decode(raw, encoding)) }
  } else {
    const raw = await request(requestData)
    return { raw, $: cheerio.load(raw) }
  }
}

export function normalizeWhitespace(str) {
  return str
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(l => l.replace(/\s\s+/g, ' ')) // replace multiple whitespaces with a single space
    .join(' ')
}

export function getMenuCache(fn, ttlSec = 10 * 60) {
  let cache = null
  let lastDate = null

  return async date => {
    const dateStr = date.format('YYYY-DD-MM')

    if (dateStr !== lastDate) {
      cache = null
      lastDate = dateStr
    }

    if (!cache) {
      cache = await fn(date)

      setTimeout(() => {
        cache = null
      }, ttlSec * 1000)
    }

    return cache
  }
}

export function toHumanTime(time) {
  return `${time.hour
    .toString()
    .padStart(2, '0')}:${time.minute.toString().padStart(2, '0')}`
}

export class OrdersCounter {
  constructor(id, name, pattern, options) {
    this.id = id
    this.name = name
    this.pattern = pattern
    this.options = {
      getGroups: result => result.groups,
      templateFile: `views/restaurants/${id}.pug`,
      viewData: {},
      ...options,
    }

    this.data = {}
  }

  add(text) {
    const result = this.pattern.exec(text)

    if (!result) {
      return false
    }

    const groups = this.options.getGroups(result)

    Object.entries(groups).forEach(([key, value]) => {
      if (value === undefined) {
        return
      }

      if (!this.data[key]) {
        this.data[key] = {}
      }

      if (!this.data[key][value]) {
        this.data[key][value] = 0
      }

      this.data[key][value]++
    })

    return true
  }

  view() {
    return pug.renderFile('views/restaurants/index.pug', {
      name: this.name,
      view: pug.renderFile(this.options.templateFile, {
        ...this.options.viewData,
        ...this.data,
      }),
    })
  }
}
