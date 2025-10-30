export type RecordingInfo = {
  orderNo: string;
  recordingNo: number;
  locationCode: string;
};

export type Profile = RecordingInfo & {
  apiEndpoint: string;
  bearerToken?: string;
};

export type SubmissionPayload = RecordingInfo & {
  packageNo: string;
  quantity: number;
  packageIntact: boolean;
};
