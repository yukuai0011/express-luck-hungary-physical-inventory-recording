import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:express_luck_inventory_scanner/screens/profile_screen.dart';
import 'package:express_luck_inventory_scanner/screens/work_screen.dart';
import 'package:express_luck_inventory_scanner/services/profile_store.dart';
import 'package:express_luck_inventory_scanner/models/profile.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const InventoryApp());
}

class InventoryApp extends StatefulWidget {
  const InventoryApp({super.key});

  @override
  State<InventoryApp> createState() => _InventoryAppState();
}

class _InventoryAppState extends State<InventoryApp> {
  RecordingProfile? _profile;
  int _currentIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final store = ProfileStore();
    final p = await store.loadProfile();
    setState(() => _profile = p);
  }

  void _onProfileChanged(RecordingProfile? newProfile) async {
    final store = ProfileStore();
    if (newProfile != null) {
      await store.saveProfile(newProfile);
    } else {
      await store.clearProfile();
    }
    setState(() => _profile = newProfile);
  }

  @override
  Widget build(BuildContext context) {
    final isDesktop = !kIsWeb && (Platform.isWindows || Platform.isLinux || Platform.isMacOS);
    return MaterialApp(
      title: 'Inventory Scanner',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.blue),
        useMaterial3: true,
      ),
      home: Scaffold(
        appBar: AppBar(
          title: const Text('Inventory Scanner'),
        ),
        body: IndexedStack(
          index: _currentIndex,
          children: [
            ProfileScreen(
              profile: _profile,
              onProfileChanged: _onProfileChanged,
              isDesktop: isDesktop,
            ),
            WorkScreen(
              profile: _profile,
              onRequireProfile: () => setState(() => _currentIndex = 0),
              isDesktop: isDesktop,
            ),
          ],
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _currentIndex,
          destinations: const [
            NavigationDestination(icon: Icon(Icons.qr_code), label: 'Profile'),
            NavigationDestination(icon: Icon(Icons.inventory), label: 'Work'),
          ],
          onDestinationSelected: (i) => setState(() => _currentIndex = i),
        ),
      ),
    );
  }
}
