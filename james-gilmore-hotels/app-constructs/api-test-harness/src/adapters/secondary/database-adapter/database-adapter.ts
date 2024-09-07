import {
  DeleteItemCommand,
  DynamoDBClient,
  ScanCommand,
} from '@aws-sdk/client-dynamodb';

import { logger } from '@shared';
import { unmarshall } from '@aws-sdk/util-dynamodb';

export interface DatabaseRecord {
  pk: string;
  sk: number;
  statusCode: number;
  response: Record<string, any>;
}

const client = new DynamoDBClient({});

export async function getAndDeleteLastRecord(): Promise<DatabaseRecord> {
  try {
    const tableName = process.env.TABLE_NAME;

    const scanCommand = new ScanCommand({
      TableName: tableName,
    });

    const results = await client.send(scanCommand);

    if (results.Items && results.Items.length > 0) {
      const items = results.Items.map(
        (item) => unmarshall(item) as DatabaseRecord
      );
      items.sort((a, b) => a.sk - b.sk);
      const lastItem = items[0];

      const deleteCommand = new DeleteItemCommand({
        TableName: tableName,
        Key: {
          pk: { S: lastItem.pk },
          sk: { N: lastItem.sk.toString() },
        },
      });

      await client.send(deleteCommand);

      return lastItem;
    } else {
      throw new Error('no items to retrieve');
    }
  } catch (error) {
    logger.error(`error fetching and deleting record: ${error}`);
    throw error;
  }
}
