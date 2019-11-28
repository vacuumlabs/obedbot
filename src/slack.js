import { slack } from './resources'
import { getMomentForOrders } from './utils'

export async function getUsersInChannel(channel, cursor) {
  const {
    members,
    response_metadata: { next_cursor },
  } = await slack.webBot.conversations.members({
    channel,
    cursor,
  })

  return [
    ...members,
    ...(next_cursor ? await getUsersInChannel(channel, next_cursor) : []),
  ]
}

export async function getTodaysMessages(channel, since = null) {
  const oldest = since || getMomentForOrders().valueOf() / 1000

  const { has_more, messages } = await slack.webUser.channels.history({
    channel,
    oldest,
    count: 1000,
  })

  const validMessages = messages.filter(({ type, subtype }) =>
    type === 'message' && (!subtype || subtype === 'message_changed'),
  )

  return has_more
    ? [
      ...validMessages,
      ...await getTodaysMessages(channel, messages[messages.length - 1].ts),
    ]
    : validMessages

}

export function addPost(channel, text, thread) {
  return slack.webBot.chat.postMessage({
    channel,
    text,
    as_user: true,
    thread_ts: thread,
  })
}

export function getUserInfo(user) {
  return slack.webBot.users.info({ user })
}

export function getUserChannel(user) {
  return slack.webBot.im
    .open({ user })
    .then(({ channel: { id: channelId } }) => channelId)
}

export function getReactions(channel, timestamp) {
  return slack.webBot.reactions
    .get({ channel, timestamp })
    .then(({ message: { reactions = [] } }) => reactions)
}

export function addReaction(name, channel, timestamp) {
  return slack.webBot.reactions.add({
    name,
    channel,
    timestamp,
  })
}

export function removeReaction(name, channel, timestamp) {
  return slack.webBot.reactions.remove({
    name,
    channel,
    timestamp,
  })
}
