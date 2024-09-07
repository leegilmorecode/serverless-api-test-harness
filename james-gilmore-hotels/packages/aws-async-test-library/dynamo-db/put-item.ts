import {
  DynamoDBClient,
  PutItemCommand,
  PutItemCommandInput,
} from '@aws-sdk/client-dynamodb';

import { marshall } from '@aws-sdk/util-dynamodb';

export async function putItem(
  tableName: string,
  item: Record<string, any>
): Promise<void> {
  const client: DynamoDBClient = new DynamoDBClient({});

  const putItemInput: PutItemCommandInput = {
    TableName: tableName,
    Item: marshall(item),
  };

  const putItemCommand = new PutItemCommand(putItemInput);

  try {
    await client.send(putItemCommand);
  } catch (error) {
    console.error('error putting item into dynamoDB table:', error);
    throw error;
  }
}
