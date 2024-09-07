import {
  AttributeValue,
  DeleteItemCommand,
  DynamoDBClient,
  ScanCommand,
  ScanCommandOutput,
} from '@aws-sdk/client-dynamodb';

import { unmarshall } from '@aws-sdk/util-dynamodb';

export async function clearTable(
  tableName: string,
  partitionKeyName: string,
  sortKeyName?: string
): Promise<void> {
  const client: DynamoDBClient = new DynamoDBClient({});

  const scanCommand = new ScanCommand({
    TableName: tableName,
  });

  const scanResponse: ScanCommandOutput = await client.send(scanCommand);
  const items: Record<string, AttributeValue>[] = scanResponse.Items || [];

  for (const item of items) {
    const record = unmarshall(item);

    const key = {
      [partitionKeyName]: { S: record[partitionKeyName] },
      ...(sortKeyName && record[sortKeyName]
        ? { [sortKeyName]: { S: record[sortKeyName] } }
        : {}),
    };

    const deleteCommand = new DeleteItemCommand({
      TableName: tableName,
      Key: key as Record<string, AttributeValue>,
    });

    await client.send(deleteCommand);
  }
}
