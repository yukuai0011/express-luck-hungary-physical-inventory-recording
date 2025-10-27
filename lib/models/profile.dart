class ApiEndpointInfo {
  final String apiEndpoint;
  const ApiEndpointInfo({required this.apiEndpoint});

  factory ApiEndpointInfo.fromJson(Map<String, dynamic> json) {
    var raw = (json['apiEndpoint'] ?? '').toString().trim();
    // Some QR generators wrap URLs with angle brackets. Strip them.
    if (raw.startsWith('<') && raw.endsWith('>')) {
      raw = raw.substring(1, raw.length - 1);
    }
    return ApiEndpointInfo(apiEndpoint: raw);
  }

  Map<String, dynamic> toJson() => {
        'apiEndpoint': apiEndpoint,
      };
}

class OrderInfo {
  final String orderNo;
  final int recordingNo;
  final String locationCode;
  const OrderInfo({
    required this.orderNo,
    required this.recordingNo,
    required this.locationCode,
  });

  factory OrderInfo.fromJson(Map<String, dynamic> json) {
    return OrderInfo(
      orderNo: (json['orderNo'] ?? '').toString(),
      recordingNo: int.tryParse((json['recordingNo'] ?? '0').toString()) ?? 0,
      locationCode: (json['locationCode'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'orderNo': orderNo,
        'recordingNo': recordingNo,
        'locationCode': locationCode,
      };
}

class RecordingProfile {
  final ApiEndpointInfo api;
  final OrderInfo order;
  const RecordingProfile({required this.api, required this.order});

  Map<String, dynamic> toJson() => {
        'apiEndpoint': api.apiEndpoint,
        'orderNo': order.orderNo,
        'recordingNo': order.recordingNo,
        'locationCode': order.locationCode,
      };

  factory RecordingProfile.fromJson(Map<String, dynamic> json) {
    return RecordingProfile(
      api: ApiEndpointInfo.fromJson(json),
      order: OrderInfo.fromJson(json),
    );
  }
}
