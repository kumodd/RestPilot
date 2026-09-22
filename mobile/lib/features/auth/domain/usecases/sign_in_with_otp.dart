// ============================================================
// RestPilot — Auth Use Cases
// ============================================================

import '../repositories/auth_repository.dart';
import '../entities/user_profile.dart';
import '../../../../core/realtime/realtime_manager.dart';

class SignInWithOtp {
  final AuthRepository _repo;
  const SignInWithOtp(this._repo);
  Future<void> call(String email) => _repo.signInWithOtp(email);
}
