import { getFormattedDate, getISOString } from '@shared';

import { GolfBooking } from '@dto/golf-booking';
import { config } from '@config';
import { upsert } from '@adapters/secondary/dynamodb-adapter';
import { v4 as uuid } from 'uuid';

const tableName = config.get('tableName');

export async function createGolfSessionUseCase(
  newGolfSession: GolfBooking
): Promise<GolfBooking> {
  const createdDate = getISOString();

  const id = uuid();

  const golfSession: GolfBooking = {
    ...newGolfSession,
    created: createdDate,
    id,
    type: 'GolfBooking',
    bookingDate: getFormattedDate(),
  };

  await upsert(
    {
      ...golfSession,
      pk: `CUSTOMERID#${newGolfSession.customerId}`,
      sk: `DATE#${getFormattedDate()}#TYPE#GolfBooking`,
    },
    tableName,
    id
  );

  return golfSession;
}
