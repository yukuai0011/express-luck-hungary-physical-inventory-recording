import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import 'package:express_luck_inventory_scanner/models/profile.dart';

class PowerAutomateClient {
  final RecordingProfile profile;
  PowerAutomateClient(this.profile);

  Map<String, dynamic> buildPayload({
    required String packageNo,
    required num quantity,
    required bool packageIntact,
  }) {
    return {
      'orderNo': profile.order.orderNo,
      'recordingNo': profile.order.recordingNo,
      'locationCode': profile.order.locationCode,
      'packageNo': packageNo,
      'quantity': quantity.toDouble(),
      'packageIntact': packageIntact,
    };
  }

  Future<http.Response> submit({
    required String packageNo,
    required num quantity,
    required bool packageIntact,
  }) async {
    final url = Uri.parse(profile.api.apiEndpoint);
    final payload = buildPayload(
      packageNo: packageNo,
      quantity: quantity,
      packageIntact: packageIntact,
    );
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'inventory-scanner-poc/1.0',
      'x-ms-client-tracking-id': const Uuid().v4(),
    };
    final body = jsonEncode(payload);
    final resp = await http.post(url, headers: headers, body: body);
    return resp;
  }
}
