import { Http } from '@nativescript/core';

export interface RecordPayload {
  orderNo: string;
  recordingNo: number;
  locationCode: string;
  packageNo: string;
  quantity: number;
  packageIntact: boolean;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function submitRecord(
  endpoint: string,
  payload: RecordPayload,
  bearerToken?: string
): Promise<any> {
  const headers: any = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'x-ms-client-tracking-id': generateUUID()
  };
  
  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`;
  }

  try {
    const response = await Http.request({
      url: endpoint,
      method: 'POST',
      headers,
      content: JSON.stringify(payload),
      timeout: 30000
    });

    const result = {
      status: response.statusCode,
      ok: response.statusCode >= 200 && response.statusCode < 300,
      data: null as any
    };

    try {
      result.data = response.content?.toJSON();
    } catch {
      result.data = response.content?.toString();
    }

    return result;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}
