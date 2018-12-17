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
  Object.keys(records).forEach((key) => {
    const recordUserId = records[key].get('user_id');
    if (userId && recordUserId !== userId) return;
    listedRecords.push(records[key].fields);
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
  Object.keys(records).forEach((key) => {
    const recordChannelId = records[key].get('channel_id');
    if (recordChannelId === channelId) recordId = records[key].getId();
  });
  return recordId;
}

export async function updateRecord(table, userChannel, mute) {
  const recordId = await findId(table, userChannel);
  await base(table).update(recordId, {
    notifications: mute,
  });
}
