// ============================================================
// RestPilot — Auth Repository Implementation
// ============================================================

import '../../domain/entities/user_profile.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../../../../core/errors/failures.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _dataSource;
  const AuthRepositoryImpl(this._dataSource);

  @override
  Future<void> signInWithOtp(String email) async {
    try {
      await _dataSource.signInWithOtp(email);
    } on AppException catch (e) {
      throw AuthFailure(e.message, cause: e);
    } catch (e) {
      throw AuthFailure('Failed to send OTP', cause: e);
    }
  }

  @override
  Future<UserProfile> verifyOtp({
    required String email,
    required String token,
  }) async {
    try {
      return await _dataSource.verifyOtp(email: email, token: token);
    } on AppException catch (e) {
      throw AuthFailure(e.message, cause: e);
    } catch (e) {
      throw AuthFailure('OTP verification failed', cause: e);
    }
  }

  @override
  Future<void> signOut() async {
    try {
      await _dataSource.signOut();
    } catch (e) {
      throw AuthFailure('Sign out failed', cause: e);
    }
  }

  @override
  Future<UserProfile?> getCurrentUser() async {
    try {
      return await _dataSource.getCurrentUser();
    } catch (_) {
      return null;
    }
  }

  @override
  Stream<UserProfile?> get authStateChanges => _dataSource.authStateChanges;
}
