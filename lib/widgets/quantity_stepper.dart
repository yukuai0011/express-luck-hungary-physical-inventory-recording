import 'package:flutter/material.dart';

class QuantityStepper extends StatelessWidget {
  final int value;
  final bool enabled;
  final void Function(int) onChanged;
  const QuantityStepper({
    super.key,
    required this.value,
    required this.enabled,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        IconButton(
          onPressed: enabled ? () => onChanged(value - 1 < 0 ? 0 : value - 1) : null,
          icon: const Icon(Icons.remove),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: enabled ? theme.colorScheme.surfaceVariant : theme.disabledColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text('$value', style: theme.textTheme.titleMedium),
        ),
        IconButton(
          onPressed: enabled ? () => onChanged(value + 1) : null,
          icon: const Icon(Icons.add),
        ),
      ],
    );
  }
}
