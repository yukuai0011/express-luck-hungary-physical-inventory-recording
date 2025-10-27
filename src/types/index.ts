export interface Profile {
  apiEndpoint: string;
  orderNo: string;
  recordingNo: number;
  locationCode: string;
  bearerToken?: string;
}

export interface RecordingInfo {
  orderNo: string;
  recordingNo: number;
  locationCode: string;
}

export interface ApiEndpoint {
  apiEndpoint: string;
}

export interface PackagePayload {
  orderNo: string;
  recordingNo: number;
  locationCode: string;
  packageNo: string;
  quantity: number;
  packageIntact: boolean;
}

export type ScanType = 'qr' | 'barcode';
