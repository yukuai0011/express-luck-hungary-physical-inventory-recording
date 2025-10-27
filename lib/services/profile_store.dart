import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';
import 'package:express_luck_inventory_scanner/models/profile.dart';

class ProfileStore {
  static const _key = 'inventory_profile';

  Future<RecordingProfile?> loadProfile() async {
    final prefs = await SharedPreferences.getInstance();
    final str = prefs.getString(_key);
    if (str == null || str.isEmpty) return null;
    try {
      final map = json.decode(str) as Map<String, dynamic>;
      return RecordingProfile.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  Future<void> saveProfile(RecordingProfile profile) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, json.encode(profile.toJson()));
  }

  Future<void> clearProfile() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
