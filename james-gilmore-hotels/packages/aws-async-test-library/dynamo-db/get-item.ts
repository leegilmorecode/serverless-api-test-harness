import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';

import { delay } from '@packages/aws-async-test-library';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export async function getItem(
  tableName: string,
  partitionKeyName: string,
  partitionKeyValue: string,
  maxIterations: number = 10,
  delayInSeconds: number = 2
): Promise<Record<string, any>> {
  const client: DynamoDBClient = new DynamoDBClient({});

  const getItemCommand = new GetItemCommand({
    TableName: tableName,
    Key: {
      [partitionKeyName]: { S: partitionKeyValue },
    },
  });

  let iteration = 1;
  while (iteration <= maxIterations) {
    try {
      const response = await client.send(getItemCommand);
      if (response.Item) {
        return unmarshall(response.Item);
      }
    } catch (error) {
      console.error('error getting item:', error);
      throw error;
    }
    await delay(delayInSeconds);

    iteration++;
  }

  throw new Error('record not found');
}
