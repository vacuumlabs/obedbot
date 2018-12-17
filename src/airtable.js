import Airtable from 'airtable';
import config from '../config';
import {createChannel} from 'yacol';
import {logger} from './resources';

const base = new Airtable({apiKey: config.airtable.apiKey}).base(config.airtable.baseId);

const times = [];
const countLimit = 5;
const timeLimit = 1000;

const pendingRequests = createChannel();

function sleep(till) {
  return new Promise((resolve) => setTimeout(resolve(), till - Date.now()));
}

(async function throttleRequests() {
  for (; ;) {
    while (times.length >= countLimit) {
      await sleep(times[0] + timeLimit);
      times.shift();
    }

    (await pendingRequests.take())();
    times.push(Date.now());
  }
})();


function waitForRequest() {
  return new Promise((resolve) => pendingRequests.put(resolve));
}


export async function createRecord(table, record) {
  await waitForRequest();
  return await base(table).create(record);
}

export async function listRecords(table, userId = undefined) {
  await waitForRequest();
  const records = await base(table).select({
    view: config.airtable.viewName,
  }).firstPage();

  let listedRecords = [];
  records.forEach((record) => {
    const recordUserId = record.get('user_id');
    if (userId && recordUserId !== userId) return;
    listedRecords.push(record.fields);
  });
  if (listedRecords.length === 0) return false;
  return listedRecords;
}

export async function findId(table, channelId) {
  await waitForRequest();
  let records = await base(table).select({
    view: config.airtable.viewName,
  }).firstPage();

  let recordId;
  records.forEach((record) => {
    const recordChannelId = record.get('channel_id');
    if (recordChannelId === channelId) recordId = record.getId();
  });
  return recordId;
}

export async function updateRecord(table, userChannel, mute) {
  const recordId = await findId(table, userChannel);
  await base(table).update(recordId, {
    notifications: mute,
  });
  logger.devLog('Notifications updated for user with ID ' + recordId);
}
