import 'dart:convert';
import 'dart:io' show Platform; // guard for mobile vs desktop

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:http/http.dart' as http;
import 'package:mobile_scanner/mobile_scanner.dart';

// Boxes / keys
const String kBoxSettings = 'settings';
const String kKeyProfile = 'profile';
const String kBoxOutbox = 'outbox';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox(kBoxSettings);
  await Hive.openBox<Map>(kBoxOutbox);
  runApp(const InventoryApp());
}

class InventoryApp extends StatelessWidget {
  const InventoryApp({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Inventory Scanner',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo),
      darkTheme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.indigo, brightness: Brightness.dark),
      home: const HomePage(),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  // Profile scanning state (not persisted until Save)
  String? _scannedApi;
  Map<String, dynamic>? _scannedInfo;
  final _pasteController = TextEditingController();
  final _bearerController = TextEditingController();

  // Work state
  final _packageController = TextEditingController();
  bool _intact = true;
  int _quantity = 0;
  String _result = '';

  @override
  void dispose() {
    _pasteController.dispose();
    _bearerController.dispose();
    _packageController.dispose();
    super.dispose();
  }

  Map<String, dynamic>? get _currentProfile {
    final box = Hive.box(kBoxSettings);
    final p = box.get(kKeyProfile);
    if (p is Map) return p.cast<String, dynamic>();
    return null;
  }

  bool get _hasBothScans => _scannedApi != null && _scannedInfo != null;

  @override
  Widget build(BuildContext context) {
    final profile = _currentProfile;
    return Scaffold(
      appBar: AppBar(title: const Text('Inventory Scanner PoC')), // Title aligns with original
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildProfileCard(profile),
          const SizedBox(height: 16),
          _buildWorkCard(profile),
          const SizedBox(height: 16),
          _buildOutboxCard(),
        ],
      ),
    );
  }

  Widget _buildProfileCard(Map<String, dynamic>? profile) {
    final apiOk = _scannedApi != null;
    final infoOk = _scannedInfo != null;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('1) Recording Profile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            const Text('Scan two QR codes in any order to establish a profile: API Endpoint and Recording Info. Then save.'),
            const SizedBox(height: 12),
            Row(
              children: [
                _pill('API Endpoint', apiOk),
                const SizedBox(width: 8),
                _pill('Recording Info', infoOk),
              ],
            ),
            const SizedBox(height: 8),
            Wrap(spacing: 8, runSpacing: 8, children: [
              FilledButton(
                onPressed: _onScanQr,
                child: const Text('Scan QR'),
              ),
              OutlinedButton(
                onPressed: () {
                  setState(() {
                    _scannedApi = null;
                    _scannedInfo = null;
                  });
                },
                child: const Text('Reset'),
              ),
            ]),
            const SizedBox(height: 8),
            ExpansionTile(
              title: const Text('Paste JSON instead'),
              childrenPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              children: [
                TextField(
                  controller: _pasteController,
                  maxLines: 4,
                  decoration: const InputDecoration(border: OutlineInputBorder(), hintText: '{"apiEndpoint":"<https://...>"} or {"orderNo":"1234","recordingNo":1,"locationCode":"FG HU"}'),
                ),
                const SizedBox(height: 8),
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton(
                    onPressed: _onDetectPastedJson,
                    child: const Text('Detect'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            ExpansionTile(
              title: const Text('Advanced: Optional Bearer Token'),
              childrenPadding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
              children: [
                TextField(
                  controller: _bearerController,
                  obscureText: true,
                  decoration: const InputDecoration(border: OutlineInputBorder(), hintText: 'Bearer token (optional)'),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(spacing: 8, runSpacing: 8, children: [
              FilledButton(
                onPressed: _hasBothScans ? _onSaveProfile : null,
                child: const Text('Save Profile'),
              ),
              OutlinedButton(
                onPressed: () async {
                  final box = Hive.box(kBoxSettings);
                  await box.delete(kKeyProfile);
                  setState(() {});
                },
                child: const Text('Clear Saved Profile'),
              ),
            ]),
            const SizedBox(height: 8),
            const Text('Current Profile'),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(border: Border.all(color: Theme.of(context).dividerColor), borderRadius: BorderRadius.circular(8)),
              child: Text(_profileSummary(profile)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _pill(String label, bool ok) {
    final bg = ok ? Colors.green.shade700 : Colors.grey.shade700;
    final text = ok ? 'ready' : 'missing';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(999)),
      child: Text('$label: $text', style: const TextStyle(color: Colors.white)),
    );
  }

  Widget _buildWorkCard(Map<String, dynamic>? profile) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('2) Work', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            const Text('Use your saved profile to submit package records.'),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: TextField(
                  controller: _packageController,
                  decoration: const InputDecoration(labelText: 'Package No', border: OutlineInputBorder(), hintText: 'Scan or type package number'),
                ),
              ),
              const SizedBox(width: 8),
              OutlinedButton.icon(
                onPressed: _onScanBarcode,
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text('Scan'),
              ),
            ]),
            const SizedBox(height: 12),
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Package intact'),
              value: _intact,
              onChanged: (v) => setState(() => _intact = v ?? true),
            ),
            const SizedBox(height: 4),
            Opacity(
              opacity: _intact ? 0.6 : 1,
              child: IgnorePointer(
                ignoring: _intact,
                child: Row(children: [
                  IconButton(
                    onPressed: () => setState(() => _quantity = (_quantity - 1).clamp(0, 1 << 31)),
                    icon: const Icon(Icons.remove_circle_outline),
                  ),
                  SizedBox(
                    width: 100,
                    child: TextField(
                      key: ValueKey(_intact),
                      controller: TextEditingController(text: '$_quantity'),
                      readOnly: true,
                      textAlign: TextAlign.center,
                      decoration: const InputDecoration(labelText: 'Quantity', border: OutlineInputBorder()),
                    ),
                  ),
                  IconButton(
                    onPressed: () => setState(() => _quantity = (_quantity + 1).clamp(0, 1 << 31)),
                    icon: const Icon(Icons.add_circle_outline),
                  ),
                ]),
              ),
            ),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _onSubmit,
              child: const Text('Submit'),
            ),
            const SizedBox(height: 12),
            if (_result.isNotEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(border: Border.all(color: Theme.of(context).dividerColor), borderRadius: BorderRadius.circular(8)),
                child: Text(_result),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildOutboxCard() {
    final outbox = Hive.box<Map>(kBoxOutbox);
    final count = outbox.length;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Offline queue', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          Text('Pending submissions: $count'),
          const SizedBox(height: 8),
          Wrap(spacing: 8, children: [
            OutlinedButton.icon(onPressed: _onSyncNow, icon: const Icon(Icons.sync), label: const Text('Sync now')),
            OutlinedButton.icon(
              onPressed: () async {
                if (!await _confirm(context, 'Clear all pending submissions?')) return;
                await outbox.clear();
                setState(() {});
              },
              icon: const Icon(Icons.delete_sweep_outlined),
              label: const Text('Clear'),
            ),
          ])
        ]),
      ),
    );
  }

  // --- Actions ---
  Future<void> _onScanQr() async {
    // Allow camera scanning on Android, iOS, and Windows (desktop)
    if (!(Platform.isAndroid || Platform.isIOS || Platform.isWindows)) {
      await _info(context, 'Camera scanning is supported on Android, iOS, and Windows. On this platform, use Paste JSON.');
      return;
    }
    String? text = await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ScanView(title: 'Scan QR')),
    );
    if (text == null || text.isEmpty) return;
    final ok = _handleQrText(text);
    if (!ok && mounted) {
      _toast('Not JSON or unexpected structure; keep scanning…');
    }
    setState(() {});
  }

  Future<void> _onScanBarcode() async {
    // Allow camera scanning on Android, iOS, and Windows (desktop)
    if (!(Platform.isAndroid || Platform.isIOS || Platform.isWindows)) {
      await _info(context, 'Camera scanning is supported on Android, iOS, and Windows. Type the package number on this platform.');
      return;
    }
    final code = await Navigator.push<String?>(
      context,
      MaterialPageRoute(builder: (_) => const ScanView(title: 'Scan Package Barcode')),
    );
    if (code != null && code.isNotEmpty) {
      setState(() => _packageController.text = code.trim());
    }
  }

  void _onDetectPastedJson() {
    final ok = _handleQrText(_pasteController.text.trim());
    if (!ok) _toast('Not valid JSON or unexpected format');
    setState(() {});
  }

  bool _handleQrText(String text) {
    Map<String, dynamic>? obj;
    try {
      obj = jsonDecode(text) as Map<String, dynamic>?;
    } catch (_) {
      return false;
    }
    if (obj == null) return false;
    // API endpoint
    if (obj['apiEndpoint'] is String) {
      _scannedApi = _sanitizeEndpoint(obj['apiEndpoint'] as String);
      return true;
    }
    // Recording info
    final orderNo = (obj['orderNo'] ?? '').toString().trim();
    final recNo = obj['recordingNo'];
    final location = (obj['locationCode'] ?? '').toString().trim();
    if (orderNo.isNotEmpty && location.isNotEmpty && (recNo is num)) {
      _scannedInfo = {
        'orderNo': orderNo,
        'recordingNo': recNo.toInt(),
        'locationCode': location,
      };
      return true;
    }
    return false;
  }

  Future<void> _onSaveProfile() async {
    final box = Hive.box(kBoxSettings);
    await box.put(kKeyProfile, {
      'apiEndpoint': _scannedApi,
      'orderNo': _scannedInfo!['orderNo'],
      'recordingNo': _scannedInfo!['recordingNo'],
      'locationCode': _scannedInfo!['locationCode'],
      'bearerToken': _bearerController.text.trim().isEmpty ? null : _bearerController.text.trim(),
    });
    if (mounted) {
      _toast('Profile saved');
      setState(() {});
    }
  }

  Future<void> _onSubmit() async {
    setState(() => _result = '');
    final p = _currentProfile;
    if (p == null) {
      _toast('No profile saved. Please create and save a profile first.');
      return;
    }
    final pkg = _packageController.text.trim();
    if (pkg.isEmpty) {
      _toast('Package number is required.');
      return;
    }
    final qty = _intact ? 0 : _quantity;
    final url = _sanitizeEndpoint(p['apiEndpoint']?.toString() ?? '');
    if (!url.startsWith('http')) {
      _toast('Profile API endpoint is invalid.');
      return;
    }
    final payload = {
      'orderNo': p['orderNo'],
      'recordingNo': p['recordingNo'],
      'locationCode': p['locationCode'],
      'packageNo': pkg,
      'quantity': qty,
      'packageIntact': _intact,
    };

    try {
      final headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-ms-client-tracking-id': _uuidv4(),
      };
      final token = (p['bearerToken'] ?? '').toString().trim();
      if (token.isNotEmpty) headers['Authorization'] = 'Bearer $token';

      final resp = await http.post(Uri.parse(url), headers: headers, body: jsonEncode(payload));
      final ct = resp.headers['content-type'] ?? '';
      String bodyOut;
      if (ct.contains('application/json')) {
        bodyOut = jsonEncode(jsonDecode(resp.body), toEncodable: (o) => o.toString());
      } else {
        bodyOut = resp.body;
      }
      setState(() {
        _result = 'POST $url\nPayload:\n${jsonEncode(payload)}\n\nResponse:\n{\n  "status": ${resp.statusCode},\n  "ok": ${resp.statusCode >= 200 && resp.statusCode < 300},\n  "body": ${jsonEncode(bodyOut)}\n}';
      });
    } catch (e) {
      // Offline or CORS/network errors → queue
      final outbox = Hive.box<Map>(kBoxOutbox);
      await outbox.add({
        'url': url,
        'headers': {'Authorization': (p['bearerToken'] ?? '').toString().trim().isEmpty ? null : 'Bearer ${p['bearerToken']}'},
        'payload': payload,
        'ts': DateTime.now().toIso8601String(),
      });
      setState(() {
        _result = 'Request failed (likely offline). Saved to queue.\n${e.toString()}';
      });
    }
    setState(() {});
  }

  Future<void> _onSyncNow() async {
    final outbox = Hive.box<Map>(kBoxOutbox);
    final items = outbox.values.toList(growable: false);
    int success = 0;
    for (var i = 0; i < items.length; i++) {
      final entry = items[i];
      final url = entry['url']?.toString() ?? '';
      final payload = entry['payload'] as Map? ?? {};
      if (!url.startsWith('http')) continue;
      try {
        final headers = <String, String>{
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-ms-client-tracking-id': _uuidv4(),
        };
        final auth = (entry['headers'] as Map?)?['Authorization']?.toString();
        if (auth != null && auth.isNotEmpty) headers['Authorization'] = auth;
        final resp = await http.post(Uri.parse(url), headers: headers, body: jsonEncode(payload));
        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          // delete this item
          final key = outbox.keyAt(i);
          await outbox.delete(key);
          success++;
        }
      } catch (_) {
        // keep in queue
      }
    }
    _toast(success > 0 ? 'Synced $success item(s)' : 'Nothing synced');
    setState(() {});
  }

  // --- Utils ---
  String _profileSummary(Map<String, dynamic>? profile) {
    if (profile == null) return '(No profile saved)';
    final safe = {
      'apiEndpoint': profile['apiEndpoint'] ?? '',
      'orderNo': profile['orderNo'] ?? '',
      'recordingNo': profile['recordingNo'] ?? '',
      'locationCode': profile['locationCode'] ?? '',
      'bearerToken': (profile['bearerToken'] ?? '').toString().isNotEmpty ? '(stored)' : '(none)',
    };
    return const JsonEncoder.withIndent('  ').convert(safe);
  }

  String _sanitizeEndpoint(String input) {
    var s = input.trim();
    if (s.startsWith('<') && s.endsWith('>')) s = s.substring(1, s.length - 1);
    return s;
  }

  String _uuidv4() {
    // simple RFC4122-ish uuid
    final rand = (int max) => (DateTime.now().microsecondsSinceEpoch + (max - 1)) % max;
    String hex(int n, int width) => n.toRadixString(16).padLeft(width, '0');
    final p1 = hex(rand(0xffffffff), 8);
    final p2 = hex(rand(0xffff), 4);
    final p3 = hex((rand(0x0fff) & 0x0fff) | 0x4000, 4);
    final p4 = hex((rand(0x3fff) & 0x3fff) | 0x8000, 4);
    final p5 = hex(rand(0xffffffffffff), 12);
    return '$p1-$p2-$p3-$p4-$p5';
  }

  Future<void> _toast(String message) async {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _info(BuildContext context, String message) async {
    await showDialog(
      context: context,
      builder: (context) => AlertDialog(title: const Text('Info'), content: Text(message), actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('OK'))]),
    );
  }
}

class ScanView extends StatefulWidget {
  final String title;
  const ScanView({super.key, required this.title});
  const ScanView.qr({super.key}) : title = 'Scan QR';

  @override
  State<ScanView> createState() => _ScanViewState();
}

class _ScanViewState extends State<ScanView> {
  final MobileScannerController _controller = MobileScannerController();
  bool _handled = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.cameraswitch),
            onPressed: () async {
              try {
                await _controller.switchCamera();
              } catch (_) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No alternative camera available.')));
              }
            },
          ),
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () async {
              try {
                await _controller.toggleTorch();
              } catch (_) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Torch not available on this device.')));
                }
              }
            },
          ),
        ],
      ),
      body: MobileScanner(
        controller: _controller,
        fit: BoxFit.cover,
        placeholderBuilder: (context) => Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              SizedBox(width: 28, height: 28, child: CircularProgressIndicator(strokeWidth: 2.6)),
              SizedBox(height: 8),
              Text('Starting camera…'),
              SizedBox(height: 12),
              Text(
                'If this takes more than a few seconds on Windows:\n\n• Check Settings → Privacy & security → Camera\n• Enable “Camera access” and “Let desktop apps access your camera”\n• Ensure a webcam is connected and works in the built-in Camera app\n• On Windows N/KN, install the Media Feature Pack',
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
        errorBuilder: (context, error) {
          // Show a helpful message when the camera cannot start (e.g., Windows privacy settings)
          return Center(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const Icon(Icons.videocam_off, size: 40),
                  const SizedBox(height: 8),
                  Text(
                    'Camera unavailable',
                    style: Theme.of(context).textTheme.titleMedium,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    '$error\n\nOn Windows, ensure Settings → Privacy & security → Camera → enable "Camera access" and "Let desktop apps access your camera".',
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          );
        },
        onDetect: (capture) {
          if (_handled) return;
          final codes = capture.barcodes;
          if (codes.isEmpty) return;
          final raw = codes.first.rawValue;
          if (raw == null || raw.isEmpty) return;
          _handled = true;
          Navigator.pop(context, raw);
        },
      ),
    );
  }
}

Future<bool> _confirm(BuildContext context, String message) async {
  final res = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Confirm'),
      content: Text(message),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('OK')),
      ],
    ),
  );
  return res ?? false;
}
