import 'dart:io';

import 'package:flutter/material.dart';
import 'package:hive/hive.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:intl/intl.dart';
import 'package:path_provider/path_provider.dart';
import 'package:csv/csv.dart';

// Boxes
const String kBoxSessions = 'sessions';
const String kBoxEntries = 'entries';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox<Map>(kBoxSessions);
  await Hive.openBox<Map>(kBoxEntries);

  // Ensure a default session exists
  final sessions = Hive.box<Map>(kBoxSessions);
  if (sessions.isEmpty) {
    await sessions.add({
      'id': UniqueKey().toString(),
      'name': 'Default',
      'createdAt': DateTime.now().toIso8601String(),
    });
  }

  runApp(const InventoryApp());
}

class InventoryApp extends StatelessWidget {
  const InventoryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Inventory Recording',
      theme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.indigo,
        brightness: Brightness.light,
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorSchemeSeed: Colors.indigo,
        brightness: Brightness.dark,
      ),
      home: const SessionsPage(),
    );
  }
}

class SessionsPage extends StatelessWidget {
  const SessionsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final sessionsBox = Hive.box<Map>(kBoxSessions);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory Sessions'),
      ),
      body: ValueListenableBuilder(
        valueListenable: sessionsBox.listenable(),
        builder: (context, Box<Map> box, _) {
          final items = box.values.toList(growable: false);
          items.sort((a, b) => (b['createdAt'] ?? '').toString().compareTo((a['createdAt'] ?? '').toString()));
          if (items.isEmpty) {
            return const Center(
              child: Text('No sessions yet. Tap + to create.'),
            );
          }
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final s = items[index];
              final sessionId = s['id'] as String? ?? '';
              final name = s['name'] as String? ?? 'Session';
              final created = _formatDate(s['createdAt']);
              return ListTile(
                title: Text(name),
                subtitle: Text('Created $created'),
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => SessionEntriesPage(sessionId: sessionId, sessionName: name),
                  ),
                ),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  tooltip: 'Delete session',
                  onPressed: () async {
                    final confirmed = await _confirm(context, 'Delete this session and all its entries?');
                    if (confirmed) {
                      // Delete entries in this session
                      final entriesBox = Hive.box<Map>(kBoxEntries);
                      final toDelete = <int>[];
                      for (final key in entriesBox.keys) {
                        final v = entriesBox.get(key);
                        if (v != null && v['sessionId'] == sessionId) {
                          toDelete.add(key as int);
                        }
                      }
                      await entriesBox.deleteAll(toDelete);
                      // Delete session itself
                      final delKey = box.keys.firstWhere((k) => box.get(k)?['id'] == sessionId, orElse: () => null);
                      if (delKey != null) {
                        await box.delete(delKey);
                      }
                    }
                  },
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _createSessionDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  Future<void> _createSessionDialog(BuildContext context) async {
    final controller = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('New session'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            labelText: 'Session name',
            hintText: 'e.g. 2025-10-27 Warehouse A',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Create')),
        ],
      ),
    );
    if (ok == true) {
      final name = controller.text.trim().isEmpty ? 'Session' : controller.text.trim();
      final sessions = Hive.box<Map>(kBoxSessions);
      await sessions.add({
        'id': UniqueKey().toString(),
        'name': name,
        'createdAt': DateTime.now().toIso8601String(),
      });
    }
  }
}

class SessionEntriesPage extends StatelessWidget {
  final String sessionId;
  final String sessionName;
  const SessionEntriesPage({super.key, required this.sessionId, required this.sessionName});

  @override
  Widget build(BuildContext context) {
    final entriesBox = Hive.box<Map>(kBoxEntries);
    return Scaffold(
      appBar: AppBar(
        title: Text(sessionName),
        actions: [
          IconButton(
            tooltip: 'Export CSV',
            icon: const Icon(Icons.download),
            onPressed: () async {
              final path = await _exportSessionToCsv(sessionId, sessionName);
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Exported to $path')),
                );
              }
            },
          ),
          IconButton(
            tooltip: 'Clear entries',
            icon: const Icon(Icons.delete_sweep_outlined),
            onPressed: () async {
              final confirmed = await _confirm(context, 'Delete all entries in this session?');
              if (confirmed) {
                final toDelete = <int>[];
                for (final key in entriesBox.keys) {
                  final v = entriesBox.get(key);
                  if (v != null && v['sessionId'] == sessionId) {
                    toDelete.add(key as int);
                  }
                }
                await entriesBox.deleteAll(toDelete);
              }
            },
          ),
        ],
      ),
      body: ValueListenableBuilder(
        valueListenable: entriesBox.listenable(),
        builder: (context, Box<Map> box, _) {
          final entries = box.values
              .where((e) => e['sessionId'] == sessionId)
              .map((e) => e as Map)
              .toList(growable: false);
          entries.sort((a, b) => (b['ts'] ?? '').toString().compareTo((a['ts'] ?? '').toString()));
          if (entries.isEmpty) {
            return const Center(child: Text('No entries yet. Tap + to add.'));
          }
          return ListView.separated(
            itemCount: entries.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final e = entries[index];
              final code = (e['itemCode'] ?? '').toString();
              final loc = (e['location'] ?? '').toString();
              final qty = (e['quantity'] ?? 0).toString();
              final ts = _formatDateTime(e['ts']);
              return ListTile(
                title: Text(code.isEmpty ? '(no item code)' : code),
                subtitle: Text('Loc: ${loc.isEmpty ? '-' : loc} • Qty: $qty • $ts'),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () async {
                    final confirmed = await _confirm(context, 'Delete this entry?');
                    if (!confirmed) return;
                    // find and delete by key
                    final key = box.keys.firstWhere((k) => box.get(k) == e, orElse: () => null);
                    if (key != null) {
                      await box.delete(key);
                    }
                  },
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => AddEntryPage(sessionId: sessionId),
            ),
          );
        },
        icon: const Icon(Icons.add),
        label: const Text('Add Entry'),
      ),
    );
  }
}

class AddEntryPage extends StatefulWidget {
  final String sessionId;
  const AddEntryPage({super.key, required this.sessionId});

  @override
  State<AddEntryPage> createState() => _AddEntryPageState();
}

class _AddEntryPageState extends State<AddEntryPage> {
  final _formKey = GlobalKey<FormState>();
  final _itemCode = TextEditingController();
  final _location = TextEditingController();
  final _quantity = TextEditingController(text: '0');
  final _remarks = TextEditingController();

  @override
  void dispose() {
    _itemCode.dispose();
    _location.dispose();
    _quantity.dispose();
    _remarks.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Add Entry')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _itemCode,
              decoration: const InputDecoration(
                labelText: 'Item code / Barcode',
                border: OutlineInputBorder(),
              ),
              textInputAction: TextInputAction.next,
              validator: (v) => null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _location,
              decoration: const InputDecoration(
                labelText: 'Location',
                border: OutlineInputBorder(),
              ),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _quantity,
              decoration: const InputDecoration(
                labelText: 'Quantity',
                border: OutlineInputBorder(),
              ),
              keyboardType: TextInputType.number,
              validator: (v) {
                final n = int.tryParse(v?.trim() ?? '');
                if (n == null || n < 0) return 'Enter a non-negative integer';
                return null;
              },
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _remarks,
              decoration: const InputDecoration(
                labelText: 'Remarks (optional)',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Expanded(
                  child: FilledButton.icon(
                    onPressed: () async {
                      if (!_formKey.currentState!.validate()) return;
                      final entriesBox = Hive.box<Map>(kBoxEntries);
                      final now = DateTime.now();
                      final entry = {
                        'sessionId': widget.sessionId,
                        'itemCode': _itemCode.text.trim(),
                        'location': _location.text.trim(),
                        'quantity': int.tryParse(_quantity.text.trim()) ?? 0,
                        'remarks': _remarks.text.trim(),
                        'ts': now.toIso8601String(),
                      };
                      await entriesBox.add(entry);
                      if (context.mounted) Navigator.pop(context);
                    },
                    icon: const Icon(Icons.save),
                    label: const Text('Save'),
                  ),
                ),
              ],
            )
          ],
        ),
      ),
    );
  }
}

Future<String> _exportSessionToCsv(String sessionId, String sessionName) async {
  final entriesBox = Hive.box<Map>(kBoxEntries);
  final entries = entriesBox.values
      .where((e) => e['sessionId'] == sessionId)
      .map((e) => e as Map)
      .toList(growable: false);
  final rows = <List<dynamic>>[
    ['ItemCode', 'Location', 'Quantity', 'Remarks', 'Timestamp'],
    ...entries.map((e) => [
          e['itemCode'] ?? '',
          e['location'] ?? '',
          e['quantity'] ?? 0,
          e['remarks'] ?? '',
          e['ts'] ?? '',
        ])
  ];
  final csv = const ListToCsvConverter().convert(rows);

  final dir = await getApplicationDocumentsDirectory();
  final safeName = sessionName.trim().isEmpty ? 'session' : sessionName.replaceAll(RegExp(r'[^A-Za-z0-9._-]'), '_');
  final date = DateFormat('yyyyMMdd_HHmmss').format(DateTime.now());
  final file = File('${dir.path}/inventory_${safeName}_$date.csv');
  await file.writeAsString(csv, mode: FileMode.write, flush: true);
  return file.path;
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

String _formatDate(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final dt = DateTime.tryParse(iso);
  if (dt == null) return '';
  return DateFormat.yMMMd().format(dt);
}

String _formatDateTime(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final dt = DateTime.tryParse(iso);
  if (dt == null) return '';
  return DateFormat('yyyy-MM-dd HH:mm').format(dt);
}
