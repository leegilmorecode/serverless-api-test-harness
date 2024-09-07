import { getFormattedDate, getISOString } from '@shared';

import { HotelBooking } from '@dto/hotel-booking';
import { config } from '@config';
import { upsert } from '@adapters/secondary/dynamodb-adapter';
import { v4 as uuid } from 'uuid';

const tableName = config.get('tableName');

export async function createHotelBookingUseCase(
  newHotelBooking: HotelBooking
): Promise<HotelBooking> {
  const createdDate = getISOString();

  const id = uuid();

  const hotelBooking: HotelBooking = {
    ...newHotelBooking,
    id,
    created: createdDate,
    type: 'HotelBooking',
    bookingDate: getFormattedDate(),
  };

  await upsert(
    {
      ...hotelBooking,
      pk: `CUSTOMERID#${newHotelBooking.customerId}`,
      sk: `DATE#${getFormattedDate()}#TYPE#HotelBooking`,
    },
    tableName,
    id
  );

  return hotelBooking;
}
