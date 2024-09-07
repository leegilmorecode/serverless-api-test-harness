import axios, { AxiosResponse } from 'axios';

interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

interface RequestBody {
  [key: string]: any;
}

export async function postRequest<T>(
  url: string,
  body: RequestBody
): Promise<ApiResponse<T>> {
  try {
    const response: AxiosResponse<T> = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return {
      data: response.data,
      status: response.status,
      statusText: response.statusText,
    };
  } catch (error) {
    throw new Error('an unexpected error occurred');
  }
}
