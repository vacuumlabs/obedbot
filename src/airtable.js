import Airtable from 'airtable';
import config from '../config';
import {logger} from './resources';

const base = new Airtable({apiKey: config.airtable.apiKey}).base(config.airtable.baseId);
const table = base(config.airtable.tableName);

export function createRecord(record) {
  return table.create(record);
}

export async function listRecords(filter) {
  let records = [];
  await table.select({
    view: config.airtable.viewName,
    filterByFormula: filter || '',
  }).eachPage((recordsPage, fetchNextPage) => {
    records = [...records, ...recordsPage];
    fetchNextPage();
  });
  records = records.map((record) => {
    let recordInfo = record.fields;
    recordInfo.id = record.getId();
    return recordInfo;
  });
  return records;
}

export async function updateRecord(userChannel, mute) {
  const filter = '({channel_id} = \'' + userChannel + '\')';
  const records = await listRecords(filter);
  const recordId = records[0].id;
  await table.update(recordId, {
    notifications: mute,
  });
  logger.devLog('Notifications updated for channel ' + userChannel);
}
