// ============================================================
// RestPilot — Auth Remote DataSource
// ============================================================

import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../../core/errors/failures.dart';
import '../../domain/entities/user_profile.dart';

abstract class AuthRemoteDataSource {
  Future<void> signInWithOtp(String email);
  Future<UserProfile> verifyOtp({required String email, required String token});
  Future<void> signOut();
  Future<UserProfile?> getCurrentUser();
  Stream<UserProfile?> get authStateChanges;
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final _client = Supabase.instance.client;

  @override
  Future<void> signInWithOtp(String email) async {
    try {
      await _client.auth.signInWithOtp(
        email: email,
        // RestPilot authenticates with the six-digit email OTP only.
        shouldCreateUser: true,
      );
    } on AuthException catch (e) {
      throw AppException(e.message);
    }
  }

  @override
  Future<UserProfile> verifyOtp({
    required String email,
    required String token,
  }) async {
    final response = await _client.auth.verifyOTP(
      type: OtpType.email,
      email: email,
      token: token,
    );
    final user = response.user;
    if (user == null) throw const AppException('OTP verification failed');
    return _fetchProfile(user.id);
  }

  @override
  Future<void> signOut() async {
    await _client.auth.signOut();
  }

  @override
  Future<UserProfile?> getCurrentUser() async {
    final user = _client.auth.currentUser;
    if (user == null) return null;
    try {
      return await _fetchProfile(user.id);
    } catch (_) {
      return null;
    }
  }

  @override
  Stream<UserProfile?> get authStateChanges {
    return _client.auth.onAuthStateChange.asyncMap((event) async {
      final user = event.session?.user;
      if (user == null) return null;
      try {
        return await _fetchProfile(user.id);
      } catch (_) {
        return null;
      }
    });
  }

  Future<UserProfile> _fetchProfile(String userId) async {
    final data = await _client
        .from('profiles')
        .select('id, full_name, phone, avatar_url, role, is_active')
        .eq('id', userId)
        .single();

    return UserProfile(
      id: data['id'] as String,
      fullName: data['full_name'] as String?,
      phone: data['phone'] as String?,
      avatarUrl: data['avatar_url'] as String?,
      role: data['role'] as String,
      isActive: data['is_active'] as bool? ?? true,
    );
  }
}
