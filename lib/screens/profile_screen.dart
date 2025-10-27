import 'dart:convert';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:express_luck_inventory_scanner/models/profile.dart';
import 'package:express_luck_inventory_scanner/services/profile_store.dart';
import 'package:express_luck_inventory_scanner/screens/scan_screen.dart';

class ProfileScreen extends StatefulWidget {
  final RecordingProfile? profile;
  final void Function(RecordingProfile? profile) onProfileChanged;
  final bool isDesktop;
  const ProfileScreen({
    super.key,
    required this.profile,
    required this.onProfileChanged,
    required this.isDesktop,
  });

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  ApiEndpointInfo? _api;
  OrderInfo? _order;
  bool _loadingSaved = true;

  @override
  void initState() {
    super.initState();
    _initFromSaved();
  }

  Future<void> _initFromSaved() async {
    final store = ProfileStore();
    final saved = await store.loadProfile();
    if (mounted) {
      setState(() {
        _loadingSaved = false;
        if (widget.profile != null) {
          _api = widget.profile!.api;
          _order = widget.profile!.order;
        } else if (saved != null) {
          _api = saved.api;
          _order = saved.order;
        }
      });
    }
  }

  Future<void> _scan() async {
    final scanned = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const ScanScreen()),
    );
    if (scanned == null) return;
    try {
      final map = json.decode(scanned);
      if (map is Map<String, dynamic>) {
        if (map.containsKey('apiEndpoint')) {
          setState(() => _api = ApiEndpointInfo.fromJson(map));
        } else if (map.containsKey('orderNo') || map.containsKey('recordingNo') || map.containsKey('locationCode')) {
          setState(() => _order = OrderInfo.fromJson(map));
        } else {
          _showSnack('Unrecognized JSON content');
        }
      } else {
        _showSnack('Scanned code is not a JSON object');
      }
    } catch (_) {
      _showSnack('Failed to parse scanned content as JSON');
    }
  }

  void _clear() {
    setState(() {
      _api = null;
      _order = null;
    });
    widget.onProfileChanged(null);
  }

  void _save() {
    if (_api == null || _order == null) {
      _showSnack('Scan both QR codes (API endpoint and order info) first.');
      return;
    }
    final profile = RecordingProfile(api: _api!, order: _order!);
    widget.onProfileChanged(profile);
    _showSnack('Profile saved');
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final hasProfile = _api != null && _order != null;
    final isCameraLikelyAvailable = !kIsWeb && (Platform.isAndroid || Platform.isIOS);
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Recording Profile', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            children: [
              ElevatedButton.icon(
                onPressed: isCameraLikelyAvailable ? _scan : null,
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Scan QR'),
              ),
              const SizedBox(width: 12),
              if (!isCameraLikelyAvailable)
                const Flexible(
                  child: Text('Camera scanning not supported on this platform. You can paste JSON content below.'),
                ),
            ],
          ),
          const SizedBox(height: 12),
          if (!isCameraLikelyAvailable) _PasteJson(onParsed: _onManualJsonParsed),
          const Divider(height: 32),
          if (_loadingSaved) const LinearProgressIndicator(),
          if (!hasProfile)
            const Text('Awaiting both QR scans: one for API endpoint, one for order/location info.'),
          if (_api != null) ...[
            _InfoRow(label: 'API Endpoint', value: _api!.apiEndpoint),
          ],
          if (_order != null) ...[
            _InfoRow(label: 'Order No', value: _order!.orderNo),
            _InfoRow(label: 'Recording No', value: _order!.recordingNo.toString()),
            _InfoRow(label: 'Location Code', value: _order!.locationCode),
          ],
          const Spacer(),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: _clear,
                icon: const Icon(Icons.delete_outline),
                label: const Text('Clear'),
              ),
              const SizedBox(width: 12),
              ElevatedButton.icon(
                onPressed: hasProfile ? _save : null,
                icon: const Icon(Icons.save),
                label: const Text('Save Profile'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _onManualJsonParsed(Map<String, dynamic> map) {
    if (map.containsKey('apiEndpoint')) {
      setState(() => _api = ApiEndpointInfo.fromJson(map));
      _showSnack('API endpoint captured');
    } else if (map.containsKey('orderNo') || map.containsKey('recordingNo') || map.containsKey('locationCode')) {
      setState(() => _order = OrderInfo.fromJson(map));
      _showSnack('Order info captured');
    } else {
      _showSnack('Unrecognized JSON content');
    }
  }
}

class _InfoRow extends StatelessWidget {
  final String label;
  final String value;
  const _InfoRow({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 120, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}

class _PasteJson extends StatefulWidget {
  final void Function(Map<String, dynamic>) onParsed;
  const _PasteJson({required this.onParsed});
  @override
  State<_PasteJson> createState() => _PasteJsonState();
}

class _PasteJsonState extends State<_PasteJson> {
  final controller = TextEditingController();
  String? _error;
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Paste QR JSON here (if scanning not available):'),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          minLines: 3,
          maxLines: 8,
          decoration: InputDecoration(
            hintText: '{"apiEndpoint":"..."} or {"orderNo":"...","recordingNo":1,"locationCode":"..."}',
            border: const OutlineInputBorder(),
            errorText: _error,
          ),
        ),
        const SizedBox(height: 6),
        Row(
          children: [
            ElevatedButton(
              onPressed: () {
                try {
                  final map = json.decode(controller.text);
                  if (map is Map<String, dynamic>) {
                    setState(() => _error = null);
                    widget.onParsed(map);
                  } else {
                    setState(() => _error = 'Not a JSON object');
                  }
                } catch (e) {
                  setState(() => _error = 'Invalid JSON');
                }
              },
              child: const Text('Parse'),
            ),
          ],
        )
      ],
    );
  }
}
