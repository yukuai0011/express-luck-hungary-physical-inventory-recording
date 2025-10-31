import 'dart:async';
import 'dart:io' show Platform;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter_lite_camera/flutter_lite_camera.dart';
import 'package:zxing2/qrcode.dart';
import 'package:zxing2/zxing2.dart' as zxing;

/// A minimal Windows-only scanner view using flutter_lite_camera + zxing2.
///
/// Returns the detected code text with Navigator.pop(context, value).
class WindowsScanView extends StatefulWidget {
  final String title;
  const WindowsScanView({super.key, required this.title});

  @override
  State<WindowsScanView> createState() => _WindowsScanViewState();
}

class _WindowsScanViewState extends State<WindowsScanView> {
  final FlutterLiteCamera _cam = FlutterLiteCamera();
  bool _opened = false;
  bool _running = false;
  int _width = 640;
  int _height = 480;
  ui.Image? _preview;
  Timer? _timer;
  // Try both QR-only and multi-format readers when available
  final QRCodeReader _qrReader = QRCodeReader();

  @override
  void initState() {
    super.initState();
    // Guard to Windows
    if (!Platform.isWindows) {
      // Not supported, just pop.
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.pop(context);
      });
      return;
    }
    _start();
  }

  Future<void> _start() async {
    try {
      final devices = await _cam.getDeviceList();
      if (devices.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No camera devices found')));
        return;
      }
      // open first camera
      final ok = await _cam.open(0);
      if (!ok) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to open camera')));
        return;
      }
      _opened = true;
      _running = true;
      _scheduleNext();
      setState(() {});
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Camera error: $e')));
    }
  }

  void _scheduleNext() {
    if (!_running) return;
    _timer?.cancel();
    // target ~10-12 FPS for decode loop
    _timer = Timer(const Duration(milliseconds: 85), _captureAndProcess);
  }

  Future<void> _captureAndProcess() async {
    if (!_opened || !_running) return;
    try {
      final frame = await _cam.captureFrame();
      final data = frame['data'] as Uint8List?;
      final w = frame['width'] as int? ?? _width;
      final h = frame['height'] as int? ?? _height;
      if (data == null || data.isEmpty) {
        _scheduleNext();
        return;
      }

      _width = w;
      _height = h;

      // Update preview image (convert RGB888 -> RGBA8888 for display)
      final rgba = Uint8List(w * h * 4);
      for (int i = 0, j = 0; i < data.length; i += 3, j += 4) {
        final r = data[i];
        final g = data[i + 1];
        final b = data[i + 2];
        // Flutter expects RGBA when using rgba8888
        rgba[j] = r;
        rgba[j + 1] = g;
        rgba[j + 2] = b;
        rgba[j + 3] = 0xFF;
      }
      // Decode off UI thread would be ideal; lightweight here due to low res
      await _updatePreview(rgba, w, h);

      // Build ABGR Int32 list for zxing2 RGBLuminanceSource
      final abgr = Uint8List(w * h * 4);
      for (int i = 0, j = 0; i < data.length; i += 3, j += 4) {
        final r = data[i];
        final g = data[i + 1];
        final b = data[i + 2];
        // ABGR order bytes [A, B, G, R]
        abgr[j] = 0xFF;
        abgr[j + 1] = b;
        abgr[j + 2] = g;
        abgr[j + 3] = r;
      }
      final pixels = abgr.buffer.asInt32List();
      final source = zxing.RGBLuminanceSource(w, h, pixels);
      final bitmap = zxing.BinaryBitmap(zxing.GlobalHistogramBinarizer(source));

      String? resultText;
      try {
        final res = _qrReader.decode(bitmap);
        resultText = res.text;
      } catch (_) {
        // QR decoding failed; keep scanning.
      }

      if (resultText != null && resultText.isNotEmpty && mounted) {
        _running = false;
        await _stop();
        if (!mounted) return;
        Navigator.pop(context, resultText);
        return;
      }
    } catch (_) {
      // swallow errors to keep loop running
    }
    _scheduleNext();
  }

  Future<void> _updatePreview(Uint8List rgba, int w, int h) async {
    final completer = Completer<ui.Image>();
    ui.decodeImageFromPixels(
      rgba,
      w,
      h,
      ui.PixelFormat.rgba8888,
      completer.complete,
    );
    final img = await completer.future;
    if (!mounted) return;
    setState(() => _preview = img);
  }

  Future<void> _stop() async {
    _running = false;
    _timer?.cancel();
    if (_opened) {
      try {
        await _cam.release();
      } catch (_) {}
      _opened = false;
    }
  }

  @override
  void dispose() {
    _stop();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.close),
            tooltip: 'Cancel',
            onPressed: () async {
              await _stop();
              if (!mounted) return;
              Navigator.pop(context);
            },
          )
        ],
      ),
      body: Stack(
        children: [
          if (_preview != null)
            Center(
              child: CustomPaint(
                painter: _ImagePainter(_preview!),
                child: SizedBox(
                  width: double.infinity,
                  height: double.infinity,
                ),
              ),
            )
          else
            const Center(child: CircularProgressIndicator()),
          Positioned(
            bottom: 16,
            left: 16,
            right: 16,
            child: Text(
              'Align a QR/Barcode within the frame',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}

class _ImagePainter extends CustomPainter {
  final ui.Image image;
  _ImagePainter(this.image);

  @override
  void paint(Canvas canvas, Size size) {
    final imgW = image.width.toDouble();
    final imgH = image.height.toDouble();
    final dst = _contain(Size(imgW, imgH), size);
    final paint = Paint();
    canvas.drawImageRect(
      image,
      Rect.fromLTWH(0, 0, imgW, imgH),
      dst,
      paint,
    );
  }

  Rect _contain(Size src, Size dst) {
    final scale = (dst.width / src.width) < (dst.height / src.height)
        ? (dst.width / src.width)
        : (dst.height / src.height);
    final w = src.width * scale;
    final h = src.height * scale;
    final dx = (dst.width - w) / 2;
    final dy = (dst.height - h) / 2;
    return Rect.fromLTWH(dx, dy, w, h);
  }

  @override
  bool shouldRepaint(covariant _ImagePainter oldDelegate) => oldDelegate.image != image;
}
