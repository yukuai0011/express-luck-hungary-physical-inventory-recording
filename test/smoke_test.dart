import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:express_luck_inventory_scanner/main.dart' as app;

void main() {
  testWidgets('App builds and shows tabs', (tester) async {
    app.main();
    await tester.pumpAndSettle();
    expect(find.text('Inventory Scanner'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('Work'), findsOneWidget);
  });
}
