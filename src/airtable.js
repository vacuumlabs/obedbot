import Airtable from 'airtable';
import config from '../config';
import {createChannel} from 'yacol';
import {logger} from './resources';
import {filter} from 'lodash';

const base = new Airtable({apiKey: config.airtable.apiKey}).base(config.airtable.baseId);
const table = base(config.airtable.tableName);

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


export async function createRecord(record) {
  await waitForRequest();
  return (await table.create(record));
}

export async function listRecords() {
  await waitForRequest();
  const records = await table.select({
    view: config.airtable.viewName,
  }).firstPage();

  let listedRecords = [];
  records.forEach((record) => {
    const recordId = record.fields;
    recordId.id = record.getId();
    listedRecords.push(recordId);
  });
  return listedRecords;
}

export async function updateRecord(userChannel, mute) {
  const records = await listRecords();
  const recordId = filter(records, {channel_id: userChannel})[0].id;
  await table.update(recordId, {
    notifications: mute,
  });
  logger.devLog('Notifications updated for channel ' + userChannel);
}
