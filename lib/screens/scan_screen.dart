import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ScanScreen extends StatefulWidget {
  const ScanScreen({super.key});

  @override
  State<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends State<ScanScreen> {
  bool _handled = false;

  @override
  Widget build(BuildContext context) {
    final supported = !kIsWeb && (Platform.isAndroid || Platform.isIOS);
    return Scaffold(
      appBar: AppBar(title: const Text('Scan')),
      body: supported
          ? MobileScanner(
              onDetect: (capture) {
                if (_handled) return;
                final codes = capture.barcodes;
                if (codes.isEmpty) return;
                final value = codes.first.rawValue;
                if (value == null) return;
                _handled = true;
                Navigator.of(context).pop(value);
              },
            )
          : const Center(
              child: Text('Camera scanning is not supported on this platform.'),
            ),
    );
  }
}
