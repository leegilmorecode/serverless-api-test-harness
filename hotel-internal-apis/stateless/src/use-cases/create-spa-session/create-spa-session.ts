import { getFormattedDate, getISOString } from '@shared';

import { SpaSession } from '@dto/spa-booking';
import { config } from '@config';
import { upsert } from '@adapters/secondary/dynamodb-adapter';
import { v4 as uuid } from 'uuid';

const tableName = config.get('tableName');

export async function createSpaSessionUseCase(
  newSpaSession: SpaSession
): Promise<SpaSession> {
  const createdDate = getISOString();

  const id = uuid();

  const spaSession: SpaSession = {
    ...newSpaSession,
    id,
    created: createdDate,
    type: 'SpaBooking',
    bookingDate: getFormattedDate(),
  };

  await upsert(
    {
      ...spaSession,
      pk: `CUSTOMERID#${newSpaSession.customerId}`,
      sk: `DATE#${getFormattedDate()}#TYPE#SpaBooking`,
    },
    tableName,
    id
  );

  return spaSession;
}
