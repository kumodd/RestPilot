// ============================================================
// RestPilot — Supabase Client Singleton + Retry Utility
// ============================================================

import 'package:supabase_flutter/supabase_flutter.dart';
import '../errors/failures.dart';

/// Convenience accessor for the Supabase client
SupabaseClient get supabase => Supabase.instance.client;

/// Retry a Supabase operation with exponential backoff.
/// Max [AppConstants.maxRetryAttempts] attempts; delays: 200ms, 400ms, 800ms.
Future<T> withRetry<T>(
  Future<T> Function() operation, {
  int maxAttempts = 3,
  Duration baseDelay = const Duration(milliseconds: 200),
}) async {
  for (int attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } on PostgrestException catch (e) {
      // RLS/server errors are terminal — don't retry
      throw ServerFailure(e.message, code: e.code, cause: e);
    } catch (e) {
      if (attempt == maxAttempts) {
        throw NetworkFailure('Operation failed after $maxAttempts attempts', cause: e);
      }
      final delay = baseDelay * (1 << (attempt - 1)); // 200ms, 400ms, 800ms
      await Future.delayed(delay);
    }
  }
  throw const NetworkFailure('Unreachable');
}

/// Safely call a Supabase RPC and surface errors as [ServerFailure].
Future<dynamic> callRpc(
  String function,
  Map<String, dynamic> params,
) async {
  final response = await supabase.rpc(function, params: params);
  if (response is Map && response.containsKey('error')) {
    throw ServerFailure(response['error'] as String, code: function);
  }
  return response;
}
