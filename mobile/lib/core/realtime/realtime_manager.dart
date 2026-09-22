// ============================================================
// RestPilot — RealtimeManager
// Idempotent channel registry. Channels are created once per name,
// disposed on logout or restaurant/branch switch.
// ============================================================

import 'package:supabase_flutter/supabase_flutter.dart';

class RealtimeManager {
  RealtimeManager._();
  static final RealtimeManager instance = RealtimeManager._();

  final _channels = <String, RealtimeChannel>{};

  /// Subscribe to postgres changes. Idempotent — returns existing channel if
  /// already subscribed for [channelName].
  ///
  /// [filterColumn] and [filterValue] form `column=eq.value` filter.
  /// Pass null for both to receive all changes on the table.
  RealtimeChannel subscribe({
    required String channelName,
    required String table,
    String? filterColumn,
    String? filterValue,
    required void Function(PostgresChangePayload) onEvent,
  }) {
    if (_channels.containsKey(channelName)) {
      return _channels[channelName]!;
    }

    final client = Supabase.instance.client;
    var channelBuilder = client.channel(channelName);

    if (filterColumn != null && filterValue != null) {
      channelBuilder = channelBuilder.onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: table,
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: filterColumn,
          value: filterValue,
        ),
        callback: onEvent,
      );
    } else {
      channelBuilder = channelBuilder.onPostgresChanges(
        event: PostgresChangeEvent.all,
        schema: 'public',
        table: table,
        callback: onEvent,
      );
    }

    final channel = channelBuilder.subscribe();
    _channels[channelName] = channel;
    return channel;
  }

  /// Unsubscribe a single channel by name.
  Future<void> unsubscribe(String channelName) async {
    final channel = _channels.remove(channelName);
    if (channel != null) {
      await Supabase.instance.client.removeChannel(channel);
    }
  }

  /// Dispose ALL channels. Called on logout and restaurant/branch switch.
  Future<void> disposeAll() async {
    for (final channel in _channels.values) {
      try {
        await Supabase.instance.client.removeChannel(channel);
      } catch (_) {}
    }
    _channels.clear();
  }

  bool isSubscribed(String channelName) => _channels.containsKey(channelName);
}
