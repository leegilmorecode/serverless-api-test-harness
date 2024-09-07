import { BookHotelBooking } from '@dto/book-hotel-booking';
import { DynamoDBProvider } from '@aws-lambda-powertools/parameters/dynamodb';
import { config } from '@config';
import { postRequest } from '@adapters/secondary/http-adapter';

const configTableName = config.get('configTableName');
const configRestApiEndpoint = config.get('configRestApiEndpoint');

const dynamoDBProvider = new DynamoDBProvider({ tableName: configTableName });

export async function bookHotelBookingUseCase(
  hotelBooking: BookHotelBooking
): Promise<BookHotelBooking> {
  // get the relevant rest endpoint from the config table
  const restEndpoint = (await dynamoDBProvider.get(
    configRestApiEndpoint
  )) as string;

  // call the internal api to create a new booking
  await postRequest(`${restEndpoint}hotel-bookings/`, hotelBooking);

  return hotelBooking;
}
