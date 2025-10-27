import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:express_luck_inventory_scanner/models/profile.dart';
import 'package:express_luck_inventory_scanner/widgets/quantity_stepper.dart';
import 'package:express_luck_inventory_scanner/services/power_automate_client.dart';
import 'package:express_luck_inventory_scanner/screens/scan_screen.dart';

class WorkScreen extends StatefulWidget {
  final RecordingProfile? profile;
  final VoidCallback onRequireProfile;
  final bool isDesktop;
  const WorkScreen({
    super.key,
    required this.profile,
    required this.onRequireProfile,
    required this.isDesktop,
  });

  @override
  State<WorkScreen> createState() => _WorkScreenState();
}

class _WorkScreenState extends State<WorkScreen> {
  final packageController = TextEditingController();
  bool intact = false;
  int qty = 0;
  bool sending = false;

  @override
  void dispose() {
    packageController.dispose();
    super.dispose();
  }

  Future<void> _scanPackage() async {
    final supported = !kIsWeb && (Platform.isAndroid || Platform.isIOS);
    if (!supported) return;
    final val = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const ScanScreen()),
    );
    if (val != null && val.isNotEmpty) {
      setState(() => packageController.text = val);
    }
  }

  Future<void> _submit() async {
    final p = widget.profile;
    if (p == null) {
      _showSnack('Please create and save a profile first.');
      widget.onRequireProfile();
      return;
    }
    final packageNo = packageController.text.trim();
    if (packageNo.isEmpty) {
      _showSnack('Enter or scan a package number.');
      return;
    }
    setState(() => sending = true);
    try {
      final client = PowerAutomateClient(p);
      final resp = await client.submit(
        packageNo: packageNo,
        quantity: qty,
        packageIntact: intact,
      );
      if (!mounted) return;
      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        _showSnack('Submitted successfully (${resp.statusCode}).');
        setState(() {
          packageController.clear();
          intact = false;
          qty = 0;
        });
      } else {
        _showSnack('HTTP ${resp.statusCode}: ${resp.body}');
      }
    } catch (e) {
      _showSnack('Failed to submit: $e');
    } finally {
      if (mounted) setState(() => sending = false);
    }
  }

  void _showSnack(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.profile;
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: packageController,
                  decoration: const InputDecoration(
                    labelText: 'Package No',
                    border: OutlineInputBorder(),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              IconButton(
                onPressed: (!kIsWeb && (Platform.isAndroid || Platform.isIOS)) ? _scanPackage : null,
                icon: const Icon(Icons.camera_alt),
                tooltip: 'Scan package barcode',
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Checkbox(
                value: intact,
                onChanged: (v) => setState(() => intact = v ?? false),
              ),
              const Text('Package intact'),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Text('Quantity:'),
              const SizedBox(width: 12),
              Opacity(
                opacity: intact ? 0.5 : 1.0,
                child: AbsorbPointer(
                  absorbing: intact,
                  child: QuantityStepper(
                    value: qty,
                    enabled: !intact,
                    onChanged: (v) => setState(() => qty = v < 0 ? 0 : v),
                  ),
                ),
              ),
            ],
          ),
          const Spacer(),
          if (p == null)
            Row(
              children: [
                const Icon(Icons.info_outline),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'No profile found. Go to Profile tab to scan and save the API endpoint and order info.',
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  ),
                ),
              ],
            ),
          const SizedBox(height: 8),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: sending ? null : _submit,
              icon: sending
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.send),
              label: const Text('Submit'),
            ),
          ),
        ],
      ),
    );
  }
}
