import Airtable from 'airtable';
import config from '../config';
import {logger} from './resources';

const base = new Airtable({apiKey: config.airtable.apiKey}).base(config.airtable.baseId);
const table = base(config.airtable.tableName);

export function createRecord(record) {
  return table.create(record);
}

export async function listRecords(filter) {
  return (await table.select({
    view: config.airtable.viewName,
    filterByFormula: filter || '',
  }).firstPage()).map((record) => {
    const recordId = record.fields;
    recordId.id = record.getId();
    return recordId;
  });
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
