import { BookSpaSession } from '@dto/book-spa-session';
import { DynamoDBProvider } from '@aws-lambda-powertools/parameters/dynamodb';
import { config } from '@config';
import { postRequest } from '@adapters/secondary/http-adapter';

const configTableName = config.get('configTableName');
const configRestApiEndpoint = config.get('configRestApiEndpoint');

const dynamoDBProvider = new DynamoDBProvider({ tableName: configTableName });

export async function bookSpaSessionUseCase(
  spaSession: BookSpaSession
): Promise<BookSpaSession> {
  // get the relevant rest endpoint from the config table
  const restEndpoint = (await dynamoDBProvider.get(
    configRestApiEndpoint
  )) as string;

  // call the internal api to create a new booking
  await postRequest(`${restEndpoint}spa-bookings/`, spaSession);

  return spaSession;
}
