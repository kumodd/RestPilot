// ============================================================
// RestPilot — Auth Repository (Abstract)
// ============================================================

import '../entities/user_profile.dart';

abstract class AuthRepository {
  /// Send a six-digit OTP to [email].
  Future<void> signInWithOtp(String email);

  /// Verify the OTP token sent to [email].
  Future<UserProfile> verifyOtp({required String email, required String token});

  /// Sign out the current user.
  Future<void> signOut();

  /// Get the current authenticated user's profile, or null if not authenticated.
  Future<UserProfile?> getCurrentUser();

  /// Stream of auth state changes.
  Stream<UserProfile?> get authStateChanges;
}
