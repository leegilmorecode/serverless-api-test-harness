import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

export async function getParameter(parameterName: string): Promise<string> {
  const client = new SSMClient({});

  const command = new GetParameterCommand({
    Name: parameterName,
    WithDecryption: false,
  });

  try {
    const response = await client.send(command);
    return response.Parameter?.Value || '';
  } catch (error) {
    console.error('error retrieving parameter:', error);
    throw error;
  }
}
